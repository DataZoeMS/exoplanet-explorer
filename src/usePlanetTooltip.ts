import { useEffect, useRef, useState } from 'react';

type HoveredPlanet<Planet> = {
  planet: Planet;
  target: { getBoundingClientRect: () => DOMRect; contextElement: Element };
};

export function usePlanetTooltip<Planet>() {
  const [hovered, setHovered] = useState<HoveredPlanet<Planet> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (hideTimer.current !== null) clearTimeout(hideTimer.current);
  }, []);

  function cancelHide() {
    if (hideTimer.current !== null) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }

  function dismissTooltip() {
    cancelHide();
    setHovered(null);
  }

  function scheduleHide() {
    cancelHide();
    hideTimer.current = setTimeout(() => {
      hideTimer.current = null;
      setHovered(null);
    }, 200);
  }

  function showTooltip(planet: Planet, target: Element) {
    cancelHide();
    setHovered({ planet, target: {
      getBoundingClientRect: () => target.getBoundingClientRect(), contextElement: target,
    } });
  }

  return { hovered, cancelHide, dismissTooltip, scheduleHide, showTooltip };
}
