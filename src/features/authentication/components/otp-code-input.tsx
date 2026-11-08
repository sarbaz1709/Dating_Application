import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputInstance } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { EMAIL_OTP_LENGTH } from '@/constants/brand';
import { useShake } from '@/hooks/use-shake';
import { haptics } from '@/lib/haptics';
import { Colors, FontFamily, Radius, Spacing } from '@/theme';

interface OtpCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called once all digits are entered (typed, pasted or autofilled). */
  onComplete?: (code: string) => void;
  length?: number;
  /** Bump this number to play the error shake (e.g. after a failed verification). */
  errorSignal?: number;
  hasError?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

function Caret() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.set(
      withRepeat(
        withSequence(withTiming(0, { duration: 450 }), withTiming(1, { duration: 450 })),
        -1,
      ),
    );
    return () => cancelAnimation(opacity);
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View style={[styles.caret, style]} />;
}

function Cell({
  digit,
  active,
  hasError,
}: {
  digit: string | undefined;
  active: boolean;
  hasError: boolean;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (digit) {
      scale.set(
        withSequence(
          withTiming(1.12, { duration: 80 }),
          withSpring(1, { damping: 10, stiffness: 380 }),
        ),
      );
    }
  }, [digit, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Animated.View
      style={[
        styles.cell,
        digit ? styles.cellFilled : null,
        active ? styles.cellActive : null,
        hasError ? styles.cellError : null,
        style,
      ]}>
      {digit ? <Text style={styles.digit}>{digit}</Text> : active ? <Caret /> : null}
    </Animated.View>
  );
}

/**
 * One hidden TextInput behind a row of boxes: typing, pasting and the iOS/Android one-time-code
 * autofill all work, while the boxes give each digit its own little moment.
 */
export function OtpCodeInput({
  value,
  onChange,
  onComplete,
  length = EMAIL_OTP_LENGTH,
  errorSignal = 0,
  hasError = false,
  disabled = false,
  autoFocus = true,
}: OtpCodeInputProps) {
  const [focused, setFocused] = useState(false);
  const innerRef = useRef<TextInputInstance>(null);
  const { style: shakeStyle, shake } = useShake();

  const lastErrorSignal = useRef(errorSignal);
  useEffect(() => {
    if (errorSignal === lastErrorSignal.current) return;
    lastErrorSignal.current = errorSignal;
    shake();
  }, [errorSignal, shake]);

  function handleChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, length);
    if (digits.length > value.length) haptics.tap();
    onChange(digits);
    if (digits.length === length && value.length !== length) onComplete?.(digits);
  }

  return (
    <Pressable
      onPress={() => innerRef.current?.focus()}
      accessibilityRole="none"
      accessible={false}>
      <Animated.View style={[styles.row, shakeStyle]}>
        {Array.from({ length }, (_, index) => (
          <Cell
            key={index}
            digit={value[index]}
            active={focused && !disabled && index === Math.min(value.length, length - 1)}
            hasError={hasError}
          />
        ))}
        <TextInput
          ref={innerRef}
          testID="otp-input"
          value={value}
          onChangeText={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          maxLength={length}
          keyboardType="number-pad"
          inputMode="numeric"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          autoFocus={autoFocus}
          editable={!disabled}
          caretHidden
          selectionColor="transparent"
          accessibilityLabel={`${length}-digit code`}
          style={styles.hiddenInput}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  cell: {
    flex: 1,
    maxWidth: 56,
    aspectRatio: 0.82,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFilled: {
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surfaceHigh,
  },
  cellActive: {
    borderColor: Colors.accent,
    boxShadow: `0 0 0 4px ${Colors.accentSoft}`,
  },
  cellError: {
    borderColor: Colors.danger,
  },
  digit: {
    fontFamily: FontFamily.display,
    fontSize: 28,
    color: Colors.text,
  },
  caret: {
    width: 2,
    height: 26,
    borderRadius: 1,
    backgroundColor: Colors.accent,
  },
  hiddenInput: {
    ...StyleSheet.absoluteFill,
    opacity: 0.011,
    color: 'transparent',
    fontSize: 1,
  },
});
