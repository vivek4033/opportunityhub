-- Adds "Roles I'm looking for" to profiles (Banking, Teaching, Government, ...).
-- Run once in Supabase → SQL Editor. Safe to run again.
alter table public.profiles add column if not exists target_roles text[] not null default '{}';
