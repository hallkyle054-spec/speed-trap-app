/**
 * Reconnaissance for the zone feed, run on a GitHub runner because it has the
 * network access this project's dev container does not.
 *
 * It answers three questions, in this order, and changes nothing:
 *
 *   1. Does robots.txt permit automated fetching, and what do the terms say?
 *   2. Is the camera map backed by a machine-readable endpoint, so no HTML
 *      needs parsing at all?
 *   3. Failing that, what does the markup actually look like?
 *
 * It fetches a handful of pages once, identifies itself honestly, and prints
 * what it finds. It is not a scraper and must not become one — the parser is
 * written only after these answers are in.
 */

const UA =
  'VergeZoneFeedProbe/0.1 (+https://github.com/hallkyle054-spec/speed-trap-app; one-off source assessment)';

const PAGES = [
  'https://www.gosafe.org/robots.txt',
  'https://www.gosafe.org/camera-map/',
  'https://www.gosafe.org/camera-details/',
  'https://www.gosafe.org/terms-and-conditions/',
];

const OPEN_DATA =
  'https://www.data.gov.uk/api/3/action/package_show?id=d9a46353-ed30-483e-913f-4283d232d044';

const line = (s = '') => console.log(s);
const rule = t => line(`\n${'='.repeat(72)}\n${t}\n${'='.repeat(72)}`);

async function get(url) {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, accept: '*/*' },
      redirect: 'follow',
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, url: res.url, type: res.headers.get('content-type'), body, ms: Date.now() - started };
  } catch (e) {
    return { ok: false, status: 0, url, error: String(e).slice(0, 200), body: '', ms: Date.now() - started };
  }
}

/** Endpoints the page's own scripts call — the shortest path to clean data. */
function findEndpoints(html) {
  const hits = new Set();
  const patterns = [
    /https?:\/\/[^\s"'<>]*\/(?:wp-json|api|rest|graphql|arcgis|geoserver)\/[^\s"'<>]*/gi,
    /https?:\/\/[^\s"'<>]*\.(?:json|geojson|csv|kml|gpx)(?:\?[^\s"'<>]*)?/gi,
    /https?:\/\/[^\s"'<>]*(?:services|maps)\.arcgis\.com[^\s"'<>]*/gi,
  ];
  for (const re of patterns) for (const m of html.matchAll(re)) hits.add(m[0]);
  return [...hits];
}

/** JSON islands (application/json script tags, wp data blobs). */
function findJsonIslands(html) {
  const out = [];
  for (const m of html.matchAll(
    /<script[^>]*type=["'](application\/(?:ld\+)?json)["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    out.push({ kind: m[1], length: m[2].length, head: m[2].trim().slice(0, 400) });
  }
  for (const m of html.matchAll(/var\s+(\w*(?:markers?|cameras?|sites?|locations?)\w*)\s*=\s*(\[[\s\S]{0,200})/gi)) {
    out.push({ kind: `js var ${m[1]}`, length: m[2].length, head: m[2].slice(0, 400) });
  }
  return out;
}

/** Coordinate pairs anywhere in the source — a strong signal the data is inline. */
function findCoords(html) {
  const re = /(-?5[0-3]\.\d{3,})\s*[,:]\s*["']?\s*(-?[0-5]\.\d{3,})/g;
  return [...html.matchAll(re)].slice(0, 12).map(m => `${m[1]}, ${m[2]}`);
}

function summariseMarkup(html) {
  const counts = {};
  for (const m of html.matchAll(/class=["']([^"']+)["']/g)) {
    for (const c of m[1].split(/\s+/)) {
      if (/camera|site|marker|location|map|list|table|row|item/i.test(c)) {
        counts[c] = (counts[c] || 0) + 1;
      }
    }
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 25);
}

async function main() {
  rule('1 · PERMISSION — robots.txt and terms come before anything else');

  for (const url of PAGES) {
    const r = await get(url);
    line(`\n--- ${url}`);
    line(`    status ${r.status}${r.error ? ` (${r.error})` : ''}  ${r.type || ''}  ${r.body.length} bytes  ${r.ms}ms`);
    if (!r.ok) continue;

    if (url.endsWith('robots.txt')) {
      line('    ---- robots.txt verbatim ----');
      line(r.body.split('\n').slice(0, 60).map(l => `    ${l}`).join('\n'));
      continue;
    }

    const title = r.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
    if (title) line(`    title: ${title}`);

    const terms = [...r.body.matchAll(/href=["']([^"']*(?:terms|copyright|privacy|licen[cs]e|foi|open-data)[^"']*)["']/gi)]
      .map(m => m[1]);
    if (terms.length) line(`    terms-ish links: ${[...new Set(terms)].slice(0, 10).join('  ')}`);

    rule(`2 · MACHINE-READABLE? — ${url}`);
    const endpoints = findEndpoints(r.body);
    line(endpoints.length ? endpoints.map(e => `    ${e}`).join('\n') : '    (no data endpoints referenced in the HTML)');

    const islands = findJsonIslands(r.body);
    if (islands.length) {
      line('\n    JSON islands:');
      for (const i of islands) line(`    [${i.kind}] ${i.length} bytes :: ${i.head.replace(/\s+/g, ' ')}`);
    } else {
      line('\n    (no inline JSON blobs)');
    }

    const coords = findCoords(r.body);
    line(coords.length ? `\n    coordinate-looking pairs: ${coords.join(' | ')}` : '\n    (no inline coordinates)');

    rule(`3 · MARKUP SHAPE — ${url}`);
    const classes = summariseMarkup(r.body);
    line(classes.length ? classes.map(([c, n]) => `    ${String(n).padStart(4)}  .${c}`).join('\n') : '    (nothing obviously listy)');
  }

  rule('4 · OFFICIAL OPEN DATA — data.gov.uk');
  const od = await get(OPEN_DATA);
  line(`status ${od.status}${od.error ? ` (${od.error})` : ''}`);
  if (od.ok) {
    try {
      const j = JSON.parse(od.body);
      const r = j.result ?? {};
      line(`title:   ${r.title}`);
      line(`licence: ${r.license_title} ${r.license_url || ''}`);
      line(`org:     ${r.organization?.title}`);
      line(`notes:   ${String(r.notes || '').replace(/\s+/g, ' ').slice(0, 400)}`);
      for (const res of r.resources ?? []) {
        line(`  resource: [${res.format}] ${res.name} -> ${res.url}`);
      }
    } catch {
      line(od.body.slice(0, 600));
    }
  }

  rule('DONE — the parser gets written from what is above, not from guesswork');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
