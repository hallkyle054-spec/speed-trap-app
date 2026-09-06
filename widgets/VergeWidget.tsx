import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { formatDistance } from '../data/geo';
import { shortDate } from '../data/zones';
import { flatten } from '../theme/mapStyle';
import { dark, light } from '../theme/tokens';
import { WidgetSummary } from './summary';

/** Widget styles take a literal hex; the tokens are opaque after flattening. */
type Hex = `#${string}`;
const hex = (token: string, ground: string): Hex => flatten(token, ground) as Hex;

/**
 * The widget, in the two shapes Android actually hands it.
 *
 * `tile` is a 2x2 cell with room for the road. `compact` is the 2x1 strip a
 * Flip's cover screen offers, which has room for one line — so it keeps the
 * distance and the disclaimer and drops the road, because a truncated road name
 * is worth less than either.
 *
 * Either way it is read at arm's length, in a second, and its whole face is a
 * tap target that opens Verge.
 *
 * Widget styles take plain colours, not the app's translucent ink tokens, so
 * the tokens are composited over the ground first — the same treatment the map
 * style gets.
 */
export type WidgetVariant = 'tile' | 'compact';

/** One scale per variant rather than a multiplier: these are read, not derived. */
const SIZES = {
  tile: { pad: 14, padY: 13, radius: 22, kicker: 9, headline: 38, caption: 11, foot: 9, gap: 6 },
  compact: { pad: 12, padY: 8, radius: 18, kicker: 8, headline: 26, caption: 9, foot: 8, gap: 8 },
} as const;

const clock = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export function VergeWidget({
  summary,
  isDark,
  variant = 'tile',
}: {
  summary: WidgetSummary | null;
  isDark: boolean;
  variant?: WidgetVariant;
}) {
  const t = isDark ? dark : light;
  const s = SIZES[variant];
  const ground = t.bg as Hex;
  const ink = t.ink as Hex;
  const muted = hex(t.ink55, t.bg);
  const faint = hex(t.ink45, t.bg);

  // With no position yet the count is the honest headline; a distance would be
  // inventing a proximity nobody measured.
  const showDistance = summary?.nearestMetres != null && summary.fromRealFix;
  const headline = !summary
    ? '—'
    : showDistance
      ? formatDistance(summary.nearestMetres as number)
      : String(summary.zoneCount);
  const caption = !summary
    ? 'Open Verge to load the list'
    : showDistance
      ? (summary.nearestLabel ?? 'Nearest published zone')
      : `zones published${summary.listedOn ? ` · ${shortDate(summary.listedOn)}` : ''}`;

  if (variant === 'compact') {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{
          height: 'match_parent',
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: ground,
          borderRadius: s.radius,
          paddingHorizontal: s.pad,
          paddingVertical: s.padY,
        }}
      >
        <TextWidget
          text={headline}
          style={{ fontSize: s.headline, color: ink, fontFamily: 'CormorantGaramond' }}
        />
        <FlexWidget style={{ flexDirection: 'column', marginLeft: s.gap }}>
          <TextWidget
            text={showDistance ? 'NEAREST ZONE' : 'PUBLISHED ZONES'}
            style={{ fontSize: s.kicker, letterSpacing: 1.1, color: faint, fontFamily: 'Lora' }}
          />
          <TextWidget
            text="camera not confirmed"
            style={{ fontSize: s.foot, color: faint, fontFamily: 'Lora', marginTop: 1 }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        // There is room to breathe at both sizes, so the reading sits at the
        // top and the provenance line holds the bottom edge.
        justifyContent: 'space-between',
        backgroundColor: ground,
        borderRadius: s.radius,
        paddingHorizontal: s.pad,
        paddingVertical: s.padY,
      }}
    >
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget
          text={showDistance ? 'NEAREST ZONE' : 'PUBLISHED ZONES'}
          style={{ fontSize: s.kicker, letterSpacing: 1.2, color: faint, fontFamily: 'Lora' }}
        />
        <TextWidget
          text={headline}
          style={{ fontSize: s.headline, color: ink, fontFamily: 'CormorantGaramond', marginTop: 2 }}
        />
        <TextWidget
          text={caption}
          maxLines={3}
          style={{ fontSize: s.caption, color: muted, fontFamily: 'Lora', marginTop: 2 }}
        />
      </FlexWidget>
      <TextWidget
        text={
          summary && showDistance
            ? `as of ${clock(summary.at)} · camera not confirmed`
            : 'camera not confirmed'
        }
        maxLines={2}
        style={{ fontSize: s.foot, color: faint, fontFamily: 'Lora', marginTop: s.gap }}
      />
    </FlexWidget>
  );
}
