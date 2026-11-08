import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { Colors, Radius, Spacing, Type } from '@/theme';

import type { ProfilePhoto } from '../types';

interface PhotoActionsSheetProps {
  photo: ProfilePhoto | null;
  /** False when removing would leave a live profile with no photos. */
  canRemove: boolean;
  onClose: () => void;
  onMakeMain: (photo: ProfilePhoto) => void;
  onRemove: (photo: ProfilePhoto) => void;
}

export function PhotoActionsSheet({
  photo,
  canRemove,
  onClose,
  onMakeMain,
  onRemove,
}: PhotoActionsSheetProps) {
  return (
    <BottomSheet visible={photo !== null} onClose={onClose} testID="photo-actions">
      {photo ? (
        <>
          <View style={styles.header}>
            {photo.url ? (
              <Image
                source={{ uri: photo.url, cacheKey: photo.storagePath }}
                style={styles.thumb}
                contentFit="cover"
              />
            ) : (
              <View style={styles.thumb} />
            )}
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{photo.isPrimary ? 'Your main photo' : 'Photo'}</Text>
              <Text style={styles.subtitle}>
                {photo.isPrimary
                  ? 'This is the first thing people see.'
                  : 'Make it your main photo, or remove it.'}
              </Text>
            </View>
          </View>
          {!photo.isPrimary ? (
            <Button
              testID="photo-make-main"
              label="Make main photo"
              onPress={() => onMakeMain(photo)}
            />
          ) : null}
          <Button
            testID="photo-remove"
            label="Remove photo"
            variant="secondary"
            disabled={!canRemove}
            onPress={() => onRemove(photo)}
          />
          {!canRemove ? (
            <Text style={styles.hint}>
              Your profile needs at least one photo. Add another first.
            </Text>
          ) : null}
          <Button label="Cancel" variant="ghost" onPress={onClose} />
        </>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  thumb: {
    width: 64,
    height: 84,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceHigh,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...Type.heading,
    fontSize: 19,
    color: Colors.text,
  },
  subtitle: {
    ...Type.small,
    color: Colors.textMuted,
  },
  hint: {
    ...Type.caption,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
