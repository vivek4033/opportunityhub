-- Resumes (private file storage) and admin job recommendations.
-- Run once in Supabase → SQL Editor. Safe to run again.

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
