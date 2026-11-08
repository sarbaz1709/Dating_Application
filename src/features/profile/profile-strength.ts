import { MAX_PHOTOS } from './constants';

export interface StrengthItem {
  id: 'basics' | 'photo-1' | 'photo-2' | 'photo-3' | 'photo-4' | 'bio';
  label: string;
  points: number;
  done: boolean;
}

export interface ProfileStrength {
  /** 0-100 */
  score: number;
  items: StrengthItem[];
  /** The most valuable thing still missing, or null at 100%. */
  next: StrengthItem | null;
}

/** A bio this long reads like a real person rather than a placeholder. */
export const MEANINGFUL_BIO_LENGTH = 30;

const PHOTO_POINTS = [20, 15, 10, 5] as const;
const PHOTO_LABELS = [
  'Add a photo',
  'Add a second photo',
  'Add a third photo',
  'Add a fourth photo',
];

/**
 * How complete a profile is, as a percentage with the next best step. This measures completeness
 * only, never looks or desirability.
 */
export function getProfileStrength(profile: {
  hasBasics: boolean;
  photoCount: number;
  bio: string;
}): ProfileStrength {
  const items: StrengthItem[] = [
    { id: 'basics', label: 'Add your basics', points: 30, done: profile.hasBasics },
    ...PHOTO_POINTS.map((points, index) => ({
      id: `photo-${index + 1}` as StrengthItem['id'],
      label: PHOTO_LABELS[index] ?? 'Add a photo',
      points,
      done: Math.min(profile.photoCount, MAX_PHOTOS) > index,
    })),
    {
      id: 'bio',
      label: profile.bio.trim() ? 'Write a little more in your bio' : 'Write a short bio',
      points: 20,
      done: profile.bio.trim().length >= MEANINGFUL_BIO_LENGTH,
    },
  ];

  const score = items.reduce((total, item) => total + (item.done ? item.points : 0), 0);
  const next = items.filter((item) => !item.done).sort((a, b) => b.points - a.points)[0] ?? null;

  return { score, items, next };
}
