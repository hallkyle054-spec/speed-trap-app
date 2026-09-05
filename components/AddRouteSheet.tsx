import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Place, ROUTING_CONFIGURED, RoutingError, routeBetween, searchPlaces } from '../data/directions';
import { SavedRoute } from '../data/routes';
import { useTheme } from '../theme/ThemeProvider';
import { radius } from '../theme/tokens';
import { body, display, heading, kicker } from '../theme/type';
import { Button } from './Button';


type Field = 'from' | 'to';

export function AddRouteSheet({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (route: SavedRoute) => void;
}) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  const [field, setField] = useState<Field>('from');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [from, setFrom] = useState<Place | null>(null);
  const [to, setTo] = useState<Place | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setField('from');
    setQuery('');
    setResults([]);
    setFrom(null);
    setTo(null);
    setError(null);
    setSaving(false);
  }, []);

  useEffect(() => {
    if (visible) reset();
  }, [visible, reset]);

  /**
   * While this sheet is up, back closes it and stops there. Without this the
   * app-level handler also ran and dropped the user onto the Map tab — back
   * did two things at once.
   */
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  /** Only the newest search may write results, or a slow one overwrites a fast one. */
  const searchId = useRef(0);

  /**
   * Searching happens on submit rather than as you type. Place search is billed
   * per request and the quota cannot always be capped, so one deliberate search
   * costs one request instead of one per pause in typing.
   */
  const runSearch = useCallback(() => {
    const text = query.trim();
    if (text.length < 3) return;

    const id = ++searchId.current;
    setSearching(true);
    setError(null);
    searchPlaces(text)
      .then(found => {
        if (id !== searchId.current) return;
        setResults(found);
        if (found.length === 0) setError(`Nothing found for “${text}”.`);
      })
      .catch(e => {
        if (id !== searchId.current) return;
        setResults([]);
        setError(e instanceof RoutingError ? e.message : 'Place search failed.');
      })
      .finally(() => {
        if (id === searchId.current) setSearching(false);
      });
  }, [query]);

  const choose = (place: Place) => {
    setError(null);
    setResults([]);
    setQuery('');
    if (field === 'from') {
      setFrom(place);
      setField('to');
    } else {
      setTo(place);
    }
  };

  const save = async () => {
    if (!from || !to) return;
    setSaving(true);
    setError(null);
    try {
      const route = await routeBetween(from, to);
      onSave({
        id: `r-${Date.now()}`,
        title: `${from.name} → ${to.name}`,
        sub: `${route.summary} · ${route.minutes} min`,
        path: route.path,
      });
      onClose();
    } catch (e) {
      setError(e instanceof RoutingError ? e.message : 'Could not work out a route.');
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable
        accessibilityLabel="Dismiss"
        onPress={onClose}
        style={[styles.scrim, { backgroundColor: t.scrim }]}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.lift}
        pointerEvents="box-none"
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: t.bg,
              borderTopColor: t.rule,
              shadowColor: t.shadow,
              paddingTop: 14 + insets.top,
              // Clear of the gesture bar, and never flush against the edge.
              paddingBottom: Math.max(insets.bottom, 12) + 12,
            },
          ]}
        >
        <View style={[styles.handle, { backgroundColor: t.rule3 }]} />
        <Text style={[kicker(9.5, 0.14), { color: t.ink50 }]}>Saved routes</Text>
        <Text style={[display(30, -0.02), styles.title, { color: t.ink }]}>Add a route</Text>

        {!ROUTING_CONFIGURED ? (
          <Text style={[body(12), styles.note, { color: t.ink60 }]}>
            No routing key is configured, so places cannot be searched. See the README.
          </Text>
        ) : null}

        <View style={styles.ends}>
          <End label="From" place={from} active={field === 'from'} onPress={() => setField('from')} />
          <End label="To" place={to} active={field === 'to'} onPress={() => setField('to')} />
        </View>

        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={runSearch}
            editable={ROUTING_CONFIGURED && !saving}
            placeholder={field === 'from' ? 'Where from?' : 'Where to?'}
            placeholderTextColor={t.ink45}
            autoCorrect={false}
            returnKeyType="search"
            style={[body(14), styles.input, { color: t.ink, borderBottomColor: t.rule2 }]}
          />
          <Button
            label="Search"
            size={13}
            onPress={runSearch}
            disabled={!ROUTING_CONFIGURED || saving || query.trim().length < 3}
            style={[
              styles.searchButton,
              { opacity: !ROUTING_CONFIGURED || query.trim().length < 3 ? 0.5 : 1 },
            ]}
          />
        </View>

        {error ? (
          <View style={[styles.error, { borderLeftColor: t.accent }]}>
            <Text style={[body(11.5), styles.errorText, { color: t.ink70 }]}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button label="Cancel" tone="quiet" onPress={onClose} style={styles.action} />
          <Button
            label={saving ? 'Finding the road…' : 'Save route'}
            onPress={save}
            disabled={!from || !to || saving}
            style={[styles.action, { opacity: !from || !to || saving ? 0.5 : 1 }]}
          />
        </View>

        <View style={styles.results}>
          {searching ? <ActivityIndicator color={t.ink45} style={styles.spinner} /> : null}
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            {results.map(place => (
              <Pressable
                key={place.id}
                onPress={() => choose(place)}
                style={({ pressed }) => [
                  styles.result,
                  { borderBottomColor: t.rule, backgroundColor: pressed ? t.hover : 'transparent' },
                ]}
              >
                <Text style={[heading(16), { color: t.ink }]} numberOfLines={2}>
                  {place.name}
                </Text>
                <Text style={[body(11), { color: t.ink55 }]} numberOfLines={1}>
                  {place.address}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function End({
  label,
  place,
  active,
  onPress,
}: {
  label: string;
  place: Place | null;
  active: boolean;
  onPress: () => void;
}) {
  const { t } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.end, { borderColor: active ? t.accent : t.rule }]}>
      <Text style={[kicker(9.5, 0.13), { color: t.ink50 }]}>{label}</Text>
      <Text
        style={[heading(16), styles.endValue, { color: place ? t.ink : t.ink45 }]}
        numberOfLines={1}
      >
        {place ? place.name : 'Not set'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  lift: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '92%',
    borderTopWidth: 1,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: 18,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 32,
    shadowOpacity: 1,
    elevation: 12,
  },
  handle: { width: 38, height: 3, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  title: { marginTop: 6, marginBottom: 12, lineHeight: 30 * 1.08 },
  note: { marginBottom: 10 },
  ends: { flexDirection: 'row', gap: 10 },
  end: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: 11,
  },
  endValue: { marginTop: 2 },
  searchRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 14 },
  input: { flex: 1, paddingVertical: 10, borderBottomWidth: 1 },
  searchButton: { flexShrink: 0, minHeight: 44, paddingHorizontal: 16 },
  results: { flexShrink: 1, marginTop: 6 },
  spinner: { marginTop: 12 },
  result: { paddingVertical: 12, minHeight: 48, justifyContent: 'center', borderBottomWidth: 1 },
  error: { marginTop: 10, borderLeftWidth: 2, paddingLeft: 11, paddingVertical: 2 },
  errorText: { lineHeight: 11.5 * 1.6 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  action: { flex: 1, minHeight: 48 },
});
