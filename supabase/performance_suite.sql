-- ECG Lab — Meu Desempenho / My Performance
-- Run after schema.sql, training_suite.sql and simulation_suite.sql.
-- Objective statistics are calculated by the application/backend; AI insights are stored separately.

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

create index if not exists learning_events_user_time_idx on public.learning_events(user_id, answered_at desc);
create index if not exists learning_events_user_type_idx on public.learning_events(user_id, activity_type, answered_at desc);
create index if not exists learning_events_user_competency_idx on public.learning_events(user_id, competency, answered_at desc);

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

create index if not exists performance_snapshots_user_date_idx on public.performance_snapshots(user_id, snapshot_date desc);
create index if not exists ai_performance_insights_user_idx on public.ai_performance_insights(user_id, created_at desc);

alter table public.learning_events enable row level security;
alter table public.user_performance enable row level security;
alter table public.competency_performance enable row level security;
alter table public.performance_snapshots enable row level security;
alter table public.user_xp enable row level security;
alter table public.ai_performance_insights enable row level security;

grant select, insert, update on public.learning_events, public.user_performance, public.competency_performance, public.performance_snapshots, public.user_xp to authenticated;
grant select, insert on public.ai_performance_insights to authenticated;
grant usage, select on sequence public.ai_performance_insights_id_seq to authenticated;

-- learning_events
create policy "learning_events_select_own" on public.learning_events for select to authenticated using ((select auth.uid()) = user_id);
create policy "learning_events_insert_own" on public.learning_events for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "learning_events_update_own" on public.learning_events for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- user_performance
create policy "user_performance_select_own" on public.user_performance for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_performance_insert_own" on public.user_performance for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_performance_update_own" on public.user_performance for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- competency_performance
create policy "competency_performance_select_own" on public.competency_performance for select to authenticated using ((select auth.uid()) = user_id);
create policy "competency_performance_insert_own" on public.competency_performance for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "competency_performance_update_own" on public.competency_performance for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- performance_snapshots
create policy "performance_snapshots_select_own" on public.performance_snapshots for select to authenticated using ((select auth.uid()) = user_id);
create policy "performance_snapshots_insert_own" on public.performance_snapshots for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "performance_snapshots_update_own" on public.performance_snapshots for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- user_xp
create policy "user_xp_select_own" on public.user_xp for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_xp_insert_own" on public.user_xp for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_xp_update_own" on public.user_xp for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- AI insights
create policy "ai_performance_insights_select_own" on public.ai_performance_insights for select to authenticated using ((select auth.uid()) = user_id);
create policy "ai_performance_insights_insert_own" on public.ai_performance_insights for insert to authenticated with check ((select auth.uid()) = user_id);
