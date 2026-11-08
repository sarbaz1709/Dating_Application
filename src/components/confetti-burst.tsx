import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/theme';

const PALETTE = [Colors.accent, Colors.tangerine, Colors.violet, Colors.success, Colors.warning];

interface Particle {
  angle: number;
  distance: number;
  size: number;
  color: string;
  spin: number;
  delay: number;
  round: boolean;
}

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, index) => ({
    angle: (index / count) * Math.PI * 2 + Math.random() * 0.5,
    distance: 110 + Math.random() * 150,
    size: 6 + Math.random() * 7,
    color: PALETTE[index % PALETTE.length] ?? Colors.accent,
    spin: (Math.random() - 0.5) * 720,
    delay: Math.random() * 120,
    round: index % 3 === 0,
  }));
}

function Piece({ particle }: { particle: Particle }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withDelay(
        particle.delay,
        withTiming(1, { duration: 1300, easing: Easing.out(Easing.cubic) }),
      ),
    );
  }, [particle.delay, progress]);

  const style = useAnimatedStyle(() => {
    const p = progress.get();
    const x = Math.cos(particle.angle) * particle.distance * p;
    // Burst outwards, then let gravity pull the pieces down.
    const y = Math.sin(particle.angle) * particle.distance * p + 160 * p * p;
    return {
      opacity: p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25,
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${particle.spin * p}deg` },
        { scale: 0.4 + Math.min(p * 3, 1) * 0.6 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: particle.size,
          height: particle.round ? particle.size : particle.size * 0.45,
          borderRadius: particle.round ? particle.size / 2 : 2,
          backgroundColor: particle.color,
        },
        style,
      ]}
    />
  );
}

/** A one-shot celebratory burst, centred on its parent. Skipped when reduced motion is on. */
export function ConfettiBurst({ count = 36 }: { count?: number }) {
  const reduceMotion = useReducedMotion();
  const [particles] = useState(() => makeParticles(count));
  if (reduceMotion) return null;

  return (
    <View style={styles.origin} pointerEvents="none" accessibilityElementsHidden>
      {particles.map((particle, index) => (
        <Piece key={index} particle={particle} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  origin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 0,
    height: 0,
    overflow: 'visible',
  },
  piece: {
    position: 'absolute',
  },
});
