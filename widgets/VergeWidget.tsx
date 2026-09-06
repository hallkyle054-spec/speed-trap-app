import React from 'react';
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';

import { formatDistance } from '../data/geo';
import { shortDate } from '../data/zones';
import { flatten } from '../theme/mapStyle';
import { dark, light } from '../theme/tokens';
import { localityScale, localityRadius, localitySvg } from './locality';
import { WidgetVariant } from './names';
import { WidgetSummary } from './summary';

/** Widget styles take a literal hex; the tokens are opaque after flattening. */
type Hex = `#${string}`;
const hex = (token: string, ground: string): Hex => flatten(token, ground) as Hex;

/**
 * The widget, in the three shapes Android actually hands it.
 *
 * `cover` is a Flip's whole Flex Window. `tile` is a home-screen cell with room
 * for the road. `compact` is a one-row strip, which has room for one line — so
 * it keeps the distance and the disclaimer and drops the road, because a
 * truncated road name is worth less than either.
 *
 * Whichever it is, it is read at arm's length, in a second, and its whole face
 * is a tap target that opens Verge.
 *
 * Widget styles take plain colours, not the app's translucent ink tokens, so
 * the tokens are composited over the ground first — the same treatment the map
 * style gets.
 */
/**
 * One scale per variant rather than a multiplier: these are read, not derived.
 *
 * `cover` has no corner radius of its own. A Flex Window widget is given the
 * whole panel and the host rounds it off, so rounding it again only opens a
 * gap at each corner with the host's own background showing through — the
 * widget stops meeting the edges. The widget already on this phone's cover
 * screen draws square and transparent for the same reason. The smaller
 * variants keep a radius: those sit on a home-screen grid with real space
 * around them, where a card edge is the point.
 */
const SIZES = {
  compact: { pad: 12, padY: 8, radius: 18, kicker: 8, headline: 26, caption: 9, foot: 8, gap: 8 },
  tile: { pad: 14, padY: 13, radius: 22, kicker: 9, headline: 38, caption: 11, foot: 9, gap: 6 },
  cover: { pad: 26, padY: 24, radius: 0, kicker: 13, headline: 78, caption: 18, foot: 12, gap: 10 },
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
  const accentWash = hex(t.accentTint2, t.bg);
  const markInk = t.mark as Hex;
  const ringInk = hex(t.ink40, t.bg);

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

  if (variant === 'cover') {
    const limit = summary?.nearestLimitMph;
    const stamp = summary && showDistance ? ` · as of ${clock(summary.at)}` : '';
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{
          height: 'match_parent',
          width: 'match_parent',
          flexDirection: 'column',
          // Everything hangs from the top. The cover screen does not give a
          // widget its whole declared height — the bottom band is spoken for,
          // and anything put there is unreadable and cannot be tapped. So the
          // slack goes at the bottom, where losing it costs nothing.
          justifyContent: 'flex-start',
          backgroundColor: ground,
          borderRadius: s.radius,
          paddingHorizontal: s.pad,
          paddingVertical: s.padY,
        }}
      >
        {/* The way into the app sits on the top line, the one place on a cover */}
        {/* screen guaranteed to be both visible and reachable. */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: 'match_parent',
          }}
        >
          <TextWidget
            text={showDistance ? 'NEAREST ZONE' : 'PUBLISHED ZONES'}
            style={{ fontSize: s.kicker, letterSpacing: 1.4, color: faint, fontFamily: 'Lora' }}
          />
          <FlexWidget
            clickAction="OPEN_APP"
            style={{
              paddingHorizontal: 18,
              paddingVertical: 11,
              borderRadius: 22,
              backgroundColor: accentWash,
            }}
          >
            <TextWidget
              text="OPEN"
              style={{ fontSize: s.kicker, letterSpacing: 1.6, color: ink, fontFamily: 'Lora' }}
            />
          </FlexWidget>
        </FlexWidget>

        <TextWidget
          text={headline}
          style={{ fontSize: s.headline, color: ink, fontFamily: 'CormorantGaramond', marginTop: 4 }}
        />
        <TextWidget
          text={caption}
          maxLines={2}
          style={{ fontSize: s.caption, color: muted, fontFamily: 'Lora', marginTop: 2 }}
        />
        <TextWidget
          text={`${limit ? `${limit} MPH · ` : ''}possible mobile camera${stamp}`}
          maxLines={2}
          style={{ fontSize: s.foot, color: faint, fontFamily: 'Lora', marginTop: 4 }}
        />

        {/*
          Last, because it is the one thing that still reads when its bottom
          edge is lost: a diagram missing its outer ring is still a diagram.
        */}
        {summary && summary.nearby.length ? (
          <FlexWidget
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              width: 'match_parent',
              marginTop: 8,
            }}
          >
            <SvgWidget
              svg={localitySvg(summary.nearby, { mark: markInk, ring: ringInk, ink })}
              style={{ width: 104, height: 104 }}
            />
            <FlexWidget style={{ flexDirection: 'column', marginLeft: 14 }}>
              <TextWidget
                text={`${summary.nearby.length}`}
                style={{ fontSize: 30, color: ink, fontFamily: 'CormorantGaramond' }}
              />
              <TextWidget
                text={summary.nearby.length === 1 ? 'zone within' : 'zones within'}
                style={{ fontSize: s.foot, color: muted, fontFamily: 'Lora' }}
              />
              <TextWidget
                text={localityScale(localityRadius(summary.nearby))}
                style={{ fontSize: s.caption, color: ink, fontFamily: 'Lora', marginTop: 2 }}
              />
            </FlexWidget>
          </FlexWidget>
        ) : (
          <FlexWidget style={{ width: 0, height: 0 }} />
        )}
      </FlexWidget>
    );
  }

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
            text="possible mobile camera"
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
            ? `as of ${clock(summary.at)} · possible mobile camera`
            : 'possible mobile camera'
        }
        maxLines={2}
        style={{ fontSize: s.foot, color: faint, fontFamily: 'Lora', marginTop: s.gap }}
      />
    </FlexWidget>
  );
}
