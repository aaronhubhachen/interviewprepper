import { Stack } from 'expo-router';
import { usePalette } from '@/lib/theme';

export default function SparLayout() {
  const p = usePalette();
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerTransparent: true,
        headerBlurEffect: 'systemChromeMaterial',
        headerTintColor: p.accent,
        headerLargeTitleStyle: { color: p.text },
        headerTitleStyle: { color: p.text },
        contentStyle: { backgroundColor: p.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Behavioral' }} />
      <Stack.Screen name="[id]" options={{ title: '', headerLargeTitle: false }} />
    </Stack>
  );
}
