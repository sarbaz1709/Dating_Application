import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { Colors, DuskGradient, FontFamily, Radius, Spacing, Type } from '@/theme';

export interface ProfileCardPhoto {
  id: string;
  url: string | null;
  cacheKey?: string;
}

interface ProfileCardProps {
  name: string;
  age: number | null;
  bio: string;
  photos: ProfileCardPhoto[];
  testID?: string;
}

/**
 * How a profile looks to other people. Tap the right or left side to flip through photos.
 * Built for the preview now, and reused by Discovery later.
 */
export function ProfileCard({ name, age, bio, photos, testID }: ProfileCardProps) {
  const [index, setIndex] = useState(0);
  const count = photos.length;
  const current = photos[Math.min(index, Math.max(count - 1, 0))];

  function step(direction: 1 | -1) {
    if (count < 2) return;
    haptics.select();
    setIndex((value) => (value + direction + count) % count);
  }

  return (
    <View style={styles.card} testID={testID}>
      {current?.url ? (
        <Image
          source={{ uri: current.url, cacheKey: current.cacheKey }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <LinearGradient
          colors={DuskGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.placeholder]}>
          <Text style={styles.initial}>{name.trim().charAt(0).toUpperCase() || '?'}</Text>
        </LinearGradient>
      )}

      {count > 1 ? (
        <View style={styles.indicators} pointerEvents="none">
          {photos.map((photo, photoIndex) => (
            <View
              key={photo.id}
              style={[styles.indicator, photoIndex === index && styles.indicatorActive]}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.tapZones}>
        <Pressable
          style={styles.tapZone}
          onPress={() => step(-1)}
          accessibilityRole="button"
          accessibilityLabel="Previous photo"
          disabled={count < 2}
        />
        <Pressable
          style={styles.tapZone}
          onPress={() => step(1)}
          accessibilityRole="button"
          accessibilityLabel="Next photo"
          disabled={count < 2}
        />
      </View>

      <LinearGradient
        colors={['rgba(11, 10, 18, 0)', 'rgba(11, 10, 18, 0.65)', 'rgba(11, 10, 18, 0.95)']}
        locations={[0, 0.45, 1]}
        style={styles.info}
        pointerEvents="none">
        <Text style={styles.name} numberOfLines={1}>
          {name || 'Your name'}
          {age !== null ? <Text style={styles.age}>{`  ${age}`}</Text> : null}
        </Text>
        {bio.trim() ? (
          <Text style={styles.bio} numberOfLines={3}>
            {bio.trim()}
          </Text>
        ) : null}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 0.7,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: FontFamily.display,
    fontSize: 120,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  indicators: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  indicator: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  indicatorActive: {
    backgroundColor: '#FFFFFF',
  },
  tapZones: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
  },
  tapZone: {
    flex: 1,
  },
  info: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl * 1.5,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  name: {
    fontFamily: FontFamily.display,
    fontSize: 34,
    lineHeight: 38,
    color: '#FFFFFF',
  },
  age: {
    fontFamily: FontFamily.displayMedium,
    fontSize: 28,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  bio: {
    ...Type.body,
    color: 'rgba(255, 255, 255, 0.9)',
  },
});
