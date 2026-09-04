-- ECG Lab — bridge for the CURRENT Supabase project created manually in the dashboard.
--
-- Purpose:
--   Keep the schema already created for profiles/questions/practice_sessions/case studies,
--   while adding the cloud-sync tables expected by the current static GitHub Pages app.
--
-- IMPORTANT:
--   Do NOT run supabase/schema.sql on this project: that older schema defines a different
--   questions table. Run this bridge instead.
--
-- Safe to re-run. It does not drop the manually-created educational tables.

create extension if not exists pgcrypto;

-- ============================================================
-- 1) PROFILE COMPATIBILITY + SAFE ADMIN ROLE
-- ============================================================

alter table public.profiles
  add column if not exists role text;

update public.profiles
set role = 'student'
where role is null;

alter table public.profiles
  alter column role set default 'student';

alter table public.profiles
  alter column role set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('student','admin'));
  end if;
end $$;

-- Prevent a normal browser client from promoting itself to admin.
revoke update on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name, preferred_language, avatar_url) on table public.profiles to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ============================================================
-- 2) LEGACY SUMMARY TABLES USED BY app.js
-- ============================================================

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

create index if not exists external_user_answers_user_idx
  on public.external_user_answers(user_id, answered_at desc);

alter table public.user_progress enable row level security;
alter table public.external_user_answers enable row level security;

revoke all on table public.user_progress, public.external_user_answers from anon, authenticated;
grant select, insert, update on table public.user_progress to authenticated;
grant select, insert on table public.external_user_answers to authenticated;
grant usage, select on sequence public.external_user_answers_id_seq to authenticated;

drop policy if exists "progress_select_own" on public.user_progress;
drop policy if exists "progress_insert_own" on public.user_progress;
drop policy if exists "progress_update_own" on public.user_progress;
create policy "progress_select_own" on public.user_progress
for select to authenticated using ((select auth.uid()) = user_id);
create policy "progress_insert_own" on public.user_progress
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "progress_update_own" on public.user_progress
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "external_answers_select_own" on public.external_user_answers;
drop policy if exists "external_answers_insert_own" on public.external_user_answers;
create policy "external_answers_select_own" on public.external_user_answers
for select to authenticated using ((select auth.uid()) = user_id);
create policy "external_answers_insert_own" on public.external_user_answers
for insert to authenticated with check ((select auth.uid()) = user_id);

-- Ensure future signups get both a profile and progress row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    )
  )
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
for each row execute function public.handle_new_user();

-- ============================================================
-- 3) CAT / ADAPTIVE TRAINING CLOUD SYNC
-- ============================================================

create table if not exists public.training_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  language text not null default 'pt-BR' check (language in ('pt-BR','en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  total_questions integer not null check (total_questions between 20 and 80),
  current_question_index integer not null default 0,
  current_question_id text,
  correct_answers integer not null default 0,
  incorrect_answers integer not null default 0,
  score_percentage numeric(5,2),
  elapsed_time integer not null default 0,
  ability_start numeric(6,3) not null default 3,
  ability_current numeric(6,3) not null default 3,
  state_snapshot jsonb not null default '{}'::jsonb
);

create table if not exists public.training_session_answers (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.training_sessions(id) on delete cascade,
  question_id text not null,
  sequence integer not null,
  selected_answer integer,
  correct_answer integer,
  is_correct boolean,
  response_time integer not null default 0,
  difficulty numeric(6,3) not null,
  ability_before numeric(6,3) not null,
  ability_after numeric(6,3) not null,
  category text,
  subcategory text,
  answered_at timestamptz,
  item_snapshot jsonb not null default '{}'::jsonb,
  unique (session_id, question_id)
);

create index if not exists training_sessions_user_updated_idx
  on public.training_sessions(user_id, updated_at desc);
create index if not exists training_sessions_user_status_idx
  on public.training_sessions(user_id, status, updated_at desc);
create index if not exists training_answers_session_idx
  on public.training_session_answers(session_id, sequence);

alter table public.training_sessions enable row level security;
alter table public.training_session_answers enable row level security;

revoke all on table public.training_sessions, public.training_session_answers from anon, authenticated;
grant select, insert, update on table public.training_sessions, public.training_session_answers to authenticated;
grant usage, select on sequence public.training_session_answers_id_seq to authenticated;

drop policy if exists "training_sessions_select_own" on public.training_sessions;
drop policy if exists "training_sessions_insert_own" on public.training_sessions;
drop policy if exists "training_sessions_update_own" on public.training_sessions;
create policy "training_sessions_select_own" on public.training_sessions
for select to authenticated using ((select auth.uid()) = user_id);
create policy "training_sessions_insert_own" on public.training_sessions
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "training_sessions_update_own" on public.training_sessions
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "training_answers_select_own" on public.training_session_answers;
drop policy if exists "training_answers_insert_own" on public.training_session_answers;
drop policy if exists "training_answers_update_own" on public.training_session_answers;
create policy "training_answers_select_own" on public.training_session_answers
for select to authenticated
using (exists (
  select 1 from public.training_sessions s
  where s.id = session_id
    and s.user_id = (select auth.uid())
));
create policy "training_answers_insert_own" on public.training_session_answers
for insert to authenticated
with check (exists (
  select 1 from public.training_sessions s
  where s.id = session_id
    and s.user_id = (select auth.uid())
));
create policy "training_answers_update_own" on public.training_session_answers
for update to authenticated
using (exists (
  select 1 from public.training_sessions s
  where s.id = session_id
    and s.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.training_sessions s
  where s.id = session_id
    and s.user_id = (select auth.uid())
));

-- ============================================================
-- 4) PRACTICE EXAM / SIMULATION CLOUD SYNC
-- ============================================================

create table if not exists public.simulations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  language text not null default 'pt-BR' check (language in ('pt-BR','en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  total_questions integer not null check (total_questions between 1 and 200),
  current_question_index integer not null default 0,
  question_ids jsonb not null default '[]'::jsonb,
  flagged_question_ids jsonb not null default '[]'::jsonb,
  correct_answers integer not null default 0,
  incorrect_answers integer not null default 0,
  unanswered_questions integer not null default 0,
  score_percentage numeric(5,2),
  elapsed_time integer not null default 0,
  average_time_per_question numeric(10,2)
);

create table if not exists public.simulation_answers (
  id bigint generated always as identity primary key,
  simulation_id uuid not null references public.simulations(id) on delete cascade,
  question_id text not null,
  selected_answer integer,
  is_correct boolean,
  is_flagged boolean not null default false,
  answered_at timestamptz,
  response_time integer not null default 0,
  question_snapshot jsonb,
  unique (simulation_id, question_id)
);

-- Compatibility with the simpler fallback simulator still present in app.js.
create table if not exists public.simulation_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  total_questions integer not null,
  correct_answers integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists simulations_user_updated_idx
  on public.simulations(user_id, updated_at desc);
create index if not exists simulations_user_status_idx
  on public.simulations(user_id, status, updated_at desc);
create index if not exists simulation_answers_sim_idx
  on public.simulation_answers(simulation_id);
create index if not exists simulation_attempts_user_idx
  on public.simulation_attempts(user_id, started_at desc);

alter table public.simulations enable row level security;
alter table public.simulation_answers enable row level security;
alter table public.simulation_attempts enable row level security;

revoke all on table public.simulations, public.simulation_answers, public.simulation_attempts from anon, authenticated;
grant select, insert, update on table public.simulations, public.simulation_answers, public.simulation_attempts to authenticated;
grant usage, select on sequence public.simulation_answers_id_seq to authenticated;

drop policy if exists "simulations_select_own" on public.simulations;
drop policy if exists "simulations_insert_own" on public.simulations;
drop policy if exists "simulations_update_own" on public.simulations;
create policy "simulations_select_own" on public.simulations
for select to authenticated using ((select auth.uid()) = user_id);
create policy "simulations_insert_own" on public.simulations
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "simulations_update_own" on public.simulations
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "simulation_answers_select_own" on public.simulation_answers;
drop policy if exists "simulation_answers_insert_own" on public.simulation_answers;
drop policy if exists "simulation_answers_update_own" on public.simulation_answers;
create policy "simulation_answers_select_own" on public.simulation_answers
for select to authenticated
using (exists (
  select 1 from public.simulations s
  where s.id = simulation_id
    and s.user_id = (select auth.uid())
));
create policy "simulation_answers_insert_own" on public.simulation_answers
for insert to authenticated
with check (exists (
  select 1 from public.simulations s
  where s.id = simulation_id
    and s.user_id = (select auth.uid())
));
create policy "simulation_answers_update_own" on public.simulation_answers
for update to authenticated
using (exists (
  select 1 from public.simulations s
  where s.id = simulation_id
    and s.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.simulations s
  where s.id = simulation_id
    and s.user_id = (select auth.uid())
));

drop policy if exists "simulation_attempts_select_own" on public.simulation_attempts;
drop policy if exists "simulation_attempts_insert_own" on public.simulation_attempts;
drop policy if exists "simulation_attempts_update_own" on public.simulation_attempts;
create policy "simulation_attempts_select_own" on public.simulation_attempts
for select to authenticated using ((select auth.uid()) = user_id);
create policy "simulation_attempts_insert_own" on public.simulation_attempts
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "simulation_attempts_update_own" on public.simulation_attempts
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- ============================================================
-- 5) MY PERFORMANCE CLOUD SYNC
-- ============================================================

create table if not exists public.learning_events (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id text,
  activity_type text not null check (activity_type in ('quick_training','simulation','clinical_case')),
  question_id text,
  case_id text,
  topic text,
  subtopic text,
  competency text,
  difficulty numeric(6,3),
  correct boolean,
  score numeric(6,2) check (score is null or (score between 0 and 100)),
  response_time integer not null default 0 check (response_time >= 0),
  attempt_number integer not null default 1 check (attempt_number >= 1),
  answered_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_performance (
  user_id uuid primary key references auth.users(id) on delete cascade,
  overall_accuracy numeric(6,2),
  mastery_score numeric(6,2),
  quick_training_score numeric(6,2),
  simulation_score numeric(6,2),
  clinical_case_score numeric(6,2),
  progression_score numeric(6,2),
  total_questions integer not null default 0,
  total_cases integer not null default 0,
  total_simulations integer not null default 0,
  study_time integer not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  confidence text not null default 'low' check (confidence in ('low','medium','high')),
  updated_at timestamptz not null default now()
);

create table if not exists public.competency_performance (
  user_id uuid not null references auth.users(id) on delete cascade,
  competency text not null,
  topic text,
  attempts integer not null default 0,
  correct_answers integer not null default 0,
  mastery_score numeric(6,2),
  average_response_time numeric(10,2),
  last_answered_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, competency)
);

create table if not exists public.performance_snapshots (
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null,
  mastery_score numeric(6,2),
  simulation_score numeric(6,2),
  training_score numeric(6,2),
  clinical_case_score numeric(6,2),
  created_at timestamptz not null default now(),
  primary key (user_id, snapshot_date)
);

create table if not exists public.user_xp (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level between 1 and 10),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_performance_insights (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  language text not null default 'pt-BR' check (language in ('pt-BR','en')),
  input_snapshot jsonb not null default '{}'::jsonb,
  summary text not null,
  recommendations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists learning_events_user_time_idx
  on public.learning_events(user_id, answered_at desc);
create index if not exists learning_events_user_type_idx
  on public.learning_events(user_id, activity_type, answered_at desc);
create index if not exists performance_snapshots_user_date_idx
  on public.performance_snapshots(user_id, snapshot_date desc);
create index if not exists ai_performance_insights_user_idx
  on public.ai_performance_insights(user_id, created_at desc);

alter table public.learning_events enable row level security;
alter table public.user_performance enable row level security;
alter table public.competency_performance enable row level security;
alter table public.performance_snapshots enable row level security;
alter table public.user_xp enable row level security;
alter table public.ai_performance_insights enable row level security;

grant select, insert, update on table public.learning_events, public.user_performance,
  public.competency_performance, public.performance_snapshots, public.user_xp to authenticated;
grant select, insert on table public.ai_performance_insights to authenticated;
grant usage, select on sequence public.ai_performance_insights_id_seq to authenticated;

drop policy if exists "learning_events_select_own" on public.learning_events;
drop policy if exists "learning_events_insert_own" on public.learning_events;
drop policy if exists "learning_events_update_own" on public.learning_events;
create policy "learning_events_select_own" on public.learning_events
for select to authenticated using ((select auth.uid()) = user_id);
create policy "learning_events_insert_own" on public.learning_events
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "learning_events_update_own" on public.learning_events
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "user_performance_select_own" on public.user_performance;
drop policy if exists "user_performance_insert_own" on public.user_performance;
drop policy if exists "user_performance_update_own" on public.user_performance;
create policy "user_performance_select_own" on public.user_performance
for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_performance_insert_own" on public.user_performance
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_performance_update_own" on public.user_performance
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "competency_performance_select_own" on public.competency_performance;
drop policy if exists "competency_performance_insert_own" on public.competency_performance;
drop policy if exists "competency_performance_update_own" on public.competency_performance;
create policy "competency_performance_select_own" on public.competency_performance
for select to authenticated using ((select auth.uid()) = user_id);
create policy "competency_performance_insert_own" on public.competency_performance
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "competency_performance_update_own" on public.competency_performance
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "performance_snapshots_select_own" on public.performance_snapshots;
drop policy if exists "performance_snapshots_insert_own" on public.performance_snapshots;
drop policy if exists "performance_snapshots_update_own" on public.performance_snapshots;
create policy "performance_snapshots_select_own" on public.performance_snapshots
for select to authenticated using ((select auth.uid()) = user_id);
create policy "performance_snapshots_insert_own" on public.performance_snapshots
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "performance_snapshots_update_own" on public.performance_snapshots
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "user_xp_select_own" on public.user_xp;
drop policy if exists "user_xp_insert_own" on public.user_xp;
drop policy if exists "user_xp_update_own" on public.user_xp;
create policy "user_xp_select_own" on public.user_xp
for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_xp_insert_own" on public.user_xp
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_xp_update_own" on public.user_xp
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "ai_performance_insights_select_own" on public.ai_performance_insights;
drop policy if exists "ai_performance_insights_insert_own" on public.ai_performance_insights;
create policy "ai_performance_insights_select_own" on public.ai_performance_insights
for select to authenticated using ((select auth.uid()) = user_id);
create policy "ai_performance_insights_insert_own" on public.ai_performance_insights
for insert to authenticated with check ((select auth.uid()) = user_id);

-- ============================================================
-- DONE
-- ============================================================
-- After this script:
--   1. Configure config.js with SUPABASE_URL + publishable key.
--   2. Add GitHub Pages URL to Auth > URL Configuration.
--   3. Test signup/login and cross-device CAT/simulation history.
