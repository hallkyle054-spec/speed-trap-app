import { LatLng } from './geo';
import { decodePolyline, simplifyPath } from './polyline';

/**
 * Place search and road routing, for building a saved route.
 *
 * ⚠️ These are Google **Web Service** APIs, and an Android application
 * restriction does not apply to them — a key locked to a package name and
 * signing certificate is rejected here. They need their own key, restricted by
 * API rather than by app, which is why this reads a separate variable. Cap its
 * daily quota in the Cloud console: the key ships inside the APK and anyone
 * with the file can extract it.
 */

const ROUTES_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_ROUTES_API_KEY ??
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
  '';

export const ROUTING_CONFIGURED = ROUTES_KEY.length > 0;

const TIMEOUT_MS = 12_000;

export type Place = {
  id: string;
  /** 'Llanelli' */
  name: string;
  /** 'Llanelli, Carmarthenshire, UK' */
  address: string;
  location: LatLng;
};

export type Route = {
  path: LatLng[];
  minutes: number;
  /** The roads the route mostly follows, as Google summarises them. */
  summary: string;
};

export class RoutingError extends Error {}

async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

/** Text search, biased to Wales, for picking the ends of a route. */
export async function searchPlaces(query: string): Promise<Place[]> {
  if (!ROUTING_CONFIGURED) throw new RoutingError('No routing key is configured.');
  const text = query.trim();
  if (text.length < 3) return [];

  const body = {
    textQuery: text,
    regionCode: 'GB',
    maxResultCount: 6,
    locationBias: {
      circle: { center: { latitude: 51.86, longitude: -4.15 }, radius: 40_000 },
    },
  };

  const res = await withTimeout(signal =>
    fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': ROUTES_KEY,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location',
      },
      body: JSON.stringify(body),
    }),
  );

  if (!res.ok) {
    throw new RoutingError(
      res.status === 403
        ? 'The routing key was rejected. A key restricted to Android apps cannot call Places; it needs its own key restricted by API.'
        : `Place search failed (${res.status}).`,
    );
  }

  const json = (await res.json()) as {
    places?: {
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
    }[];
  };

  return (json.places ?? [])
    .map(p => ({
      id: String(p.id ?? ''),
      name: p.displayName?.text ?? p.formattedAddress ?? '',
      address: p.formattedAddress ?? '',
      location: {
        latitude: Number(p.location?.latitude),
        longitude: Number(p.location?.longitude),
      },
    }))
    .filter(
      p =>
        p.id &&
        p.name &&
        Number.isFinite(p.location.latitude) &&
        Number.isFinite(p.location.longitude),
    );
}

/** The driving route between two places, as road geometry. */
export async function routeBetween(from: Place, to: Place): Promise<Route> {
  if (!ROUTING_CONFIGURED) throw new RoutingError('No routing key is configured.');

  const params = new URLSearchParams({
    origin: `${from.location.latitude},${from.location.longitude}`,
    destination: `${to.location.latitude},${to.location.longitude}`,
    mode: 'driving',
    region: 'gb',
    units: 'metric',
    key: ROUTES_KEY,
  });

  const res = await withTimeout(signal =>
    fetch(`https://maps.googleapis.com/maps/api/directions/json?${params}`, { signal }),
  );
  if (!res.ok) throw new RoutingError(`Routing failed (${res.status}).`);

  const json = (await res.json()) as {
    status?: string;
    error_message?: string;
    routes?: {
      summary?: string;
      overview_polyline?: { points?: string };
      legs?: { duration?: { value?: number } }[];
    }[];
  };

  if (json.status !== 'OK') {
    throw new RoutingError(
      json.status === 'REQUEST_DENIED'
        ? 'The routing key was rejected. A key restricted to Android apps cannot call Directions; it needs its own key restricted by API.'
        : json.error_message || `Routing failed (${json.status ?? 'unknown'}).`,
    );
  }

  const route = json.routes?.[0];
  const encoded = route?.overview_polyline?.points;
  if (!encoded) throw new RoutingError('No route was returned between those places.');

  const path = simplifyPath(decodePolyline(encoded));
  if (path.length < 2) throw new RoutingError('The route came back with no usable geometry.');

  const seconds = route?.legs?.reduce((total, leg) => total + (leg.duration?.value ?? 0), 0) ?? 0;

  return {
    path,
    minutes: Math.max(1, Math.round(seconds / 60)),
    summary: route?.summary?.trim() || 'Driving route',
  };
}
