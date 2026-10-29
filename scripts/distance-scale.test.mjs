import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chart, distanceLimit, distanceRadius, markerRadius, planetPosition, distanceBands, quarterArc, radiusBounds } from '../src/distance-scale.ts';

const bounds = { min: .3, max: 80 };

function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} should equal ${expected}`);
}

test('Earth maps to the lower-left origin and the maximum distance reaches the outer band', () => {
  assert.equal(distanceRadius(0, 1000), 0);
  assert.equal(distanceRadius(1000, 1000), chart.radius);
  const origin = planetPosition({ name: 'Earth', distanceLy: 0, radiusEarth: 1 }, 1000, bounds);
  assert.equal(origin.x, chart.originX);
  assert.equal(origin.y, chart.originY);
  assert.ok(chart.originX < chart.width / 2 && chart.originY > chart.height / 2);
});

test('log1p distance scaling is monotonic, exact, and has equal transformed intervals', () => {
  const distances = [0, 1, 9, 99, 999];
  const radii = distances.map(distance => distanceRadius(distance, 999));
  assert.ok(radii.every((radius, i) => i === 0 || radius > radii[i - 1]));
  close(radii[2], chart.radius / 3);
  close(radii[3], 2 * chart.radius / 3);
  close(radii[4] - radii[3], radii[3] - radii[2]);
  assert.equal(distanceLimit(27800), 100000);
  assert.equal(distanceLimit(100), 100);
  assert.deepEqual(distanceBands(1000), [1, 10, 100, 1000]);
});

test('marker area is proportional to catalog radius, without minimum-size or maximum-size clamps', () => {
  close(markerRadius(4) / markerRadius(1), 2);
  close(markerRadius(16) / markerRadius(1), 4);
  close(markerRadius(.01) / markerRadius(1), .1);
  close(markerRadius(100) ** 2 / markerRadius(1) ** 2, 100);
});

test('angular placement depends on radius, not name, and preserves radial distance', () => {
  const planet = { name: 'TRAPPIST-1 e', distanceLy: 40.5, radiusEarth: .92 };
  const point = planetPosition(planet, 1000, bounds);
  assert.deepEqual(planetPosition({ ...planet, name: 'Another world' }, 1000, bounds), point);
  assert.ok(point.x > chart.originX && point.y < chart.originY);
  close(Math.hypot(point.x - chart.originX, point.y - chart.originY), distanceRadius(planet.distanceLy, 1000));
  const larger = planetPosition({ ...planet, radiusEarth: 16 }, 1000, bounds);
  assert.ok(larger.x > point.x && larger.y > point.y);
  close(Math.hypot(larger.x - chart.originX, larger.y - chart.originY), distanceRadius(planet.distanceLy, 1000));
  const path = quarterArc(chart.radius);
  assert.equal(path, 'M 664 660 A 600 600 0 0 0 64 60');
});

test('smallest planets are nearest the vertical axis and largest nearest the horizontal axis', () => {
  const radii = [.3, 1, 4, 16, 80];
  const planets = radii.map(radiusEarth => ({ name: `${radiusEarth}`, radiusEarth, distanceLy: 100 }));
  assert.deepEqual(radiusBounds(planets), bounds);
  const positions = planets.map(planet => planetPosition(planet, 1000, bounds));
  const angles = positions.map(point => Math.atan2(chart.originY - point.y, point.x - chart.originX));
  close(angles[0], 84 * Math.PI / 180);
  close(angles.at(-1), 6 * Math.PI / 180);
  assert.ok(angles.every((angle, i) => i === 0 || angle < angles[i - 1]));
  const middle = planetPosition({ name: 'Log midpoint', distanceLy: 100, radiusEarth: Math.sqrt(bounds.min * bounds.max) }, 1000, bounds);
  close(Math.atan2(chart.originY - middle.y, middle.x - chart.originX), Math.PI / 4);
});

test('equal-radius catalogs use a shared diagonal and empty catalogs have no size bounds', () => {
  const planets = [{ name: 'A', distanceLy: 10, radiusEarth: 1 }, { name: 'B', distanceLy: 20, radiusEarth: 1 }];
  const equalBounds = radiusBounds(planets);
  assert.deepEqual(equalBounds, { min: 1, max: 1 });
  const point = planetPosition(planets[0], 1000, equalBounds);
  close(point.x - chart.originX, chart.originY - point.y);
  assert.equal(radiusBounds([]), null);
});

test('rejects invalid scales and measurements instead of fabricating positions', () => {
  for (const distance of [-1, NaN, Infinity, 1001]) assert.throws(() => distanceRadius(distance, 1000));
  for (const limit of [0, -1, NaN, Infinity]) {
    assert.throws(() => distanceRadius(1, limit));
    assert.throws(() => distanceLimit(limit));
  }
  for (const radius of [0, -1, NaN, Infinity]) assert.throws(() => markerRadius(radius));
  for (const invalid of [{ min: 0, max: 80 }, { min: 4, max: 1 }, { min: 2, max: 80 }, { min: 1, max: Infinity }]) {
    assert.throws(() => planetPosition({ name: 'A', distanceLy: 10, radiusEarth: 1 }, 1000, invalid));
  }
});

test('every catalog point fits the quarter circle at its exact scaled distance', async () => {
  const data = JSON.parse(await readFile(new URL('../src/data/planets.json', import.meta.url)));
  const limit = distanceLimit(Math.max(...data.plot.map(planet => planet.distanceLy)));
  const catalogBounds = radiusBounds(data.plot);
  for (const planet of data.plot) {
    const position = planetPosition(planet, limit, catalogBounds);
    assert.ok(position.x > chart.originX && position.y < chart.originY);
    const distance = Math.hypot(position.x - chart.originX, position.y - chart.originY);
    assert.ok(distance <= chart.radius);
    close(distance, distanceRadius(planet.distanceLy, limit));
    assert.ok(Number.isFinite(position.radius) && position.radius > 0);
  }
  const sortedByRadius = [...data.plot].sort((a, b) => a.radiusEarth - b.radiusEarth);
  const angles = sortedByRadius.map(planet => {
    const point = planetPosition(planet, limit, catalogBounds);
    return Math.atan2(chart.originY - point.y, point.x - chart.originX);
  });
  assert.ok(angles.every((angle, i) => i === 0 || angle <= angles[i - 1] + 1e-12));
});
