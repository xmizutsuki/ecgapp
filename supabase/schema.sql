-- ECG Lab — Supabase/PostgreSQL schema
-- Execute no SQL Editor de um projeto Supabase novo.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'student' check (role in ('student','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ecg_cases (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  difficulty smallint not null default 1 check (difficulty between 1 and 5),
  diagnosis text,
  interpretation text,
  explanation text,
  image_url text,
  heart_rate integer,
  rhythm text,
  p_wave text,
  pr_interval_ms integer,
  qrs_duration_ms integer,
  axis text,
  st_segment text,
  t_wave text,
  qt_interval_ms integer,
  source_name text,
  source_url text,
  license text,
  status text not null default 'draft' check (status in ('draft','review','published','archived')),
  created_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  ecg_case_id uuid not null references public.ecg_cases(id) on delete cascade,
  prompt text not null,
  explanation text,
  difficulty smallint not null default 1 check (difficulty between 1 and 5),
  skill text,
  status text not null default 'draft' check (status in ('draft','review','published','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.answer_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  label text not null,
  is_correct boolean not null default false,
  sort_order integer not null default 0
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  level integer not null default 1,
  position integer not null default 1,
  body_md text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_answers (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected_option_index integer not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);

create index if not exists user_answers_user_idx on public.user_answers(user_id, answered_at desc);
create index if not exists questions_case_idx on public.questions(ecg_case_id);
create index if not exists answer_options_question_idx on public.answer_options(question_id, sort_order);

-- Answers to educational library questions loaded outside the main database catalog.
create table if not exists public.external_user_answers (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_key text not null,
  case_key text not null,
  category text,
  selected_option_index integer not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);
create index if not exists external_user_answers_user_idx on public.external_user_answers(user_id, answered_at desc);

create table if not exists public.user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_answers integer not null default 0,
  correct_answers integer not null default 0,
  ecgs_completed integer not null default 0,
  xp integer not null default 0,
  streak_days integer not null default 0,
  last_study_date date,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  progress_percent smallint not null default 0 check (progress_percent between 0 and 100),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.simulation_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  total_questions integer not null,
  correct_answers integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- Admin helper. SECURITY DEFINER avoids recursive RLS checks on profiles.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Auto-create profile + progress on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  insert into public.user_progress (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.ecg_cases enable row level security;
alter table public.questions enable row level security;
alter table public.answer_options enable row level security;
alter table public.lessons enable row level security;
alter table public.user_answers enable row level security;
alter table public.external_user_answers enable row level security;
alter table public.user_progress enable row level security;
alter table public.user_lesson_progress enable row level security;
alter table public.simulation_attempts enable row level security;

-- Remove broad default grants first.
revoke all on table public.profiles, public.ecg_cases, public.questions, public.answer_options, public.lessons,
  public.user_answers, public.external_user_answers, public.user_progress, public.user_lesson_progress, public.simulation_attempts
from anon, authenticated;

-- Minimal grants. RLS still decides which rows are visible/writable.
grant select on public.ecg_cases, public.questions, public.answer_options, public.lessons to anon;
grant select on public.ecg_cases, public.questions, public.answer_options, public.lessons to authenticated;
grant insert, update, delete on public.ecg_cases, public.questions, public.answer_options, public.lessons to authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, updated_at) on public.profiles to authenticated;
grant select, insert on public.user_answers, public.external_user_answers to authenticated;
grant select, insert, update on public.user_progress, public.user_lesson_progress, public.simulation_attempts to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- profiles
create policy "profile_select_own_or_admin" on public.profiles for select to authenticated
using ((select auth.uid()) = id or public.is_admin());
create policy "profile_update_own" on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Published educational content can be read publicly; admins can see/manage all.
create policy "ecg_select_published_anon" on public.ecg_cases for select to anon using (status='published');
create policy "ecg_select_published_or_admin" on public.ecg_cases for select to authenticated using (status='published' or public.is_admin());
create policy "ecg_insert_admin" on public.ecg_cases for insert to authenticated with check (public.is_admin());
create policy "ecg_update_admin" on public.ecg_cases for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "ecg_delete_admin" on public.ecg_cases for delete to authenticated using (public.is_admin());

create policy "question_select_published_anon" on public.questions for select to anon using (status='published');
create policy "question_select_published_or_admin" on public.questions for select to authenticated using (status='published' or public.is_admin());
create policy "question_insert_admin" on public.questions for insert to authenticated with check (public.is_admin());
create policy "question_update_admin" on public.questions for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "question_delete_admin" on public.questions for delete to authenticated using (public.is_admin());

create policy "option_select_public" on public.answer_options for select to anon
using (exists(select 1 from public.questions q where q.id=question_id and q.status='published'));
create policy "option_select_auth" on public.answer_options for select to authenticated
using (public.is_admin() or exists(select 1 from public.questions q where q.id=question_id and q.status='published'));
create policy "option_insert_admin" on public.answer_options for insert to authenticated with check (public.is_admin());
create policy "option_update_admin" on public.answer_options for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "option_delete_admin" on public.answer_options for delete to authenticated using (public.is_admin());

create policy "lesson_select_published_anon" on public.lessons for select to anon using (status='published');
create policy "lesson_select_published_or_admin" on public.lessons for select to authenticated using (status='published' or public.is_admin());
create policy "lesson_insert_admin" on public.lessons for insert to authenticated with check (public.is_admin());
create policy "lesson_update_admin" on public.lessons for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "lesson_delete_admin" on public.lessons for delete to authenticated using (public.is_admin());

-- User-owned data
create policy "answers_select_own" on public.user_answers for select to authenticated using ((select auth.uid())=user_id);
create policy "answers_insert_own" on public.user_answers for insert to authenticated with check ((select auth.uid())=user_id);

create policy "external_answers_select_own" on public.external_user_answers for select to authenticated using ((select auth.uid())=user_id);
create policy "external_answers_insert_own" on public.external_user_answers for insert to authenticated with check ((select auth.uid())=user_id);

create policy "progress_select_own" on public.user_progress for select to authenticated using ((select auth.uid())=user_id);
create policy "progress_insert_own" on public.user_progress for insert to authenticated with check ((select auth.uid())=user_id);
create policy "progress_update_own" on public.user_progress for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

create policy "lesson_progress_select_own" on public.user_lesson_progress for select to authenticated using ((select auth.uid())=user_id);
create policy "lesson_progress_insert_own" on public.user_lesson_progress for insert to authenticated with check ((select auth.uid())=user_id);
create policy "lesson_progress_update_own" on public.user_lesson_progress for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

create policy "sim_select_own" on public.simulation_attempts for select to authenticated using ((select auth.uid())=user_id);
create policy "sim_insert_own" on public.simulation_attempts for insert to authenticated with check ((select auth.uid())=user_id);
create policy "sim_update_own" on public.simulation_attempts for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

-- Public bucket for de-identified educational ECG images.
insert into storage.buckets (id, name, public)
values ('ecgs','ecgs',true)
on conflict (id) do update set public=true;

create policy "ecg_storage_admin_insert" on storage.objects for insert to authenticated
with check (bucket_id='ecgs' and public.is_admin());
create policy "ecg_storage_admin_update" on storage.objects for update to authenticated
using (bucket_id='ecgs' and public.is_admin())
with check (bucket_id='ecgs' and public.is_admin());
create policy "ecg_storage_admin_delete" on storage.objects for delete to authenticated
using (bucket_id='ecgs' and public.is_admin());
