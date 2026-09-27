import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { ServerProvider, useServer } from '@/lib/server';
import { usePalette } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

function Navigator() {
  const { ready } = useServer();
  const p = usePalette();

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // Hold the splash until the saved server URL is loaded, so no request goes to the wrong host.
  if (!ready) return null;
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: p.bg } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ presentation: 'formSheet', title: 'Server', sheetAllowedDetents: [0.6, 1] }} />
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const base = scheme === 'light' ? DefaultTheme : DarkTheme;
  const p = usePalette();
  const theme = { ...base, colors: { ...base.colors, primary: p.accent, background: p.bg, card: p.bg, text: p.text, border: p.line } };
  return (
    <ServerProvider>
      <ThemeProvider value={theme}>
        <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
        <Navigator />
      </ThemeProvider>
    </ServerProvider>
  );
}
