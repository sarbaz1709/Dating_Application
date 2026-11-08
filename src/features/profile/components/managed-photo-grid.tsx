import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FormMessage } from '@/components/form-message';
import { Spacing } from '@/theme';

import { MAX_PHOTOS } from '../constants';
import { useAddPhotos, useRemovePhoto, useSetPrimaryPhoto } from '../hooks';
import { pickPhotos } from '../image-processing';
import { toProfileError } from '../profile-errors';
import type { ProfilePhoto } from '../types';
import { PhotoActionsSheet } from './photo-actions-sheet';
import { PhotoGrid } from './photo-grid';

interface ManagedPhotoGridProps {
  photos: ProfilePhoto[];
  /** A live profile must keep at least one photo. */
  profileComplete: boolean;
}

/**
 * The photo grid wired to the backend: pick (several at once), upload with placeholders, make
 * main and remove (both applied instantly, rolled back if the server says no).
 */
export function ManagedPhotoGrid({ photos, profileComplete }: ManagedPhotoGridProps) {
  const addPhotos = useAddPhotos();
  const removePhoto = useRemovePhoto();
  const setPrimary = useSetPrimaryPhoto();
  const [selected, setSelected] = useState<ProfilePhoto | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const remaining = MAX_PHOTOS - photos.length - addPhotos.uploading;

  async function handleAdd() {
    if (remaining <= 0) return;
    setNotice(null);
    try {
      const picked = await pickPhotos(remaining);
      if (picked.length === 0) return;
      addPhotos.mutate(picked, {
        onSuccess: (result) => {
          if (result.failed > 0) {
            setNotice(
              `${result.failed === 1 ? 'One photo' : `${result.failed} photos`} didn't upload. ${
                result.firstError?.message ?? ''
              }`.trim(),
            );
          }
        },
      });
    } catch (error) {
      setNotice(toProfileError(error).message);
    }
  }

  const error =
    notice ?? addPhotos.error?.message ?? removePhoto.error?.message ?? setPrimary.error?.message;

  return (
    <View style={styles.container}>
      <PhotoGrid
        photos={photos}
        uploading={addPhotos.uploading}
        onAdd={handleAdd}
        onPhotoPress={setSelected}
        disabled={remaining <= 0}
      />
      <FormMessage message={error} />
      <PhotoActionsSheet
        photo={selected}
        canRemove={!profileComplete || photos.length > 1}
        onClose={() => setSelected(null)}
        onMakeMain={(photo) => {
          setSelected(null);
          setNotice(null);
          setPrimary.mutate(photo.id);
        }}
        onRemove={(photo) => {
          setSelected(null);
          setNotice(null);
          removePhoto.mutate(photo.id);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
});
