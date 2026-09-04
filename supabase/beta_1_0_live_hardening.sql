-- ECG Lab Beta 1.0 — production hardening.
-- Incremental and idempotent for the current live schema.

-- Trigger-only function: clients do not need RPC execute permission.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- The legacy admin helper is not part of the public Beta 1.0 rollout and no live
-- RLS policy currently depends on client-side execution of this function.
revoke execute on function public.is_admin() from public, anon, authenticated;

-- Cover foreign keys reported by the Supabase performance advisor.
create index if not exists user_case_progress_case_study_idx
  on public.user_case_progress(case_study_id);

create index if not exists user_question_answers_selected_option_idx
  on public.user_question_answers(selected_option_id);
