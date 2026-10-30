import test from 'node:test';
import assert from 'node:assert/strict';
import { nearestPoint, spacedTicks } from '../src/explore-scale.ts';
import { distanceBands, distanceRadius } from '../src/distance-scale.ts';
import { comparisonViewport, comparisonPosition } from '../src/comparison-scale.ts';

test('Explore labels retain the outer band and never crowd at phone or desktop chart sizes', () => {
  for (const limit of [100, 1000, 10000, 100000]) {
    const ticks = distanceBands(limit);
    for (const scale of [0.25, 0.4, 0.6, 1, 1.5]) {
      const position = tick => distanceRadius(tick, limit) * scale;
      const labels = spacedTicks(ticks, position, 56);
      assert.equal(labels.at(-1), ticks.at(-1));
      assert.ok(labels.every(tick => ticks.includes(tick)));
      for (let i = 1; i < labels.length; i++) assert.ok(position(labels[i]) - position(labels[i - 1]) >= 56);
    }
  }
});

test('Explore spacing keeps an empty list empty and rejects invalid measurements', () => {
  assert.deepEqual(spacedTicks([], value => value, 56), []);
  for (const gap of [0, -1, NaN, Infinity]) assert.throws(() => spacedTicks([1], value => value, gap), RangeError);
  assert.throws(() => spacedTicks([1], () => NaN, 56), RangeError);
});

test('touch selection chooses the nearest visible point within the hit radius', () => {
  const points = [{ x: 1, y: 1, name: 'near' }, { x: 8, y: 8, name: 'far' }];
  assert.equal(nearestPoint(points, 2, 2, 24), points[0]);
  assert.equal(nearestPoint(points, 100, 100, 24), undefined);
  assert.equal(nearestPoint([], 0, 0, 24), undefined);
  assert.equal(nearestPoint([{ x: 24, y: 0 }], 0, 0, 24)?.x, 24);
});

test('responsive comparison geometry keeps the reference centered and ratios exact', () => {
  for (const [width, height] of [[1032, 354], [374, 579], [828, 246], [240, 180]]) {
    const chart = comparisonViewport(width, height);
    const bounds = { star: 2, planet: 3 };
    assert.deepEqual(comparisonPosition({ starRadiusSun: 1, radiusEarth: 1 }, bounds, chart),
      { x: (chart.left + chart.right) / 2, y: (chart.top + chart.bottom) / 2 });
    assert.deepEqual(comparisonPosition({ starRadiusSun: 4, radiusEarth: 8 }, bounds, chart),
      { x: chart.right, y: chart.top });
    assert.deepEqual(comparisonPosition({ starRadiusSun: 0.25, radiusEarth: 0.125 }, bounds, chart),
      { x: chart.left, y: chart.bottom });
  }
  assert.throws(() => comparisonViewport(0, 768), RangeError);
  assert.throws(() => comparisonViewport(1366, NaN), RangeError);
});
