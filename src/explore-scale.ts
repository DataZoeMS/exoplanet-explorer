export function spacedTicks(ticks: readonly number[], position: (tick: number) => number, minimumGap: number) {
  if (!Number.isFinite(minimumGap) || minimumGap <= 0) throw new RangeError('Tick spacing must be positive.');
  const result: number[] = [];
  let previous = Infinity;
  for (const tick of [...ticks].reverse()) {
    const value = position(tick);
    if (!Number.isFinite(value)) throw new RangeError('Tick positions must be finite.');
    if (previous - value >= minimumGap) {
      result.push(tick);
      previous = value;
    }
  }
  return result.reverse();
}

export function nearestPoint<T extends { x: number; y: number }>(points: readonly T[], x: number, y: number, radius: number): T | undefined {
  let nearest: T | undefined;
  let squaredDistance = radius ** 2;
  for (const point of points) {
    const distance = (point.x - x) ** 2 + (point.y - y) ** 2;
    if (distance <= squaredDistance) {
      squaredDistance = distance;
      nearest = point;
    }
  }
  return nearest;
}
