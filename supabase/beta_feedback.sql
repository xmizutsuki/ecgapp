-- ECG Lab beta feedback collection.
-- Safe to run more than once. Feedback contains only user-entered text and
-- non-sensitive client metadata; authentication tokens and email are not stored.

create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('bug','visual','performance','content','other')),
  description text not null check (char_length(description) between 1 and 4000),
  page text,
  app_version text,
  language text,
  user_agent text,
  platform text,
  viewport jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new','reviewing','resolved','closed')),
  created_at timestamptz not null default now()
);

alter table public.beta_feedback enable row level security;

create index if not exists beta_feedback_user_created_idx
  on public.beta_feedback(user_id, created_at desc);
create index if not exists beta_feedback_status_created_idx
  on public.beta_feedback(status, created_at desc);

drop policy if exists "beta_feedback_insert_own" on public.beta_feedback;
create policy "beta_feedback_insert_own"
  on public.beta_feedback
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "beta_feedback_select_own" on public.beta_feedback;
create policy "beta_feedback_select_own"
  on public.beta_feedback
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Administrative review is intentionally delegated to the existing admin model.
-- Do not grant anonymous read/write access to this table.
