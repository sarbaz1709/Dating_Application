import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { Colors, Spacing, Type } from '@/theme';

interface TextLinkProps {
  label: string;
  onPress: () => void;
  /** Muted lead-in text, e.g. "New here?" before "Create an account". */
  prompt?: string;
  align?: 'center' | 'right' | 'left';
  testID?: string;
}

export function TextLink({ label, onPress, prompt, align = 'center', testID }: TextLinkProps) {
  return (
    <View style={[styles.row, align === 'right' && styles.right, align === 'left' && styles.left]}>
      {prompt ? <Text style={styles.prompt}>{prompt}</Text> : null}
      <Pressable
        testID={testID}
        onPress={() => {
          haptics.tap();
          onPress();
        }}
        hitSlop={10}
        accessibilityRole="link"
        accessibilityLabel={label}>
        <Text style={styles.link}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  right: {
    justifyContent: 'flex-end',
  },
  left: {
    justifyContent: 'flex-start',
  },
  prompt: {
    ...Type.small,
    color: Colors.textMuted,
  },
  link: {
    ...Type.small,
    color: Colors.accent,
    fontWeight: '700',
  },
});
