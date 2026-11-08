import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { Colors, Radius, Spacing, Type } from '@/theme';

interface AuthHeaderProps {
  title: string;
  subtitle?: ReactNode;
  /** Hide the back control (e.g. on the first screen of a flow). */
  showBack?: boolean;
}

function BackChevron() {
  return <View style={styles.chevron} />;
}

export function AuthHeader({ title, subtitle, showBack = true }: AuthHeaderProps) {
  return (
    <View style={styles.container}>
      {showBack ? (
        <Pressable
          onPress={() => {
            haptics.tap();
            if (router.canGoBack()) router.back();
            else router.replace('/');
          }}
          hitSlop={12}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <BackChevron />
        </Pressable>
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
  back: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    width: 11,
    height: 11,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: Colors.text,
    transform: [{ translateX: 2 }, { rotate: '45deg' }],
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
