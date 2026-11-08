-- MVP feature 2 (Profile): name, age, gender, who you want to see, short bio, up to 4 photos.
--
-- Design:
-- * `profiles` holds what other people will eventually see (name, bio). `user_private_settings`
--   holds sensitive data (birthday, gender, preferences) and is never exposed to other users;
--   discovery will compute eligibility server-side (spec sections 7.1 and 3.6).
-- * Clients can READ their own rows but never write these tables directly. Every write goes
--   through the security-definer functions below, which validate input and keep derived fields
--   (photo order, completeness, profile_version) consistent.
-- * Photos live in a PRIVATE storage bucket, each user in their own folder. Images are resized
--   and re-encoded to JPEG on the device (which also strips EXIF/GPS metadata) before upload.

-- ---------------------------------------------------------------------------------------------
-- Private helpers schema (not exposed through the API)
-- ---------------------------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  bio text not null default '',
  is_active boolean not null default true,
  -- Derived: has a name, private settings and at least one usable photo. Maintained by
  -- private.refresh_profile_completeness(); never written by clients.
  is_complete boolean not null default false,
  -- Bumped on every meaningful change; AI analyses and embeddings will be cached against it.
  profile_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_check check (
    display_name = btrim(display_name)
    and char_length(display_name) between 1 and 30
    and display_name !~ '[0-9[:cntrl:]]'
  ),
  constraint profiles_bio_check check (char_length(bio) <= 300)
);

comment on table public.profiles is
  'Public-facing profile fields. Written only through public.save_my_profile().';

create table public.user_private_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Set once at profile creation and locked afterwards. Never returned to other users.
  date_of_birth date not null,
  gender_identity text not null,
  -- Who this person wants to see. Same vocabulary as gender_identity.
  interested_in text[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_private_settings_gender_check check (
    gender_identity in ('woman', 'man', 'nonbinary')
  ),
  constraint user_private_settings_interested_in_check check (
    cardinality(interested_in) between 1 and 3
    and interested_in <@ array['woman', 'man', 'nonbinary']::text[]
  )
);

comment on table public.user_private_settings is
  'Sensitive profile data (birthday, gender, preferences). Owner-readable only.';

create table public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null unique,
  display_order smallint not null,
  -- The first photo is the main one; deriving it keeps exactly one primary photo per user.
  is_primary boolean generated always as (display_order = 0) stored,
  -- No moderation pipeline yet. 'unreviewed' photos are usable; 'rejected' ones will be hidden.
  moderation_status text not null default 'unreviewed',
  created_at timestamptz not null default now(),
  constraint profile_photos_display_order_check check (display_order between 0 and 3),
  constraint profile_photos_moderation_status_check check (
    moderation_status in ('unreviewed', 'approved', 'rejected')
  ),
  -- Deferrable so reordering can shuffle positions inside one transaction.
  constraint profile_photos_user_order_key unique (user_id, display_order)
    deferrable initially immediate
);

comment on table public.profile_photos is
  'Up to 4 photos per user, ordered. Written only through the photo functions below.';

-- ---------------------------------------------------------------------------------------------
-- Row level security: owners can read their own rows; nobody writes directly
-- ---------------------------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_private_settings enable row level security;
alter table public.profile_photos enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users can read their own private settings"
  on public.user_private_settings for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read their own photos"
  on public.profile_photos for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.profiles, public.user_private_settings, public.profile_photos
  from anon, authenticated;
grant select on table public.profiles, public.user_private_settings, public.profile_photos
  to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Photo storage bucket (private) and object policies
-- ---------------------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Objects are stored as "<user id>/<random>.jpg"; each user may only touch their own folder.
create policy "Users can upload profile photos to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can read profile photos in their own folder"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can delete profile photos in their own folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------------------------

create function private.require_user()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;
  return uid;
end;
$$;

create function private.refresh_profile_completeness(p_user_id uuid)
returns void
language sql
set search_path = ''
as $$
  update public.profiles p
  set is_complete = (
    exists (select 1 from public.user_private_settings s where s.user_id = p_user_id)
    and exists (
      select 1 from public.profile_photos ph
      where ph.user_id = p_user_id and ph.moderation_status <> 'rejected'
    )
  )
  where p.id = p_user_id;
$$;

create function private.bump_profile_version(p_user_id uuid)
returns void
language sql
set search_path = ''
as $$
  update public.profiles
  set profile_version = profile_version + 1, updated_at = now()
  where id = p_user_id;
$$;

-- Serialises photo changes per user so concurrent requests cannot collide on display_order.
create function private.lock_user_photos(p_user_id uuid)
returns void
language sql
set search_path = ''
as $$
  select pg_advisory_xact_lock(hashtextextended('profile_photos:' || p_user_id::text, 0));
$$;

-- Renumbers a user's photos 0..n-1, keeping their relative order.
create function private.compact_photo_order(p_user_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  set constraints public.profile_photos_user_order_key deferred;
  update public.profile_photos ph
  set display_order = ordered.new_order
  from (
    select id, (row_number() over (order by display_order) - 1)::smallint as new_order
    from public.profile_photos
    where user_id = p_user_id
  ) ordered
  where ph.id = ordered.id and ph.display_order <> ordered.new_order;
  set constraints public.profile_photos_user_order_key immediate;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- API: read
-- ---------------------------------------------------------------------------------------------

-- Everything the signed-in user needs to show and edit their own profile, in one round trip.
-- Security invoker: row level security limits it to the caller's own rows.
create function public.get_my_profile()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'display_name', p.display_name,
    'bio', p.bio,
    'is_complete', coalesce(p.is_complete, false),
    'profile_version', p.profile_version,
    'date_of_birth', s.date_of_birth,
    'age', case when s.date_of_birth is null then null
                else extract(year from age(current_date, s.date_of_birth))::int end,
    'gender', s.gender_identity,
    'interested_in', s.interested_in,
    'photos', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', ph.id,
          'storage_path', ph.storage_path,
          'display_order', ph.display_order,
          'is_primary', ph.is_primary,
          'moderation_status', ph.moderation_status
        )
        order by ph.display_order
      )
      from public.profile_photos ph
      where ph.user_id = auth.uid()
    ), '[]'::jsonb)
  )
  from (select auth.uid() as uid) me
  left join public.profiles p on p.id = me.uid
  left join public.user_private_settings s on s.user_id = me.uid
  where me.uid is not null;
$$;

-- ---------------------------------------------------------------------------------------------
-- API: write
-- ---------------------------------------------------------------------------------------------

-- Creates or updates the caller's profile. The birthday is required the first time and cannot be
-- changed afterwards. Raises a short machine-readable code (e.g. 'UNDERAGE') on invalid input.
create function public.save_my_profile(
  p_display_name text,
  p_bio text,
  p_gender text,
  p_interested_in text[],
  p_date_of_birth date default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  v_name text := btrim(coalesce(p_display_name, ''));
  v_bio text := btrim(coalesce(p_bio, ''));
  v_interests text[];
  v_existing_dob date;
  v_dob date;
begin
  if char_length(v_name) not between 1 and 30 or v_name ~ '[0-9[:cntrl:]]' then
    raise exception 'INVALID_NAME' using errcode = '22023';
  end if;

  if char_length(v_bio) > 300 then
    raise exception 'INVALID_BIO' using errcode = '22023';
  end if;

  if p_gender is null or p_gender not in ('woman', 'man', 'nonbinary') then
    raise exception 'INVALID_GENDER' using errcode = '22023';
  end if;

  select array_agg(distinct value order by value)
  into v_interests
  from unnest(coalesce(p_interested_in, '{}'::text[])) as value;

  if v_interests is null
    or not (v_interests <@ array['woman', 'man', 'nonbinary']::text[]) then
    raise exception 'INVALID_INTERESTS' using errcode = '22023';
  end if;

  select date_of_birth into v_existing_dob
  from public.user_private_settings
  where user_id = uid;

  if v_existing_dob is null then
    if p_date_of_birth is null then
      raise exception 'BIRTHDAY_REQUIRED' using errcode = '22023';
    end if;
    if p_date_of_birth > (current_date - interval '18 years')::date then
      raise exception 'UNDERAGE' using errcode = '22023';
    end if;
    if p_date_of_birth < (current_date - interval '100 years')::date then
      raise exception 'INVALID_BIRTHDAY' using errcode = '22023';
    end if;
    v_dob := p_date_of_birth;
  else
    if p_date_of_birth is not null and p_date_of_birth <> v_existing_dob then
      raise exception 'BIRTHDAY_LOCKED' using errcode = '22023';
    end if;
    v_dob := v_existing_dob;
  end if;

  insert into public.user_private_settings (user_id, date_of_birth, gender_identity, interested_in)
  values (uid, v_dob, p_gender, v_interests)
  on conflict (user_id) do update
    set gender_identity = excluded.gender_identity,
        interested_in = excluded.interested_in,
        updated_at = now();

  insert into public.profiles (id, display_name, bio)
  values (uid, v_name, v_bio)
  on conflict (id) do update
    set display_name = excluded.display_name,
        bio = excluded.bio,
        updated_at = now(),
        profile_version = public.profiles.profile_version
          + case
              when (public.profiles.display_name, public.profiles.bio)
                is distinct from (excluded.display_name, excluded.bio) then 1
              else 0
            end;

  perform private.refresh_profile_completeness(uid);
end;
$$;

-- Registers a photo the caller has already uploaded to their storage folder.
create function public.add_profile_photo(p_storage_path text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  v_count integer;
  v_id uuid;
begin
  if p_storage_path is null
    or p_storage_path !~ ('^' || uid::text || '/[A-Za-z0-9_-]{8,64}\.jpg$') then
    raise exception 'INVALID_PHOTO_PATH' using errcode = '22023';
  end if;

  if not exists (
    select 1 from storage.objects
    where bucket_id = 'profile-photos' and name = p_storage_path
  ) then
    raise exception 'PHOTO_NOT_UPLOADED' using errcode = '22023';
  end if;

  perform private.lock_user_photos(uid);

  select count(*) into v_count from public.profile_photos where user_id = uid;
  if v_count >= 4 then
    raise exception 'PHOTO_LIMIT' using errcode = '22023';
  end if;

  insert into public.profile_photos (user_id, storage_path, display_order)
  values (uid, p_storage_path, v_count)
  returning id into v_id;

  perform private.bump_profile_version(uid);
  perform private.refresh_profile_completeness(uid);
  return v_id;
end;
$$;

-- Removes one of the caller's photos and returns its storage path so the client can delete the
-- file. A complete profile must keep at least one photo.
create function public.remove_profile_photo(p_photo_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  v_path text;
  v_count integer;
  v_complete boolean;
begin
  perform private.lock_user_photos(uid);

  select storage_path into v_path
  from public.profile_photos
  where id = p_photo_id and user_id = uid;

  if v_path is null then
    raise exception 'PHOTO_NOT_FOUND' using errcode = '22023';
  end if;

  select count(*) into v_count from public.profile_photos where user_id = uid;
  select is_complete into v_complete from public.profiles where id = uid;

  if coalesce(v_complete, false) and v_count <= 1 then
    raise exception 'LAST_PHOTO' using errcode = '22023';
  end if;

  delete from public.profile_photos where id = p_photo_id;
  perform private.compact_photo_order(uid);
  perform private.bump_profile_version(uid);
  perform private.refresh_profile_completeness(uid);
  return v_path;
end;
$$;

-- Makes one of the caller's photos the main photo, shifting the others along.
create function public.set_primary_profile_photo(p_photo_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  v_order smallint;
begin
  perform private.lock_user_photos(uid);

  select display_order into v_order
  from public.profile_photos
  where id = p_photo_id and user_id = uid;

  if v_order is null then
    raise exception 'PHOTO_NOT_FOUND' using errcode = '22023';
  end if;

  if v_order = 0 then
    return;
  end if;

  set constraints public.profile_photos_user_order_key deferred;
  update public.profile_photos
  set display_order = case when id = p_photo_id then 0 else display_order + 1 end
  where user_id = uid and display_order <= v_order;
  set constraints public.profile_photos_user_order_key immediate;

  perform private.bump_profile_version(uid);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Function privileges: only signed-in users may call the API; helpers are never exposed
-- ---------------------------------------------------------------------------------------------

revoke execute on all functions in schema private from public, anon, authenticated;

revoke execute on function
  public.get_my_profile(),
  public.save_my_profile(text, text, text, text[], date),
  public.add_profile_photo(text),
  public.remove_profile_photo(uuid),
  public.set_primary_profile_photo(uuid)
  from public, anon;

grant execute on function
  public.get_my_profile(),
  public.save_my_profile(text, text, text, text[], date),
  public.add_profile_photo(text),
  public.remove_profile_photo(uuid),
  public.set_primary_profile_photo(uuid)
  to authenticated;
