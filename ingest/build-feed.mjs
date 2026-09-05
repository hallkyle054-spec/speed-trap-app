/**
 * Builds the zone feed the app reads.
 *
 * Runs on a schedule from GitHub Actions. Fetches the publisher's camera map
 * once, parses the site list out of it, keeps the authorities we cover, and
 * writes a clean JSON feed. Never run from the device: it is one page-load per
 * run from one place, and it keeps the user's IP away from the publisher.
 *
 * `firstListed` is preserved across runs by merging with the feed already in
 * the repo, so the app can say how long a site has been on the list, and a site
 * that disappears keeps its last-seen date instead of vanishing silently.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import { extractArrayLiteral, readRows, toSites } from './parse.mjs';

const SOURCE = 'https://www.gosafe.org/camera-map/';
const OUT = 'feed/zones.json';
const UA =
  'VergeZoneFeed/0.1 (+https://github.com/hallkyle054-spec/speed-trap-app; daily site-list sync)';

/** Which unitary authorities the app covers. */
const AUTHORITIES = (process.env.ZONE_AUTHORITIES ?? 'Carmarthenshire')
  .split(',')
  .map(a => a.trim())
  .filter(Boolean);

/** A run that loses most of the list is a parser or site change, not a real drop. */
const MIN_EXPECTED = Number(process.env.ZONE_MIN_EXPECTED ?? 5);

const today = () => new Date().toISOString().slice(0, 10);

async function readExisting() {
  try {
    return JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  const res = await fetch(SOURCE, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`source responded ${res.status}`);
  const html = await res.text();
  console.log(`fetched ${html.length} bytes from ${SOURCE}`);

  const literal = extractArrayLiteral(html, 'pois');
  if (!literal) {
    throw new Error('could not find the `pois` array — the page structure has changed');
  }

  const rows = readRows(literal);
  console.log(`parsed ${rows.length} sites across Wales`);

  const { sites, rejected } = toSites(rows, { authorities: AUTHORITIES });
  console.log(`kept ${sites.length} in ${AUTHORITIES.join(', ')}`);
  for (const r of rejected) console.log(`  rejected: ${r.row} (${r.problems.join('; ')})`);

  if (sites.length < MIN_EXPECTED) {
    throw new Error(
      `only ${sites.length} sites parsed, expected at least ${MIN_EXPECTED}. ` +
        'Refusing to publish a feed that would silently empty the app.',
    );
  }

  const existing = await readExisting();
  const previous = new Map((existing?.zones ?? []).map(z => [z.id, z]));
  const listedOn = today();

  const zones = sites.map(site => {
    const before = previous.get(site.id);
    return {
      id: site.id,
      road: site.road,
      name: site.name,
      limitMph: site.limitMph,
      note: `Listed by ${site.authority} as a ${site.type.toLowerCase()} enforcement site.`,
      sourceUrl: site.sourceUrl,
      firstListed: before?.firstListed ?? listedOn,
      lastListed: listedOn,
      // The source publishes a point per site, not a stretch of road. The
      // single-element path says exactly that and claims no extent.
      path: [site.point],
    };
  });

  // Sites that dropped off the list are kept with their last-seen date, so the
  // app can show them as removed rather than having them disappear overnight.
  const current = new Set(zones.map(z => z.id));
  const dropped = (existing?.zones ?? []).filter(z => !current.has(z.id));
  console.log(`${dropped.length} previously listed sites are no longer published`);

  const feed = {
    listedOn,
    source: SOURCE,
    authorities: AUTHORITIES,
    generatedAt: new Date().toISOString(),
    zones: [...zones, ...dropped],
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(feed, null, 2)}\n`);
  console.log(`wrote ${OUT} with ${feed.zones.length} zones (${dropped.length} removed)`);

  for (const z of zones.slice(0, 10)) {
    console.log(`  ${z.road.padEnd(10)} ${z.name} — ${z.limitMph ?? '?'} mph`);
  }
}

main().catch(e => {
  console.error(`\ningest failed: ${e.message}`);
  process.exit(1);
});
