/**
 * Parses the site list out of the publisher's camera map page.
 *
 * The page carries the whole of Wales inline as a JavaScript array literal:
 *
 *   var pois = [ ['A5025, Trgele, Cemaes Bay, Anglesey','53.403372','-4.47532',
 *                 'Mobile','/camera-details?id=2520','Mobile','Anglesey','2520','40'], … ]
 *
 * Nine fields, positionally:
 *   0 description   1 latitude   2 longitude   3 type   4 detail path
 *   5 type again    6 unitary authority        7 site id            8 speed limit
 *
 * The literal is read with a small scanner rather than eval — this is untrusted
 * third-party text and must never be executed.
 */

/** Extracts the balanced `[...]` that follows `var <name> =`. */
export function extractArrayLiteral(source, name) {
  const start = source.search(new RegExp(`var\\s+${name}\\s*=\\s*\\[`));
  if (start === -1) return null;
  const open = source.indexOf('[', start);

  let depth = 0;
  let quote = null;
  for (let i = open; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  return null;
}

/**
 * Reads a literal of quoted strings into rows. Depth 1 is the outer array,
 * depth 2 a site; strings are collected only inside a site, so stray commas
 * and apostrophes in the copy cannot shift the columns.
 */
export function readRows(literal) {
  const rows = [];
  let depth = 0;
  let row = null;
  let quote = null;
  let buf = '';

  for (let i = 0; i < literal.length; i++) {
    const c = literal[i];

    if (quote) {
      if (c === '\\') buf += literal[++i] ?? '';
      else if (c === quote) {
        if (row) row.push(buf);
        buf = '';
        quote = null;
      } else buf += c;
      continue;
    }

    if (c === '"' || c === "'") {
      quote = c;
      buf = '';
    } else if (c === '[') {
      depth++;
      if (depth === 2) row = [];
    } else if (c === ']') {
      if (depth === 2 && row) {
        rows.push(row);
        row = null;
      }
      depth--;
    }
  }
  return rows;
}

const ROAD = /^\s*((?:A|B)\d{1,4}(?:\s*\(M\))?|M\d{1,3}(?:\s*\(M\))?)\b/i;

/** 'A484, Llangain, Carmarthenshire' -> { road: 'A484', name: 'Llangain' } */
export function splitDescription(description, authority) {
  const cleaned = description.replace(/\s+/g, ' ').trim();
  const parts = cleaned
    .split(/\s*[,/]\s*/)
    .map(p => p.trim())
    .filter(Boolean)
    .filter(p => p.toLowerCase() !== String(authority).toLowerCase());

  const match = ROAD.exec(cleaned);
  if (match) {
    const road = match[1].toUpperCase().replace(/\s+/g, '');
    const rest = parts
      .map((p, i) => (i === 0 ? p.replace(ROAD, '').replace(/^[\s,/-]+/, '') : p))
      .filter(Boolean)
      .filter(p => p.toLowerCase() !== road.toLowerCase());
    return { road, name: rest.join(', ') };
  }
  // No road number published — lead with the first phrase instead of inventing one.
  const road = parts[0] ?? cleaned;
  const rest = parts.slice(1).filter(p => p.toLowerCase() !== road.toLowerCase());
  return { road, name: rest.join(', ') };
}

const isFiniteNumber = n => typeof n === 'number' && Number.isFinite(n);

/**
 * Rows -> site records. Anything that fails validation is dropped and counted;
 * a malformed site is worse than a missing one.
 */
export function toSites(rows, { authorities }) {
  // No authorities named means take them all. The publisher covers Wales and
  // nothing else, so "everything it lists" and "Wales" are the same set — there
  // is no filter that would make the result more Welsh, only smaller.
  const wanted = new Set((authorities ?? []).map(a => a.toLowerCase()));
  const sites = [];
  const rejected = [];

  for (const row of rows) {
    const [description, lat, lng, type, detail, , authority, id, limit] = row;
    if (wanted.size && !wanted.has(String(authority ?? '').toLowerCase())) continue;

    const latitude = Number(lat);
    const longitude = Number(lng);
    const problems = [];

    if (!description) problems.push('no description');
    if (!id) problems.push('no id');
    if (!isFiniteNumber(latitude) || latitude < 51 || latitude > 54) problems.push(`lat ${lat}`);
    if (!isFiniteNumber(longitude) || longitude < -6 || longitude > -2) problems.push(`lng ${lng}`);

    if (problems.length) {
      rejected.push({ row: row.slice(0, 3).join(' | '), problems });
      continue;
    }

    const limitMph = /^\d+$/.test(String(limit ?? '')) ? Number(limit) : null;
    const { road, name } = splitDescription(description, authority);

    sites.push({
      id: `gosafe-${id}`,
      road,
      name,
      limitMph: limitMph && limitMph > 0 ? limitMph : null,
      type: String(type ?? '').trim() || 'Unknown',
      authority: String(authority),
      sourceUrl: detail ? new URL(detail, 'https://www.gosafe.org').toString() : null,
      point: { latitude, longitude },
    });
  }

  return { sites, rejected };
}
