import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { PHOTO_JPEG_QUALITY, PHOTO_MAX_BYTES } from './constants';
import { base64ToBytes, fitWithin } from './image-utils';
import { ProfileError } from './profile-errors';

export interface PickedPhoto {
  uri: string;
  width: number;
  height: number;
}

/**
 * Opens the system photo picker. Uses the OS picker, which needs no photo-library permission on
 * current iOS and Android. Returns an empty list if the person cancels.
 */
export async function pickPhotos(limit: number): Promise<PickedPhoto[]> {
  if (limit <= 0) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    orderedSelection: true,
    quality: 1,
    exif: false,
  });
  if (result.canceled) return [];
  return result.assets
    .slice(0, limit)
    .map((asset) => ({ uri: asset.uri, width: asset.width, height: asset.height }));
}

/**
 * Resizes and re-encodes a picked photo as JPEG. Re-encoding also drops EXIF metadata such as
 * GPS location, so a photo never reveals where it was taken.
 */
export async function preparePhotoForUpload(photo: PickedPhoto): Promise<Uint8Array> {
  const context = ImageManipulator.manipulate(photo.uri);
  try {
    const target = fitWithin(photo.width, photo.height);
    if (target) context.resize(target);
    const image = await context.renderAsync();
    try {
      const result = await image.saveAsync({
        format: SaveFormat.JPEG,
        compress: PHOTO_JPEG_QUALITY,
        base64: true,
      });
      if (!result.base64) {
        throw new ProfileError('photo_unreadable', "We couldn't read that photo. Try another.");
      }
      const bytes = base64ToBytes(result.base64);
      if (bytes.byteLength > PHOTO_MAX_BYTES) {
        throw new ProfileError('photo_too_large', 'That photo is too large. Try a different one.');
      }
      return bytes;
    } finally {
      image.release();
    }
  } catch (error) {
    if (error instanceof ProfileError) throw error;
    throw new ProfileError('photo_unreadable', "We couldn't read that photo. Try another.");
  } finally {
    context.release();
  }
}
