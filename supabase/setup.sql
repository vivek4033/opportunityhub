-- OpportunityHub — run this ONCE in Supabase: SQL Editor -> New query -> paste -> Run.
-- Before running, replace the admin email on the line marked  >>>  with YOUR login email.
-- Privacy model (enforced by the database, not the website):
--   * every friend can read and change ONLY their own profile, applications and mock scores
--   * the admin email(s) can READ everyone's data (no one can edit someone else's)

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------ admins
create table if not exists public.admins (
  email text primary key
);
insert into public.admins (email)
values (lower('YOUR-EMAIL@example.com'))   -- >>> replace with your email, keep the quotes
on conflict do nothing;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
grant execute on function public.is_admin() to authenticated;

-- ------------------------------------------------------------------ profiles
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               text,
  full_name           text not null default '',
  phone               text,
  date_of_birth       date,
  home_state          text,
  reservation_category text check (reservation_category in ('GEN','EWS','OBC','SC','ST')),
  languages           text[] not null default '{}',
  experience_years    numeric not null default 0 check (experience_years between 0 and 50),
  tets_cleared        text[] not null default '{}',
  exams_cleared       text[] not null default '{}',
  bed_final_year      boolean not null default false,
  preferred_locations text[] not null default '{}',
  education           jsonb not null default '[]',
  target_roles        text[] not null default '{}',   -- role types they want: banking, schools, government, ...
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  last_seen_at        timestamptz not null default now()
);
-- Safe to re-run on a database created before roles existed.
alter table public.profiles add column if not exists target_roles text[] not null default '{}';

-- ------------------------------------------------------------------ applications
create table if not exists public.applications (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  opening_id     text,
  organization   text not null check (length(organization) between 2 and 200),
  title          text not null check (length(title) between 2 and 300),
  track          text,
  status         text not null default 'to_apply'
                 check (status in ('to_apply','applied','exam','interview','selected','rejected')),
  deadline       date,
  exam_date      date,
  interview_date date,
  applied_date   date,
  notes          text,
  history        jsonb not null default '[]',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, opening_id)
);
create index if not exists applications_user_idx on public.applications (user_id);

-- ------------------------------------------------------------------ mock tests
create table if not exists public.mock_tests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  exam_group   text not null check (exam_group in ('banking','ssc','railways','insurance','tet','net','other')),
  exam_name    text not null check (length(exam_name) between 2 and 120),
  test_date    date not null,
  score        numeric not null,
  total_marks  numeric not null check (total_marks > 0),
  accuracy     numeric check (accuracy between 0 and 100),
  notes        text,
  created_at   timestamptz not null default now(),
  check (score <= total_marks)
);
create index if not exists mock_tests_user_idx on public.mock_tests (user_id);

-- ------------------------------------------------------------------ row level security
alter table public.admins       enable row level security;
alter table public.profiles     enable row level security;
alter table public.applications enable row level security;
alter table public.mock_tests   enable row level security;

drop policy if exists "admins read admins" on public.admins;
create policy "admins read admins" on public.admins for select to authenticated using (public.is_admin());

drop policy if exists "own or admin read" on public.profiles;
drop policy if exists "own insert" on public.profiles;
drop policy if exists "own update" on public.profiles;
create policy "own or admin read" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "own insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own or admin read" on public.applications;
drop policy if exists "own write" on public.applications;
create policy "own or admin read" on public.applications for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "own write" on public.applications for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own or admin read" on public.mock_tests;
drop policy if exists "own write" on public.mock_tests;
create policy "own or admin read" on public.mock_tests for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "own write" on public.mock_tests for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Signed-out visitors get nothing.
revoke all on public.admins, public.profiles, public.applications, public.mock_tests from anon;
grant select, insert, update, delete on public.profiles, public.applications, public.mock_tests to authenticated;
grant select on public.admins to authenticated;
