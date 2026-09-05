import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Settings, defaultSettings, reconcile } from './settingsSchema';

export type { Settings, Theme, WarnAt, ZoneMark } from './settingsSchema';
export { defaultSettings } from './settingsSchema';

const STORAGE_KEY = 'verge.settings.v1';

type Ctx = {
  settings: Settings;
  /** True once the persisted settings have been read back off disk. */
  loaded: boolean;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  toggle: (key: 'chime' | 'voice' | 'showStale') => void;
};

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(json => {
        if (cancelled || !json) return;
        setSettings(reconcile(JSON.parse(json)));
      })
      .catch(() => {
        /* first run, or unreadable store — defaults stand */
      })
      .finally(() => {
        if (cancelled) return;
        loadedRef.current = true;
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Never write back before the first read lands, or defaults would clobber
  // what is already on disk.
  useEffect(() => {
    if (!loadedRef.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch(() => {});
  }, [settings]);

  const set = useCallback<Ctx['set']>((key, value) => {
    setSettings(prev => (prev[key] === value ? prev : { ...prev, [key]: value }));
  }, []);

  const toggle = useCallback<Ctx['toggle']>(key => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const value = useMemo(() => ({ settings, loaded, set, toggle }), [settings, loaded, set, toggle]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
