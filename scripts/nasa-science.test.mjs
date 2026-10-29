import test from 'node:test';
import assert from 'node:assert/strict';
import { attachScienceLinks, fetchScienceCatalog, indexSciencePages, scienceEndpoint } from './nasa-science.mjs';

function entry(id, slug = id.toLowerCase().replaceAll('_', '-'), displayName = id.replaceAll('_', ' ')) {
  return { link: `https://science.nasa.gov/exoplanet-catalog/${slug}/`, acf: { exo_id: id, display_name: displayName } };
}

test('joins archive identities to canonical NASA pages, not guessed slugs', () => {
  const pages = indexSciencePages([entry('51_Peg_b', '51-pegasi-b', '51 Pegasi b')]);
  const result = attachScienceLinks({
    featured: [{ pl_name: '51 Peg b' }], plot: [{ name: '51 Peg b', radiusEarth: 14.1 }],
  }, { pages, source: scienceEndpoint, retrievedAt: '2026-10-29T00:00:00Z', total: 1 });
  for (const planet of [...result.featured, ...result.plot]) {
    assert.equal(planet.scienceUrl, 'https://science.nasa.gov/exoplanet-catalog/51-pegasi-b/');
    assert.equal(planet.scienceName, '51 Pegasi b');
  }
  assert.equal(result.plot[0].radiusEarth, 14.1);
  assert.throws(() => attachScienceLinks({ featured: [{ pl_name: 'Unknown b' }], plot: [] }, { pages }), /No verified NASA Science page/);
});

test('rejects invalid URLs, missing metadata and ambiguous identities', () => {
  for (const invalid of [
    { ...entry('A_b'), link: 'https://example.com/exoplanet-catalog/a-b/' },
    { ...entry('A_b'), link: 'https://science.nasa.gov:8080/exoplanet-catalog/a-b/' },
    { ...entry('A_b'), link: 'https://science.nasa.gov/exoplanets/' },
    { ...entry('A_b'), link: 'javascript:alert(1)' },
    { ...entry('A_b'), link: 'https://science.nasa.gov/exoplanet-catalog/a-b/?redirect=elsewhere' },
    { link: entry('A_b').link, acf: { exo_id: 'A_b' } },
  ]) assert.throws(() => indexSciencePages([invalid]));
  assert.throws(() => indexSciencePages([entry('A_b'), entry('A_b')]), /Ambiguous/);
});

test('retrieves and indexes all catalog pages', async () => {
  const entries = Array.from({ length: 201 }, (_, i) => entry(`Star_${i}_b`));
  const requests = [];
  const catalog = await fetchScienceCatalog(async url => {
    const page = Number(url.searchParams.get('page'));
    requests.push(page);
    assert.equal(url.searchParams.get('per_page'), '100');
    return new Response(JSON.stringify(entries.slice((page - 1) * 100, page * 100)), {
      headers: { 'x-wp-total': '201', 'x-wp-totalpages': '3' },
    });
  });
  assert.deepEqual(requests, [1, 2, 3]);
  assert.equal(catalog.pages.size, 201);
  assert.equal(catalog.pages.get('Star_200_b').scienceName, 'Star 200 b');
});

test('rejects failed, malformed, incomplete or concurrently changing catalogs', async () => {
  await assert.rejects(() => fetchScienceCatalog(async () => new Response('', { status: 503 })), /failed: 503/);
  await assert.rejects(() => fetchScienceCatalog(async () => new Response('[]')), /invalid catalog/);
  await assert.rejects(() => fetchScienceCatalog(async () => new Response(JSON.stringify([entry('A_b')]), {
    headers: { 'x-wp-total': '2', 'x-wp-totalpages': '1' },
  })), /incomplete catalog/);
  await assert.rejects(() => fetchScienceCatalog(async url => new Response(JSON.stringify([entry(`Page_${url.searchParams.get('page')}_b`)]), {
    headers: { 'x-wp-total': url.searchParams.get('page') === '1' ? '101' : '102', 'x-wp-totalpages': '2' },
  })), /changed during retrieval/);
});
