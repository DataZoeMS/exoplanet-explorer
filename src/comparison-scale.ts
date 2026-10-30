export type ComparisonPlanet = {
  name: string;
  hostName: string;
  starRadiusSun: number;
  radiusEarth: number;
};

type Radii = Pick<ComparisonPlanet, 'starRadiusSun' | 'radiusEarth'>;
export type ComparisonBounds = { star: number; planet: number };
export type ComparisonAxis = keyof ComparisonBounds;
export type ComparisonZoom = { star: number; planet: number };
export const comparisonZoomMax = 8;

export const comparisonChart = {
  width: 760, height: 700, left: 84, right: 728, top: 60, bottom: 616,
  originX: 406, originY: 338,
};

export function comparisonViewport(width: number, height: number): typeof comparisonChart {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 120 || height <= 120) {
    throw new RangeError('Comparison viewport must leave room for axes.');
  }
  const left = 72;
  const right = width - 24;
  const top = 32;
  const bottom = height - 60;
  return { width, height, left, right, top, bottom, originX: (left + right) / 2, originY: (top + bottom) / 2 };
}

export const quadrantLabels = {
  'smaller-star-larger-planet': 'Smaller star / larger planet',
  'larger-star-larger-planet': 'Larger star / larger planet',
  'smaller-star-smaller-planet': 'Smaller star / smaller planet',
  'larger-star-smaller-planet': 'Larger star / smaller planet',
  'reference-axis': 'On the Earth/Sun axes',
} as const;
export type Quadrant = keyof typeof quadrantLabels;

function validateRadii(planet: Radii) {
  if (!Number.isFinite(planet.starRadiusSun) || planet.starRadiusSun <= 0
    || !Number.isFinite(planet.radiusEarth) || planet.radiusEarth <= 0) {
    throw new RangeError('Comparison radii must be finite and positive.');
  }
}

function validateBounds(bounds: ComparisonBounds) {
  if (!Number.isFinite(bounds.star) || bounds.star <= 0
    || !Number.isFinite(bounds.planet) || bounds.planet <= 0) {
    throw new RangeError('Comparison bounds must be finite and positive.');
  }
}

export function comparisonZoomFactor(step: number) {
  if (!Number.isInteger(step) || step < 0 || step > comparisonZoomMax) {
    throw new RangeError('Invalid comparison zoom step.');
  }
  return 2 ** (step / 2);
}

export function zoomComparisonBounds(full: ComparisonBounds, zoom: ComparisonZoom): ComparisonBounds {
  validateBounds(full);
  const bounds = {
    star: full.star / comparisonZoomFactor(zoom.star),
    planet: full.planet / comparisonZoomFactor(zoom.planet),
  };
  validateBounds(bounds);
  return bounds;
}

export function changeComparisonZoom(zoom: ComparisonZoom, axis: ComparisonAxis, steps: number): ComparisonZoom {
  if (axis !== 'star' && axis !== 'planet') throw new RangeError('Invalid comparison zoom axis.');
  comparisonZoomFactor(zoom.star);
  comparisonZoomFactor(zoom.planet);
  if (!Number.isInteger(steps)) throw new RangeError('Zoom changes must be whole steps.');
  return { ...zoom, [axis]: Math.min(comparisonZoomMax, Math.max(0, zoom[axis] + steps)) };
}

export function inComparisonView(entry: Radii, bounds: ComparisonBounds) {
  validateRadii(entry);
  validateBounds(bounds);
  return Math.abs(Math.log2(entry.starRadiusSun)) <= bounds.star
    && Math.abs(Math.log2(entry.radiusEarth)) <= bounds.planet;
}

export function quadrantFor(planet: Radii): Quadrant {
  validateRadii(planet);
  if (planet.starRadiusSun === 1 || planet.radiusEarth === 1) return 'reference-axis';
  return planet.starRadiusSun < 1
    ? planet.radiusEarth > 1 ? 'smaller-star-larger-planet' : 'smaller-star-smaller-planet'
    : planet.radiusEarth > 1 ? 'larger-star-larger-planet' : 'larger-star-smaller-planet';
}

export function comparisonBounds(planets: readonly Radii[]): ComparisonBounds {
  let star = 1;
  let planet = 1;
  for (const entry of planets) {
    validateRadii(entry);
    star = Math.max(star, Math.ceil(Math.abs(Math.log2(entry.starRadiusSun))));
    planet = Math.max(planet, Math.ceil(Math.abs(Math.log2(entry.radiusEarth))));
  }
  return { star, planet };
}

export function comparisonTicks(extent: number): number[] {
  if (!Number.isFinite(extent) || extent <= 0) throw new RangeError('Invalid comparison axis extent.');
  const step = extent >= 1 ? Math.ceil(extent / 3) : 2 ** Math.floor(Math.log2(extent / 2));
  if (step === 0) throw new RangeError('Comparison axis extent is too small.');
  const count = Math.floor(extent / step);
  return Array.from({ length: count * 2 + 1 }, (_, index) => (index - count) * step);
}

export function comparisonPosition(entry: Radii, bounds: ComparisonBounds, chart = comparisonChart) {
  if (!inComparisonView(entry, bounds)) {
    throw new RangeError('Planet-host pair is outside the comparison bounds.');
  }
  const star = Math.log2(entry.starRadiusSun);
  const planet = Math.log2(entry.radiusEarth);
  return {
    x: chart.originX + star / bounds.star * (chart.right - chart.originX),
    y: chart.originY - planet / bounds.planet * (chart.originY - chart.top),
  };
}
