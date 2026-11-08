import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/theme';

interface SoundWaveProps {
  bars?: number;
  height?: number;
  barWidth?: number;
  gap?: number;
  /** Animate like a live voice. Static when false or when the OS asks for reduced motion. */
  live?: boolean;
}

/** Blend two #RRGGBB colours. */
function mix(from: string, to: string, amount: number) {
  const channel = (hex: string, offset: number) =>
    Number.parseInt(hex.slice(offset, offset + 2), 16);
  const blended = [1, 3, 5].map((offset) =>
    Math.round(channel(from, offset) + (channel(to, offset) - channel(from, offset)) * amount)
      .toString(16)
      .padStart(2, '0'),
  );
  return `#${blended.join('')}`;
}

/** A resting "voice" silhouette: tall in the middle, tapering to the edges, with some texture. */
function restingLevel(index: number, count: number) {
  const centre = (count - 1) / 2;
  const distance = Math.abs(index - centre) / Math.max(centre, 1);
  const envelope = 1 - distance * 0.75;
  const texture = 0.75 + 0.25 * Math.abs(Math.sin(index * 2.3));
  return Math.max(0.12, envelope * texture);
}

function WaveBar({
  index,
  count,
  height,
  width,
  live,
}: {
  index: number;
  count: number;
  height: number;
  width: number;
  live: boolean;
}) {
  const level = restingLevel(index, count);
  const scale = useSharedValue(level);

  useEffect(() => {
    if (!live) {
      cancelAnimation(scale);
      scale.set(level);
      return;
    }
    const duration = 380 + ((index * 97) % 260);
    scale.set(
      withDelay(
        (index * 53) % 400,
        withRepeat(
          withSequence(
            withTiming(Math.min(1, level + 0.35), { duration, easing: Easing.inOut(Easing.quad) }),
            withTiming(Math.max(0.1, level * 0.35), {
              duration,
              easing: Easing.inOut(Easing.quad),
            }),
          ),
          -1,
          true,
        ),
      ),
    );
    return () => cancelAnimation(scale);
  }, [index, level, live, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: scale.get() }] }));
  const color = mix(Colors.accent, Colors.tangerine, count > 1 ? index / (count - 1) : 0);

  return (
    <Animated.View
      style={[{ height, width, borderRadius: width / 2, backgroundColor: color }, animatedStyle]}
    />
  );
}

/** Dialed's signature motif: a live voice waveform in the signal gradient. */
export function SoundWave({
  bars = 17,
  height = 96,
  barWidth = 6,
  gap = 5,
  live = true,
}: SoundWaveProps) {
  const reduceMotion = useReducedMotion();
  return (
    <View
      style={[styles.row, { height, gap }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {Array.from({ length: bars }, (_, index) => (
        <WaveBar
          key={index}
          index={index}
          count={bars}
          height={height}
          width={barWidth}
          live={live && !reduceMotion}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
