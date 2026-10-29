export type PlotPlanet = {
  name: string;
  distanceLy: number;
  radiusEarth: number;
};

export const chart = { width: 760, height: 740, originX: 64, originY: 660, radius: 600 };

export type RadiusBounds = { min: number; max: number };

export function radiusBounds(planets: PlotPlanet[]): RadiusBounds | null {
  if (planets.length === 0) return null;
  const radii = planets.map(planet => planet.radiusEarth);
  for (const radius of radii) markerRadius(radius);
  return { min: Math.min(...radii), max: Math.max(...radii) };
}

export function distanceLimit(maxDistance: number) {
  if (!Number.isFinite(maxDistance) || maxDistance <= 0) {
    throw new Error('The distance limit must be finite and positive.');
  }
  return 10 ** Math.ceil(Math.log10(maxDistance));
}

export function distanceRadius(distanceLy: number, limit: number) {
  if (!Number.isFinite(distanceLy) || distanceLy < 0
    || !Number.isFinite(limit) || limit <= 0 || distanceLy > limit) {
    throw new Error('Distance must be finite, nonnegative, and within the positive chart limit.');
  }
  return chart.radius * Math.log1p(distanceLy) / Math.log1p(limit);
}

export function markerRadius(radiusEarth: number) {
  if (!Number.isFinite(radiusEarth) || radiusEarth <= 0) {
    throw new Error('Planet radius must be finite and positive.');
  }
  return 2.6 * Math.sqrt(radiusEarth);
}

export function planetPosition(planet: PlotPlanet, limit: number, bounds: RadiusBounds) {
  const radius = markerRadius(planet.radiusEarth);
  if (!Number.isFinite(bounds.min) || !Number.isFinite(bounds.max)
    || bounds.min <= 0 || bounds.max < bounds.min
    || planet.radiusEarth < bounds.min || planet.radiusEarth > bounds.max) {
    throw new Error('Planet radius must fall within finite, positive catalog radius bounds.');
  }
  const sizeFraction = bounds.min === bounds.max ? .5
    : Math.log(planet.radiusEarth / bounds.min) / Math.log(bounds.max / bounds.min);
  const angle = (84 - 78 * sizeFraction) * Math.PI / 180;
  const distance = distanceRadius(planet.distanceLy, limit);
  return {
    x: chart.originX + distance * Math.cos(angle),
    y: chart.originY - distance * Math.sin(angle),
    radius,
  };
}

export function distanceBands(limit: number) {
  distanceLimit(limit);
  const bands: number[] = [];
  for (let distance = 1; distance <= limit; distance *= 10) bands.push(distance);
  return bands;
}

export function quarterArc(radius: number) {
  return `M ${chart.originX + radius} ${chart.originY} A ${radius} ${radius} 0 0 0 ${chart.originX} ${chart.originY - radius}`;
}
