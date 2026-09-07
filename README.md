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
  screen never blanks while Verge is in front.
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
| `EXPO_PUBLIC_GOOGLE_ROUTES_API_KEY` | Directions + Places, for building saved routes. Needs to be a **second key** — see below. |

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

By default the generated project signs release builds with the **debug**
keystore. That keystore ships in the React Native template, so its private key is
public: the signature proves nothing, and anyone could sign a modified APK that
Android would accept as an update to yours. Fine for your own phone, not fine for
handing to other people.

The `android/` folder is generated and gitignored — `expo prebuild` recreates it.

### Signing it properly

Generate a keystore once and keep it safe — lose it and you can never ship an
update that installs over the old app.

```bash
keytool -genkeypair -v -keystore release.keystore \
  -alias verge -keyalg RSA -keysize 4096 -validity 10000
base64 -w0 release.keystore   # macOS: base64 -i release.keystore
```

Add four repository secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | the base64 blob printed above |
| `ANDROID_KEYSTORE_PASSWORD` | the store password you chose |
| `ANDROID_KEY_ALIAS` | `verge` |
| `ANDROID_KEY_PASSWORD` | the key password you chose |

Builds work without them, but the workflow logs a warning and the release notes
say plainly that the APK is debug-signed. Passwords are read from the environment
at build time and never written to disk.

Switching from debug-signed to release-signed **changes the signature**, so the
first release-signed build will not install over a debug-signed one. Uninstall
first, that once only.

### Locking down the Maps key

Because the name starts `EXPO_PUBLIC_`, the Maps key is compiled into the APK and
anyone with the file can extract it. Restrict what a leaked copy can do:

1. **API restriction** — Google Cloud → Credentials → your key → API restrictions
   → restrict to *Maps SDK for Android*.
2. **Application restriction** — the same page, Application restrictions → Android
   apps. It needs the package name and the signing certificate's SHA-1, and every
   build prints both in its job summary under *Signing certificate*, read from the
   APK itself rather than from what we hoped signed it.

Do the application restriction *after* setting up the release keystore, or you
will pin the key to the debug certificate and the properly signed build will show
a blank map.

### Routing needs its own key

`Add a route` calls the Directions and Places **Web Service** APIs. An Android
application restriction — package name plus signing certificate — does not apply
to those: Google rejects an app-restricted key on a web service call with
`REQUEST_DENIED`. So the Maps key that draws the basemap cannot also do routing.

Create a second key and restrict it by **API** instead of by app:

1. Enable **Directions API** and **Places API (New)**.
2. New key → API restrictions → those two only. Leave application restrictions
   set to None; there is no app restriction that would work here.
3. **Put a ceiling on the spend.** Quota editing is not always available — on a
   project without a billing account the console refuses it. Set a budget alert
   instead (Billing → Budgets & alerts), which works either way. The key is
   compiled into the APK and extractable, and unlike the Maps key these calls are
   billed per request.

   The app is built to keep that number small: place search runs when you press
   Search, not while you type, so one lookup costs one request rather than one
   per pause. A route costs one Directions call when you save it.
4. Add it as the `EXPO_PUBLIC_GOOGLE_ROUTES_API_KEY` repository secret.

Without it the Routes tab still lists saved routes and their zone counts; only
searching for new ones is unavailable, and the sheet says so.

### A Google Maps key

Google Cloud console → enable **Maps SDK for Android** → create an API key. The free
tier covers personal use. Without one the app runs and every screen works; the map
canvas is just empty.

---

## The cover screen

A Flip's cover display is small in both directions, so `App.tsx` measures the
window rather than the model — under 600dp on the long edge and Verge renders
`CoverDrive` and nothing else: a full-bleed following map, the distance to the
next published zone, three bubbles and a **ROUTE** button. Tracking starts on its
own there, because unfolding the phone to press **Start drive** would defeat the
point.

The map follows you until you drag it, and then stops: a map that snaps back
half a second after you moved it is one you cannot look ahead on. The recentre
bubble — a ring around a dot, drawn rather than set, because the obvious glyphs
are in neither of the app's fonts — puts it back on you and resumes following.
Pinch stays off deliberately: zoom lives entirely in the two bubbles, so the
zoom level the component holds is always what the map is showing. A pinch would
desynchronise the two and the next follow would snap the zoom back.

Routing from the cover screen asks one question — where to. The start is
wherever the driver is, which is the only sensible answer with the phone shut
and the engine running, so `components/CoverRoute.tsx` takes a destination and
nothing else. The route it draws is deliberately not saved: it means where you
are going now, from where you are now, and stops meaning anything when either
changes. The button waits for a real fix rather than offering to route from a
position nobody has measured.

`plugins/with-cover-screen.js` carries the Android and Samsung-specific parts:

- **The app fills the cover display.** `android:resizeableActivity="true"` on the
  main activity plus the `android.supports_size_changes` flag. Without them
  Android puts the activity in device-compatibility mode and draws it in a
  fixed-size box in the middle of the screen.
- **The widget is offered on the Flex Window.** Three things together:
  a `com.samsung.android.appwidget.provider` meta-data pointing at a
  `<samsung-appwidget-provider display="sub_screen">` resource,
  `android:widgetCategory="home_screen|keyguard"`, and an **exported**
  receiver. react-native-android-widget writes `home_screen` and
  `exported="false"` and knows nothing about the Samsung resource, so the
  plugin applies all three.

  Exporting the receiver is the one that is easy to miss. Samsung's
  cover-screen host is a separate app and cannot enumerate a provider it is not
  allowed to see, so a non-exported widget is simply invisible to it — it never
  appears in the list, with no error anywhere. The receiver only acts on its own
  `<package>.WIDGET…` actions and the worst another app can do with it is ask
  for a redraw.

  These were read off a widget already living on this phone's cover screen
  rather than worked out from documentation, after three builds of doing the
  latter. Samsung's published guidance covers the meta-data and the category
  and says nothing about the export, and the two attempts that followed only
  the documentation did not work.

There is one widget, `Verge` (`widgets/names.ts` holds the name, which is also
the generated provider class name). It is declared at 339x352dp — a Flex Window
panel, not a home-screen cell — with **no** `targetCellWidth`/`targetCellHeight`,
because declaring cells makes Android place it on a home-screen grid and the
cover screen is not a grid. It stays resizable, and Android reports the size it
actually gave the widget on every redraw, so `VergeWidget` picks its layout from
that: a one-line strip under 90dp, a tile under 200dp, the full panel above it.
Tapping it opens the app. Which screen it opens on is Android's decision, not
ours — and an attempt to make it ours cost a working button. Samsung's guidance
is to set `launchDisplayId` on the launch, so the plugin generated a provider
class that targeted whichever display was awake. Setting that to a display the
app does not own does not throw: the system simply declines the launch. The
result was a tap with no effect, nothing thrown to catch and nothing logged. It
has been taken out. A tap that opens the app on the wrong screen beats a tap
that does nothing.

At the panel size the widget draws square and edge to edge. Samsung rounds the
panel off itself, so rounding it again only opens a gap at each corner where the
host's background shows through — the widget stops meeting the edges. The
smaller variants keep a corner radius, because those sit on a home-screen grid
with real space around them.

At panel size the widget carries the drive HUD's reading — distance, road,
limit — a **locality diagram**, and an **OPEN** button.

It is laid out as **two columns** — the reading left, the locality right —
because a single stack ran off the bottom.

**Both columns are given an explicit width**, and that is the whole trick. The
toolkit has no flex weights: a row hands each child whatever width it asks for,
and the first child asking for more than there is pushes the rest off the edge.
A road name is exactly that. Left unconstrained, "Model Church in Wales School"
set itself on one long line and shoved the diagram clean out of the widget. So
`panelColumns` divides the padded width between the two and the text wraps
inside its own column.

The distance is sized the same way. `panelHeadlineSize` derives it from the
reading column rather than fixing it, because the panel is narrower than it
looks — a live cover widget measured about 305dp across, not the ~400dp the
editor's preview card suggests — and a size that fits a wide widget wraps on a
narrow one. Cormorant needs roughly 3.4dp of width per point for a string like
"12.4 km"; the tests hold the layout to that.

**OPEN leads the top line**, hard against the left margin, where it is
unmissable and cannot be pushed anywhere by the content beside it.

**`assets/widget-preview.png`** is what the picker draws: the widget's own layout
(`@layout/rn_widget`, from the library) is a transparent frame that the app fills
with a bitmap at runtime, so without a preview the picker shows an empty tile —
present, but easy to scroll straight past. Regenerate it to match the design
rather than screenshotting a device.

One known gap: the library opens the app from a broadcast receiver with a plain
`startActivity` and no `ActivityOptions`, so nothing tells Android which display
to launch on. Samsung's guidance is to set `launchDisplayId` on the
`PendingIntent` (0 main, 1 cover). If a tap on the widget opens the app on the
main screen, that is why.

None of this has been checked on a device — there isn't one here.

---

## Layout

```
app/           MapScreen · TodayScreen · RoutesScreen · AlertsScreen
components/    ZoneMarks · ZoneSheet · DriveHud · OfflineBanner · Switch · Segmented · Button · TabBar
theme/         tokens.ts (light + dark maps) · type.ts · mapStyle.ts · ThemeProvider.tsx
data/          zones.ts (types, fixture, phase derivation) · feed.ts (fetch + cache + stamp) · routes.ts · geo.ts
state/         settings.tsx (persisted) · drive.ts · useLocation.ts · savedRoutes.tsx
widgets/       the 2x2 home/cover-screen widget and the headless task handler
plugins/       config plugins applied at prebuild (cover-screen resizability)
ingest/        the daily job that rebuilds feed/zones.json
tests/         pure-logic unit tests
design_reference/   the handoff bundle
App.tsx        tab state, the three overlays, providers
```

`theme/tokens.ts` is the whole colour system — one value per theme, and every
colour in the UI comes from it. Type rules (Cormorant for headings and figures,
Lora for body, no bold anywhere, tabular figures wherever a number stands as a
number) live in `theme/type.ts`.

---

## Routes

A route is either kept or temporary.

A kept route is what the Routes tab has always held: two searched places, saved
to the device, drawn in the accent. A **temporary** route starts from wherever
the driver is — `My location` in the route sheet, or the cover screen's **ROUTE**
button — and is the answer to "where am I going now". It lives in the same list,
counts its zones the same way and can be removed the same way, but
`routesToPersist` filters it out on the way to storage: surviving a restart
would make it a lie about where you started. There is only ever one; a second
replaces the first.

It is drawn in `tempRoute` — a violet set against the accent rather than a
shade of it, because "this one is temporary" is a different fact about a route,
not a weaker version of the same one. The same colour marks its card and the
option that creates it, so the thing you pressed and the line on the map are
recognisably the same idea.

Both ends need somewhere real to start: the option only appears once there is an
actual fix, because routing from an unmeasured position would draw a route from
the middle of the county.

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
- **Background location.** Verge is foreground-only and holds the screen
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
