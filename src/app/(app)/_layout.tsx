import { Stack } from 'expo-router';

import { ErrorScreen, LoadingScreen } from '@/components/loading-screen';
import { useMyProfile } from '@/features/profile/hooks';
import { Colors } from '@/theme';

/**
 * The signed-in area. Until the profile is complete, only setup is reachable; once it is,
 * setup disappears and the rest of the app opens up. Saving the profile flips the guard and
 * Expo Router redirects automatically.
 */
export default function AppLayout() {
  const profile = useMyProfile();

  if (profile.isPending) return <LoadingScreen />;
  if (profile.isError) {
    return <ErrorScreen message={profile.error.message} onRetry={() => void profile.refetch()} />;
  }

  const complete = profile.data.isComplete;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: Colors.background },
      }}>
      <Stack.Protected guard={!complete}>
        <Stack.Screen name="setup" options={{ animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={complete}>
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="edit-profile" />
      </Stack.Protected>
    </Stack>
  );
}
