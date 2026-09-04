-- ECG Lab — persistent adaptive CAT training storage.
-- Run after schema.sql when enabling authenticated, cross-device training sync.

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

create index if not exists training_sessions_user_updated_idx on public.training_sessions(user_id, updated_at desc);
create index if not exists training_sessions_user_status_idx on public.training_sessions(user_id, status, updated_at desc);
create index if not exists training_answers_session_idx on public.training_session_answers(session_id, sequence);
create index if not exists training_answers_category_idx on public.training_session_answers(category);

alter table public.training_sessions enable row level security;
alter table public.training_session_answers enable row level security;

revoke all on table public.training_sessions, public.training_session_answers from anon, authenticated;
grant select, insert, update on public.training_sessions, public.training_session_answers to authenticated;
grant usage, select on sequence public.training_session_answers_id_seq to authenticated;

drop policy if exists "training_sessions_select_own" on public.training_sessions;
drop policy if exists "training_sessions_insert_own" on public.training_sessions;
drop policy if exists "training_sessions_update_own" on public.training_sessions;
create policy "training_sessions_select_own" on public.training_sessions for select to authenticated
using ((select auth.uid()) = user_id);
create policy "training_sessions_insert_own" on public.training_sessions for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "training_sessions_update_own" on public.training_sessions for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "training_answers_select_own" on public.training_session_answers;
drop policy if exists "training_answers_insert_own" on public.training_session_answers;
drop policy if exists "training_answers_update_own" on public.training_session_answers;
create policy "training_answers_select_own" on public.training_session_answers for select to authenticated
using (exists (
  select 1 from public.training_sessions s
  where s.id = session_id and s.user_id = (select auth.uid())
));
create policy "training_answers_insert_own" on public.training_session_answers for insert to authenticated
with check (exists (
  select 1 from public.training_sessions s
  where s.id = session_id and s.user_id = (select auth.uid())
));
create policy "training_answers_update_own" on public.training_session_answers for update to authenticated
using (exists (
  select 1 from public.training_sessions s
  where s.id = session_id and s.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.training_sessions s
  where s.id = session_id and s.user_id = (select auth.uid())
));