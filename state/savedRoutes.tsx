import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { SavedRoute, fixtureRoutes, parseRoutes, routesToPersist } from '../data/routes';

/**
 * Saved routes, persisted on the device. The fixture routes stand in until the
 * first edit, so the tab is never empty on a fresh install.
 *
 * A route marked `temporary` lives in this list like any other — it draws on
 * the map, it counts its zones, it can be removed — but it is filtered out on
 * the way to storage. It means "from where I am now to there", so surviving a
 * restart would make it a lie.
 */

const STORAGE_KEY = 'verge.routes.v1';

type Ctx = {
  routes: SavedRoute[];
  add: (route: SavedRoute) => void;
  remove: (id: string) => void;
};

const RoutesContext = createContext<Ctx | null>(null);

export function SavedRoutesProvider({ children }: { children: React.ReactNode }) {
  const [routes, setRoutes] = useState<SavedRoute[]>(fixtureRoutes);
  const loaded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(json => {
        if (cancelled || !json) return;
        // An empty stored list is a real state — the user deleted them all.
        setRoutes(parseRoutes(JSON.parse(json)));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) loaded.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: SavedRoute[]) => {
    setRoutes(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(routesToPersist(next))).catch(() => {});
  }, []);

  const add = useCallback(
    (route: SavedRoute) =>
      // Only one temporary route at a time: a second "from here" replaces the
      // first rather than leaving a trail of routes from places you have left.
      persist([
        ...routesRef.current.filter(r => !(route.temporary && r.temporary)),
        route,
      ]),
    [persist],
  );
  const remove = useCallback(
    (id: string) => persist(routesRef.current.filter(r => r.id !== id)),
    [persist],
  );

  // Callers hold onto `add`/`remove`; a ref keeps them working off the current
  // list without changing identity on every edit.
  const routesRef = useRef(routes);
  useEffect(() => {
    routesRef.current = routes;
  }, [routes]);

  const value = useMemo(() => ({ routes, add, remove }), [routes, add, remove]);
  return <RoutesContext.Provider value={value}>{children}</RoutesContext.Provider>;
}

export function useSavedRoutes(): Ctx {
  const ctx = useContext(RoutesContext);
  if (!ctx) throw new Error('useSavedRoutes must be used inside <SavedRoutesProvider>');
  return ctx;
}
