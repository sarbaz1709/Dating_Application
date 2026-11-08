-- Run with `npm run db:test` (requires `npm run db:start`).
begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

-- Users: ...0a = adult who attested, ...0b = second adult (tests cross-account isolation).

-- 1-3: sign-ups without the attestation are rejected -------------------------------------------

select throws_ok(
  $$ insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
     values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000000',
             'authenticated', 'authenticated', 'no-metadata@example.com', '{}'::jsonb) $$,
  '23514',
  null,
  'sign-up without the 18+ attestation is rejected'
);

select throws_ok(
  $$ insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
     values ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-000000000000',
             'authenticated', 'authenticated', 'false@example.com',
             '{"age_attested_18_plus": false}'::jsonb) $$,
  '23514',
  null,
  'sign-up with age_attested_18_plus = false is rejected'
);

select throws_ok(
  $$ insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
     values ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-000000000000',
             'authenticated', 'authenticated', 'string@example.com',
             '{"age_attested_18_plus": "yes"}'::jsonb) $$,
  '23514',
  null,
  'sign-up with a non-boolean attestation is rejected'
);

-- 4-5: a valid sign-up succeeds and records the consent -----------------------------------------

select lives_ok(
  $$ insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
     values
       ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'a@example.com', '{"age_attested_18_plus": true}'::jsonb),
       ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'b@example.com', '{"age_attested_18_plus": true}'::jsonb) $$,
  'sign-up with the 18+ attestation succeeds'
);

select results_eq(
  $$ select consent_type, policy_version from public.user_consents
     where user_id = '00000000-0000-0000-0000-00000000000a' $$,
  $$ values ('age_18_plus'::text, '2026-11-v1'::text) $$,
  'the attestation is recorded in user_consents'
);

-- 6-9: RLS, as user a ----------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select results_eq(
  $$ select user_id from public.user_consents $$,
  $$ values ('00000000-0000-0000-0000-00000000000a'::uuid) $$,
  'a user can read only their own consent records'
);

select throws_ok(
  $$ insert into public.user_consents (user_id, consent_type, policy_version)
     values ('00000000-0000-0000-0000-00000000000a', 'age_18_plus', 'forged') $$,
  '42501',
  null,
  'a user cannot insert consent records directly'
);

select throws_ok(
  $$ update public.user_consents set withdrawn_at = now() $$,
  '42501',
  null,
  'a user cannot modify consent records'
);

select throws_ok(
  $$ delete from public.user_consents $$,
  '42501',
  null,
  'a user cannot delete consent records'
);

-- 10: anon cannot read consents ------------------------------------------------------------------

reset role;
set local role anon;

select throws_ok(
  $$ select * from public.user_consents $$,
  '42501',
  null,
  'anonymous clients cannot read consent records'
);

-- 11: deleting the account removes its consent records ------------------------------------------

reset role;
delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';

select is_empty(
  $$ select 1 from public.user_consents where user_id = '00000000-0000-0000-0000-00000000000a' $$,
  'deleting an account cascades to its consent records'
);

select * from finish();

rollback;
