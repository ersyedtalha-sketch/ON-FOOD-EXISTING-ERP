-- ============================================================
-- TEMPORARY: allow the app to read/write WITHOUT login (for now)
-- ============================================================
-- Our tables currently allow only logged-in (authenticated) users.
-- Since we haven't built the login screen yet, the app (using the
-- public "anon" key) is blocked from saving. This snippet ALSO allows
-- the anon role so you can test saving today.
--
-- ⚠️ This makes the data readable/writable by anyone who has your
-- anon key. That's fine for testing with sample data. BEFORE you put
-- real business data in and share it, we'll add login and remove this.
--
-- Paste into Supabase → SQL Editor → New query → Run.
-- ============================================================

do $$
declare t text;
begin
  foreach t in array array['partners','inventory','batches','invoices','invoice_items','payments']
  loop
    -- drop the temp policy if re-running
    execute format('drop policy if exists "temp anon access" on %I;', t);
    execute format(
      'create policy "temp anon access" on %I for all to anon using (true) with check (true);', t
    );
  end loop;
end $$;

-- To REMOVE this later (after we add login), run:
-- do $$ declare t text; begin
--   foreach t in array array['partners','inventory','batches','invoices','invoice_items','payments']
--   loop execute format('drop policy if exists "temp anon access" on %I;', t); end loop;
-- end $$;
