import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { Colors, Radius } from '@/theme';

interface BackButtonProps {
  /** Defaults to going back in the navigation stack (or home if there is nothing to go back to). */
  onPress?: () => void;
  testID?: string;
}

export function BackButton({ onPress, testID }: BackButtonProps) {
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        haptics.tap();
        if (onPress) onPress();
        else if (router.canGoBack()) router.back();
        else router.replace('/');
      }}
      hitSlop={12}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel="Go back">
      <View style={styles.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
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
});
