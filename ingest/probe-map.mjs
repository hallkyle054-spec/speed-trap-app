/**
 * Second pass. The first probe established that fetching is permitted and that
 * the camera map is a 778 KB HTML page with no data endpoint behind it — so the
 * site list is embedded in that page somehow, and this works out how.
 *
 * Still read-only. Fetches two pages once and reports structure.
 */

const UA =
  'VergeZoneFeedProbe/0.1 (+https://github.com/hallkyle054-spec/speed-trap-app; one-off source assessment)';

const MAP = 'https://www.gosafe.org/camera-map/';
const TERMS = 'https://www.gosafe.org/terms-conditions/';

const line = (s = '') => console.log(s);
const rule = t => line(`\n${'='.repeat(72)}\n${t}\n${'='.repeat(72)}`);

/** Never print someone else's API keys into a build log. */
const redact = s => s.replace(/AIza[0-9A-Za-z_-]{10,}/g, 'AIza…REDACTED');

const clip = (s, n) => redact(String(s).replace(/\s+/g, ' ').slice(0, n));

async function get(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow' });
  return { status: res.status, body: await res.text() };
}

function countAll(html, patterns) {
  for (const [name, re] of Object.entries(patterns)) {
    const n = [...html.matchAll(re)].length;
    line(`    ${String(n).padStart(6)}  ${name}`);
  }
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const map = await get(MAP);
  rule(`CAMERA MAP — status ${map.status}, ${map.body.length} bytes`);

  line('\n-- how often each coordinate-ish construct appears --');
  countAll(map.body, {
    'google.maps.LatLng(': /google\.maps\.LatLng\s*\(/g,
    'new Marker / addMarker': /(?:new\s+google\.maps\.Marker|addMarker\s*\()/g,
    'data-lat attribute': /data-lat(?:itude)?=/gi,
    'data-lng attribute': /data-(?:lng|lon|longitude)=/gi,
    '"lat" json key': /["']lat(?:itude)?["']\s*:/g,
    '"lng" json key': /["'](?:lng|lon|longitude)["']\s*:/g,
    'latLng=  querystring': /lat(?:itude)?=[-\d.]+/gi,
    '<option> elements': /<option\b/gi,
    'camera-ish hrefs': /href=["'][^"']*camera[^"']*["']/gi,
  });

  line('\n-- every distinct decimal pair that could be a Welsh coordinate --');
  const pairs = new Set();
  for (const m of map.body.matchAll(/(5[1-3]\.\d{4,})[^\d\-]{1,12}(-[0-5]\.\d{4,})/g)) {
    pairs.add(`${m[1]}, ${m[2]}`);
  }
  line(`    ${pairs.size} distinct pairs`);
  line([...pairs].slice(0, 8).map(p => `    ${p}`).join('\n') || '    (none)');

  line('\n-- the five largest <script> blocks --');
  const scripts = [...map.body.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(m => m[1])
    .sort((a, b) => b.length - a.length)
    .slice(0, 5);
  scripts.forEach((s, i) => line(`    [${i}] ${s.length} bytes :: ${clip(s, 220)}`));

  const marker = scripts.find(s => /Marker|LatLng|markers/i.test(s));
  if (marker) {
    rule('THE BLOCK THAT BUILDS THE MARKERS — first 2500 chars');
    line(redact(marker.trim().slice(0, 2500)));
  }

  line('\n-- what the biggest chunk of the page actually is --');
  const text = stripTags(map.body);
  line(`    visible text length: ${text.length}`);
  line(`    sample: ${clip(text.slice(0, 900), 900)}`);

  rule('TERMS OF USE');
  const terms = await get(TERMS);
  line(`status ${terms.status}, ${terms.body.length} bytes`);
  if (terms.status === 200) {
    const t = stripTags(terms.body);
    // Print the clauses that actually bear on reuse.
    const sentences = t.split(/(?<=\.)\s+/);
    const relevant = sentences.filter(s =>
      /copyright|reproduce|reproduction|redistribut|re-?use|extract|data|licen[cs]e|permission|commercial|automated|crawl|scrape|robot/i.test(s),
    );
    line(relevant.length ? relevant.map(s => `  • ${clip(s, 400)}`).join('\n\n') : clip(t, 2000));
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
