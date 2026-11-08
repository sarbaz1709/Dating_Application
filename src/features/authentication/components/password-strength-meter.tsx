import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { CheckMark } from '@/components/check-mark';
import { haptics } from '@/lib/haptics';
import { Colors, Radius, Spacing, Type } from '@/theme';

import { getPasswordStrength, type PasswordStrengthLevel } from '../password-strength';

const LEVEL_COLORS: Record<PasswordStrengthLevel, string> = {
  0: Colors.danger,
  1: Colors.warning,
  2: Colors.success,
  3: Colors.success,
  4: Colors.success,
};

function Segment({ filled, color }: { filled: boolean; color: string }) {
  const fill = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    fill.set(withTiming(filled ? 1 : 0, { duration: 260 }));
  }, [fill, filled]);

  const style = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));

  return (
    <View style={styles.segment}>
      <Animated.View style={[styles.segmentFill, { backgroundColor: color }, style]} />
    </View>
  );
}

function Requirement({ label, met }: { label: string; met: boolean }) {
  const scale = useSharedValue(1);
  const wasMet = useRef(met);

  useEffect(() => {
    if (met && !wasMet.current) {
      scale.set(
        withSequence(
          withTiming(1.15, { duration: 90 }),
          withSpring(1, { damping: 8, stiffness: 400 }),
        ),
      );
    }
    wasMet.current = met;
  }, [met, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Animated.View
      style={[styles.chip, met && styles.chipMet, style]}
      accessibilityLabel={`${label}: ${met ? 'done' : 'not yet'}`}>
      {met ? (
        <CheckMark size={10} color={Colors.success} weight={2} />
      ) : (
        <View style={styles.chipDot} />
      )}
      <Text style={[styles.chipLabel, met && styles.chipLabelMet]}>{label}</Text>
    </Animated.View>
  );
}

/** Live feedback while choosing a password: a 4-step meter plus the server's requirements. */
export function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = getPasswordStrength(password);
  const color = LEVEL_COLORS[strength.level];
  const previousLevel = useRef(strength.level);

  useEffect(() => {
    if (strength.level === 4 && previousLevel.current < 4) haptics.success();
    else if (strength.level > previousLevel.current) haptics.tap();
    previousLevel.current = strength.level;
  }, [strength.level]);

  if (!password) return null;

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.container}>
      <View style={styles.meterRow}>
        <View
          style={styles.segments}
          accessibilityRole="progressbar"
          accessibilityLabel="Password strength"
          accessibilityValue={{ min: 0, max: 4, now: strength.level, text: strength.label }}>
          {[1, 2, 3, 4].map((step) => (
            <Segment key={step} filled={strength.level >= step} color={color} />
          ))}
        </View>
        <Text style={[styles.levelLabel, { color }]}>{strength.label}</Text>
      </View>
      <View style={styles.chips}>
        {strength.requirements.map((requirement) => (
          <Requirement key={requirement.id} label={requirement.label} met={requirement.met} />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  segments: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceHigh,
    overflow: 'hidden',
  },
  segmentFill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  levelLabel: {
    ...Type.caption,
    fontWeight: '800',
    minWidth: 82,
    textAlign: 'right',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipMet: {
    borderColor: Colors.success,
    backgroundColor: Colors.successSoft,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textFaint,
    marginHorizontal: 2,
  },
  chipLabel: {
    ...Type.caption,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  chipLabelMet: {
    color: Colors.success,
  },
});
