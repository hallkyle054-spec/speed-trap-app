import { Tokens, dark, light } from './tokens';

/**
 * Google map styles are built from the same token pairs as the rest of the UI,
 * so the basemap reads like the design's engraving: near-monochrome land and
 * water, hairline roads, Lora-weight labels, no POIs, no terrain, no satellite.
 *
 * Style JSON takes opaque hex only, so the translucent ink tokens are composited
 * over the theme's ground first rather than being hardcoded a second time.
 */

const parse = (color: string): { r: number; g: number; b: number; a: number } => {
  const rgba = color.match(/rgba?\(([^)]+)\)/);
  if (rgba) {
    const [r, g, b, a = '1'] = rgba[1].split(',').map(part => part.trim());
    return { r: Number(r), g: Number(g), b: Number(b), a: Number(a) };
  }
  const hex = color.replace('#', '');
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
    a: 1,
  };
};

const channel = (value: number) =>
  Math.round(Math.max(0, Math.min(255, value)))
    .toString(16)
    .padStart(2, '0');

/** Composites `color` over `ground` and returns opaque `#rrggbb`. */
export function flatten(color: string, ground: string): string {
  const top = parse(color);
  const base = parse(ground);
  const mix = (t: number, b: number) => b + (t - b) * top.a;
  return `#${channel(mix(top.r, base.r))}${channel(mix(top.g, base.g))}${channel(mix(top.b, base.b))}`;
}

type StyleRule = {
  featureType?: string;
  elementType?: string;
  stylers: Record<string, string | number>[];
};

function buildStyle(t: Tokens): StyleRule[] {
  const on = (token: string) => flatten(token, t.bg);
  const land = t.bg;
  const water = t.sea;
  const road = on(t.road);
  const minorRoad = on(t.rule3);
  const label = on(t.mapLabel);
  const faintLabel = on(t.ink50);
  const border = on(t.rule2);

  return [
    { elementType: 'geometry', stylers: [{ color: land }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: label }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: land }] },

    // No points of interest, no terrain, no transit clutter.
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'landscape.natural.terrain', stylers: [{ visibility: 'off' }] },

    { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: border }] },
    {
      featureType: 'administrative.land_parcel',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'administrative.locality',
      elementType: 'labels.text.fill',
      stylers: [{ color: label }],
    },

    { featureType: 'road', elementType: 'geometry', stylers: [{ color: minorRoad }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: faintLabel }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: road }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: road }] },
    { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },

    { featureType: 'water', elementType: 'geometry', stylers: [{ color: water }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: faintLabel }] },
  ];
}

export const lightMapStyle = buildStyle(light);
export const darkMapStyle = buildStyle(dark);
