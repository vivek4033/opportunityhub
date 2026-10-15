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
  hidden_openings     text[] not null default '{}',   -- opening ids they marked "Not for me"
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  last_seen_at        timestamptz not null default now()
);
-- Safe to re-run on a database created before roles existed.
alter table public.profiles add column if not exists target_roles text[] not null default '{}';
alter table public.profiles add column if not exists hidden_openings text[] not null default '{}';

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

-- ------------------------------------------------------------------ resumes + recommendations (same as migrations/004)

-- 1) Profile fields for the uploaded resume
alter table public.profiles add column if not exists resume_path text;
alter table public.profiles add column if not exists resume_name text;
alter table public.profiles add column if not exists resume_uploaded_at timestamptz;

-- 2) Private bucket: PDF / Word, up to 5 MB. Files live at resumes/<user id>/<file name>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 5242880,
        array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Each person can add, replace and delete only their own resume; the admin can open everyone's.
drop policy if exists "resume own or admin read" on storage.objects;
drop policy if exists "resume own insert" on storage.objects;
drop policy if exists "resume own update" on storage.objects;
drop policy if exists "resume own delete" on storage.objects;
create policy "resume own or admin read" on storage.objects for select to authenticated
  using (bucket_id = 'resumes' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "resume own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "resume own update" on storage.objects for update to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "resume own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

-- 3) Recommendations: the admin suggests an opening to a friend; the friend sees it on Openings.
create table if not exists public.recommendations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  opening_id  text not null,
  note        text check (note is null or length(note) <= 500),
  created_by  text default (auth.jwt() ->> 'email'),
  created_at  timestamptz not null default now(),
  unique (user_id, opening_id)
);
alter table public.recommendations enable row level security;
drop policy if exists "own or admin read" on public.recommendations;
drop policy if exists "admin add" on public.recommendations;
drop policy if exists "admin remove" on public.recommendations;
create policy "own or admin read" on public.recommendations for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "admin add" on public.recommendations for insert to authenticated with check (public.is_admin());
create policy "admin remove" on public.recommendations for delete to authenticated using (public.is_admin());
revoke all on public.recommendations from anon;
grant select, insert, delete on public.recommendations to authenticated;
