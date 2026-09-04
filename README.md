# Verge — published speed-zone reader

An Android app that reads the published mobile speed-camera **enforcement zone**
list for Carmarthenshire, plots it on a map, and warns the driver as they
approach a zone.

The premise the whole interface is built on, and which the code is written to
protect:

> **The partnership publishes enforcement _zones_, not live camera positions.**

Every zone in the UI is labelled as published, never as confirmed. Nothing in
`data/zones.ts` may describe a zone as a confirmed camera, and `tests/zones.test.ts`
asserts that no status label or row note ever does.

Built from the design handoff in [`design_reference/`](design_reference/), which
is committed so the intent stays with the code.

---

## Stack

- **Expo SDK 57 / React Native 0.86**, TypeScript strict.
- **`react-native-maps`** with the Google provider, styled down to near-monochrome
  from the same tokens as the rest of the UI (`theme/mapStyle.ts`).
- **`expo-location`** for foreground position and speed, **`expo-audio`** for the
  chime, **`expo-speech`** for the spoken announcement, **`expo-keep-awake`** so the
  drive HUD stays lit.
- Fonts (**Cormorant Garamond** 400/600, **Lora** 400/600/400-italic) are bundled
  with the app, not fetched at runtime.

This needs a **development or release build** — `react-native-maps` and
`expo-location` are native modules, so Expo Go will not run it.

```bash
npm install
npm run typecheck        # tsc --noEmit
npm test                 # 22 unit tests over the pure logic
```

### Configuration

Both are read from the environment; neither is committed.

| Variable | What it does |
| --- | --- |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Android Maps SDK key. Without it the map renders blank. |
| `EXPO_PUBLIC_ZONE_FEED_URL` | The JSON zone feed. **Unset**, so the app falls back to the committed fixture — see *Ingest*. |

> The Maps key is written into `AndroidManifest.xml` at **prebuild** time, not read
> at runtime. It has to be set in the environment before the build, or the manifest
> ships without a key and the map is blank.

---

## Getting an APK

There is no APK in this repo — it is source, and the Android SDK is not part of it.
Two routes:

### EAS Build (no local Android toolchain)

`eas.json` is set up; the `preview` profile produces an installable APK rather than
a Play Store bundle.

```bash
npm install -g eas-cli
eas login
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value <your-key>
eas build --platform android --profile preview
```

EAS returns a download link; open it on the phone and install it. Because it is
sideloaded, Android will ask you to allow installs from that browser once.

### Locally (needs Android Studio / the Android SDK)

```bash
export EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=<your-key>
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease
# android/app/build/outputs/apk/release/app-release.apk
```

The generated project signs release builds with the debug keystore, so the APK
installs without any signing setup. That is fine for your own phone and not fine
for distribution.

The `android/` folder is generated and gitignored — `expo prebuild` recreates it.

### A Google Maps key

Google Cloud console → enable **Maps SDK for Android** → create an API key. The free
tier covers personal use. Without one the app runs and every screen works; the map
canvas is just empty.

---

## Layout

```
app/           MapScreen · TodayScreen · RoutesScreen · AlertsScreen
components/    ZoneMarks · ZoneSheet · DriveHud · OfflineBanner · Switch · Segmented · Button · TabBar
theme/         tokens.ts (light + dark maps) · type.ts · mapStyle.ts · ThemeProvider.tsx
data/          zones.ts (types, fixture, phase derivation) · feed.ts (fetch + cache + stamp) · routes.ts · geo.ts
state/         settings.tsx (persisted) · drive.ts · useLocation.ts
tests/         pure-logic unit tests
design_reference/   the handoff bundle
App.tsx        tab state, the three overlays, providers
```

`theme/tokens.ts` is the whole colour system — one value per theme, and every
colour in the UI comes from it. Type rules (Cormorant for headings and figures,
Lora for body, no bold anywhere, tabular figures wherever a number stands as a
number) live in `theme/type.ts`.

---

## What is derived rather than stored

The prototype hard-coded a few values that a real app has to work out. These are
now computed, which is the main behavioural difference from the design file:

| Design file | Here |
| --- | --- |
| `active: true` on the zone | `phaseOf(zone, now)` — derived from the clock against the published window, re-derived every minute |
| `dist: '2.4 km'` string | Great-circle distance from the device to the nearest point on the zone's road segment (`data/geo.ts`) |
| Route counts `3 / 1 / 0` | Zones whose geometry comes within 500 m of the saved route's corridor |
| Countdown simulated at 34 m / 150 ms | GPS distance and speed when location permission is granted; the simulation is the documented fallback |

Two consequences worth knowing:

- **The route counts read `1 / 1 / 0`, not `3 / 1 / 0`.** The design mock counted
  A484 zones at Kidwelly and Pwll that are not in the zone fixture. The counts are
  now honest against whatever the feed publishes.
- **There is a fourth zone phase.** The design has `active` / `scheduled later` /
  `stale`. Deriving `active` from the clock creates a fourth case — a window that
  has already closed — which the design's copy would have described as "scheduled
  later today", i.e. wrongly. It reads `Published earlier today` and takes the same
  muted treatment as `scheduled`. This is the one piece of copy not from the handoff.

---

## Deviations from the handoff, and why

- **Zone mark defaults to `segment`, not `pin`.** The handoff recommends the road
  segment because it matches how the zones are actually published, and only ships
  `pin` in the prototype "so the choice stays visible". All three treatments are
  built and switchable.
- **The mark switch lives on the Alerts tab**, under a new `Map` section, styled as
  the other segmented controls. The handoff requires the option stay switchable but
  the design gives it no home.
- **`Simulate offline` is replaced by `Fetch now`**, as the handoff instructs for
  production. The simulate affordance is kept behind `__DEV__` so the offline banner
  stays exercisable.
- **`GoSafe` is retained as the publisher name.** The handoff flags it as possibly
  wrong, on the basis that GoSafe is an Irish operator. GoSafe is *also* the Welsh
  road casualty reduction partnership (gosafe.org.uk), which is the body that
  publishes Carmarthenshire mobile sites — so the brief's name stands. It is a single
  constant (`PUBLISHER` in `data/feed.ts`) feeding every string that names the source;
  confirm it against the live source before shipping and change it in one place.
- **The map basemap is real, not the prototype's hand-drawn SVG**, per the handoff's
  warning. The SVG's road geometry, coastline and town positions are not shipped.

---

## Ingest — the part that is stubbed

`data/feed.ts` has the full client side: fetch, validate, cache, stamp, fall back
to the last good list, and surface its age. What it does not have is a feed to
point at. `EXPO_PUBLIC_ZONE_FEED_URL` is unset and the app uses the committed
fixture.

Before wiring a real source, the handoff's sequence still stands and none of it
is done:

1. **Confirm the source** and record its URL.
2. **Read the terms of use and robots.txt**; prefer an official feed, API or
   open-data release over scraping.
3. **Fetch server-side.** A scheduled early-morning job fetches, parses, geocodes
   and serves clean JSON. The device must never scrape the publisher's HTML — it is
   brittle, it leaks the user's IP to the publisher, and it makes offline caching
   harder. `parseZones()` is the contract that job has to satisfy.
4. **Geocode once and review by hand.** Site descriptions are prose; a mis-geocoded
   zone is worse than a missing one.

> ⚠️ **The fixture geometry in `data/zones.ts` is approximate.** The road paths are
> plausible lines near the named settlements, good enough to exercise the UI. They
> are not surveyed and must not be used to warn a real driver.

---

## Not built yet

- The ingest job and feed (above).
- **`Add a route`** — capturing a route needs a routing layer that is not in this
  handoff. The button is present and stubbed.
- **Background location.** The drive HUD is foreground-only and holds the screen
  awake. Warning a driver with the app backgrounded needs a foreground service and
  `ACCESS_BACKGROUND_LOCATION`, which is a separate piece of work (and a Play Store
  declaration).
- **Onboarding / permission priming.** Location permission is requested at the point
  of use.

---

## Testing

`npm test` compiles the pure modules and runs 22 assertions over the parts worth
protecting: the distance maths (including that a distance is measured to the
nearest point on a segment, not to its nearest vertex), the window and staleness
boundaries, the route-corridor matching, and the disclaimer copy.

The staleness rule is deliberately a **calendar-day** comparison: "not republished
in the last 7 days" measured in milliseconds would turn a week-old list stale
part-way through the day.

UI rendering is not covered — there is no component test harness set up.
