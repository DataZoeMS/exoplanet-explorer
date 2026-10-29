export const query = 'select pl_name,hostname,discoverymethod,disc_year,pl_rade,st_rad,pl_orbsmax,pl_orbper,sy_dist from pscomppars';
export const endpoint = new URL('https://exoplanetarchive.ipac.caltech.edu/TAP/sync');
endpoint.search = new URLSearchParams({ query, format: 'json' }).toString();

export const featuredNames = [
  'TRAPPIST-1 e', '51 Peg b', 'Kepler-186 f',
  'TOI-700 d', '55 Cnc e', 'Kepler-16 b',
];

export function summarize(rows, retrievedAt) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('NASA returned no planetary records. Existing snapshot was not replaced.');
  }
  const names = new Set();
  const hosts = new Set();
  const methods = new Map();
  const years = new Map();
  for (const row of rows) {
    if (typeof row.pl_name !== 'string' || !row.pl_name.trim()
      || typeof row.hostname !== 'string' || !row.hostname.trim()
      || typeof row.discoverymethod !== 'string' || !row.discoverymethod.trim()
      || !Number.isInteger(row.disc_year) || row.disc_year < 1900
      || row.disc_year > new Date(retrievedAt).getUTCFullYear()
      || names.has(row.pl_name)) {
      throw new Error('NASA returned invalid or duplicate planetary records.');
    }
    for (const field of ['pl_rade', 'st_rad', 'pl_orbsmax', 'pl_orbper', 'sy_dist']) {
      if (row[field] !== null && (!Number.isFinite(row[field]) || row[field] <= 0)) {
        throw new Error(`Invalid ${field} for ${row.pl_name}.`);
      }
    }
    names.add(row.pl_name);
    hosts.add(row.hostname);
    methods.set(row.discoverymethod, (methods.get(row.discoverymethod) ?? 0) + 1);
    years.set(row.disc_year, (years.get(row.disc_year) ?? 0) + 1);
  }
  const featured = featuredNames.map(name => {
    const row = rows.find(row => row.pl_name === name);
    if (!row) throw new Error(`Featured planet ${name} is missing from NASA's response.`);
    return row;
  });
  const plot = rows
    .filter(row => row.sy_dist !== null && row.pl_rade !== null)
    .map(row => ({
      name: row.pl_name,
      distanceLy: row.sy_dist * 3.26156,
      radiusEarth: row.pl_rade,
    }))
    .sort((a, b) => a.distanceLy - b.distanceLy || a.name.localeCompare(b.name, 'en'));
  const comparison = rows
    .filter(row => row.st_rad !== null && row.pl_rade !== null)
    .map(row => ({
      name: row.pl_name, hostName: row.hostname,
      starRadiusSun: row.st_rad, radiusEarth: row.pl_rade,
      orbitalRadiusAu: row.pl_orbsmax, orbitalPeriodDays: row.pl_orbper,
    }))
    .sort((a, b) => a.starRadiusSun - b.starRadiusSun
      || a.radiusEarth - b.radiusEarth || a.name.localeCompare(b.name, 'en'));
  return {
    retrievedAt, source: endpoint.href, table: 'pscomppars',
    totalPlanets: names.size, totalSystems: hosts.size,
    methods: [...methods].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    discoveries: [...years].map(([year, count]) => ({ year, count })).sort((a, b) => a.year - b.year),
    featured, plot, comparison,
  };
}
