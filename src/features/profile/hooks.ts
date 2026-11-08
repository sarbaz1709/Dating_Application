import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useSessionStore } from '@/features/authentication/session-store';
import { haptics } from '@/lib/haptics';

import type { PickedPhoto } from './image-processing';
import { toProfileError, type ProfileError } from './profile-errors';
import {
  fetchMyProfile,
  removeProfilePhoto,
  saveMyProfile,
  setPrimaryProfilePhoto,
  uploadProfilePhoto,
  type SaveProfileInput,
} from './profile-service';
import type { MyProfile } from './types';

export const MY_PROFILE_KEY = ['my-profile'] as const;

/** The signed-in user's own profile (with fresh signed photo URLs). */
export function useMyProfile() {
  return useQuery<MyProfile, ProfileError>({
    queryKey: MY_PROFILE_KEY,
    queryFn: fetchMyProfile,
    // Signed photo URLs last an hour; refresh comfortably before that.
    staleTime: 20 * 60 * 1000,
    refetchInterval: 40 * 60 * 1000,
  });
}

/** Saves profile details. `goLive` marks the end of setup and queues the celebration. */
export function useSaveProfile({ goLive = false }: { goLive?: boolean } = {}) {
  const queryClient = useQueryClient();
  return useMutation<void, ProfileError, SaveProfileInput>({
    mutationFn: async (input) => {
      try {
        await saveMyProfile(input);
      } catch (error) {
        throw toProfileError(error);
      }
    },
    onMutate: () => {
      // The refetch below can complete the profile and swap screens before onSuccess resolves.
      if (goLive) useSessionStore.getState().queueCelebration('profile');
    },
    onSuccess: async () => {
      haptics.success();
      await queryClient.invalidateQueries({ queryKey: MY_PROFILE_KEY });
    },
    onError: () => {
      if (goLive) useSessionStore.getState().clearCelebration();
      haptics.error();
    },
  });
}

export interface AddPhotosResult {
  added: number;
  failed: number;
  firstError: ProfileError | null;
}

/**
 * Uploads several photos one after another, exposing how many are still in flight so the grid
 * can show placeholders. One bad photo does not stop the rest.
 */
export function useAddPhotos() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(0);

  const mutation = useMutation<AddPhotosResult, ProfileError, PickedPhoto[]>({
    mutationFn: async (photos) => {
      const result: AddPhotosResult = { added: 0, failed: 0, firstError: null };
      setUploading(photos.length);
      try {
        for (const photo of photos) {
          try {
            await uploadProfilePhoto(photo);
            result.added += 1;
            haptics.tap();
            await queryClient.invalidateQueries({ queryKey: MY_PROFILE_KEY });
          } catch (error) {
            result.failed += 1;
            result.firstError ??= toProfileError(error);
          } finally {
            setUploading((count) => Math.max(0, count - 1));
          }
        }
      } finally {
        setUploading(0);
      }
      if (result.added === 0 && result.firstError) throw result.firstError;
      return result;
    },
    onSuccess: (result) => (result.failed ? haptics.warning() : haptics.success()),
    onError: () => haptics.error(),
  });

  return { ...mutation, uploading };
}

/** Optimistically applies a photo change to the cached profile, rolling back on failure. */
function useOptimisticPhotoMutation(
  mutationFn: (photoId: string) => Promise<void>,
  apply: (profile: MyProfile, photoId: string) => MyProfile,
) {
  const queryClient = useQueryClient();
  return useMutation<void, ProfileError, string, { previous?: MyProfile }>({
    mutationFn: async (photoId) => {
      try {
        await mutationFn(photoId);
      } catch (error) {
        throw toProfileError(error);
      }
    },
    onMutate: async (photoId) => {
      await queryClient.cancelQueries({ queryKey: MY_PROFILE_KEY });
      const previous = queryClient.getQueryData<MyProfile>(MY_PROFILE_KEY);
      if (previous) queryClient.setQueryData(MY_PROFILE_KEY, apply(previous, photoId));
      haptics.select();
      return { previous };
    },
    onError: (_error, _photoId, context) => {
      if (context?.previous) queryClient.setQueryData(MY_PROFILE_KEY, context.previous);
      haptics.error();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: MY_PROFILE_KEY }),
  });
}

function renumber(profile: MyProfile, photos: MyProfile['photos']): MyProfile {
  return {
    ...profile,
    photos: photos.map((photo, order) => ({ ...photo, order, isPrimary: order === 0 })),
  };
}

export function useRemovePhoto() {
  return useOptimisticPhotoMutation(removeProfilePhoto, (profile, photoId) =>
    renumber(
      profile,
      profile.photos.filter((photo) => photo.id !== photoId),
    ),
  );
}

export function useSetPrimaryPhoto() {
  return useOptimisticPhotoMutation(setPrimaryProfilePhoto, (profile, photoId) => {
    const chosen = profile.photos.find((photo) => photo.id === photoId);
    if (!chosen) return profile;
    return renumber(profile, [chosen, ...profile.photos.filter((photo) => photo.id !== photoId)]);
  });
}
