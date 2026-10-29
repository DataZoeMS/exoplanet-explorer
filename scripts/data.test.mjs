import test from 'node:test';
import assert from 'node:assert/strict';
import { featuredNames, summarize } from './data.mjs';
import { readFile } from 'node:fs/promises';

const rows = featuredNames.map((name, i) => ({
  pl_name: name, hostname: i < 2 ? 'Shared star' : `Star ${i}`,
  discoverymethod: i < 4 ? 'Transit' : 'Radial Velocity',
  disc_year: 2000 + i, pl_rade: i === 0 ? null : 1,
  pl_orbsmax: 0.03, pl_orbper: 10, sy_dist: 20, st_rad: i === 2 ? null : 0.5,
}));
const date = '2026-10-29T00:00:00.000Z';

test('aggregates unique systems, discovery years and methods without losing nulls', () => {
  const result = summarize(rows, date);
  assert.equal(result.totalPlanets, 6);
  assert.equal(result.totalSystems, 5);
  assert.deepEqual(result.methods, [{ name: 'Transit', count: 4 }, { name: 'Radial Velocity', count: 2 }]);
  assert.equal(result.discoveries.reduce((sum, year) => sum + year.count, 0), 6);
  assert.equal(result.featured[0].pl_rade, null);
  assert.equal(result.plot.length, 5);
  assert.equal(result.plot[0].distanceLy, 20 * 3.26156);
  assert.ok(result.plot.every(planet => planet.name !== featuredNames[0]));
});

test('excludes missing distances and radii, while retaining every complete record', () => {
  const result = summarize(rows.map((row, i) => ({ ...row, sy_dist: i === 1 ? null : row.sy_dist })), date);
  assert.equal(result.totalPlanets, 6);
  assert.equal(result.plot.length, 4);
  assert.ok(result.plot.every(planet => planet.radiusEarth === 1 && planet.distanceLy > 0));
});

test('compares every complete planet-host pair independently of distance availability', () => {
  const result = summarize(rows.map((row, i) => ({ ...row, sy_dist: i === 1 ? null : row.sy_dist })), date);
  assert.equal(result.comparison.length, 4);
  assert.ok(result.comparison.some(planet => planet.name === featuredNames[1]));
  assert.ok(!result.comparison.some(planet => planet.name === featuredNames[0] || planet.name === featuredNames[2]));
  assert.ok(result.comparison.every(planet => planet.starRadiusSun === 0.5 && planet.radiusEarth === 1));
  assert.equal(result.comparison.find(planet => planet.name === featuredNames[1]).hostName, 'Shared star');
  const missingStars = summarize(rows.map(row => ({ ...row, st_rad: null })), date);
  assert.equal(missingStars.comparison.length, 0);
  assert.equal(missingStars.plot.length, 5);
});

test('rejects empty, duplicate, malformed and incomplete responses', () => {
  for (const invalid of [[], {}, [...rows, rows[0]], rows.slice(1),
    rows.map(row => ({ ...row, disc_year: null })),
    rows.map(row => ({ ...row, sy_dist: -1 })),
    rows.map(row => ({ ...row, st_rad: 0 })),
    rows.map(row => ({ ...row, st_rad: -1 })),
    rows.map(row => ({ ...row, st_rad: '1' })),
    rows.map(row => ({ ...row, pl_orbsmax: 0 })),
    rows.map(row => ({ ...row, pl_orbsmax: -1 })),
    rows.map(row => ({ ...row, pl_orbsmax: '1' })),
    rows.map(({ pl_orbsmax, ...row }) => row),
    rows.map(row => ({ ...row, pl_orbper: Infinity })),
    rows.map(({ st_rad, ...row }) => row),
    rows.map(row => ({ ...row, discoverymethod: '' }))]) {
    assert.throws(() => summarize(invalid, date));
  }
});

test('comparison orbital measurements retain NASA units and nullable coverage', () => {
  const result = summarize(rows.map((row, i) => ({
    ...row, pl_orbsmax: i === 1 ? null : row.pl_orbsmax,
    pl_orbper: i === 3 ? null : row.pl_orbper,
  })), date);
  assert.equal(result.comparison.length, 4);
  const missingRadius = result.comparison.find(planet => planet.name === featuredNames[1]);
  assert.equal(missingRadius.orbitalRadiusAu, null);
  assert.equal(missingRadius.orbitalPeriodDays, 10);
  const missingPeriod = result.comparison.find(planet => planet.name === featuredNames[3]);
  assert.equal(missingPeriod.orbitalRadiusAu, 0.03);
  assert.equal(missingPeriod.orbitalPeriodDays, null);
});

test('committed snapshot totals and featured records are internally consistent', async () => {
  const snapshot = JSON.parse(await readFile(new URL('../src/data/planets.json', import.meta.url)));
  assert.ok(snapshot.totalPlanets > 0);
  assert.ok(snapshot.totalSystems > 0 && snapshot.totalSystems <= snapshot.totalPlanets);
  assert.equal(snapshot.methods.reduce((sum, method) => sum + method.count, 0), snapshot.totalPlanets);
  assert.equal(snapshot.discoveries.reduce((sum, year) => sum + year.count, 0), snapshot.totalPlanets);
  assert.deepEqual(snapshot.featured.map(row => row.pl_name), featuredNames);
  assert.ok(Number.isFinite(Date.parse(snapshot.retrievedAt)));
  assert.equal(new URL(snapshot.source).hostname, 'exoplanetarchive.ipac.caltech.edu');
  assert.equal(new URL(snapshot.scienceCatalog.source).hostname, 'science.nasa.gov');
  assert.ok(Number.isFinite(Date.parse(snapshot.scienceCatalog.retrievedAt)));
  for (const planet of [...snapshot.featured, ...snapshot.plot, ...snapshot.comparison]) {
    const url = new URL(planet.scienceUrl);
    assert.equal(url.origin, 'https://science.nasa.gov');
    assert.match(url.pathname, /^\/exoplanet-catalog\/[^/]+\/$/);
    assert.ok(planet.scienceName.length > 0);
  }
  assert.equal(snapshot.featured.find(planet => planet.pl_name === '51 Peg b').scienceUrl,
    'https://science.nasa.gov/exoplanet-catalog/51-pegasi-b/');
  assert.ok(snapshot.plot.length > snapshot.featured.length);
  assert.ok(snapshot.plot.length <= snapshot.totalPlanets);
  assert.equal(new Set(snapshot.plot.map(planet => planet.name)).size, snapshot.plot.length);
  assert.ok(snapshot.plot.every((planet, i) => planet.distanceLy > 0 && planet.radiusEarth > 0
    && (i === 0 || planet.distanceLy >= snapshot.plot[i - 1].distanceLy)));
  assert.ok(snapshot.comparison.length > snapshot.featured.length && snapshot.comparison.length <= snapshot.totalPlanets);
  assert.equal(new Set(snapshot.comparison.map(planet => planet.name)).size, snapshot.comparison.length);
  for (const planet of snapshot.comparison) {
    for (const field of ['orbitalRadiusAu', 'orbitalPeriodDays']) {
      assert.ok(planet[field] === null || (Number.isFinite(planet[field]) && planet[field] > 0));
    }
  }
  assert.ok(snapshot.comparison.every((planet, i) => planet.starRadiusSun > 0 && planet.radiusEarth > 0
    && planet.hostName && (i === 0 || planet.starRadiusSun >= snapshot.comparison[i - 1].starRadiusSun)));
  for (let i = 1; i < snapshot.comparison.length; i++) {
    const previous = snapshot.comparison[i - 1];
    const current = snapshot.comparison[i];
    if (previous.starRadiusSun === current.starRadiusSun) {
      assert.ok(previous.radiusEarth <= current.radiusEarth);
      if (previous.radiusEarth === current.radiusEarth) {
        assert.ok(previous.name.localeCompare(current.name, 'en') <= 0);
      }
    }
  }
  for (const featured of snapshot.featured) {
    if (featured.sy_dist !== null && featured.pl_rade !== null) {
      const point = snapshot.plot.find(planet => planet.name === featured.pl_name);
      assert.equal(point.distanceLy, featured.sy_dist * 3.26156);
      assert.equal(point.radiusEarth, featured.pl_rade);
      assert.equal(point.scienceUrl, featured.scienceUrl);
    }
    if (featured.st_rad !== null && featured.pl_rade !== null) {
      const point = snapshot.comparison.find(planet => planet.name === featured.pl_name);
      assert.equal(point.starRadiusSun, featured.st_rad);
      assert.equal(point.radiusEarth, featured.pl_rade);
      assert.equal(point.hostName, featured.hostname);
      assert.equal(point.orbitalRadiusAu, featured.pl_orbsmax);
      assert.equal(point.orbitalPeriodDays, featured.pl_orbper);
      assert.equal(point.scienceUrl, featured.scienceUrl);
    }
  }
});
