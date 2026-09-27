import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { errorMessage } from './api';

export interface Loaded<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  reload: () => void;
  refresh: () => void;
}

/** Fetch on mount (and when `key` changes); keeps stale data visible while refreshing. */
export function useLoad<T>(load: () => Promise<T>, key = ''): Loaded<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const run = useRef(0);

  const track = useCallback((promise: Promise<T>) => {
    const id = ++run.current;
    promise
      .then(
        (result) => {
          if (id !== run.current) return;
          setData(result);
          setError(null);
        },
        (loadError: unknown) => {
          if (id === run.current) setError(errorMessage(loadError));
        },
      )
      .finally(() => {
        if (id !== run.current) return;
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  const loadOnMount = useEffectEvent(() => track(load()));

  useEffect(() => {
    loadOnMount();
  }, [key]);

  return {
    data,
    error,
    loading,
    refreshing,
    reload: () => {
      setLoading(true);
      track(load());
    },
    refresh: () => {
      setRefreshing(true);
      track(load());
    },
  };
}
