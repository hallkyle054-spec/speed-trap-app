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
 * The cover-screen widget: a 2x2 square, because that is the cell a Flip's
 * cover screen offers. It is read at arm's length, in a second, so it says one
 * thing large and everything else quietly — and the whole face is a tap target
 * that opens Verge, which is how the app gets started without unfolding the
 * phone.
 *
 * Widget styles take plain colours, not the app's translucent ink tokens, so
 * the tokens are composited over the ground first — the same treatment the map
 * style gets.
 */

const clock = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export function VergeWidget({
  summary,
  isDark,
}: {
  summary: WidgetSummary | null;
  isDark: boolean;
}) {
  const t = isDark ? dark : light;
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

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        // A square has room to breathe, so the reading sits at the top and the
        // provenance line holds the bottom edge rather than trailing after it.
        justifyContent: 'space-between',
        backgroundColor: ground,
        borderRadius: 22,
        paddingHorizontal: 14,
        paddingVertical: 13,
      }}
    >
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget
          text={showDistance ? 'NEAREST ZONE' : 'PUBLISHED ZONES'}
          style={{ fontSize: 9, letterSpacing: 1.2, color: faint, fontFamily: 'Lora' }}
        />
        <TextWidget
          text={headline}
          style={{ fontSize: 38, color: ink, fontFamily: 'CormorantGaramond', marginTop: 2 }}
        />
        <TextWidget
          text={caption}
          maxLines={3}
          style={{ fontSize: 11, color: muted, fontFamily: 'Lora', marginTop: 2 }}
        />
      </FlexWidget>
      <TextWidget
        text={
          summary && showDistance
            ? `as of ${clock(summary.at)} · camera not confirmed`
            : 'camera not confirmed'
        }
        maxLines={2}
        style={{ fontSize: 9, color: faint, fontFamily: 'Lora', marginTop: 6 }}
      />
    </FlexWidget>
  );
}
