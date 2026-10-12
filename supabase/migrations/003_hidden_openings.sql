-- Remembers openings each person marked "Not for me", on every device.
-- Run once in Supabase → SQL Editor. Safe to run again.
alter table public.profiles add column if not exists hidden_openings text[] not null default '{}';
