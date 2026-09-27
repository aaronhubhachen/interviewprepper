import { router } from 'expo-router';
import { useState } from 'react';
import { TextInput } from 'react-native';
import { Button, Card, Screen, T } from '@/components/ui';
import { errorMessage, fetchDue, setBaseUrl } from '@/lib/api';
import { autoServerUrl, normalizeServerUrl, useServer } from '@/lib/server';
import { radius, space, usePalette } from '@/lib/theme';

export default function SettingsScreen() {
  const server = useServer();
  const p = usePalette();
  const [draft, setDraft] = useState(server.url);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const test = async () => {
    const candidate = normalizeServerUrl(draft);
    setTesting(true);
    setStatus(null);
    const previous = server.url;
    setBaseUrl(candidate);
    try {
      const due = await fetchDue();
      setStatus({ ok: true, text: `Connected. ${due.dueNow} cards due.` });
    } catch (testError) {
      setStatus({ ok: false, text: errorMessage(testError) });
    } finally {
      setBaseUrl(previous);
      setTesting(false);
    }
  };

  const save = async () => {
    await server.save(draft === autoServerUrl() ? '' : draft);
    router.back();
  };

  return (
    <Screen>
      <T variant="muted">
        The app syncs with the Prepr web server. Run the web app on your computer and use its address on the same Wi-Fi (port 3000).
      </T>
      <Card style={{ gap: space.md }}>
        <T variant="eyebrow">Server address</T>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="http://192.168.1.20:3000"
          placeholderTextColor={p.faint}
          style={{ borderWidth: 1, borderColor: p.line, backgroundColor: p.field, color: p.text, borderRadius: radius.md, padding: space.md, fontSize: 16 }}
        />
        <T variant="small">Detected automatically: {autoServerUrl()}</T>
        {status ? <T variant="small" style={{ color: status.ok ? p.accent : p.danger }}>{status.text}</T> : null}
        <Button label="Test connection" variant="secondary" onPress={() => void test()} loading={testing} />
        <Button label="Save" onPress={() => void save()} disabled={!draft.trim()} />
        {server.custom ? <Button label="Use the detected address" variant="ghost" onPress={() => void server.reset().then(() => router.back())} /> : null}
      </Card>
    </Screen>
  );
}
