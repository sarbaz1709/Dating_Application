import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { Colors, Radius, Spacing, Type } from '@/theme';

type Tone = 'error' | 'info' | 'success';

const TONES: Record<Tone, { background: string; border: string; dot: string }> = {
  error: { background: Colors.dangerSoft, border: Colors.danger, dot: Colors.danger },
  info: { background: Colors.accentSoft, border: Colors.accent, dot: Colors.accent },
  success: { background: Colors.successSoft, border: Colors.success, dot: Colors.success },
};

/** An inline banner for form-level feedback. Announced to screen readers when it appears. */
export function FormMessage({ tone = 'error', message }: { tone?: Tone; message?: string | null }) {
  if (!message) return null;
  const colors = TONES[tone];
  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOut.duration(150)}
      style={[styles.banner, { backgroundColor: colors.background, borderColor: colors.border }]}
      accessibilityLiveRegion="polite"
      accessibilityRole={tone === 'error' ? 'alert' : 'text'}>
      <View style={[styles.dot, { backgroundColor: colors.dot }]} />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
  },
  text: {
    flex: 1,
    ...Type.small,
    color: Colors.text,
  },
});
