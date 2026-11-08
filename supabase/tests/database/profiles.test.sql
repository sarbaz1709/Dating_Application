-- Run with `npm run db:test` (requires `npm run db:start`).
begin;

create extension if not exists pgtap with schema extensions;

select plan(34);

-- Two adults (the sign-up trigger requires the 18+ attestation).
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ana@example.com', '{"age_attested_18_plus": true}'::jsonb),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ben@example.com', '{"age_attested_18_plus": true}'::jsonb);

-- =============================================================================================
-- As Ana
-- =============================================================================================
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';

-- 1
select is(
  (public.get_my_profile() ->> 'is_complete')::boolean,
  false,
  'a new user has an empty, incomplete profile'
);

-- 2-6: validation
select throws_ok(
  $$ select public.save_my_profile('Ana', '', 'woman', array['man']) $$,
  '22023', 'BIRTHDAY_REQUIRED', 'the first save requires a birthday'
);
select throws_ok(
  $$ select public.save_my_profile('Ana', '', 'woman', array['man'],
       (current_date - interval '17 years')::date) $$,
  '22023', 'UNDERAGE', 'a birthday under 18 is rejected'
);
select throws_ok(
  $$ select public.save_my_profile('Ana 2', '', 'woman', array['man'], '1995-06-15') $$,
  '22023', 'INVALID_NAME', 'names cannot contain digits'
);
select throws_ok(
  $$ select public.save_my_profile('Ana', '', 'robot', array['man'], '1995-06-15') $$,
  '22023', 'INVALID_GENDER', 'gender must be one of the supported values'
);
select throws_ok(
  $$ select public.save_my_profile('Ana', '', 'woman', array[]::text[], '1995-06-15') $$,
  '22023', 'INVALID_INTERESTS', 'at least one preference is required'
);

-- 7-10: a valid save
select lives_ok(
  $$ select public.save_my_profile('  Ana  ', ' Loves long calls. ', 'woman',
       array['man', 'woman', 'man'], '1995-06-15') $$,
  'a valid profile saves'
);
select is(
  public.get_my_profile() ->> 'display_name',
  'Ana',
  'the name is trimmed'
);
select is(
  (select interested_in from public.user_private_settings),
  array['man', 'woman']::text[],
  'preferences are de-duplicated and sorted'
);
select is(
  (public.get_my_profile() ->> 'is_complete')::boolean,
  false,
  'a profile without photos is not complete'
);

-- 11-12: birthday lock and versioning
select throws_ok(
  $$ select public.save_my_profile('Ana', '', 'woman', array['man'], '1990-01-01') $$,
  '22023', 'BIRTHDAY_LOCKED', 'the birthday cannot be changed once set'
);
select public.save_my_profile('Ana', 'New bio', 'woman', array['man']);
select is(
  (public.get_my_profile() ->> 'profile_version')::int,
  2,
  'changing the bio bumps profile_version'
);

-- 13: storage policies allow uploads into your own folder
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values
       ('profile-photos', '00000000-0000-0000-0000-0000000000a1/photo-one.jpg', '00000000-0000-0000-0000-0000000000a1'),
       ('profile-photos', '00000000-0000-0000-0000-0000000000a1/photo-two.jpg', '00000000-0000-0000-0000-0000000000a1'),
       ('profile-photos', '00000000-0000-0000-0000-0000000000a1/photo-three.jpg', '00000000-0000-0000-0000-0000000000a1'),
       ('profile-photos', '00000000-0000-0000-0000-0000000000a1/photo-four.jpg', '00000000-0000-0000-0000-0000000000a1'),
       ('profile-photos', '00000000-0000-0000-0000-0000000000a1/photo-five.jpg', '00000000-0000-0000-0000-0000000000a1') $$,
  'a user can upload into their own photo folder'
);

-- 14-15: photo path validation
select throws_ok(
  $$ select public.add_profile_photo('00000000-0000-0000-0000-0000000000b2/photo-one.jpg') $$,
  '22023', 'INVALID_PHOTO_PATH', 'a photo outside your own folder is rejected'
);
select throws_ok(
  $$ select public.add_profile_photo('00000000-0000-0000-0000-0000000000a1/not-uploaded.jpg') $$,
  '22023', 'PHOTO_NOT_UPLOADED', 'a photo that was never uploaded is rejected'
);

-- 16-17: the first photo completes the profile
select lives_ok(
  $$ select public.add_profile_photo('00000000-0000-0000-0000-0000000000a1/photo-one.jpg') $$,
  'an uploaded photo can be added'
);
select is(
  (public.get_my_profile() ->> 'is_complete')::boolean,
  true,
  'name + settings + one photo completes the profile'
);

-- 18-19: up to four photos
select public.add_profile_photo('00000000-0000-0000-0000-0000000000a1/photo-two.jpg');
select public.add_profile_photo('00000000-0000-0000-0000-0000000000a1/photo-three.jpg');
select public.add_profile_photo('00000000-0000-0000-0000-0000000000a1/photo-four.jpg');
select is(
  (select array_agg(display_order order by display_order) from public.profile_photos),
  array[0, 1, 2, 3]::smallint[],
  'photos are numbered 0 to 3'
);
select throws_ok(
  $$ select public.add_profile_photo('00000000-0000-0000-0000-0000000000a1/photo-five.jpg') $$,
  '22023', 'PHOTO_LIMIT', 'a fifth photo is rejected'
);

-- 20-21: make main
select public.set_primary_profile_photo(
  (select id from public.profile_photos where storage_path like '%photo-three.jpg')
);
select is(
  (select array_agg(split_part(storage_path, '/', 2) order by display_order) from public.profile_photos),
  array['photo-three.jpg', 'photo-one.jpg', 'photo-two.jpg', 'photo-four.jpg'],
  'making a photo the main one moves it first and shifts the rest'
);
select is(
  (select split_part(storage_path, '/', 2) from public.profile_photos where is_primary),
  'photo-three.jpg',
  'exactly the first photo is primary'
);

-- 22-23: remove and compact
select is(
  public.remove_profile_photo(
    (select id from public.profile_photos where storage_path like '%photo-one.jpg')
  ),
  '00000000-0000-0000-0000-0000000000a1/photo-one.jpg',
  'removing a photo returns its storage path for cleanup'
);
select is(
  (select array_agg(split_part(storage_path, '/', 2) order by display_order) from public.profile_photos),
  array['photo-three.jpg', 'photo-two.jpg', 'photo-four.jpg'],
  'remaining photos are renumbered without gaps'
);

-- 24: the last photo of a complete profile cannot be removed
select public.remove_profile_photo((select id from public.profile_photos where storage_path like '%photo-two.jpg'));
select public.remove_profile_photo((select id from public.profile_photos where storage_path like '%photo-four.jpg'));
select throws_ok(
  $$ select public.remove_profile_photo((select id from public.profile_photos limit 1)) $$,
  '22023', 'LAST_PHOTO', 'a complete profile keeps at least one photo'
);

-- 25-27: no direct writes
select throws_ok(
  $$ update public.profiles set is_complete = true $$,
  '42501', null, 'clients cannot write profiles directly'
);
select throws_ok(
  $$ update public.user_private_settings set date_of_birth = '2015-01-01' $$,
  '42501', null, 'clients cannot change their birthday directly'
);
select throws_ok(
  $$ delete from public.profile_photos $$,
  '42501', null, 'clients cannot delete photo rows directly'
);

-- =============================================================================================
-- As Ben: cannot see or touch Ana's data
-- =============================================================================================
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated"}';

-- 28
select is(
  (select count(*)::int from public.profiles)
    + (select count(*)::int from public.user_private_settings)
    + (select count(*)::int from public.profile_photos),
  0,
  'another user cannot read profiles, private settings or photos'
);

-- 29-30
select throws_ok(
  format(
    'select public.remove_profile_photo(%L)',
    (select id from public.profile_photos limit 1)
  ),
  '22023', 'PHOTO_NOT_FOUND', 'another user cannot remove your photo'
);
select is(
  (public.get_my_profile() ->> 'display_name'),
  null,
  'get_my_profile only ever returns the caller''s own data'
);

-- 31-32: storage isolation
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('profile-photos', '00000000-0000-0000-0000-0000000000a1/sneaky.jpg', '00000000-0000-0000-0000-0000000000b2') $$,
  '42501', null, 'a user cannot upload into someone else''s folder'
);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'profile-photos'),
  0,
  'a user cannot list someone else''s photo files'
);

-- =============================================================================================
-- Anonymous and cleanup
-- =============================================================================================
reset role;
set local role anon;

-- 33
select throws_ok(
  $$ select public.get_my_profile() $$,
  '42501', null, 'anonymous clients cannot call the profile API'
);

reset role;

-- 34
delete from auth.users where id = '00000000-0000-0000-0000-0000000000a1';
select is(
  (select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000a1')
    + (select count(*)::int from public.user_private_settings where user_id = '00000000-0000-0000-0000-0000000000a1')
    + (select count(*)::int from public.profile_photos where user_id = '00000000-0000-0000-0000-0000000000a1'),
  0,
  'deleting an account removes its profile, settings and photo rows'
);

select * from finish();

rollback;
