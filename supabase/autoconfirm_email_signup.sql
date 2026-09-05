-- ECG Lab — auto-confirm email/password signups.
--
-- Product decision: new email/password accounts are immediately confirmed and do
-- not require a confirmation link. This intentionally removes proof-of-ownership
-- verification for the signup email, so it should only remain enabled while that
-- tradeoff is acceptable for the application.
--
-- Supabase Auth reloads auth.users after insert before deciding whether to send a
-- confirmation email. A BEFORE INSERT trigger therefore lets the normal signUp()
-- flow return an authenticated session without sending the confirmation message.
-- Invitations are excluded, as are OAuth/passwordless identities.

create or replace function public.ecg_autoconfirm_email_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null
     and coalesce(new.encrypted_password, '') <> ''
     and new.email_confirmed_at is null
     and new.invited_at is null
     and coalesce(new.raw_app_meta_data ->> 'provider', '') = 'email'
  then
    new.email_confirmed_at := now();
    new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('email_verified', true);
  end if;

  return new;
end;
$$;

revoke all on function public.ecg_autoconfirm_email_signup() from public, anon, authenticated;

drop trigger if exists ecg_autoconfirm_email_signup on auth.users;
create trigger ecg_autoconfirm_email_signup
before insert on auth.users
for each row execute function public.ecg_autoconfirm_email_signup();

-- Rollback, if email verification is required again:
-- drop trigger if exists ecg_autoconfirm_email_signup on auth.users;
-- drop function if exists public.ecg_autoconfirm_email_signup();
