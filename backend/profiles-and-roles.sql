-- ============================================================
-- LOGIN & ROLES (Step 3)
-- Creates a "profiles" table that gives each login user a role:
--   'admin'      → you and your co-founder (see everything)
--   'supervisor' → kitchen/production staff (see only operations)
-- Run this once in Supabase → SQL Editor.
-- ============================================================

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'supervisor' check (role in ('admin','supervisor')),
  created_at  timestamptz default now()
);

alter table profiles enable row level security;

-- Anyone logged in can read profiles (so the app can read its own role).
drop policy if exists "profiles readable" on profiles;
create policy "profiles readable" on profiles for select to authenticated using (true);

-- A user can update only their own profile row.
drop policy if exists "profiles self update" on profiles;
create policy "profiles self update" on profiles for update to authenticated using (id = auth.uid());

-- When a new user signs up, auto-create their profile (default role: supervisor).
-- Hardened: fixed search_path + never block signup if anything goes wrong.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email, role)
  values (new.id, new.email, 'supervisor')
  on conflict (id) do nothing;
  return new;
exception when others then
  -- Never block user creation if the profile insert hiccups.
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- AFTER you create your users (see the guide), make the admins:
-- Replace the emails with your real ones, then run these two lines.
-- ============================================================
-- update profiles set role = 'admin' where email = 'ersyedtalha@gmail.com';
-- update profiles set role = 'admin' where email = 'cofounder@example.com';
