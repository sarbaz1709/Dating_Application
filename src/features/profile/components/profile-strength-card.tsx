import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ProgressBar } from '@/components/progress-bar';
import { haptics } from '@/lib/haptics';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/theme';

import type { ProfileStrength } from '../profile-strength';

/** Counts up (or down) to the target so every gain is visible. */
function useCountTo(target: number, duration = 700) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const start = Date.now();
    let frame: ReturnType<typeof requestAnimationFrame>;
    const tick = () => {
      const progress = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      fromRef.current = target;
    };
  }, [target, duration]);

  return value;
}

interface ProfileStrengthCardProps {
  strength: ProfileStrength;
  /** Called when the "next step" tip is tapped (e.g. jump to the edit screen). */
  onNextPress?: () => void;
}

/** Profile completeness as a percentage, a bar, and the single most valuable next step. */
export function ProfileStrengthCard({ strength, onNextPress }: ProfileStrengthCardProps) {
  const shown = useCountTo(strength.score);
  const previous = useRef(strength.score);

  useEffect(() => {
    if (strength.score > previous.current) {
      if (strength.score === 100) haptics.success();
      else haptics.tap();
    }
    previous.current = strength.score;
  }, [strength.score]);

  const complete = strength.next === null;

  return (
    <View style={styles.card} testID="profile-strength">
      <View style={styles.header}>
        <Text style={styles.title}>Profile strength</Text>
        <Text style={[styles.score, complete && styles.scoreComplete]}>{shown}%</Text>
      </View>
      <ProgressBar progress={strength.score / 100} accessibilityLabel="Profile strength" />
      {strength.next ? (
        <Pressable
          onPress={onNextPress}
          disabled={!onNextPress}
          style={styles.tip}
          accessibilityRole={onNextPress ? 'button' : 'text'}>
          <View style={styles.boost}>
            <Text style={styles.boostText}>+{strength.next.points}%</Text>
          </View>
          <Text style={styles.tipText}>{strength.next.label}</Text>
        </Pressable>
      ) : (
        <Animated.Text entering={FadeIn} style={styles.doneText}>
          Fully dialed in. Nothing left to add.
        </Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: {
    ...Type.bodyStrong,
    color: Colors.text,
  },
  score: {
    fontFamily: FontFamily.display,
    fontSize: 26,
    color: Colors.accent,
  },
  scoreComplete: {
    color: Colors.success,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  boost: {
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.successSoft,
  },
  boostText: {
    ...Type.caption,
    fontWeight: '800',
    color: Colors.success,
  },
  tipText: {
    ...Type.small,
    color: Colors.textMuted,
    flex: 1,
  },
  doneText: {
    ...Type.small,
    color: Colors.success,
    fontWeight: '600',
  },
});
