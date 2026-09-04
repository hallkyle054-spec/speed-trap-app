import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useSettings } from '../state/settings';
import { dark, light, Tokens } from './tokens';

type ThemeCtx = { t: Tokens; isDark: boolean };

const Ctx = createContext<ThemeCtx>({ t: light, isDark: false });

/**
 * `system` follows Configuration.uiMode and updates live when the OS setting
 * changes; `light` / `dark` pin it.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const scheme = useColorScheme();
  const sysDark = scheme === 'dark';

  const value = useMemo<ThemeCtx>(() => {
    const isDark = settings.theme === 'dark' || (settings.theme === 'system' && sysDark);
    return { t: isDark ? dark : light, isDark };
  }, [settings.theme, sysDark]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
