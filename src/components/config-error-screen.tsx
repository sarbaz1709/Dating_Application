import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Colors, Radius, Spacing, Type } from '@/theme';

/** Shown in development when the public Supabase env vars are missing or invalid. */
export function ConfigErrorScreen({ problems }: { problems: string[] }) {
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Almost there</Text>
        <Text style={styles.body}>
          The app can&apos;t reach its backend yet. Copy{' '}
          <Text style={styles.code}>.env.example</Text> to{' '}
          <Text style={styles.code}>.env.local</Text>, fill in your Supabase URL and publishable
          key, then restart the dev server.
        </Text>
        <View style={styles.card}>
          {problems.map((problem) => (
            <Text key={problem} style={styles.problem}>
              • {problem}
            </Text>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  title: {
    ...Type.title,
    color: Colors.text,
  },
  body: {
    ...Type.body,
    color: Colors.textMuted,
  },
  code: {
    color: Colors.text,
    fontWeight: '700',
  },
  card: {
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerSoft,
  },
  problem: {
    ...Type.small,
    color: Colors.text,
  },
});
