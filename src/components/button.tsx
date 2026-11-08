import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { Colors, Radius, SignalGradient, Spacing, Type } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  testID?: string;
}

/**
 * The app's one button. Every press gets a squish and a haptic tick; the primary variant wears
 * the signal gradient.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const inactive = disabled || loading;

  const content = loading ? (
    <ActivityIndicator color={variant === 'primary' ? Colors.textOnAccent : Colors.text} />
  ) : (
    <Text
      style={[styles.label, variant === 'primary' ? styles.labelPrimary : styles.labelSecondary]}
      numberOfLines={1}>
      {label}
    </Text>
  );

  return (
    <Pressable
      testID={testID}
      onPress={() => {
        haptics.press();
        onPress();
      }}
      onPressIn={() => {
        scale.set(withSpring(0.96, { damping: 15, stiffness: 400 }));
      }}
      onPressOut={() => {
        scale.set(withSpring(1, { damping: 12, stiffness: 300 }));
      }}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      aria-disabled={inactive}
      aria-busy={loading}>
      <Animated.View
        style={[
          styles.base,
          variant === 'secondary' && styles.secondary,
          variant === 'ghost' && styles.ghost,
          disabled && !loading && styles.disabled,
          animatedStyle,
        ]}>
        {variant === 'primary' ? (
          <LinearGradient
            colors={SignalGradient}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[StyleSheet.absoluteFill, styles.gradient]}
          />
        ) : null}
        <View style={styles.contentRow}>{content}</View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: Spacing.xl,
  },
  gradient: {
    borderRadius: Radius.pill,
  },
  secondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  ghost: {
    backgroundColor: 'transparent',
    height: 48,
  },
  disabled: {
    opacity: 0.4,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    ...Type.button,
  },
  labelPrimary: {
    color: Colors.textOnAccent,
  },
  labelSecondary: {
    color: Colors.text,
  },
});
