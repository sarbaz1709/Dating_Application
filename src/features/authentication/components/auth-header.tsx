import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BackButton } from '@/components/back-button';
import { Colors, Spacing, Type } from '@/theme';

interface AuthHeaderProps {
  title: string;
  subtitle?: ReactNode;
  /** Hide the back control (e.g. on the first screen of a flow). */
  showBack?: boolean;
}

export function AuthHeader({ title, subtitle, showBack = true }: AuthHeaderProps) {
  return (
    <View style={styles.container}>
      {showBack ? (
        <View style={styles.backRow}>
          <BackButton />
        </View>
      ) : null}
      <Animated.View entering={FadeInDown.duration(320)} style={styles.copy}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  backRow: {
    flexDirection: 'row',
  },
  copy: {
    gap: Spacing.sm,
  },
  title: {
    ...Type.title,
    color: Colors.text,
  },
  subtitle: {
    ...Type.body,
    color: Colors.textMuted,
  },
});
