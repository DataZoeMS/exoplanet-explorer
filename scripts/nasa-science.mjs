export const scienceEndpoint = 'https://science.nasa.gov/wp-json/wp/v2/exoplanet';

export function indexSciencePages(entries) {
  const pages = new Map();
  for (const entry of entries) {
    const id = entry?.acf?.exo_id;
    const name = entry?.acf?.display_name;
    if (typeof id !== 'string' || !id.trim() || typeof name !== 'string' || !name.trim()
      || typeof entry.link !== 'string') {
      throw new Error('NASA Science returned a planet without its identity, display name, or canonical link.');
    }
    const url = new URL(entry.link);
    if (url.origin !== 'https://science.nasa.gov'
      || !/^\/exoplanet-catalog\/[^/]+\/$/.test(url.pathname)
      || url.search || url.hash || url.username || url.password) {
      throw new Error(`Invalid NASA Science planet URL for ${id}: ${entry.link}`);
    }
    if (pages.has(id)) throw new Error(`Ambiguous NASA Science planet identity: ${id}`);
    pages.set(id, { scienceName: name, scienceUrl: url.href });
  }
  return pages;
}

export async function fetchScienceCatalog(fetcher = fetch) {
  async function request(page) {
    const url = new URL(scienceEndpoint);
    url.search = new URLSearchParams({
      per_page: '100', page: String(page), orderby: 'id', order: 'asc',
      _fields: 'link,acf.exo_id,acf.display_name',
    }).toString();
    const response = await fetcher(url, { signal: AbortSignal.timeout(45_000) });
    if (!response.ok) throw new Error(`NASA Science page ${page} failed: ${response.status} ${response.statusText}`);
    const entries = await response.json();
    const total = Number(response.headers.get('x-wp-total'));
    const pageCount = Number(response.headers.get('x-wp-totalpages'));
    if (!Array.isArray(entries) || entries.length === 0 || !Number.isInteger(total) || total <= 0
      || !Number.isInteger(pageCount) || pageCount !== Math.ceil(total / 100)) {
      throw new Error(`NASA Science page ${page} returned invalid catalog data or pagination.`);
    }
    return { entries, total, pageCount };
  }
  const first = await request(1);
  const entries = [...first.entries];
  for (let start = 2; start <= first.pageCount; start += 3) {
    const batch = await Promise.all(Array.from(
      { length: Math.min(3, first.pageCount - start + 1) },
      (_, index) => request(start + index),
    ));
    for (const page of batch) {
      if (page.total !== first.total || page.pageCount !== first.pageCount) {
        throw new Error('NASA Science catalog changed during retrieval. Existing snapshot was not replaced.');
      }
      entries.push(...page.entries);
    }
  }
  if (entries.length !== first.total) throw new Error('NASA Science returned an incomplete catalog.');
  return {
    source: scienceEndpoint, retrievedAt: new Date().toISOString(),
    total: first.total, pages: indexSciencePages(entries),
  };
}

export function attachScienceLinks(snapshot, catalog) {
  function pageFor(name) {
    const id = name.replace(/\s+/g, '_');
    const page = catalog.pages.get(id);
    if (!page) throw new Error(`No verified NASA Science page for ${name} (${id}). Existing snapshot was not replaced.`);
    return page;
  }
  return {
    ...snapshot,
    scienceCatalog: { source: catalog.source, retrievedAt: catalog.retrievedAt, total: catalog.total },
    featured: snapshot.featured.map(planet => ({ ...planet, ...pageFor(planet.pl_name) })),
    plot: snapshot.plot.map(planet => ({ ...planet, ...pageFor(planet.name) })),
  };
}
