import { getSupabase } from '@/lib/supabase';

import { PHOTO_BUCKET, PHOTO_URL_TTL_SECONDS, type Gender } from './constants';
import { preparePhotoForUpload, type PickedPhoto } from './image-processing';
import { ProfileError, toProfileError } from './profile-errors';
import { myProfileResponseSchema, type MyProfile, type ProfilePhoto } from './types';

/**
 * Every profile read and write. All writes go through database functions that validate input
 * server-side; screens and hooks never touch tables or storage directly.
 */

async function currentUserId(): Promise<string> {
  const { data } = await getSupabase().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new ProfileError('not_signed_in', 'Your session ended. Please log in again.');
  return id;
}

async function signPhotoUrls(paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;
  const { data, error } = await getSupabase()
    .storage.from(PHOTO_BUCKET)
    .createSignedUrls(paths, PHOTO_URL_TTL_SECONDS);
  if (error) throw toProfileError(error);
  for (const entry of data) {
    if (entry.path && entry.signedUrl) urls.set(entry.path, entry.signedUrl);
  }
  return urls;
}

export async function fetchMyProfile(): Promise<MyProfile> {
  const { data, error } = await getSupabase().rpc('get_my_profile');
  if (error) throw toProfileError(error);

  const parsed = myProfileResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new ProfileError('unknown', "We couldn't load your profile. Please try again.");
  }
  const raw = parsed.data;
  const urls = await signPhotoUrls(raw.photos.map((photo) => photo.storage_path));

  const photos: ProfilePhoto[] = raw.photos
    .filter((photo) => photo.moderation_status !== 'rejected')
    .map((photo) => ({
      id: photo.id,
      storagePath: photo.storage_path,
      order: photo.display_order,
      isPrimary: photo.is_primary,
      url: urls.get(photo.storage_path) ?? null,
    }));

  return {
    isComplete: raw.is_complete,
    displayName: raw.display_name,
    bio: raw.bio ?? '',
    birthday: raw.date_of_birth,
    age: raw.age,
    gender: raw.gender,
    interestedIn: raw.interested_in ?? [],
    photos,
  };
}

export interface SaveProfileInput {
  displayName: string;
  bio: string;
  gender: Gender;
  interestedIn: Gender[];
  /** Required the first time; omit afterwards (it is locked). */
  birthday?: string;
}

export async function saveMyProfile(input: SaveProfileInput): Promise<void> {
  const { error } = await getSupabase().rpc('save_my_profile', {
    p_display_name: input.displayName,
    p_bio: input.bio,
    p_gender: input.gender,
    p_interested_in: input.interestedIn,
    ...(input.birthday ? { p_date_of_birth: input.birthday } : {}),
  });
  if (error) throw toProfileError(error);
}

function randomFileName() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}.jpg`;
}

/** Resizes, uploads and registers one photo. Cleans up the file if registration fails. */
export async function uploadProfilePhoto(photo: PickedPhoto): Promise<void> {
  const userId = await currentUserId();
  const bytes = await preparePhotoForUpload(photo);
  const path = `${userId}/${randomFileName()}`;
  const storage = getSupabase().storage.from(PHOTO_BUCKET);

  const { error: uploadError } = await storage.upload(path, bytes, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (uploadError) throw toProfileError(uploadError);

  const { error } = await getSupabase().rpc('add_profile_photo', { p_storage_path: path });
  if (error) {
    await storage.remove([path]).catch(() => undefined);
    throw toProfileError(error);
  }
}

export async function removeProfilePhoto(photoId: string): Promise<void> {
  const { data: path, error } = await getSupabase().rpc('remove_profile_photo', {
    p_photo_id: photoId,
  });
  if (error) throw toProfileError(error);
  // The row is gone either way; a leftover file is harmless and private.
  if (path)
    await getSupabase()
      .storage.from(PHOTO_BUCKET)
      .remove([path])
      .catch(() => undefined);
}

export async function setPrimaryProfilePhoto(photoId: string): Promise<void> {
  const { error } = await getSupabase().rpc('set_primary_profile_photo', { p_photo_id: photoId });
  if (error) throw toProfileError(error);
}
