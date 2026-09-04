-- ECG Lab — persistent practice exam storage.
-- Run after schema.sql when enabling authenticated, cross-device simulation sync.

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

create index if not exists simulations_user_updated_idx on public.simulations(user_id, updated_at desc);
create index if not exists simulations_user_status_idx on public.simulations(user_id, status, updated_at desc);
create index if not exists simulation_answers_sim_idx on public.simulation_answers(simulation_id);

alter table public.simulations enable row level security;
alter table public.simulation_answers enable row level security;

revoke all on table public.simulations, public.simulation_answers from anon, authenticated;
grant select, insert, update on public.simulations, public.simulation_answers to authenticated;
grant usage, select on sequence public.simulation_answers_id_seq to authenticated;

drop policy if exists "simulations_select_own" on public.simulations;
drop policy if exists "simulations_insert_own" on public.simulations;
drop policy if exists "simulations_update_own" on public.simulations;
create policy "simulations_select_own" on public.simulations for select to authenticated
using ((select auth.uid()) = user_id);
create policy "simulations_insert_own" on public.simulations for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "simulations_update_own" on public.simulations for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "simulation_answers_select_own" on public.simulation_answers;
drop policy if exists "simulation_answers_insert_own" on public.simulation_answers;
drop policy if exists "simulation_answers_update_own" on public.simulation_answers;
create policy "simulation_answers_select_own" on public.simulation_answers for select to authenticated
using (exists (
  select 1 from public.simulations s
  where s.id = simulation_id and s.user_id = (select auth.uid())
));
create policy "simulation_answers_insert_own" on public.simulation_answers for insert to authenticated
with check (exists (
  select 1 from public.simulations s
  where s.id = simulation_id and s.user_id = (select auth.uid())
));
create policy "simulation_answers_update_own" on public.simulation_answers for update to authenticated
using (exists (
  select 1 from public.simulations s
  where s.id = simulation_id and s.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.simulations s
  where s.id = simulation_id and s.user_id = (select auth.uid())
));
