-- ============================================================
-- LOCK DOWN RLS  (replaces allow-anon-temporary.sql)
-- ============================================================
-- Run this AFTER profiles-and-roles.sql, and AFTER you have at
-- least one admin user. Paste into Supabase → SQL Editor → Run.
--
-- What it does:
--   1. Removes the temporary "anon can do anything" policies.
--   2. Revokes table access from the anon role entirely.
--   3. Adds role-scoped policies for logged-in users:
--        admin      → everything
--        supervisor → operations only (inventory, batches)
--                     no access to partners / invoices / payments
--
-- Until now, role separation existed ONLY in the UI. After this,
-- it is enforced by the database, so a supervisor cannot read your
-- commercial data even by calling the API directly.
--
-- ⚠️ ORDER MATTERS: make yourself an admin FIRST, or you will lock
--    yourself out of your own commercial tables:
--      update profiles set role = 'admin' where email = 'you@example.com';
-- ============================================================


-- ------------------------------------------------------------
-- 0. Safety check — refuse to run if there is no admin yet.
-- ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from profiles where role = 'admin') then
    raise exception
      'No admin user exists yet. Run:  update profiles set role = ''admin'' where email = ''you@example.com'';  then re-run this script.';
  end if;
end $$;


-- ------------------------------------------------------------
-- 1. Role helper.
--    SECURITY DEFINER so it can read profiles without being
--    subject to profiles' own RLS (which would recurse).
--    Fixed search_path so it cannot be hijacked.
-- ------------------------------------------------------------
create or replace function current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from profiles where id = auth.uid()), 'none');
$$;

revoke all on function current_app_role() from public, anon;
grant execute on function current_app_role() to authenticated;


-- ------------------------------------------------------------
-- 2. Make sure RLS is on everywhere. Without this, policies are
--    decorative — Postgres skips them when RLS is disabled.
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['partners','inventory','batches','invoices','invoice_items','payments','profiles']
  loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;


-- ------------------------------------------------------------
-- 3. Remove BOTH of the wide-open policies, and revoke anon's grants.
--
--    "temp anon access"  — from allow-anon-temporary.sql (anyone with
--                          the public key).
--    "auth full access"  — from schema.sql, which grants every logged-in
--                          user `using (true)` on every table.
--
--    Dropping the second one is essential and easy to miss. Postgres
--    policies are PERMISSIVE by default, meaning they are OR-ed together:
--    leaving "auth full access" in place would silently override the
--    admin-only rules below, and a supervisor would still read every
--    invoice. Verified: with it present, a supervisor SELECT on partners
--    returned rows even with the admin-only policy active.
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['partners','inventory','batches','invoices','invoice_items','payments']
  loop
    execute format('drop policy if exists "temp anon access" on %I;', t);
    execute format('drop policy if exists "auth full access" on %I;', t);
    execute format('revoke all on table %I from anon;', t);
  end loop;
end $$;


-- ------------------------------------------------------------
-- 4. Operations tables — admin AND supervisor.
--    Production staff need these to do their job.
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['inventory','batches']
  loop
    execute format('drop policy if exists "ops staff full access" on %I;', t);
    execute format($f$
      create policy "ops staff full access" on %I
        for all to authenticated
        using      (current_app_role() in ('admin','supervisor'))
        with check (current_app_role() in ('admin','supervisor'));
    $f$, t);
  end loop;
end $$;


-- ------------------------------------------------------------
-- 5. Commercial tables — admin only.
--    Customer details, invoices, payments. A supervisor querying
--    these now gets zero rows instead of everything.
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['partners','invoices','invoice_items','payments']
  loop
    execute format('drop policy if exists "admin only" on %I;', t);
    execute format($f$
      create policy "admin only" on %I
        for all to authenticated
        using      (current_app_role() = 'admin')
        with check (current_app_role() = 'admin');
    $f$, t);
  end loop;
end $$;


-- ------------------------------------------------------------
-- 6. Profiles — everyone logged in can read (the app needs to
--    know its own role); only admins may change a role.
-- ------------------------------------------------------------
drop policy if exists "profiles readable"     on profiles;
drop policy if exists "profiles self update"  on profiles;
drop policy if exists "profiles admin update" on profiles;

create policy "profiles readable" on profiles
  for select to authenticated using (true);

-- A user may edit their own row, but NOT promote themselves:
-- the role must stay what it already is.
create policy "profiles self update" on profiles
  for update to authenticated
  using      (id = auth.uid())
  with check (id = auth.uid() and role = current_app_role());

create policy "profiles admin update" on profiles
  for update to authenticated
  using      (current_app_role() = 'admin')
  with check (current_app_role() = 'admin');


-- ------------------------------------------------------------
-- 7. Verify. Every table below should show rls_enabled = true and
--    have no policy granting anything to the anon role.
-- ------------------------------------------------------------
select
  c.relname                     as table_name,
  c.relrowsecurity              as rls_enabled,
  coalesce(p.polname,'(no policy)') as policy_name,
  (select string_agg(r.rolname, ', ')
     from pg_roles r
    where r.oid = any (p.polroles::oid[])) as applies_to
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relname in ('partners','inventory','batches',
                    'invoices','invoice_items','payments','profiles')
order by c.relname, policy_name;

-- Expected: rls_enabled = true for all seven, anon_can_reach = false/null.
