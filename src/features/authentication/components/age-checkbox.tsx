import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  ZoomIn,
  ZoomOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { CheckMark } from '@/components/check-mark';
import { haptics } from '@/lib/haptics';
import { Colors, Radius, SignalGradient, Spacing, Type } from '@/theme';

interface AgeCheckboxProps {
  value: boolean;
  onChange: (value: boolean) => void;
  error?: string;
}

/** The single "I'm 18+" attestation required to create an account. */
export function AgeCheckbox({ value, onChange, error }: AgeCheckboxProps) {
  const scale = useSharedValue(1);
  const boxStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  function toggle() {
    haptics.select();
    scale.set(
      withSequence(
        withTiming(0.82, { duration: 70 }),
        withSpring(1, { damping: 9, stiffness: 320 }),
      ),
    );
    onChange(!value);
  }

  return (
    <View style={styles.wrapper}>
      <Pressable
        testID="age-checkbox"
        onPress={toggle}
        style={[styles.row, value && styles.rowChecked, Boolean(error) && styles.rowError]}
        role="checkbox"
        aria-checked={value}
        accessibilityLabel="I'm 18 or older"
        accessibilityHint="Required to create an account">
        <Animated.View style={[styles.box, value && styles.boxChecked, boxStyle]}>
          {value ? (
            <Animated.View
              entering={ZoomIn.springify().damping(12)}
              exiting={ZoomOut.duration(120)}
              style={StyleSheet.absoluteFill}>
              <LinearGradient
                colors={SignalGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, styles.boxFill]}
              />
              <View style={styles.checkWrap}>
                <CheckMark size={14} color={Colors.textOnAccent} />
              </View>
            </Animated.View>
          ) : null}
        </Animated.View>
        <View style={styles.copy}>
          <Text style={styles.title}>I&apos;m 18 or older</Text>
          <Text style={styles.subtitle}>Dialed is for adults only.</Text>
        </View>
      </Pressable>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  rowChecked: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSoft,
  },
  rowError: {
    borderColor: Colors.danger,
  },
  box: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.borderStrong,
    overflow: 'hidden',
  },
  boxChecked: {
    borderColor: 'transparent',
  },
  boxFill: {
    borderRadius: 7,
  },
  checkWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...Type.bodyStrong,
    color: Colors.text,
  },
  subtitle: {
    ...Type.small,
    color: Colors.textMuted,
  },
  error: {
    ...Type.small,
    color: Colors.danger,
  },
});
