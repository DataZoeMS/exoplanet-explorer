import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type PointerEvent } from 'react';
import { Button } from '@fluentui/react-components';
import { nearestPoint } from './explore-scale';
import './chart-explore.css';

type Panel = 'none' | 'filters' | 'details' | 'legend' | 'notes' | 'reference';
const compactQuery = '(max-width: 959px), (max-height: 599px)';

export function useChartExplore(dismissTooltip: () => void, width: number, height: number) {
  const [active, setActive] = useState(false);
  const [compact, setCompact] = useState(() => window.matchMedia(compactQuery).matches);
  const [panel, setPanel] = useState<Panel>('legend');
  const [scale, setScale] = useState(1);
  const [viewport, setViewport] = useState({ width, height });
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const panelOpener = useRef<HTMLElement | SVGElement | null>(null);
  const touchStart = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const media = window.matchMedia(compactQuery);
    const update = () => {
      setCompact(media.matches);
      setPanel(media.matches ? 'none' : 'legend');
    };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!active) return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = previous; };
  }, [active]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const dialog = dialogRef.current;
    if (!active || !stage || !dialog) return;
    const resize = () => {
      const viewBox = stage.querySelector('svg')?.viewBox.baseVal;
      const scale = Math.min(stage.clientWidth / (viewBox?.width || width), stage.clientHeight / (viewBox?.height || height));
      if (scale > 0) {
        dialog.style.setProperty('--explore-label-scale', String(1 / scale));
        setScale(scale);
        setViewport(current => current.width === stage.clientWidth && current.height === stage.clientHeight
          ? current : { width: stage.clientWidth, height: stage.clientHeight });
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    resize();
    return () => observer.disconnect();
  }, [active, width, height, viewport]);

  useLayoutEffect(() => {
    if (active) dialogRef.current?.querySelector<HTMLButtonElement>('.explore-header > button')?.focus();
  }, [active]);

  useLayoutEffect(() => {
    if (!active) return;
    if ((compact && panel !== 'none') || panel === 'reference') {
      dialogRef.current?.querySelector<HTMLButtonElement>('.explore-panel-heading button')?.focus({ preventScroll: true });
    } else if (panelOpener.current?.isConnected) {
      panelOpener.current.focus({ preventScroll: true });
      panelOpener.current = null;
    }
  }, [active, compact, panel]);

  function open() {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dismissTooltip();
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelOpener.current = null;
    setPanel(compact ? 'none' : 'legend');
    dialog.close();
    dialog.showModal();
    setActive(true);
  }

  function close() {
    dismissTooltip();
    dialogRef.current?.close();
    dialogRef.current?.show();
    setActive(false);
    opener.current?.focus({ preventScroll: true });
  }

  function showPanel(next: Panel) {
    dismissTooltip();
    if (next !== 'none' && !panelOpener.current) {
      const element = document.activeElement;
      if (element instanceof HTMLElement || element instanceof SVGElement) panelOpener.current = element;
    }
    setPanel(next);
  }

  function startTouch(event: PointerEvent<SVGSVGElement>) {
    touchStart.current = event.pointerType === 'touch' && event.isPrimary
      ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
  }

  function cancelTouch() {
    touchStart.current = null;
  }

  function moveTouch(event: PointerEvent<SVGSVGElement>) {
    const start = touchStart.current;
    if (start && (start.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10)) cancelTouch();
  }

  function selectNearTouch<T extends { x: number; y: number }>(event: PointerEvent<SVGSVGElement>, points: readonly T[], select: (point: T) => void) {
    const start = touchStart.current;
    cancelTouch();
    if (!active || event.pointerType !== 'touch' || !start || start.id !== event.pointerId
      || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10
      || event.target instanceof Element && event.target.closest('[data-zoom-axis], .comparison-earth-marker')) return;
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const nearest = nearestPoint(points, point.x, point.y, 24 / Math.hypot(matrix.a, matrix.b));
    if (nearest) {
      select(nearest);
      if (compact) showPanel('details');
    }
  }

  return { active, compact, panel, scale, viewport, dialogRef, stageRef, open, close, showPanel, startTouch, moveTouch, cancelTouch, selectNearTouch };
}

type Explore = ReturnType<typeof useChartExplore>;
type Props = {
  explore: Explore;
  id: string;
  title: string;
  selected: string;
  canBrowse: boolean;
  onPrevious: () => void;
  onNext: () => void;
  children: ReactNode;
};

export function ChartExplore({ explore, id, title, selected, canBrowse, onPrevious, onNext, children }: Props) {
  const { active, compact, panel } = explore;
  const panelOpen = panel !== 'none';
  return (
    <dialog open ref={explore.dialogRef} className="chart-explore" data-active={active}
      data-panel={panel} role={active ? 'dialog' : 'region'} aria-label={title}
      onCancel={event => {
        event.preventDefault();
        if ((compact && panelOpen) || panel === 'reference') explore.showPanel('none');
        else explore.close();
      }}>
      {active && <header className="explore-header">
        <h2>{title}</h2>
        <nav aria-label="Explorer panels">
          {(['filters', 'details', 'legend', 'notes'] as const).map(item => <Button key={item}
            className={item === 'filters' || item === 'details' ? 'explore-compact-button' : undefined}
            appearance={panel === item ? 'primary' : 'subtle'} aria-pressed={panel === item}
            onClick={() => explore.showPanel(compact && panel === item ? 'none' : item)}>
            {item === 'notes' ? 'How to read' : item.charAt(0).toUpperCase() + item.slice(1)}
          </Button>)}
        </nav>
        <Button onClick={explore.close} aria-label={`Close ${title}`}>Close</Button>
      </header>}
      {active && ((compact && panelOpen) || panel === 'reference') && <div className="explore-panel-heading">
        <strong>{panel === 'reference' ? 'Earth / Sun' : panel === 'notes' ? 'How to read' : `${panel.charAt(0).toUpperCase()}${panel.slice(1)}`}</strong>
        <Button onClick={() => explore.showPanel(compact ? 'none' : 'legend')} aria-label="Dismiss panel">Done</Button>
      </div>}
      {children}
      {active && panel === 'reference' && <section className="explore-reference" aria-label="Earth and Sun measurements">
        <h3>Earth / Sun</h3>
        <dl>
          <div><dt>Star radius</dt><dd>1 Sun radius</dd></div>
          <div><dt>Planet radius</dt><dd>1 Earth radius</dd></div>
          <div><dt>Orbital radius</dt><dd>1 AU (semi-major axis)</dd></div>
          <div><dt>Orbital period</dt><dd>About 365 days</dd></div>
        </dl>
        <p>Earth/Sun is the (1, 1) size reference. Orbital measurements are approximate.</p>
      </section>}
      {active && <footer className="explore-footer">
        <Button disabled={!canBrowse} onClick={onPrevious} aria-label={`Previous ${id} planet`}>Previous</Button>
        <Button className="explore-selected-button" onClick={() => explore.showPanel(panel === 'details' ? 'none' : 'details')}
          aria-label={`Show details: ${selected}`}>{selected}</Button>
        <Button disabled={!canBrowse} onClick={onNext} aria-label={`Next ${id} planet`}>Next</Button>
      </footer>}
    </dialog>
  );
}
