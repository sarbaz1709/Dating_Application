import { Image } from 'expo-image';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  ZoomIn,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { Colors, Radius, Spacing, Type } from '@/theme';

import { MAX_PHOTOS } from '../constants';
import type { ProfilePhoto } from '../types';

interface PhotoGridProps {
  photos: ProfilePhoto[];
  /** Photos currently uploading (shown as placeholders after the existing ones). */
  uploading?: number;
  onAdd: () => void;
  onPhotoPress: (photo: ProfilePhoto) => void;
  disabled?: boolean;
}

function PlusIcon({ color, size = 22 }: { color: string; size?: number }) {
  const thickness = Math.max(2, Math.round(size / 8));
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.plusBar,
          { backgroundColor: color, width: size, height: thickness, top: (size - thickness) / 2 },
        ]}
      />
      <View
        style={[
          styles.plusBar,
          { backgroundColor: color, height: size, width: thickness, left: (size - thickness) / 2 },
        ]}
      />
    </View>
  );
}

function PhotoTile({ photo, onPress }: { photo: ProfilePhoto; onPress: () => void }) {
  return (
    <Pressable
      testID={`photo-${photo.order}`}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={styles.slot}
      accessibilityRole="button"
      accessibilityLabel={
        photo.isPrimary ? 'Main photo. Tap for options' : 'Photo. Tap for options'
      }>
      <Animated.View entering={ZoomIn.springify().damping(14)} style={StyleSheet.absoluteFill}>
        {photo.url ? (
          <Image
            source={{ uri: photo.url, cacheKey: photo.storagePath }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.missing]}>
            <Text style={styles.missingText}>Photo unavailable</Text>
          </View>
        )}
      </Animated.View>
      {photo.isPrimary ? (
        <View style={styles.mainBadge}>
          <Text style={styles.mainBadgeText}>Main</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function UploadingTile() {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    if (reduceMotion) return;
    opacity.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.5, { duration: 650, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <View style={styles.slot} accessibilityLabel="Uploading photo">
      <Animated.View style={[StyleSheet.absoluteFill, styles.uploading, style]} />
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.accent} />
        <Text style={styles.uploadingText}>Uploading…</Text>
      </View>
    </View>
  );
}

function EmptyTile({
  highlighted,
  onPress,
  disabled,
}: {
  highlighted: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      testID={highlighted ? 'add-photo' : undefined}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      disabled={disabled}
      style={[styles.slot, styles.empty, highlighted && styles.emptyHighlighted]}
      accessibilityRole="button"
      accessibilityLabel="Add a photo">
      <View style={[styles.addCircle, highlighted && styles.addCircleHighlighted]}>
        <PlusIcon color={highlighted ? Colors.textOnAccent : Colors.textMuted} size={18} />
      </View>
      {highlighted ? (
        <Animated.Text entering={FadeIn} style={styles.addLabel}>
          Add photo
        </Animated.Text>
      ) : null}
    </Pressable>
  );
}

/** Four portrait slots: photos (first = main), uploading placeholders, then add buttons. */
export function PhotoGrid({
  photos,
  uploading = 0,
  onAdd,
  onPhotoPress,
  disabled,
}: PhotoGridProps) {
  const slots = Array.from({ length: MAX_PHOTOS }, (_, index) => index);
  const firstEmpty = photos.length + uploading;

  return (
    <View style={styles.grid}>
      {slots.map((index) => {
        const photo = photos[index];
        let tile;
        if (photo) {
          tile = <PhotoTile photo={photo} onPress={() => onPhotoPress(photo)} />;
        } else if (index < firstEmpty) {
          tile = <UploadingTile />;
        } else {
          tile = (
            <EmptyTile highlighted={index === firstEmpty} onPress={onAdd} disabled={disabled} />
          );
        }
        return (
          <View key={index} style={styles.cell}>
            {tile}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.xs,
  },
  cell: {
    width: '50%',
    padding: Spacing.xs,
  },
  slot: {
    aspectRatio: 3 / 4,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  empty: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  emptyHighlighted: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSoft,
  },
  addCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceHigh,
  },
  addCircleHighlighted: {
    backgroundColor: Colors.accent,
    boxShadow: `0 6px 20px 0 rgba(255, 77, 141, 0.45)`,
  },
  addLabel: {
    ...Type.small,
    fontWeight: '700',
    color: Colors.text,
  },
  plusBar: {
    position: 'absolute',
    borderRadius: 2,
  },
  uploading: {
    backgroundColor: Colors.surfaceHigh,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  uploadingText: {
    ...Type.caption,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  missing: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceHigh,
  },
  missingText: {
    ...Type.caption,
    color: Colors.textFaint,
  },
  mainBadge: {
    position: 'absolute',
    left: Spacing.sm,
    top: Spacing.sm,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accent,
  },
  mainBadgeText: {
    ...Type.caption,
    fontWeight: '800',
    color: Colors.textOnAccent,
  },
});
