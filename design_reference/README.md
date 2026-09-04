# Handoff: Verge — published speed-zone reader (Android)

## Overview

A mobile app that pulls the published mobile speed-camera enforcement zone list for
Carmarthenshire, plots it on a map, and warns the driver as they approach a zone.

Three jobs, in priority order:

1. **Live driving companion** — audio chime + one big glanceable number as a zone approaches.
2. **Plan ahead** — check what is published before leaving; saved routes show a zone count.
3. **Browse** — the full day's published list for the county.

The whole interface is built on one premise, and it must survive implementation:
**GoSafe publishes enforcement _zones_, not live camera positions.** Every zone in the
UI is labelled as published, never as confirmed. Do not remove or soften these labels.

---

## About the design files

The files in this bundle are **design references created in HTML** — a prototype showing
intended look and behaviour. They are **not production code to copy directly**.

`Speed Zones.dc.html` is a Design Component: a single streaming HTML file with an inline
template plus a logic class. It runs in a browser but has no build system, no real map,
no GPS and no network layer.

Your task is to **recreate this design in a real Android app**. There is no existing
codebase (the target repo is empty), so pick the stack. Recommendation:

- **Expo / React Native** (TypeScript) — fastest route to a real Android build with
  background location, and the layout in the prototype is already flexbox.
- **Map:** `react-native-maps` (Google provider) or MapLibre RN with a custom style.
- **Alternative:** native Kotlin + Jetpack Compose, if long-running background location
  reliability matters more than speed of delivery.

⚠️ **The map in the prototype is a hand-drawn schematic SVG placeholder.** It is there to
show composition, label density and mark styling only. The road geometry, coastline and
town positions are approximate and must not be shipped. Replace it with a real basemap
styled to the tokens below (see *Map styling*).

---

## Fidelity

**High-fidelity.** Colours, typography, spacing, radii, animation timings and copy are
final and are all listed below. Recreate the UI to match. The one exception is the map
canvas itself, which is a placeholder as noted above.

---

## Repository

Target: `hallkyle054-spec/speed-trap-app`, branch `main` (currently empty).

Suggested initial structure:

```
/app                 screens (map, today, routes, alerts)
/components          ZoneMark, ZoneSheet, DriveHud, Switch, Segmented
/theme               tokens.ts  (light + dark token maps)
/data                zones.ts   (types, mock fixture, fetch + cache)
/design_reference    this handoff folder, committed for reference
README.md
```

Commit the design reference folder so the intent stays with the code. Do not force-push
over anything without asking.

---

## Screens / Views

The app is one Android screen frame (412 × 892 dp design size, 8dp bezel, 40dp status
bar, 24dp gesture nav in the prototype frame) with four tabs and three overlays.

### 1. Map (home) — default tab

**Purpose:** see what is published near you today, and start a drive.

**Layout** — vertical flex, top to bottom:

| Region | Spec |
| --- | --- |
| Header | padding `16 18 12`, `border-bottom: 1px solid var(--zn-rule)` |
| Map canvas | `flex: 1`, `position: relative`, `overflow: hidden` |
| Nearest-zone card | `border-top: 1px solid var(--zn-rule)`, padding `13 18 14` |
| Tab bar | `border-top: 1px solid var(--zn-rule)` |

**Header components**

- Kicker row, `justify-content: space-between`, baseline aligned:
  - Left: `Sir Gaerfyrddin · Carmarthenshire` — 9.5px, `letter-spacing: .14em`, uppercase, `--zn-ink-50`
  - Right: `Fri 4 Sep` — 9.5px, `.12em`, uppercase, `--zn-ink-50`, tabular figures
- H1 `Today's published zones` — Cormorant Garamond **400**, 33px, `line-height: 1.05`,
  `letter-spacing: -.02em`, margin `7 0 9`
- Sync row, space-between:
  - Status: 5px dot + label, 11px, colour `--zn-ink-55` (or `--zn-accent-ink` when offline).
    Labels: `Fetched 06:42 · GoSafe list` / `Fetching today's list…` / `Offline · list is 2 days old`
  - `Refresh` button: Cormorant 600 12px, `.04em`, padding `5 12`,
    `1px solid var(--zn-accent)`, radius 4, colour `--zn-accent-ink`,
    hover background `--zn-accent-tint`

**Map canvas**

- Basemap in `--zn-bg`; water in `--zn-sea`; coastline stroke `--zn-rule-2` 1px
- Primary roads (A-roads): stroke `--zn-road`, 1.6px, round caps
- Minor roads: stroke `--zn-rule-3`, 1px
- Motorway (M4): stroke `--zn-road` at 3px
- Road number labels: Lora 8.5px, `--zn-ink-50`, `.05em`
- Town markers: 4 × 4 square, `--zn-ink-80`
- Town labels: Lora 9.5px, `--zn-map-label`
- Water label `CARMARTHEN BAY`: Lora italic 10px, `--zn-ink-40`, `.1em`
- Zone marks: see *Zone mark treatments*
- Legend card, absolute `left: 14, bottom: 12`: background `--zn-legend-bg`,
  `1px solid var(--zn-rule)`, radius 4, padding `8 10`, gap 5.
  Two rows, 9.5px `--zn-ink-70`, each with a 9px circle, `1.5px` border:
  `Published for today` (`--zn-mark`) / `Scheduled later` (`--zn-ink-45`)

**Nearest-zone card**

- Label row: `Nearest to you` (9.5px `.13em` uppercase `--zn-ink-50`) / `2.4 km` (11px, tabular)
- Title `A484 · Llangain → Bancyfelin` — Cormorant 600 20px, `-.01em`
- Meta `Published 08:00–13:00 · 60 mph · camera not confirmed` — 11.5px, `--zn-ink-60`, tabular
- `Start drive` — full-width button, Cormorant 600 15px `.03em`, padding 11,
  `1px solid var(--zn-accent)`, radius 4, `--zn-accent-ink`, hover `--zn-accent-tint`

**Tab bar** — 4 equal tabs: `Map`, `Today`, `Routes`, `Alerts`.
Cormorant 600 13.5px, `.04em`, padding `11 0 13`. Inactive `--zn-ink-45`.
Active: colour `--zn-accent-ink`, `border-top: 2px solid var(--zn-accent)`, `margin-top: -1px`
(so the active rule sits on top of the container's 1px rule).

### 2. Today (list)

**Purpose:** the day's sheet, scannable by road.

- Header: kicker `The day's sheet · Fri 4 Sep`; H1 `{n} zones published`
  (Cormorant 400 31px, `1.05`, `-.02em`)
- Rows, full-width buttons, padding `14 18`, `border-bottom: 1px solid var(--zn-rule)`,
  hover background `--zn-hover`:
  - Road (Cormorant 600 19px, `--zn-mark` if active else `--zn-ink-45`) …
    hours right-aligned (10.5px `.09em` uppercase `--zn-ink-50`, tabular)
  - Location — 13px, `--zn-ink-80`
  - Note — 10.5px, `--zn-ink-50`: `Published zone · camera not confirmed` /
    `Scheduled later today · camera not confirmed` / `Stale — last published 28 Aug`
- Closing paragraph, 11px `--zn-ink-50`, margin `16 18 22`, `text-wrap: pretty`:
  > Every entry above is a zone GoSafe has published for enforcement. It is not a
  > confirmation that a camera van is present, and vans operate in zones that may not
  > appear here.

### 3. Routes

**Purpose:** saved commutes with a zone count for today.

Cards: `1px solid var(--zn-rule)`, radius 4, padding `14 15`, stacked with 14px gap.

- Title Cormorant 600 20px / count Cormorant 26px tabular, `--zn-accent-ink`
  (`--zn-ink-40` when the count is 0)
- Sub-line 11.5px `--zn-ink-60`
- 1px `--zn-rule` divider, margin `11 0`
- Zone list 11px `--zn-ink-60`, `line-height: 1.7`; when empty, italic `--zn-ink-50`:
  `Nothing published on this route today`

Content: `Home → Llanelli` / A484 coast road · 41 min / **3** ·
`School run` / Nantgaredig → Carmarthen · 14 min / **1** ·
`Weekend · Llandovery` / A40 east · 52 min / **0**.
Then `Add a route` — dashed 1px `--zn-rule-2` button, Cormorant 600 14px, padding 10.

### 4. Alerts (settings)

Section labels: 9.5px `.13em` uppercase `--zn-ink-50`, margin `22 0 6`.
Rows: `display: flex`, space-between, gap 14, padding `11 0`,
`border-bottom: 1px solid var(--zn-rule)`. Label 14px; sub-label 11px `--zn-ink-55`.

**While driving**

| Row | Sub-label | Default |
| --- | --- | --- |
| Audio chime | A single soft tone at the alert distance | on |
| Spoken announcement | "Published zone in 800 metres" | off |
| Only when over the limit | Stay quiet if you are already under | on |

Then `Warn me at` — segmented control, `1px solid var(--zn-rule-2)`, radius 4,
`overflow: hidden`, options `300 / 500 / 800 / 1000` (metres). Buttons padding `9 0`,
Cormorant 600 14px, tabular, divider `1px solid var(--zn-rule)`.
Selected: background `--zn-accent-tint-2`, colour `--zn-accent-ink`. Default **800**.

**Appearance** — segmented `System / Light / Dark`, default **System**,
sub-line: `System follows your phone's light or dark setting.`

**Data**

- `Show stale zones` / `Zones not republished in the last 7 days` — on
- `Last fetched` / current sync label, with a `Simulate offline` button
  (prototype affordance — in production replace with a real "Fetch now" + last-fetch stamp)
- Closing paragraph, 11px `--zn-ink-50`:
  > Verge reads the zone list GoSafe publishes and plots it. It does not detect cameras,
  > and a published zone is not a promise that enforcement is taking place.

**Switch component:** track 44 × 24, radius 12, `1px solid var(--zn-rule-2)`, padding 2.
Knob 18 × 18 circle, background `--zn-ink`, `transition: transform .18s`,
`translateX(0)` → `translateX(20px)`. Track background: `transparent` → `--zn-accent-tint-2`.

### Overlay A — Zone detail sheet

Opened by tapping any zone mark or list row.

- Scrim: `--zn-scrim`, fills the frame, tap to dismiss, `z-index: 5`
- Sheet: bottom-anchored, background `--zn-bg`, `border-top: 1px solid var(--zn-rule)`,
  `border-radius: 7px 7px 0 0`, `box-shadow: 0 12px 32px var(--zn-shadow)`,
  padding `14 18 20`, `z-index: 6`
- Grab handle 38 × 3, radius 2, `--zn-rule-3`, centred, margin-bottom 14
- Status kicker 9.5px `.14em` uppercase — `Published for today` (`--zn-accent-ink`) /
  `Scheduled later today` / `Stale listing` (`--zn-ink-50`)
- H2 road — Cormorant 400 30px, `1.08`, `-.02em`; location 14px `--zn-ink-80`
- 1px divider, margin `14 0`
- 2 × 2 grid, gap `14 10`; each cell: 9.5px `.12em` uppercase `--zn-ink-50` label +
  Cormorant 23px tabular figure. Cells: **Published hours**, **Speed limit**,
  **Distance**, **Source** (`GoSafe list`)
- Disclosure block: `border-left: 2px solid var(--zn-accent)`, `padding-left: 11`,
  11.5px `--zn-ink-70`, `line-height: 1.6` —
  `Published zone — camera not confirmed.` + the zone's own note
- Actions row, gap 10: `Close` (outlined `--zn-rule-2`) and `Drive this way`
  (outlined `--zn-accent`), both Cormorant 600 14px, padding 10, radius 4

### Overlay B — Live drive HUD

Full-frame, `z-index: 9`, background `--zn-bg`, colour `--zn-ink`, padding `24 22 20`.

- Top row: `Driving · A484 south` (9.5px `.16em` uppercase `--zn-ink-50`) and an
  `End` button (outlined `--zn-rule-2`, Cormorant 600 12px)
- Centre block, vertically centred:
  - Kicker 10px `.16em` uppercase `--zn-accent-ink` —
    `Approaching` → `Published zone ahead` (at or inside the warn distance) → `Zone begins`
  - **Distance numeral** — Cormorant Garamond **400**, 110px, `line-height: .92`,
    `letter-spacing: -.04em`, tabular. Shows metres under 1000, one decimal km at or
    above 1000, `Now` at zero
  - Unit line — Cormorant 26px `--zn-ink-55`:
    `metres to the zone` / `km to the zone` / `entering the zone`
  - 1px divider `--zn-rule-3`, margin `22 0 18`
  - Road — Cormorant 600 25px; meta 12.5px `--zn-ink-60` tabular:
    `Published 08:00–13:00 · zone runs 1.8 km`
  - Disclosure: `border-left: 2px solid var(--zn-accent)`, padding-left 11, 12px `--zn-ink-70`
- Bottom: two equal cards, gap 16, each `1px solid var(--zn-rule-3)`, radius 4,
  padding `11 13`; label 9.5px `.13em` uppercase `--zn-ink-50`; figure Cormorant 38px
  tabular. **Your speed** (turns `--zn-accent-ink` above the limit) and **Limit** (`60`)
- Chime banner (only while chiming): `1px solid var(--zn-accent)`, radius 4, padding `11 13`,
  gap 10; 7px dot `--zn-accent-ink` animating `zbar`; text Cormorant 600 16px `--zn-accent-ink`
  — `Chime — zone ahead`

### Overlay C — Offline banner

Top-anchored strip, `z-index: 4`, background `--zn-bg`, padding `11 18`, space-between:

- `Offline — showing Wed 2 Sep` — Cormorant 600 15px
- `This list is 2 days old. Zones change daily.` — 11px `--zn-ink-60`, tabular
- `Retry` button — outlined `--zn-accent`

---

## Zone mark treatments

Three options were explored; **road segment is recommended** because it matches how the
zones are actually published (a stretch of road, not a point). The prototype ships `pin`
as the default so the choice stays visible. Whichever you build, keep the option switchable.

| Treatment | Spec | Trade-off |
| --- | --- | --- |
| **Point** (default in prototype) | 34 × 34 tap target. Inner dot: 15px circle, background `--zn-bg`, `1.5px solid` mark colour, containing a 5px filled dot. Active zones add a 16px ring with `zpulse` | Cleanest to scan; implies precision the data does not have |
| **Road segment** (recommended) | 5–6px rounded bar along the road, mark colour, with a 2px `--zn-bg` outline so it reads over the road line | Truthful to the source data |
| **Radius** | Circle r ≈ 40 map units, `1px solid` mark colour, fill `--zn-accent-tint` | Honest about uncertainty, but the fill fights the design system's stroke-over-fill rule |

Mark colour: `--zn-mark` when published for today, `--zn-ink-45` when scheduled later or stale.
Minimum tap target 44 × 44 dp regardless of the visual size.

---

## Interactions & behaviour

- **Tab bar** — switches tab and closes any open sheet.
- **Zone mark / list row tap** — opens the zone detail sheet.
- **Sheet dismissal** — tap the scrim or `Close`.
- **`Start drive` / `Drive this way`** — closes the sheet, opens the drive HUD, resets the
  countdown. In the prototype the approach is simulated: distance starts at **1600 m** and
  decrements **34 m every 150 ms**; own speed reads 58 and drops to 56 under 900 m; the
  countdown stops at 0. In production this comes from GPS: distance to the zone's start
  point along the current heading, and speed from the location provider.
- **Chime** — fires when `distance ≤ warnAt` and the audio-chime setting is on. One soft
  tone, not repeating. If `Only when over the limit` is on, suppress unless current speed
  exceeds the zone's limit. Spoken announcement (off by default) says
  "Published zone in {n} metres".
- **`End`** — clears the countdown and returns to the map.
- **`Refresh`** — sync state goes `ok → syncing` for 1300 ms, then back to `ok` with a new
  timestamp. Production: fetch, diff, cache, stamp.
- **`Simulate offline`** — sets sync to `offline`, jumps to the Map tab, shows the offline
  banner. Production equivalent: fetch failure or no connectivity.
- **Appearance** — `System` follows `prefers-color-scheme` / `Configuration.uiMode` and
  updates live when the OS setting changes; `Light` / `Dark` pin it.
- **`Show stale zones` off** — filters zones not republished within 7 days out of the map
  and the list, and drops the count in the header.

**Animations**

```
zpulse   2.6s ease-out infinite   scale(1)→scale(2.1), opacity .55→0   (active zone ring)
zbar     1s   ease-in-out infinite  opacity .25→1→.25                  (chime dot)
switch   .18s transform                                                (toggle knob)
```

No other motion. Keep it restrained — this is glanced at while driving.

---

## State

```ts
type Theme = 'system' | 'light' | 'dark';
type Sync  = 'ok' | 'syncing' | 'offline';

type AppState = {
  tab: 'map' | 'today' | 'routes' | 'alerts';
  sheet: string | null;      // zone id
  driving: boolean;
  dist: number;              // metres to zone start
  speed: number;             // mph
  sync: Sync;
  syncTime: string;          // 'HH:MM'
  chime: boolean;            // default true
  voice: boolean;            // default false
  onlyOverLimit: boolean;    // default true
  showStale: boolean;        // default true
  warnAt: 300 | 500 | 800 | 1000;   // default 800
  mark: 'pin' | 'segment' | 'radius';
  theme: Theme;              // default 'system'
  sysDark: boolean;          // from the OS
};
```

Persist `chime`, `voice`, `onlyOverLimit`, `showStale`, `warnAt`, `mark`, `theme` and the
saved routes. Derive `isDark = theme === 'dark' || (theme === 'system' && sysDark)`.

---

## Data

### Zone shape

```ts
type Zone = {
  id: string;
  road: string;        // 'A484'
  name: string;        // 'Llangain → Bancyfelin'
  hours: string;       // '08:00–13:00'  (published window)
  limit: string;       // '60 mph'
  active: boolean;     // inside its published window right now
  stale?: boolean;     // not republished in 7 days
  note: string;        // the sheet's plain-language provenance line
  geometry: …;         // point or polyline — see below
};
```

Fixture used in the prototype (Carmarthenshire, keep for tests):

| Road | Location | Hours | Limit | State |
| --- | --- | --- | --- | --- |
| A484 | Llangain → Bancyfelin | 08:00–13:00 | 60 mph | active — published 06:12 today |
| A40 | Nantgaredig | 07:00–19:00 | 50 mph | active — listed every weekday for 3 weeks |
| A48 | Cross Hands, eastbound | 06:00–14:00 | 70 mph | active — eastbound side only |
| A483 | Ammanford, Pontamman Rd | 10:00–18:00 | 30 mph | scheduled later today |
| A4069 | Llandeilo, Ffairfach | 12:00–20:00 | 40 mph | scheduled later today |
| B4300 | Golden Grove | not today | 60 mph | stale — last published 28 Aug |

### Ingest

The prototype has no network layer. Before building one:

1. **Confirm the source.** Find the official published list for the region and record its
   URL. In Wales the mobile safety-camera sites are published by the road-safety
   partnership rather than by "GoSafe" (the Irish operator) — check which body actually
   publishes Carmarthenshire and name it correctly in the UI. All the copy above says
   "GoSafe" because that is the term the brief used; **update the strings to the real
   publisher's name.**
2. **Check the terms.** Read the page's terms of use / robots.txt before scraping, and
   prefer an official feed, API or open-data release if one exists.
3. **Fetch server-side, not on the device.** Run a scheduled job (daily, early morning)
   that fetches, parses, geocodes the site descriptions to real geometry, and serves the
   app a clean JSON feed. Do not scrape HTML from the phone: it is brittle, it leaks the
   user's IP to the publisher, and it makes offline caching harder.
4. **Geocode once, review by hand.** Site descriptions are prose ("A484 Llangain to
   Bancyfelin"). Resolve them to road segments, store the geometry, and eyeball the result
   before shipping — a mis-geocoded zone is worse than a missing one.
5. **Cache with a stamp.** Always keep the last good list plus the time it was fetched, and
   surface the age in the UI (this is what the offline banner is for).

### Map styling

Style the real basemap down to near-monochrome so it reads like the prototype's engraving:
land `--zn-bg`, water `--zn-sea`, roads `--zn-road` / `--zn-rule-3`, labels
`--zn-map-label` in Lora, no POIs, no terrain, no satellite. Two map styles (light + dark)
built from the same token pairs.

---

## Design tokens

Base system is **Classical** (bundled: `styles.css`, `readme.md`). Its raw tokens:

```
--color-bg       #f3f2f2     --color-surface  #eae9e9     --color-text  #201f1d
--color-accent   #b68235
neutral 100→900  #f8f4f4 #eae7e7 #d7d3d3 #bab6b6 #9b9797 #7d7979 #605d5d #444141 #2d2b2b
accent  100→900  #fff3e4 #ffe3bf #facb8d #e1ad66 #c28d41 #a06f24 #7d5411 #5a3b0a #3a270d
--font-heading   "Cormorant Garamond" (400 display, 600 interface headings)
--font-body      "Lora" (400, 600, 400 italic)
spacing          4.6 · 9.2 · 13.8 · 18.4 · 27.6 · 36.8
radius           2 · 4 · 7
shadow-sm/md/lg  0 1px 2px / 0 3px 10px / 0 12px 32px of ink at 14% / 16% / 22%
```

The app then maps those onto a semantic pair, one value per theme. **Build this table as
your theme file** — every colour in the UI comes from it and nothing else.

| Token | Light | Dark |
| --- | --- | --- |
| `--zn-bg` | `#f3f2f2` | `#201f1d` |
| `--zn-plate` | `#f8f4f4` | `#2d2b2b` |
| `--zn-sea` | `#e2e0dc` | `#2b2928` |
| `--zn-ink` | `#201f1d` | `#f3f2f2` |
| `--zn-ink-80` | `rgba(32,31,29,.82)` | `rgba(243,242,242,.8)` |
| `--zn-ink-70` | `rgba(32,31,29,.7)` | `rgba(243,242,242,.7)` |
| `--zn-ink-60` | `rgba(32,31,29,.6)` | `rgba(243,242,242,.6)` |
| `--zn-ink-55` | `rgba(32,31,29,.55)` | `rgba(243,242,242,.55)` |
| `--zn-ink-50` | `rgba(32,31,29,.5)` | `rgba(243,242,242,.5)` |
| `--zn-ink-45` | `rgba(32,31,29,.45)` | `rgba(243,242,242,.45)` |
| `--zn-ink-40` | `rgba(32,31,29,.4)` | `rgba(243,242,242,.4)` |
| `--zn-map-label` | `rgba(32,31,29,.78)` | `rgba(243,242,242,.72)` |
| `--zn-road` | `rgba(32,31,29,.34)` | `rgba(243,242,242,.34)` |
| `--zn-rule` | `rgba(32,31,29,.16)` | `rgba(243,242,242,.2)` |
| `--zn-rule-2` | `rgba(32,31,29,.3)` | `rgba(243,242,242,.3)` |
| `--zn-rule-3` | `rgba(32,31,29,.22)` | `rgba(243,242,242,.22)` |
| `--zn-scrim` | `rgba(32,31,29,.34)` | `rgba(0,0,0,.55)` |
| `--zn-tint-n` | `rgba(32,31,29,.09)` | `rgba(243,242,242,.12)` |
| `--zn-hover` | `rgba(182,130,53,.06)` | `rgba(225,173,102,.08)` |
| `--zn-accent` | `#b68235` | `#e1ad66` |
| `--zn-accent-ink` | `#7d5411` | `#e1ad66` |
| `--zn-accent-tint` | `rgba(182,130,53,.09)` | `rgba(225,173,102,.14)` |
| `--zn-accent-tint-2` | `rgba(182,130,53,.14)` | `rgba(225,173,102,.2)` |
| `--zn-mark` | `#a06f24` | `#e1ad66` |
| `--zn-legend-bg` | `rgba(243,242,242,.9)` | `rgba(32,31,29,.9)` |
| `--zn-shadow` | `rgba(45,43,43,.18)` | `rgba(0,0,0,.4)` |

**Typography rules from the design system, worth restating:**

- Cormorant Garamond for headings and all figures; Lora for body and map labels.
- Bold is never used. Interface headings cap at 600; display sizes (33px+) set at 400.
- Figures are tabular (`font-feature-settings: 'tnum'`) everywhere they stand as numbers —
  distances, hours, speeds, counts, kickers. Running prose keeps default figures.
- Colour is applied as **stroke, not fill**: outlined buttons, hairline rules, bordered
  cards. No solid accent fills anywhere.
- Radius 4 for cards, buttons and controls; 7 for the bottom sheet's top corners.
- Elevation is a whisper — the sheet is the only elevated surface.

**Accessibility:** the accent-to-ground pair is tuned to ~3:1, which is fine for icons,
large text and chrome but **not for body copy** — paragraph-size accent text must use
`--zn-accent-ink`, never `--zn-accent`. Keyboard/focus: 2px accent outline, 2px offset.
Minimum text size in-app is 9.5px for uppercase kickers only; nothing smaller.

---

## Prototype tweak props

The design file exposes four props; treat them as the settings that must be adjustable:

| Prop | Type | Default |
| --- | --- | --- |
| `theme` | `'system' \| 'light' \| 'dark'` | `system` |
| `zoneMark` | `'pin' \| 'segment' \| 'radius'` | `pin` |
| `alertDistanceM` | 300–1200, step 100 | `800` |
| `showStaleZones` | boolean | `true` |

---

## Assets

None. There are no images, and no icons are used in the prototype — labels are text, and
marks are drawn with borders. If you add icons, the design system specifies
**Lucide** (https://lucide.dev), stroked, on `currentColor`.

Fonts: **Cormorant Garamond** (400, 600) and **Lora** (400, 600, 400 italic), both Google
Fonts / OFL. Bundle them with the app rather than loading at runtime.

---

## Files in this bundle

| File | What it is |
| --- | --- |
| `Speed Zones.dc.html` | The design prototype. Open in a browser. Option `1a` is the chosen direction; `1b`–`1e` are the rejected alternatives, kept for context |
| `support.js` | Runtime the prototype needs to render. Not part of the app |
| `android-frame.jsx` | The device bezel used in the prototype. Not part of the app |
| `classical/styles.css` | The design system's token sheet and component CSS |
| `classical/readme.md` | The design system's own guide — read this for the type and colour rules |

To view the prototype: keep the folder structure, open `Speed Zones.dc.html` in a browser.
The Appearance control on the **Alerts** tab flips light/dark; `Start drive` on the **Map**
tab runs the approach countdown.

`1b`–`1e` show what was considered and set aside: a list-first home, two drive-HUD
treatments, and the three zone-mark options. Useful if a decision needs revisiting — but
`1a` is the design to build.
