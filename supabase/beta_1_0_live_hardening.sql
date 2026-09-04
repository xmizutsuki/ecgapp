-- ECG Lab Beta 1.0 — production hardening.
-- Incremental and idempotent for the current live schema.

-- Trigger-only function: clients do not need RPC execute permission.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Admin helper may be used by authenticated policies, but never by anonymous clients.
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Cover foreign keys reported by the Supabase performance advisor.
create index if not exists user_case_progress_case_study_idx
  on public.user_case_progress(case_study_id);

create index if not exists user_question_answers_selected_option_idx
  on public.user_question_answers(selected_option_id);
