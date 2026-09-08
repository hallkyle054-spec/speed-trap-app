import React from 'react';
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';

import { formatDistance } from '../data/geo';
import { shortDate } from '../data/zones';
import { flatten } from '../theme/mapStyle';
import { dark, light } from '../theme/tokens';
import { localityScale, localityRadius, localitySvg } from './locality';
import { PANEL_GAP, WidgetVariant, panelBand, panelHeadlineSize, panelPadding } from './names';
import { WidgetSummary } from './summary';
import { font } from '../theme/type';

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
  height,
}: {
  summary: WidgetSummary | null;
  isDark: boolean;
  variant?: WidgetVariant;
  /** The size Android gave the widget, in dp. The panel is laid out from it. */
  width?: number;
  height?: number;
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
  const ruleInk = hex(t.rule, t.bg);

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
    const band = panelBand(width ?? 320, s.pad);
    const headlineSize = panelHeadlineSize(band.inner, height ?? 300);

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
          // The far edges carry the overhang, so a `match_parent` child stops
          // where the card does rather than where the bitmap does.
          ...panelPadding(s.pad, s.padY),
        }}
      >
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: band.inner,
          }}
        >
          <TextWidget
            text={showDistance ? 'NEAREST ZONE' : 'PUBLISHED ZONES'}
            maxLines={1}
            style={{ fontSize: s.kicker, letterSpacing: 1.5, color: faint, fontFamily: font.body }}
          />
          <FlexWidget
            clickAction="OPEN_APP"
            style={{
              paddingHorizontal: 16,
              paddingVertical: 9,
              borderRadius: 18,
              backgroundColor: accentWash,
            }}
          >
            <TextWidget
              text="OPEN"
              style={{ fontSize: s.kicker, letterSpacing: 1.6, color: ink, fontFamily: font.body }}
            />
          </FlexWidget>
        </FlexWidget>

        {/*
          The reading runs the full width of the panel and shares its rows with
          nothing. That is what lets the distance be set large and a road name
          like "Model Church in Wales School" sit on one line.
        */}
        <TextWidget
          text={headline}
          maxLines={1}
          style={{
            fontSize: headlineSize,
            color: ink,
            fontFamily: font.display,
            marginTop: 6,
          }}
        />
        <TextWidget
          text={caption}
          maxLines={1}
          style={{ fontSize: s.caption, color: muted, fontFamily: font.body, marginTop: 2 }}
        />
        <TextWidget
          text={`${limit ? `${limit} MPH · ` : ''}possible mobile camera${stamp}`}
          maxLines={1}
          style={{ fontSize: s.foot, color: faint, fontFamily: font.body, marginTop: 3 }}
        />

        {marks.length ? (
          <FlexWidget style={{ flexDirection: 'column', width: band.inner }}>
            {/* A hairline, as everywhere else in the app, so the locality reads
                as its own band rather than more of the same paragraph. */}
            <FlexWidget
              style={{
                width: band.inner,
                height: 1,
                backgroundColor: ruleInk,
                marginTop: 12,
                marginBottom: 10,
              }}
            />
            <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: band.inner }}>
              <SvgWidget
                svg={localitySvg(marks, { mark: markInk, ring: ringInk, ink })}
                style={{ width: band.diagram, height: band.diagram }}
              />
              <FlexWidget
                style={{ flexDirection: 'column', width: band.caption, marginLeft: PANEL_GAP }}
              >
                <TextWidget
                  text={`${marks.length}`}
                  style={{ fontSize: s.caption * 2, color: ink, fontFamily: font.display }}
                />
                <TextWidget
                  text={`${marks.length === 1 ? 'zone' : 'zones'} within ${localityScale(localityRadius(marks))}`}
                  maxLines={2}
                  style={{ fontSize: s.foot, color: muted, fontFamily: font.body, marginTop: 1 }}
                />
              </FlexWidget>
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
          style={{ fontSize: s.headline, color: ink, fontFamily: font.display }}
        />
        <FlexWidget style={{ flexDirection: 'column', marginLeft: s.gap }}>
          <TextWidget
            text={showDistance ? 'NEAREST ZONE' : 'PUBLISHED ZONES'}
            style={{ fontSize: s.kicker, letterSpacing: 1.1, color: faint, fontFamily: font.body }}
          />
          <TextWidget
            text="possible mobile camera"
            style={{ fontSize: s.foot, color: faint, fontFamily: font.body, marginTop: 1 }}
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
          style={{ fontSize: s.kicker, letterSpacing: 1.2, color: faint, fontFamily: font.body }}
        />
        <TextWidget
          text={headline}
          style={{ fontSize: s.headline, color: ink, fontFamily: font.display, marginTop: 2 }}
        />
        <TextWidget
          text={caption}
          maxLines={3}
          style={{ fontSize: s.caption, color: muted, fontFamily: font.body, marginTop: 2 }}
        />
      </FlexWidget>
      <TextWidget
        text={
          summary && showDistance
            ? `as of ${clock(summary.at)} · possible mobile camera`
            : 'possible mobile camera'
        }
        maxLines={2}
        style={{ fontSize: s.foot, color: faint, fontFamily: font.body, marginTop: s.gap }}
      />
    </FlexWidget>
  );
}
