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

export type Theme = 'system' | 'light' | 'dark';
export type ZoneMark = 'pin' | 'segment' | 'radius';
export type WarnAt = 300 | 500 | 800 | 1000;

export type Settings = {
  chime: boolean;
  voice: boolean;
  onlyOverLimit: boolean;
  showStale: boolean;
  warnAt: WarnAt;
  mark: ZoneMark;
  theme: Theme;
};

export const defaultSettings: Settings = {
  chime: true,
  voice: false,
  onlyOverLimit: true,
  showStale: true,
  warnAt: 800,
  /**
   * The handoff recommended `segment` on the belief that the source publishes a
   * stretch of road. It does not — each site is a single published point (see
   * ingest/parse.mjs), so a bar along the road would be inventing an extent
   * nobody published. `pin` draws exactly what the source gives. `radius` stays
   * available for anyone who wants the uncertainty shown.
   */
  mark: 'pin',
  theme: 'system',
};

const STORAGE_KEY = 'verge.settings.v1';

type Ctx = {
  settings: Settings;
  /** True once the persisted settings have been read back off disk. */
  loaded: boolean;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  toggle: (key: 'chime' | 'voice' | 'onlyOverLimit' | 'showStale') => void;
};

const SettingsContext = createContext<Ctx | null>(null);

/** Drops unknown keys and keeps anything the stored blob is missing at default. */
function reconcile(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object') return defaultSettings;
  const stored = raw as Partial<Settings>;
  const out = { ...defaultSettings };
  for (const key of Object.keys(defaultSettings) as (keyof Settings)[]) {
    const value = stored[key];
    if (typeof value === typeof defaultSettings[key]) {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}

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
