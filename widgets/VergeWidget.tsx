import React from 'react';
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';

import { formatDistance } from '../data/geo';
import { shortDate } from '../data/zones';
import { flatten } from '../theme/mapStyle';
import { dark, light } from '../theme/tokens';
import { localityScale, localityRadius, localitySvg } from './locality';
import { PANEL_GAP, WidgetVariant, panelColumns, panelHeadlineSize } from './names';
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
  cover: { pad: 22, padY: 18, radius: 0, kicker: 13, headline: 56, caption: 16, foot: 11.5, gap: 10 },
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
  width,
}: {
  summary: WidgetSummary | null;
  isDark: boolean;
  variant?: WidgetVariant;
  /** The width Android gave the widget, in dp. Splits the panel's two columns. */
  width?: number;
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
    const marks = summary?.nearby ?? [];
    // A cover screen is wider than it is tall, so the panel is two columns.
    // Stacking them ran the diagram off the bottom edge.
    const col = panelColumns(width ?? 360, s.pad);
    // Sized to the column it sits in: a fixed size that fits a wide widget
    // wraps on a narrow one, and this panel is narrower than it looks.
    const headlineSize = panelHeadlineSize(col.reading);

    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{
          height: 'match_parent',
          width: 'match_parent',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          backgroundColor: ground,
          borderRadius: s.radius,
          paddingHorizontal: s.pad,
          paddingTop: s.padY,
          // Only the bottom keeps slack: the content is top-anchored and a host
          // that gives less height than it promised should lose empty space.
          paddingBottom: s.padY * 2,
        }}
      >
        {/*
          OPEN leads the top line, hard against the left margin. The top left is
          the one corner a cropped bitmap always keeps — it is where the drawing
          starts — and this button spent a build in the opposite corner, where
          the cover screen cut it in half. The kicker follows it and may
          truncate, which costs a label rather than the way into the app.
        */}
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <FlexWidget
            clickAction="OPEN_APP"
            style={{
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderRadius: 20,
              backgroundColor: accentWash,
              marginRight: 12,
            }}
          >
            <TextWidget
              text="OPEN"
              style={{ fontSize: s.kicker, letterSpacing: 1.6, color: ink, fontFamily: 'Lora' }}
            />
          </FlexWidget>
          <TextWidget
            text={showDistance ? 'NEAREST ZONE' : 'PUBLISHED ZONES'}
            maxLines={1}
            style={{ fontSize: s.kicker, letterSpacing: 1.4, color: faint, fontFamily: 'Lora' }}
          />
        </FlexWidget>

        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            width: 'match_parent',
            marginTop: 4,
          }}
        >
          <FlexWidget style={{ flexDirection: 'column', width: col.reading }}>
            <TextWidget
              text={headline}
              maxLines={1}
              style={{ fontSize: headlineSize, color: ink, fontFamily: 'CormorantGaramond' }}
            />
            <TextWidget
              text={caption}
              maxLines={2}
              style={{ fontSize: s.caption, color: muted, fontFamily: 'Lora', marginTop: 2 }}
            />
            <TextWidget
              text={`${limit ? `${limit} MPH · ` : ''}possible mobile camera${stamp}`}
              maxLines={2}
              style={{ fontSize: s.foot, color: faint, fontFamily: 'Lora', marginTop: 3 }}
            />
          </FlexWidget>

          {marks.length ? (
            <FlexWidget
              style={{
                flexDirection: 'column',
                alignItems: 'center',
                width: col.diagram,
                marginLeft: PANEL_GAP,
              }}
            >
              <SvgWidget
                svg={localitySvg(marks, { mark: markInk, ring: ringInk, ink })}
                style={{ width: col.diagram, height: col.diagram }}
              />
              <TextWidget
                text={`${marks.length} ${marks.length === 1 ? 'zone' : 'zones'} within ${localityScale(localityRadius(marks))}`}
                // Two lines: there is vertical room, and truncating this to one
                // would drop the scale, which is what makes the diagram legible.
                maxLines={2}
                style={{ fontSize: s.foot, color: muted, fontFamily: 'Lora', marginTop: 2 }}
              />
            </FlexWidget>
          ) : (
            <FlexWidget style={{ width: 0, height: 0 }} />
          )}
        </FlexWidget>
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
