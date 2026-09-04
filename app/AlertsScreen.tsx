import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Segmented } from '../components/Segmented';
import { Switch } from '../components/Switch';
import { PUBLISHER, Sync, syncLabel } from '../data/feed';
import { Settings, Theme, WarnAt, ZoneMark } from '../state/settings';
import { useTheme } from '../theme/ThemeProvider';
import { body, display, kicker } from '../theme/type';

type Props = {
  settings: Settings;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  toggle: (key: 'chime' | 'voice' | 'onlyOverLimit' | 'showStale') => void;
  sync: Sync;
  fetchedAt: Date | null;
  now: Date;
  onRefresh: () => void;
  onSimulateOffline: () => void;
  topInset: number;
};

const WARN_OPTIONS: { value: WarnAt; label: string }[] = [
  { value: 300, label: '300' },
  { value: 500, label: '500' },
  { value: 800, label: '800' },
  { value: 1000, label: '1000' },
];

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/**
 * `pin` and `radius` are the treatments the design set aside; the control keeps
 * the choice switchable, as the handoff asks.
 */
const MARK_OPTIONS: { value: ZoneMark; label: string }[] = [
  { value: 'segment', label: 'Segment' },
  { value: 'pin', label: 'Point' },
  { value: 'radius', label: 'Radius' },
];

export function AlertsScreen({
  settings,
  set,
  toggle,
  sync,
  fetchedAt,
  now,
  onRefresh,
  onSimulateOffline,
  topInset,
}: Props) {
  const { t } = useTheme();

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: 16 + topInset, borderBottomColor: t.rule }]}>
        <Text style={[kicker(9.5, 0.14), { color: t.ink50 }]}>Settings</Text>
        <Text style={[display(31, -0.02), styles.h1, { color: t.ink }]}>Alerts</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <SectionLabel first>While driving</SectionLabel>

        <Row
          label="Audio chime"
          sub="A single soft tone at the alert distance"
          control={
            <Switch value={settings.chime} onChange={() => toggle('chime')} label="Audio chime" />
          }
        />
        <Row
          label="Spoken announcement"
          sub={`“Published zone in ${settings.warnAt} metres”`}
          control={
            <Switch
              value={settings.voice}
              onChange={() => toggle('voice')}
              label="Spoken announcement"
            />
          }
        />
        <Row
          label="Only when over the limit"
          sub="Stay quiet if you are already under"
          control={
            <Switch
              value={settings.onlyOverLimit}
              onChange={() => toggle('onlyOverLimit')}
              label="Only when over the limit"
            />
          }
        />

        <View style={styles.controlBlock}>
          <Text style={[body(14), styles.controlLabel, { color: t.ink }]}>Warn me at</Text>
          <Segmented
            label="Warn me at, in metres"
            options={WARN_OPTIONS}
            value={settings.warnAt}
            onChange={value => set('warnAt', value)}
            figures
          />
        </View>

        <SectionLabel>Appearance</SectionLabel>
        <View style={styles.themeBlock}>
          <Segmented
            label="Appearance"
            options={THEME_OPTIONS}
            value={settings.theme}
            onChange={value => set('theme', value)}
          />
          <Text style={[body(11), styles.controlSub, { color: t.ink55 }]}>
            System follows your phone&rsquo;s light or dark setting.
          </Text>
        </View>

        <SectionLabel>Map</SectionLabel>
        <View style={styles.themeBlock}>
          <Segmented
            label="Zone mark"
            options={MARK_OPTIONS}
            value={settings.mark}
            onChange={value => set('mark', value)}
          />
          <Text style={[body(11), styles.controlSub, { color: t.ink55 }]}>
            How a zone is drawn on the map. A segment matches how the zones are published.
          </Text>
        </View>

        <SectionLabel>Data</SectionLabel>
        <Row
          label="Show stale zones"
          sub="Zones not republished in the last 7 days"
          control={
            <Switch
              value={settings.showStale}
              onChange={() => toggle('showStale')}
              label="Show stale zones"
            />
          }
        />
        <Row
          label="Last fetched"
          sub={syncLabel(sync, fetchedAt, now)}
          subTabular
          control={
            <Button
              label="Fetch now"
              tone="quiet"
              size={12}
              onPress={onRefresh}
              style={styles.smallButton}
              disabled={sync === 'syncing'}
            />
          }
        />
        {__DEV__ ? (
          <Row
            label="Simulate offline"
            sub="Development only — exercises the offline banner"
            control={
              <Button
                label="Go offline"
                tone="quiet"
                size={12}
                onPress={onSimulateOffline}
                style={styles.smallButton}
              />
            }
          />
        ) : null}

        <Text style={[body(11), styles.closing, { color: t.ink50 }]}>
          Verge reads the zone list {PUBLISHER} publishes and plots it. It does not detect cameras,
          and a published zone is not a promise that enforcement is taking place.
        </Text>
      </ScrollView>
    </View>
  );
}

function SectionLabel({ children, first }: { children: React.ReactNode; first?: boolean }) {
  const { t } = useTheme();
  return (
    <Text
      style={[kicker(9.5, 0.13), styles.section, first ? styles.sectionFirst : null, { color: t.ink50 }]}
    >
      {children}
    </Text>
  );
}

function Row({
  label,
  sub,
  control,
  subTabular,
}: {
  label: string;
  sub: string;
  control: React.ReactNode;
  subTabular?: boolean;
}) {
  const { t } = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: t.rule }]}>
      <View style={styles.rowText}>
        <Text style={[body(14), { color: t.ink }]}>{label}</Text>
        <Text
          style={[body(11), subTabular ? { fontVariant: ['tabular-nums' as const] } : null, { color: t.ink55 }]}
        >
          {sub}
        </Text>
      </View>
      {control}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 18, paddingBottom: 10, borderBottomWidth: 1 },
  h1: { marginTop: 7, lineHeight: 31 * 1.05 },
  body: { paddingTop: 4, paddingHorizontal: 18, paddingBottom: 20 },
  section: { marginTop: 22, marginBottom: 6 },
  sectionFirst: { marginTop: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  rowText: { flexShrink: 1, gap: 1 },
  controlBlock: { paddingTop: 13, paddingBottom: 4 },
  controlLabel: { marginBottom: 8 },
  themeBlock: { paddingTop: 4, paddingBottom: 6 },
  controlSub: { marginTop: 7 },
  smallButton: { paddingVertical: 5, paddingHorizontal: 11 },
  closing: { marginTop: 18, lineHeight: 11 * 1.65 },
});
