import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { OTP_RESEND_COOLDOWN_SECONDS } from '@/constants/brand';
import { Colors, Type } from '@/theme';

interface ResendCodeButtonProps {
  onResend: () => Promise<unknown>;
  /** Start counting down immediately (a code was just sent). */
  startCoolingDown?: boolean;
}

function formatSeconds(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** "Resend code" with a visible cooldown so people aren't tempted to hammer it. */
export function ResendCodeButton({ onResend, startCoolingDown = true }: ResendCodeButtonProps) {
  const [secondsLeft, setSecondsLeft] = useState(
    startCoolingDown ? OTP_RESEND_COOLDOWN_SECONDS : 0,
  );
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const disabled = sending || secondsLeft > 0;

  async function handlePress() {
    setSending(true);
    try {
      await onResend();
      setSecondsLeft(OTP_RESEND_COOLDOWN_SECONDS);
    } catch {
      // The caller surfaces the error; allow an immediate retry.
    } finally {
      setSending(false);
    }
  }

  const label = sending
    ? 'Sending…'
    : secondsLeft > 0
      ? `Resend code in ${formatSeconds(secondsLeft)}`
      : 'Resend code';

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="button"
      aria-disabled={disabled}
      accessibilityLabel={label}>
      <Text style={[styles.label, disabled && styles.disabled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    ...Type.small,
    fontWeight: '700',
    color: Colors.accent,
    textAlign: 'center',
  },
  disabled: {
    color: Colors.textFaint,
  },
});
