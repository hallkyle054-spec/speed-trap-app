import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Place, Route, RoutingError, routeBetween, searchPlaces } from '../data/directions';
import { LatLng } from '../data/geo';
import { useTheme } from '../theme/ThemeProvider';
import { body, display, kicker } from '../theme/type';

/**
 * Setting a route from the cover screen.
 *
 * There is only one thing to ask for: where you are going. The start is
 * wherever the driver is standing, which is the only sensible answer when the
 * phone is shut and the car is running — so this asks for a destination and
 * nothing else, and the panel closes the moment it has one.
 *
 * Searching runs on submit rather than as you type. Place search is billed per
 * request, so one deliberate search costs one request instead of one per pause
 * in typing — the same bargain the phone-screen sheet makes.
 */

/** How many results fit on a four-inch panel without becoming a list to scroll. */
const MAX_RESULTS = 4;

export function CoverRoute({
  origin,
  onRouted,
  onCancel,
  insets,
}: {
  /** The driver's current fix; the route starts here. */
  origin: LatLng;
  onRouted: (route: Route, destination: Place) => void;
  onCancel: () => void;
  insets: { top: number; bottom: number };
}) {
  const { t } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Only the newest search may write results, or a slow one overwrites a fast one. */
  const searchId = useRef(0);

  const runSearch = useCallback(() => {
    const text = query.trim();
    if (text.length < 3) return;

    const id = ++searchId.current;
    setBusy(true);
    setError(null);
    searchPlaces(text)
      .then(found => {
        if (id !== searchId.current) return;
        setResults(found.slice(0, MAX_RESULTS));
        if (found.length === 0) setError(`Nothing found for “${text}”.`);
      })
      .catch(e => {
        if (id !== searchId.current) return;
        setResults([]);
        setError(e instanceof RoutingError ? e.message : 'Place search failed.');
      })
      .finally(() => {
        if (id === searchId.current) setBusy(false);
      });
  }, [query]);

  const choose = async (place: Place) => {
    const id = ++searchId.current;
    setBusy(true);
    setError(null);
    setResults([]);
    try {
      const here: Place = {
        id: 'here',
        name: 'Here',
        address: 'Current location',
        location: origin,
      };
      const route = await routeBetween(here, place);
      onRouted(route, place);
    } catch (e) {
      if (id !== searchId.current) return;
      setError(e instanceof RoutingError ? e.message : 'Could not work out a route.');
    } finally {
      if (id === searchId.current) setBusy(false);
    }
  };

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: t.bg,
          paddingTop: insets.top + 10,
          paddingBottom: Math.max(insets.bottom, 8) + 8,
        },
      ]}
    >
      <View style={styles.head}>
        <Text style={[kicker(8.5, 0.14), styles.kicker, { color: t.ink50 }]}>
          ROUTE FROM HERE
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          onPress={onCancel}
          style={({ pressed }) => [
            styles.cancel,
            { backgroundColor: pressed ? t.accentTint : 'transparent', borderColor: t.rule2 },
          ]}
        >
          <Text style={[body(10), { color: t.ink60 }]}>Cancel</Text>
        </Pressable>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={runSearch}
        placeholder="Where to?"
        placeholderTextColor={t.ink40}
        autoFocus
        returnKeyType="search"
        editable={!busy}
        style={[
          body(14),
          styles.input,
          { color: t.ink, borderColor: t.rule, backgroundColor: t.legendBg },
        ]}
      />

      {busy ? (
        <View style={styles.busy}>
          <ActivityIndicator color={t.ink45} />
        </View>
      ) : null}

      {error ? <Text style={[body(10), styles.error, { color: t.ink60 }]}>{error}</Text> : null}

      <ScrollView keyboardShouldPersistTaps="handled" style={styles.results}>
        {results.map(place => (
          <Pressable
            key={place.id}
            accessibilityRole="button"
            onPress={() => choose(place)}
            style={({ pressed }) => [
              styles.result,
              { borderBottomColor: t.rule, backgroundColor: pressed ? t.accentTint : 'transparent' },
            ]}
          >
            <Text numberOfLines={1} style={[display(15, -0.01), { color: t.ink }]}>
              {place.name}
            </Text>
            <Text numberOfLines={1} style={[body(10), styles.address, { color: t.ink55 }]}>
              {place.address}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, paddingHorizontal: 10 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { flexShrink: 1 },
  cancel: {
    flexShrink: 0,
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 15,
  },
  input: {
    marginTop: 8,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  busy: { paddingVertical: 8 },
  error: { marginTop: 6 },
  results: { marginTop: 4 },
  result: { paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth },
  address: { marginTop: 1 },
});
