export type ComparisonPlanet = {
  name: string;
  hostName: string;
  starRadiusSun: number;
  radiusEarth: number;
};

type Radii = Pick<ComparisonPlanet, 'starRadiusSun' | 'radiusEarth'>;
export type ComparisonBounds = { star: number; planet: number };

export const comparisonChart = {
  width: 760, height: 700, left: 84, right: 728, top: 60, bottom: 616,
  originX: 406, originY: 338,
};

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
  if (!Number.isSafeInteger(extent) || extent < 1) throw new RangeError('Invalid comparison axis extent.');
  const step = Math.max(1, Math.ceil(extent / 3));
  const count = Math.floor(extent / step);
  return Array.from({ length: count * 2 + 1 }, (_, index) => (index - count) * step);
}

export function comparisonPosition(entry: Radii, bounds: ComparisonBounds) {
  validateRadii(entry);
  if (!Number.isFinite(bounds.star) || bounds.star <= 0
    || !Number.isFinite(bounds.planet) || bounds.planet <= 0) {
    throw new RangeError('Comparison bounds must be finite and positive.');
  }
  const star = Math.log2(entry.starRadiusSun);
  const planet = Math.log2(entry.radiusEarth);
  if (Math.abs(star) > bounds.star || Math.abs(planet) > bounds.planet) {
    throw new RangeError('Planet-host pair is outside the comparison bounds.');
  }
  const chart = comparisonChart;
  return {
    x: chart.originX + star / bounds.star * (chart.right - chart.originX),
    y: chart.originY - planet / bounds.planet * (chart.originY - chart.top),
  };
}
