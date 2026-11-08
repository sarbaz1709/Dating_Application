import { z } from 'zod';

import { GENDERS, type Gender } from './constants';

/** Shape of `get_my_profile()`. Validated before use so a schema drift fails loudly. */
export const myProfileResponseSchema = z.object({
  display_name: z.string().nullable(),
  bio: z.string().nullable(),
  is_complete: z.boolean(),
  profile_version: z.number().nullable(),
  date_of_birth: z.string().nullable(),
  age: z.number().nullable(),
  gender: z.enum(GENDERS).nullable(),
  interested_in: z.array(z.enum(GENDERS)).nullable(),
  photos: z.array(
    z.object({
      id: z.string(),
      storage_path: z.string(),
      display_order: z.number(),
      is_primary: z.boolean(),
      moderation_status: z.enum(['unreviewed', 'approved', 'rejected']),
    }),
  ),
});

export type MyProfileResponse = z.infer<typeof myProfileResponseSchema>;

export interface ProfilePhoto {
  id: string;
  storagePath: string;
  order: number;
  isPrimary: boolean;
  /** Short-lived signed URL, or null if it could not be created. */
  url: string | null;
}

export interface MyProfile {
  isComplete: boolean;
  displayName: string | null;
  bio: string;
  /** ISO date (YYYY-MM-DD). Locked once set. */
  birthday: string | null;
  age: number | null;
  gender: Gender | null;
  interestedIn: Gender[];
  photos: ProfilePhoto[];
}
