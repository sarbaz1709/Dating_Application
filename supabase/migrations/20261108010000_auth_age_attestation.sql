-- MVP feature 1 (Auth): the "I'm 18+" sign-up checkbox.
--
-- The app sends `age_attested_18_plus: true` in the sign-up user metadata. This migration makes
-- that attestation mandatory on the server, so a modified client cannot create an account
-- without it, and records it in `user_consents` (spec section 7.1) as an auditable row.
--
-- Note: this is a self-attestation, not age verification. Robust age assurance must be reviewed
-- before production (spec section 14.1).

-- ---------------------------------------------------------------------------------------------
-- user_consents
-- ---------------------------------------------------------------------------------------------

create table public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  consent_type text not null,
  policy_version text not null,
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  constraint user_consents_consent_type_check check (consent_type in ('age_18_plus')),
  constraint user_consents_user_type_version_key unique (user_id, consent_type, policy_version)
);

comment on table public.user_consents is
  'Policy acknowledgements and permissions granted by a user. Written only by trusted backend code.';

-- The unique constraint's index (user_id, ...) already serves lookups by user_id.

alter table public.user_consents enable row level security;

-- Users may read their own consent records. There are deliberately no insert/update/delete
-- policies: rows are written by the trigger below (security definer) or other backend code.
create policy "Users can read their own consents"
  on public.user_consents
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Defence in depth on top of RLS: the API roles never write this table directly.
revoke all on table public.user_consents from anon;
revoke insert, update, delete, truncate, references, trigger on table public.user_consents
  from authenticated;
grant select on table public.user_consents to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Sign-up guard
-- ---------------------------------------------------------------------------------------------

-- Bump the policy_version literal below when the 18+ wording shown at sign-up changes materially.
create function public.handle_new_user_age_attestation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'age_attested_18_plus', '') <> 'true' then
    raise exception 'AGE_ATTESTATION_REQUIRED: you must confirm you are 18 or older'
      using errcode = 'check_violation';
  end if;

  insert into public.user_consents (user_id, consent_type, policy_version)
  values (new.id, 'age_18_plus', '2026-11-v1');

  return new;
end;
$$;

comment on function public.handle_new_user_age_attestation() is
  'Rejects sign-ups without the 18+ attestation and records the attestation in user_consents.';

-- Trigger functions cannot be invoked over the API, but keep the surface explicit.
revoke execute on function public.handle_new_user_age_attestation() from public, anon, authenticated;

-- AFTER INSERT so the user row exists for the foreign key. Raising here rolls back the insert,
-- so the account is never created. Accounts created any other way (dashboard, admin API, future
-- OAuth providers) must also carry the attestation in their user metadata.
create trigger on_auth_user_created_age_attestation
  after insert on auth.users
  for each row
  execute function public.handle_new_user_age_attestation();
