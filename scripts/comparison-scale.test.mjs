import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  comparisonBounds, comparisonChart as chart, comparisonPosition, comparisonTicks, quadrantFor,
  comparisonZoomFactor, comparisonZoomMax, changeComparisonZoom, inComparisonView, zoomComparisonBounds,
} from '../src/comparison-scale.ts';

const pair = (starRadiusSun, radiusEarth) => ({ starRadiusSun, radiusEarth });
const bounds = { star: 4, planet: 6 };

test('Earth and Sun are exactly the origin at one reference radius, not zero radius', () => {
  assert.equal(chart.originX, (chart.left + chart.right) / 2);
  assert.equal(chart.originY, (chart.top + chart.bottom) / 2);
  for (const scale of [bounds, { star: 1, planet: 1 }, { star: 12, planet: 8 }]) {
    assert.deepEqual(comparisonPosition(pair(1, 1), scale), { x: chart.originX, y: chart.originY });
  }
  assert.deepEqual(comparisonBounds([]), { star: 1, planet: 1 });
});

test('equal multiplicative changes give equal spacing on opposite sides of Earth and Sun', () => {
  const large = comparisonPosition(pair(4, 8), bounds);
  const small = comparisonPosition(pair(0.25, 0.125), bounds);
  assert.equal(large.x + small.x, chart.originX * 2);
  assert.equal(large.y + small.y, chart.originY * 2);
  assert.ok(large.x > chart.originX && large.y < chart.originY);
  assert.ok(small.x < chart.originX && small.y > chart.originY);
  assert.equal(comparisonPosition(pair(4, 1), bounds).x - chart.originX,
    2 * (comparisonPosition(pair(2, 1), bounds).x - chart.originX));
});

test('the four quadrants use radii relative to their own reference, with boundaries separate', () => {
  for (const [star, planet, expected] of [
    [0.5, 2, 'smaller-star-larger-planet'], [2, 2, 'larger-star-larger-planet'],
    [0.5, 0.5, 'smaller-star-smaller-planet'], [2, 0.5, 'larger-star-smaller-planet'],
    [1, 2, 'reference-axis'], [2, 1, 'reference-axis'], [1, 1, 'reference-axis'],
  ]) assert.equal(quadrantFor(pair(star, planet)), expected);
});

test('full-catalog bounds include sub-Earth planets, small stars, and giant outliers', () => {
  const planets = [pair(0.125, 0.25), pair(128, 64), pair(1, 1)];
  assert.deepEqual(comparisonBounds(planets), { star: 7, planet: 6 });
  const max = comparisonPosition(planets[1], comparisonBounds(planets));
  assert.equal(max.x, chart.right);
  assert.equal(max.y, chart.top);
  assert.deepEqual(comparisonBounds([pair(1, 1)]), { star: 1, planet: 1 });
});

test('axis ticks are symmetric log-ratios, always including the one-times origin', () => {
  for (const extent of [1 / 16, 0.125, 0.4375, 0.875, 1, 1.5, 2, 3, 5, 7, 10, 20]) {
    const ticks = comparisonTicks(extent);
    assert.ok(ticks.includes(0));
    assert.ok(ticks.length >= 3 && ticks.length <= 7);
    assert.deepEqual(ticks, [...ticks].reverse().map(tick => tick === 0 ? 0 : -tick));
    assert.ok(ticks.every(tick => Math.abs(tick) <= extent));
  }
});

test('invalid or out-of-range values are rejected, never clamped or zero-filled', () => {
  for (const value of [0, -1, NaN, Infinity]) {
    assert.throws(() => comparisonBounds([pair(value, 1)]), RangeError);
    assert.throws(() => comparisonPosition(pair(1, value), bounds), RangeError);
    assert.throws(() => quadrantFor(pair(value, 1)), RangeError);
    assert.throws(() => comparisonPosition(pair(1, 1), { star: value, planet: 1 }), RangeError);
    assert.throws(() => comparisonTicks(value), RangeError);
  }
  assert.throws(() => comparisonPosition(pair(32, 1), bounds), /outside/);
  assert.throws(() => comparisonTicks(Number.MIN_VALUE), RangeError);
});

test('zooming one axis changes only its own scale and retains the Earth/Sun origin', () => {
  const full = { star: 7, planet: 7 };
  const original = comparisonPosition(pair(1.1, 1.05), full);
  for (const star of [0, 1, 2, 4, comparisonZoomMax]) {
    for (const planet of [0, 1, 2, 4, comparisonZoomMax]) {
      const view = zoomComparisonBounds(full, { star, planet });
      assert.equal(view.star, full.star / comparisonZoomFactor(star));
      assert.equal(view.planet, full.planet / comparisonZoomFactor(planet));
      assert.deepEqual(comparisonPosition(pair(1, 1), view), { x: chart.originX, y: chart.originY });
      const point = comparisonPosition(pair(1.1, 1.05), view);
      assert.ok(Math.abs((point.x - chart.originX)
        - (original.x - chart.originX) * comparisonZoomFactor(star)) < 1e-10);
      assert.ok(Math.abs((point.y - chart.originY)
        - (original.y - chart.originY) * comparisonZoomFactor(planet)) < 1e-10);
    }
  }
  assert.equal(comparisonZoomFactor(0), 1);
  assert.equal(comparisonZoomFactor(comparisonZoomMax), 16);
});

test('zoom buttons and wheel steps are bounded independently without mutating state', () => {
  const original = { star: 2, planet: 4 };
  assert.deepEqual(changeComparisonZoom(original, 'star', 2), { star: 4, planet: 4 });
  assert.deepEqual(changeComparisonZoom(original, 'planet', -1), { star: 2, planet: 3 });
  assert.deepEqual(changeComparisonZoom(original, 'star', -100), { star: 0, planet: 4 });
  assert.deepEqual(changeComparisonZoom(original, 'planet', 100), { star: 2, planet: comparisonZoomMax });
  assert.deepEqual(original, { star: 2, planet: 4 });
  for (const value of [-1, 1.5, comparisonZoomMax + 1, NaN, Infinity]) {
    assert.throws(() => comparisonZoomFactor(value), RangeError);
    assert.throws(() => zoomComparisonBounds(bounds, { star: value, planet: 0 }), RangeError);
  }
  assert.throws(() => changeComparisonZoom(original, 'star', 0.5), RangeError);
  assert.throws(() => changeComparisonZoom(original, 'unknown', 1), RangeError);
});

test('zoomed views omit out-of-range points without clamping their physical radii', () => {
  const full = { star: 7, planet: 7 };
  const zoomed = zoomComparisonBounds(full, { star: comparisonZoomMax, planet: 0 });
  for (const star of [0.5, 2]) {
    for (const planet of [0.25, 4]) {
      assert.equal(inComparisonView(pair(star, planet), { star: 1, planet: 2 }), true);
    }
  }
  assert.equal(inComparisonView(pair(1, 16), zoomed), true);
  assert.equal(inComparisonView(pair(0.125, 1), zoomed), false);
  assert.equal(inComparisonView(pair(4, 1), zoomed), false);
  assert.throws(() => comparisonPosition(pair(4, 1), zoomed), /outside/);
  assert.deepEqual(zoomComparisonBounds(full, { star: 0, planet: 0 }), full);
});

test('every committed comparison point is at its exact scaled radii inside the plot', async () => {
  const { comparison } = JSON.parse(await readFile(new URL('../src/data/planets.json', import.meta.url)));
  const scale = comparisonBounds(comparison);
  const groups = new Map();
  for (const entry of comparison) {
    const position = comparisonPosition(entry, scale);
    assert.ok(position.x >= chart.left && position.x <= chart.right);
    assert.ok(position.y >= chart.top && position.y <= chart.bottom);
    const star = (position.x - chart.originX) / (chart.right - chart.originX) * scale.star;
    const planet = (chart.originY - position.y) / (chart.originY - chart.top) * scale.planet;
    assert.ok(Math.abs(star - Math.log2(entry.starRadiusSun)) < 1e-12);
    assert.ok(Math.abs(planet - Math.log2(entry.radiusEarth)) < 1e-12);
    const quadrant = quadrantFor(entry);
    groups.set(quadrant, (groups.get(quadrant) ?? 0) + 1);
  }
  assert.equal([...groups.values()].reduce((a, b) => a + b, 0), comparison.length);
  for (const zoom of [{ star: 8, planet: 0 }, { star: 0, planet: 8 }, { star: 8, planet: 8 }]) {
    const view = zoomComparisonBounds(scale, zoom);
    const visible = comparison.filter(entry => inComparisonView(entry, view));
    for (const entry of visible) {
      const point = comparisonPosition(entry, view);
      assert.ok(point.x >= chart.left && point.x <= chart.right);
      assert.ok(point.y >= chart.top && point.y <= chart.bottom);
    }
    assert.ok(visible.length < comparison.length);
  }
  const reset = zoomComparisonBounds(scale, { star: 0, planet: 0 });
  assert.equal(comparison.filter(entry => inComparisonView(entry, reset)).length, comparison.length);
  assert.deepEqual(comparison.map(entry => comparisonPosition(entry, reset)),
    comparison.map(entry => comparisonPosition(entry, scale)));
});
