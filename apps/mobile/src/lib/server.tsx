import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setBaseUrl } from './api';
import { normalizeServerUrl, serverUrlFromHostUri } from './url';

const STORAGE_KEY = 'prepr.serverUrl';

export { normalizeServerUrl };

export function autoServerUrl(): string {
  return serverUrlFromHostUri(Constants.expoConfig?.hostUri);
}

interface ServerState {
  url: string;
  /** True when the user set the URL themselves. */
  custom: boolean;
  ready: boolean;
  save: (url: string) => Promise<void>;
  reset: () => Promise<void>;
}

const ServerContext = createContext<ServerState | null>(null);

export function ServerProvider({ children }: { children: ReactNode }) {
  const [custom, setCustom] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => setCustom(saved ? saved : null))
      .catch(() => setCustom(null))
      .finally(() => setReady(true));
  }, []);

  const url = custom ?? autoServerUrl();
  setBaseUrl(url);

  const save = useCallback(async (next: string) => {
    const normalized = normalizeServerUrl(next);
    setCustom(normalized || null);
    if (normalized) await AsyncStorage.setItem(STORAGE_KEY, normalized);
    else await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const reset = useCallback(async () => {
    setCustom(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(() => ({ url, custom: custom !== null, ready, save, reset }), [url, custom, ready, save, reset]);
  return <ServerContext.Provider value={value}>{children}</ServerContext.Provider>;
}

export function useServer(): ServerState {
  const value = useContext(ServerContext);
  if (!value) throw new Error('useServer must be used inside ServerProvider');
  return value;
}
