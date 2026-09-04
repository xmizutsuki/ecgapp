-- ECG Lab — Floating Tutor persistence and educational learning signals.
-- Tutor usage is intentionally stored separately from objective mastery calculations.

create table if not exists public.tutor_conversations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Tutor conversation',
  language text not null default 'pt-BR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_context jsonb not null default '{}'::jsonb
);

create table if not exists public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.tutor_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  context_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.tutor_learning_signals (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  help_type text not null,
  activity_type text not null,
  activity_id text,
  question_id text,
  topic text,
  category text,
  answer_submitted boolean not null default false,
  socratic boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists tutor_conversations_user_updated_idx on public.tutor_conversations(user_id,updated_at desc);
create index if not exists tutor_messages_user_created_idx on public.tutor_messages(user_id,created_at desc);
create index if not exists tutor_messages_conversation_idx on public.tutor_messages(conversation_id);
create index if not exists tutor_learning_signals_user_created_idx on public.tutor_learning_signals(user_id,created_at desc);
create index if not exists tutor_learning_signals_category_idx on public.tutor_learning_signals(user_id,category,created_at desc);

alter table public.tutor_conversations enable row level security;
alter table public.tutor_messages enable row level security;
alter table public.tutor_learning_signals enable row level security;

drop policy if exists "Users manage own tutor conversations" on public.tutor_conversations;
create policy "Users manage own tutor conversations" on public.tutor_conversations for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own tutor messages" on public.tutor_messages;
create policy "Users manage own tutor messages" on public.tutor_messages for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own tutor learning signals" on public.tutor_learning_signals;
create policy "Users manage own tutor learning signals" on public.tutor_learning_signals for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

comment on table public.tutor_learning_signals is 'Educational assistance metadata. Do not treat Tutor usage by itself as a negative mastery signal.';
comment on column public.tutor_learning_signals.answer_submitted is 'Whether the activity answer had already been submitted when assistance was requested.';
