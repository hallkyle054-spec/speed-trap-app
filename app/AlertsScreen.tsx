import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { InfoNote } from '../components/InfoNote';
import { Segmented } from '../components/Segmented';
import { Switch } from '../components/Switch';
import { countyIsOn, setCounties } from '../data/counties';
import { PUBLISHER, Sync, syncLabel } from '../data/feed';
import { ForceGroup, groupByForce } from '../data/forces';
import { Settings, Theme, WarnAt, ZoneMark } from '../state/settings';
import { useTheme } from '../theme/ThemeProvider';
import { body, display, kicker } from '../theme/type';

type Props = {
  settings: Settings;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  toggle: (key: 'chime' | 'voice' | 'showStale') => void;
  sync: Sync;
  fetchedAt: Date | null;
  now: Date;
  onRefresh: () => void;
  onSimulateOffline: () => void;
  /** Every county the feed carries, in the order the picker should list them. */
  counties: string[];
  /** How many zones the publisher has dropped from its list. */
  removedCount: number;
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
 * Point draws the published coordinate; Radius draws the uncertainty around it;
 * Both draws each, because they answer different questions and wanting the
 * exact published point inside the rough area is not a contradiction. The
 * design's fourth treatment, a bar along the road, is not offered: the source
 * publishes no extent to draw one from.
 */
const MARK_OPTIONS: { value: ZoneMark; label: string }[] = [
  { value: 'pin', label: 'Point' },
  { value: 'radius', label: 'Radius' },
  { value: 'both', label: 'Both' },
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
  counties,
  removedCount,
  topInset,
}: Props) {
  const { t } = useTheme();

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: 16 + topInset, borderBottomColor: t.rule }]}>
        <Text style={[kicker(9.5, 0.14), { color: t.ink50 }]}>Settings</Text>
        <Text style={[display(31, -0.02), styles.h1, { color: t.ink }]}>More</Text>
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
          <InfoNote about="appearance">
            System follows your phone&rsquo;s light or dark setting. The cover-screen widget
            follows whichever you pick here rather than the phone, so the two always match.
          </InfoNote>
        </View>

        <SectionLabel>Map</SectionLabel>
        <View style={styles.themeBlock}>
          <Segmented
            label="Zone mark"
            options={MARK_OPTIONS}
            value={settings.mark}
            onChange={value => set('mark', value)}
          />
          <InfoNote about="the zone mark">
            How a zone is drawn. The source publishes a single point per zone, so Radius shows
            roughly where it is rather than implying the point is the whole of it. Both draws the
            circle and the point together — the area to watch, and the coordinate as published.
          </InfoNote>
        </View>

        <SectionLabel>Coverage</SectionLabel>
        <View style={styles.themeBlock}>
          <InfoNote about="coverage">
            Wales, by force. Each one opens onto its counties if you want to be finer than that.
            Leave everything on and you get the whole country, which is what a new install does;
            one county always stays on, because a map filtered down to nothing is not a map.
          </InfoNote>
        </View>
        {groupByForce(counties).map(group => (
          <ForceSection
            key={group.force}
            group={group}
            selected={settings.counties}
            onSet={(changing, on) => set('counties', setCounties(settings.counties, counties, changing, on))}
          />
        ))}

        <SectionLabel>Data</SectionLabel>
        <Row
          label="Show removed zones"
          sub={
            removedCount === 0
              ? 'None yet — nothing has been dropped from the list'
              : removedCount === 1
                ? '1 zone has been dropped from the published list'
                : `${removedCount} zones have been dropped from the published list`
          }
          control={
            <Switch
              value={settings.showStale}
              onChange={() => toggle('showStale')}
              label="Show removed zones"
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

        <View style={styles.closing}>
          <InfoNote about="where this data comes from">
            Verge reads the zone list {PUBLISHER} publishes and plots it. It does not detect
            cameras, and a published zone is not a promise that enforcement is taking place.
          </InfoNote>
        </View>
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

/**
 * One force, with its counties folded away underneath.
 *
 * The force is the control a driver actually reaches for — four rows against
 * twenty-two, and "the patch I drive" is a force far more often than it is a
 * county. The counties are still there for anyone who wants to be finer than
 * that, but they are opened, not scrolled past.
 *
 * The switch reads "this force puts anything on the map", so a force with some
 * of its counties on shows on, with the count saying how many. Turning it off
 * takes the whole force off; turning it on brings the whole force back.
 */
function ForceSection({
  group,
  selected,
  onSet,
}: {
  group: ForceGroup;
  selected: readonly string[];
  onSet: (changing: string[], on: boolean) => void;
}) {
  const { t } = useTheme();
  const [open, setOpen] = useState(false);

  const on = group.counties.filter(c => countyIsOn(c, selected));
  const all = on.length === group.counties.length;
  const total = group.counties.length;

  return (
    <View>
      <Row
        label={group.force}
        sub={
          all
            ? `All ${total} ${total === 1 ? 'county' : 'counties'}`
            : on.length === 0
              ? 'Off — nothing from this force is plotted'
              : `${on.length} of ${total} counties`
        }
        control={
          <View style={styles.forceControl}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={
                open ? `Hide the counties in ${group.force}` : `Show the counties in ${group.force}`
              }
              onPress={() => setOpen(o => !o)}
              hitSlop={10}
            >
              <Text style={[kicker(9.5, 0.12), { color: open ? t.accentInk : t.ink50 }]}>
                {open ? 'Hide' : 'Counties'}
              </Text>
            </Pressable>
            <Switch
              value={on.length > 0}
              label={group.force}
              onChange={() => onSet([...group.counties], on.length === 0)}
            />
          </View>
        }
      />

      {open
        ? group.counties.map(county => {
            const county_on = countyIsOn(county, selected);
            return (
              <View key={county} style={styles.nested}>
                <Row
                  label={county}
                  sub={county_on ? 'Included' : 'Hidden from the map, the list and the alerts'}
                  control={
                    <Switch
                      value={county_on}
                      label={county}
                      onChange={() => onSet([county], !county_on)}
                    />
                  }
                />
              </View>
            );
          })
        : null}
    </View>
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
  forceControl: { flexDirection: 'row', alignItems: 'center', gap: 14, flexShrink: 0 },
  // Indented rather than boxed: the counties are the same list one level in,
  // and a border around them would read as a different kind of setting.
  nested: { paddingLeft: 16 },
  controlBlock: { paddingTop: 13, paddingBottom: 4 },
  controlLabel: { marginBottom: 8 },
  themeBlock: { paddingTop: 4, paddingBottom: 6 },
  controlSub: { marginTop: 7 },
  smallButton: { flexShrink: 0, minHeight: 40, paddingHorizontal: 14 },
  closing: { marginTop: 18, lineHeight: 11 * 1.65 },
});
