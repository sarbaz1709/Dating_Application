import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { SoundWave } from '@/components/sound-wave';
import { Colors, Spacing, Type } from '@/theme';

/** Full-screen "dialing…" state while something essential loads. */
export function LoadingScreen({ label }: { label?: string }) {
  return (
    <View style={styles.root} accessibilityLabel={label ?? 'Loading'} accessible>
      <SoundWave bars={9} height={44} barWidth={5} gap={5} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

/** Full-screen error with a retry button. */
export function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Lost the signal</Text>
      <Text style={styles.label}>{message}</Text>
      <View style={styles.action}>
        <Button label="Try again" onPress={onRetry} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  title: {
    ...Type.title,
    color: Colors.text,
    textAlign: 'center',
  },
  label: {
    ...Type.body,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  action: {
    alignSelf: 'stretch',
    maxWidth: 360,
    width: '100%',
    marginHorizontal: 'auto',
  },
});
