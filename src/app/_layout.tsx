import {
  BricolageGrotesque_500Medium,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/bricolage-grotesque';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { ConfigErrorScreen } from '@/components/config-error-screen';
import { useAuthSessionListener } from '@/features/authentication/hooks';
import { selectCanEnterApp, useSessionStore } from '@/features/authentication/session-store';
import { publicEnv } from '@/lib/env';
import { queryClient } from '@/lib/query-client';
import { Colors } from '@/theme';

void SplashScreen.preventAutoHideAsync();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.background,
    card: Colors.background,
    primary: Colors.accent,
    text: Colors.text,
    border: Colors.border,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_500Medium,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });
  // A font failure should never block the app: fall back to system fonts.
  const fontsReady = fontsLoaded || Boolean(fontError);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="light" />
        {publicEnv.ok ? (
          <AuthGate fontsReady={fontsReady} />
        ) : (
          <ConfigGate fontsReady={fontsReady} problems={publicEnv.problems} />
        )}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function ConfigGate({ fontsReady, problems }: { fontsReady: boolean; problems: string[] }) {
  useEffect(() => {
    if (fontsReady) SplashScreen.hide();
  }, [fontsReady]);
  return fontsReady ? <ConfigErrorScreen problems={problems} /> : null;
}

/**
 * Restores the saved session and keeps the native splash screen up until it knows where to go.
 * Expo Router's protected groups then decide: signed-out people only reach (auth), signed-in
 * people only reach (app), and flipping either guard redirects automatically. The navigator is
 * always mounted (the router requires it); the splash hides the brief pre-restore state.
 */
function AuthGate({ fontsReady }: { fontsReady: boolean }) {
  useAuthSessionListener();
  const status = useSessionStore((state) => state.status);
  const canEnterApp = useSessionStore(selectCanEnterApp);
  const ready = fontsReady && status !== 'initializing';

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: Colors.background },
      }}>
      <Stack.Protected guard={canEnterApp}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!canEnterApp}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
