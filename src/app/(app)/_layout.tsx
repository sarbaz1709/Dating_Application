import { Stack } from 'expo-router';

import { Colors } from '@/theme';

/** The signed-in area. Discovery, matches, calls and chat will live here. */
export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    />
  );
}
