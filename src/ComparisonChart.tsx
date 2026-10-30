import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, Select, Tooltip } from '@fluentui/react-components';
import { AddRegular, ArrowLeftRegular, ArrowRightRegular, ArrowUpRightRegular, SearchRegular, SubtractRegular } from '@fluentui/react-icons';
import {
  comparisonBounds, comparisonChart as fullChart, comparisonPosition, comparisonTicks, comparisonViewport,
  comparisonZoomFactor, comparisonZoomMax, changeComparisonZoom, inComparisonView, zoomComparisonBounds,
  quadrantFor, quadrantLabels, type ComparisonAxis, type ComparisonPlanet, type ComparisonZoom, type Quadrant,
} from './comparison-scale';
import { usePlanetTooltip } from './usePlanetTooltip';
import { ChartExplore, useChartExplore } from './ChartExplore';
import './comparison-chart.css';

type CatalogPlanet = ComparisonPlanet & {
  scienceName: string; scienceUrl: string;
  orbitalRadiusAu: number | null; orbitalPeriodDays: number | null;
};
type TooltipPlanet = Omit<CatalogPlanet, 'scienceName' | 'scienceUrl'>;
const earthSunReference: TooltipPlanet = {
  name: 'Earth', hostName: 'Sun', starRadiusSun: 1, radiusEarth: 1,
  orbitalRadiusAu: 1, orbitalPeriodDays: 365.25,
};
type Props = { planets: CatalogPlanet[]; totalPlanets: number; date: string };
const number = new Intl.NumberFormat('en-US');
const decimal = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 3 });
const tickLabel = (exponent: number) => exponent < 0
  && Number.isInteger(exponent) ? `1/${2 ** -exponent}\u00d7` : `${decimal.format(2 ** exponent)}\u00d7`;

const quadrantDescriptions: { key: Quadrant; star: string; planet: string }[] = [
  { key: 'smaller-star-larger-planet', star: 'SMALLER STAR', planet: 'LARGER PLANET' },
  { key: 'larger-star-larger-planet', star: 'LARGER STAR', planet: 'LARGER PLANET' },
  { key: 'smaller-star-smaller-planet', star: 'SMALLER STAR', planet: 'SMALLER PLANET' },
  { key: 'larger-star-smaller-planet', star: 'LARGER STAR', planet: 'SMALLER PLANET' },
];

export function ComparisonChart({ planets, totalPlanets, date }: Props) {
  const [query, setQuery] = useState('');
  const [quadrant, setQuadrant] = useState('all');
  const [selectedName, setSelectedName] = useState('TRAPPIST-1 e');
  const [zoom, setZoom] = useState<ComparisonZoom>({ star: 0, planet: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const wheelDelta = useRef({ star: 0, planet: 0 });
  const { hovered, cancelHide, dismissTooltip, scheduleHide, showTooltip } = usePlanetTooltip<TooltipPlanet>();
  const explore = useChartExplore(dismissTooltip, fullChart.width, fullChart.height);
  const chart = useMemo(() => explore.active
    ? comparisonViewport(Math.max(240, explore.viewport.width), Math.max(180, explore.viewport.height))
    : fullChart, [explore.active, explore.viewport]);
  const quadrants = quadrantDescriptions.map((entry, index) => ({
    ...entry, x: index % 2 === 0 ? chart.left : chart.originX, y: index < 2 ? chart.top : chart.originY,
  }));
  const fullBounds = useMemo(() => comparisonBounds(planets), [planets]);
  const bounds = useMemo(() => zoomComparisonBounds(fullBounds, zoom), [fullBounds, zoom]);
  const catalog = useMemo(() => planets.map(planet => ({
    planet, quadrant: quadrantFor(planet),
  })), [planets]);
  const matching = useMemo(() => {
    const text = query.trim().toLocaleLowerCase('en-US');
    return catalog.filter(entry => (quadrant === 'all' || entry.quadrant === quadrant)
      && [entry.planet.name, entry.planet.scienceName, entry.planet.hostName]
        .some(name => name.toLocaleLowerCase('en-US').includes(text)));
  }, [catalog, query, quadrant]);
  const visible = useMemo(() => matching
    .filter(entry => inComparisonView(entry.planet, bounds))
    .map(entry => ({ ...entry, ...comparisonPosition(entry.planet, bounds, chart) })), [matching, bounds, chart]);
  const selectedIndex = Math.max(0, visible.findIndex(entry => entry.planet.name === selectedName));
  const selected = visible[selectedIndex];
  const xTicks = comparisonTicks(bounds.star);
  const yTicks = comparisonTicks(bounds.planet);
  const xLabels = explore.active && explore.compact ? xTicks.filter((tick, i) => tick === 0 || i === 0 || i === xTicks.length - 1) : xTicks;
  const yLabels = explore.active && explore.compact ? yTicks.filter((tick, i) => tick === 0 || i === 0 || i === yTicks.length - 1) : yTicks;
  const xFor = (tick: number) => chart.originX + tick / bounds.star * (chart.right - chart.originX);
  const yFor = (tick: number) => chart.originY - tick / bounds.planet * (chart.originY - chart.top);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || !(event.target instanceof Element)) return;
      const axis = event.target.closest('[data-zoom-axis]')?.getAttribute('data-zoom-axis');
      if (axis !== 'star' && axis !== 'planet') return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (delta === 0 || !event.cancelable) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? svg.clientHeight : 1;
      wheelDelta.current[axis] += delta * unit;
      const steps = -Math.trunc(wheelDelta.current[axis] / 80);
      if (steps === 0) return;
      wheelDelta.current[axis] = 0;
      dismissTooltip();
      setZoom(current => changeComparisonZoom(current, axis, steps));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [dismissTooltip]);

  function adjustZoom(axis: ComparisonAxis, steps: number) {
    dismissTooltip();
    wheelDelta.current[axis] = 0;
    setZoom(current => changeComparisonZoom(current, axis, steps));
  }

  function setAxisZoom(axis: ComparisonAxis, step: number) {
    comparisonZoomFactor(step);
    dismissTooltip();
    wheelDelta.current[axis] = 0;
    setZoom(current => ({ ...current, [axis]: step }));
  }

  function resetAxes() {
    dismissTooltip();
    wheelDelta.current = { star: 0, planet: 0 };
    setZoom({ star: 0, planet: 0 });
  }

  function step(direction: number) {
    dismissTooltip();
    if (visible.length) setSelectedName(visible[(selectedIndex + direction + visible.length) % visible.length].planet.name);
  }

  function reset() {
    resetAxes();
    setQuery('');
    setQuadrant('all');
    setSelectedName('TRAPPIST-1 e');
  }

  return (
    <section id="comparison" className="distance-section comparison-section page-width" aria-labelledby="comparison-title">
      <div className="section-heading">
        <div><p className="eyebrow">OUR SOLAR SYSTEM AS THE YARDSTICK</p><h2 id="comparison-title">How do they compare to home?</h2>
          <p>Compare a planet and its host star to Earth and the Sun. Our reference sits at the center.</p></div>
        <div className="chart-heading-actions">
          <Button appearance="primary" onClick={explore.open}>Expand size chart</Button>
          <a className="text-link" href="#comparison-notes">How to read this chart <ArrowRightRegular aria-hidden="true" /></a>
        </div>
      </div>
      <ChartExplore explore={explore} id="comparison" title="Size explorer"
        selected={selected?.planet.name ?? 'No systems in view'} canBrowse={visible.length > 1}
        onPrevious={() => step(-1)} onNext={() => step(1)}>
      <div className="distance-panel">
        <div className="explore-filters">
        <div className="distance-toolbar">
          <div className="distance-search">
            <label htmlFor="comparison-search">Find a planet or host star</label>
            <Input id="comparison-search" type="search" value={query} contentBefore={<SearchRegular aria-hidden="true" />}
              placeholder="Try TRAPPIST, 51 Pegasi, or Kepler"
              onChange={(_, state) => { dismissTooltip(); setQuery(state.value); }} />
          </div>
          <div className="distance-range">
            <label htmlFor="comparison-quadrant">Size comparison</label>
            <Select id="comparison-quadrant" value={quadrant} onChange={event => { dismissTooltip(); setQuadrant(event.target.value); }}>
              <option value="all">All quadrants</option>
              {Object.entries(quadrantLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
            </Select>
          </div>
          <Button appearance="subtle" onClick={reset}>Reset view</Button>
        </div>
        <div className="comparison-zoom-toolbar" role="group" aria-label="Independent axis zoom">
          {(['star', 'planet'] as const).map(axis => {
            const name = axis === 'star' ? 'Star radius (x)' : 'Planet radius (y)';
            const factor = decimal.format(comparisonZoomFactor(zoom[axis]));
            return <div className="comparison-zoom-control" key={axis}>
              <div><label htmlFor={`comparison-${axis}-zoom`}>{name}</label>
                <output htmlFor={`comparison-${axis}-zoom`} aria-live="polite">{factor}&times;</output></div>
              <div className="comparison-zoom-input">
                <Button appearance="subtle" icon={<SubtractRegular />} disabled={zoom[axis] === 0}
                  aria-label={`Zoom out ${axis} radius axis`} onClick={() => adjustZoom(axis, -1)} />
                <input id={`comparison-${axis}-zoom`} type="range" min="0" max={comparisonZoomMax} step="1" value={zoom[axis]}
                  aria-label={`${axis === 'star' ? 'Star' : 'Planet'} radius axis zoom`} aria-valuetext={`${factor} times zoom`}
                  onChange={event => setAxisZoom(axis, event.currentTarget.valueAsNumber)} />
                <Button appearance="subtle" icon={<AddRegular />} disabled={zoom[axis] === comparisonZoomMax}
                  aria-label={`Zoom in ${axis} radius axis`} onClick={() => adjustZoom(axis, 1)} />
              </div>
            </div>;
          })}
          <Button appearance="subtle" onClick={resetAxes} disabled={zoom.star === 0 && zoom.planet === 0}>Reset axes</Button>
          <p>Scroll over the bottom axis to zoom x, or the left axis to zoom y. Earth/Sun stays centered.</p>
        </div>
        </div>
        <div className="distance-body">
          <figure className="distance-figure">
            <div className="distance-inspector">
              <p className="eyebrow">A SYSTEM IN PERSPECTIVE</p>
              <div aria-live="polite" aria-atomic="true">
                {selected ? <>
                  <h3><a className="planet-name-link" href={selected.planet.scienceUrl} target="_blank" rel="noopener noreferrer" title="Opens in a new tab"
                    aria-label={`${selected.planet.scienceName} - NASA Science (opens in a new tab)`}>{selected.planet.name}<ArrowUpRightRegular aria-hidden="true" /></a></h3>
                  <p className="comparison-host">Host: {selected.planet.hostName}</p>
                  <dl>
                    <div><dt>Host star radius</dt><dd>{decimal.format(selected.planet.starRadiusSun)} <span>Sun radii</span></dd></div>
                    <div><dt>Planet radius</dt><dd>{decimal.format(selected.planet.radiusEarth)} <span>Earth radii</span></dd></div>
                    <div className="explore-orbit"><dt>Orbital radius</dt><dd>{selected.planet.orbitalRadiusAu === null ? 'Not available' : decimal.format(selected.planet.orbitalRadiusAu)} <span>AU (semi-major axis)</span></dd></div>
                    <div className="explore-orbit"><dt>Orbital period</dt><dd>{selected.planet.orbitalPeriodDays === null ? 'Not available' : decimal.format(selected.planet.orbitalPeriodDays)} <span>days</span></dd></div>
                  </dl>
                  <p className="comparison-category">{quadrantLabels[selected.quadrant]}</p>
                  <div className="distance-source-links">
                    <a className="text-link" href={selected.planet.scienceUrl} target="_blank" rel="noopener noreferrer" title="Opens in a new tab">NASA Science <ArrowUpRightRegular aria-hidden="true" /></a>
                    <a className="text-link" href={`https://exoplanetarchive.ipac.caltech.edu/cgi-bin/DisplayOverview/nph-DisplayOverview?objname=${encodeURIComponent(selected.planet.name)}&type=CONFIRMED_PLANET`}
                      target="_blank" rel="noopener noreferrer" title="Opens in a new tab">NASA Archive data <ArrowUpRightRegular aria-hidden="true" /></a>
                  </div>
                </> : <div className="distance-no-results"><h3>No systems in view.</h3><p>{matching.length ? 'Zoom out or reset the axes to see matching planets.' : 'Try a different name or choose all quadrants.'}</p></div>}
              </div>
              <div className="distance-browse">
                <Button appearance="outline" icon={<ArrowLeftRegular />} disabled={visible.length < 2} aria-label="Previous planet by star radius" onClick={() => step(-1)} />
                <span>{visible.length ? `${number.format(selectedIndex + 1)} / ${number.format(visible.length)}` : '0 results'}</span>
                <Button appearance="outline" icon={<ArrowRightRegular />} disabled={visible.length < 2} aria-label="Next planet by star radius" onClick={() => step(1)} />
              </div>
              <p className="distance-browse-note">Browse planets in view by increasing star radius, then planet radius. Zoom out to include more pairs.</p>
            </div>
            <p className="distance-count" role="status">{number.format(visible.length)} in view / {number.format(matching.length)} matching / {number.format(planets.length)} comparable planets <span>/</span> independent axis zoom</p>
            <p className="comparison-scroll-hint">Scroll the plot sideways to see every quadrant.</p>
            <Tooltip visible={hovered !== null} relationship="description" withArrow hideDelay={200}
              mountNode={explore.active ? explore.dialogRef.current : undefined}
              positioning={{ target: hovered?.target, position: 'above', align: 'center', offset: 12 }}
              onVisibleChange={(_, state) => { if (!state.visible) dismissTooltip(); }}
              content={{
                id: 'comparison-planet-tooltip', className: 'planet-hover-card',
                onPointerEnter: cancelHide, onPointerLeave: scheduleHide,
                children: hovered && <>
                  <div className="planet-hover-heading"><span className="planet-hover-orb" aria-hidden="true" /><div>
                    <span className="planet-hover-kicker">{hovered.planet === earthSunReference ? 'OUR SOLAR SYSTEM' : 'PLANET + HOST STAR'}</span>
                    <strong>{hovered.planet === earthSunReference ? 'Earth / Sun' : hovered.planet.name}</strong>
                  </div></div>
                  <p className="comparison-host">Host: {hovered.planet.hostName}</p>
                  <dl className="planet-hover-values">
                    <div><dt>Star radius</dt><dd>{decimal.format(hovered.planet.starRadiusSun)}<span>Sun radii</span></dd></div>
                    <div><dt>Planet radius</dt><dd>{decimal.format(hovered.planet.radiusEarth)}<span>Earth radii</span></dd></div>
                    <div><dt>Orbital radius</dt><dd className={hovered.planet.orbitalRadiusAu === null ? 'comparison-missing' : 'comparison-orbit-value'}>
                      {hovered.planet.orbitalRadiusAu === null ? 'Not available' : decimal.format(hovered.planet.orbitalRadiusAu)}<span>AU (semi-major axis)</span>
                    </dd></div>
                    <div><dt>Orbital period</dt><dd className={hovered.planet.orbitalPeriodDays === null ? 'comparison-missing' : 'comparison-orbit-value'}>
                      {hovered.planet.orbitalPeriodDays === null ? 'Not available' : decimal.format(hovered.planet.orbitalPeriodDays)}<span>days</span>
                    </dd></div>
                  </dl>
                  <p className="planet-hover-note">{hovered.planet === earthSunReference
                    ? 'Earth/Sun is the (1, 1) size reference. Orbital measurements are approximate.'
                    : <>{quadrantLabels[quadrantFor(hovered.planet)]}.<br />Catalog radii may be measured or estimated. Select the dot for NASA links.</>}</p>
                </>,
              }}>
              <div ref={explore.stageRef} className="distance-stage comparison-stage" tabIndex={0} role="region" aria-label="Earth and Sun size comparison"
                aria-describedby="comparison-notes comparison-planet-tooltip"
                onFocus={event => { if (event.target === event.currentTarget && selected) showTooltip(selected.planet, event.currentTarget); }}
                onBlur={dismissTooltip}>
                <svg ref={svgRef} className="comparison-svg" viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-labelledby="comparison-plot-title comparison-plot-description"
                  onPointerDown={explore.startTouch} onPointerMove={explore.moveTouch} onPointerCancel={explore.cancelTouch}
                  onPointerUp={event => explore.selectNearTouch(event, visible, point => setSelectedName(point.planet.name))}>
                  <title id="comparison-plot-title">Planet and host-star radii relative to Earth and the Sun</title>
                  <desc id="comparison-plot-description">The horizontal axis is stellar radius in Sun radii; the vertical axis is planetary radius in Earth radii. Both use logarithmic ratios. The axes cross at one Sun radius and one Earth radius, not at zero physical size. Larger stars are right, smaller stars left; larger planets above, smaller planets below. Scroll over either axis to zoom it independently, or use the labeled zoom controls. Search, quadrant filters, and Previous or Next provide access to planets in the current view.</desc>
                  {quadrants.map(item => <rect key={item.key} className="comparison-quadrant comparison-color" data-quadrant={item.key}
                    x={item.x} y={item.y} width={chart.originX - chart.left} height={chart.originY - chart.top} />)}
                  <g className="comparison-grid">
                    {xTicks.filter(tick => tick !== 0).map(tick => <line key={`x${tick}`} x1={xFor(tick)} x2={xFor(tick)} y1={chart.top} y2={chart.bottom} />)}
                    {yTicks.filter(tick => tick !== 0).map(tick => <line key={`y${tick}`} x1={chart.left} x2={chart.right} y1={yFor(tick)} y2={yFor(tick)} />)}
                  </g>
                  <rect className="comparison-frame" x={chart.left} y={chart.top} width={chart.right - chart.left} height={chart.bottom - chart.top} />
                  <g className="comparison-reference-axis">
                    <line x1={chart.originX} x2={chart.originX} y1={chart.top} y2={chart.bottom} />
                    <line x1={chart.left} x2={chart.right} y1={chart.originY} y2={chart.originY} />
                  </g>
                  <g className="comparison-points">
                    {visible.map(entry => <circle key={entry.planet.name} className="comparison-point comparison-color" data-name={entry.planet.name} data-quadrant={entry.quadrant}
                      cx={entry.x} cy={entry.y} r="3.3"
                      onPointerEnter={event => { if (event.pointerType !== 'touch') showTooltip(entry.planet, event.currentTarget); }} onPointerLeave={scheduleHide}
                      onClick={event => {
                        setSelectedName(entry.planet.name);
                        if (explore.active && explore.compact) explore.showPanel('details');
                        else showTooltip(entry.planet, event.currentTarget);
                      }} />)}
                  </g>
                  {selected && <g className="comparison-selected" pointerEvents="none">
                    <line x1={selected.x} y1={chart.originY} x2={selected.x} y2={selected.y} />
                    <line x1={chart.originX} y1={selected.y} x2={selected.x} y2={selected.y} />
                    <circle className="selection-halo" cx={selected.x} cy={selected.y} r="8" />
                    <circle className="selection-point" cx={selected.x} cy={selected.y} r="4" />
                  </g>}
                  <g className="comparison-quadrant-labels" pointerEvents="none">
                    {quadrants.map(item => <text key={item.key} x={item.x + 14} y={item.y === chart.top ? chart.top + 24 : chart.bottom - 34}>
                      <tspan x={item.x + 14}>{explore.active ? item.star === 'SMALLER STAR' ? 'Smaller star' : 'Larger star' : item.star}</tspan>
                      <tspan x={item.x + 14} dy={explore.active ? '1.3em' : '16'}>{explore.active ? item.planet === 'SMALLER PLANET' ? 'Smaller planet' : 'Larger planet' : item.planet}</tspan>
                    </text>)}
                  </g>
                  <g className="comparison-axis-labels">
                    <g className="comparison-axis-zoom" data-zoom-axis="star">
                      <title>Scroll up to zoom in on star radius; scroll down to zoom out.</title>
                      <rect className="comparison-axis-hit" x={chart.left} y={chart.bottom + 2} width={chart.right - chart.left} height={chart.height - chart.bottom - 2} />
                      {xLabels.map(tick => <text key={`x${tick}`} x={xFor(tick)} y={chart.bottom + 25} textAnchor="middle">{tickLabel(tick)}</text>)}
                      <text className="comparison-axis-title" x={chart.originX} y={chart.height - 24} textAnchor="middle">{explore.active ? 'STAR / SUN RADIUS' : 'HOST STAR RADIUS / SUN RADIUS'}</text>
                    </g>
                    <g className="comparison-axis-zoom" data-zoom-axis="planet">
                      <title>Scroll up to zoom in on planet radius; scroll down to zoom out.</title>
                      <rect className="comparison-axis-hit" x="0" y={chart.top} width={chart.left - 2} height={chart.bottom - chart.top} />
                      {yLabels.map(tick => <text key={`y${tick}`} x={chart.left - 10} y={yFor(tick) + 4} textAnchor="end">{tickLabel(tick)}</text>)}
                      <text className="comparison-axis-title" x="20" y={chart.originY} textAnchor="middle" transform={`rotate(-90 20 ${chart.originY})`}>{explore.active ? 'PLANET / EARTH RADIUS' : 'PLANET RADIUS / EARTH RADIUS'}</text>
                    </g>
                  </g>
                  <g className="comparison-earth" pointerEvents="none">
                    <g className="comparison-earth-marker" pointerEvents="all" tabIndex={0} role={explore.active ? 'button' : 'img'}
                      aria-label="Earth and Sun reference" aria-describedby="comparison-planet-tooltip"
                      onPointerEnter={event => { if (event.pointerType !== 'touch') showTooltip(earthSunReference, event.currentTarget); }} onPointerLeave={scheduleHide}
                      onClick={event => {
                        if (explore.active) explore.showPanel('reference');
                        else showTooltip(earthSunReference, event.currentTarget);
                      }}
                      onKeyDown={event => {
                        if (explore.active && (event.key === 'Enter' || event.key === ' ')) {
                          event.preventDefault();
                          explore.showPanel('reference');
                        }
                      }}
                      onFocus={event => showTooltip(earthSunReference, event.currentTarget)} onBlur={dismissTooltip}>
                      <circle className="comparison-reference-hit" cx={chart.originX} cy={chart.originY} r="16" />
                      <circle className="selection-halo" cx={chart.originX} cy={chart.originY} r="11" />
                      <path d={`M ${chart.originX} ${chart.originY - 6} l 6 6 -6 6 -6 -6 Z`} />
                    </g>
                    <text x={chart.originX + 16} y={chart.originY + 27}>EARTH / SUN{!explore.active && ' (1\u00d7, 1\u00d7)'}</text>
                  </g>
                  {/* Keep selection visible when a pair overlaps the Earth/Sun marker. */}
                  {selected && <circle className="comparison-selection-ring" cx={selected.x} cy={selected.y} r="10" pointerEvents="none" />}
                  {!selected && <text className="distance-empty-label comparison-empty" x={chart.originX} y={chart.originY + 70} textAnchor="middle">
                    {explore.active ? matching.length ? 'No pairs in view' : 'No matching systems'
                      : matching.length ? 'No pairs in this zoom range. Reset axes to see them.' : 'No matching planet-host pairs'}
                  </text>}
                </svg>
              </div>
            </Tooltip>
            <figcaption className="distance-caption">{explore.active && explore.compact
              ? 'Tap a dot or Earth/Sun for details. Use Filters for search and axis zoom.'
              : 'Hover a dot for size and orbit details. Focus the plot to preview the selected planet, or focus Earth/Sun for our reference values; press Escape to dismiss.'}</figcaption>
          </figure>
          <aside className="distance-sidebar" aria-label="Size comparison legend and chart notes">
            <div className="distance-legend" role="group" aria-labelledby="comparison-legend-title">
              <div className="distance-legend-heading"><h3 id="comparison-legend-title">Chart legend</h3><span>Sun radius = 1 / Earth radius = 1</span></div>
              <ul className="comparison-key">
                {Object.entries(quadrantLabels).map(([key, label]) => <li key={key}>
                  <span className="comparison-swatch comparison-color" data-quadrant={key} aria-hidden="true" />{label}
                </li>)}
                <li><span className="comparison-reference-key" aria-hidden="true" />Earth / Sun reference</li>
                <li><span className="comparison-selection-key" aria-hidden="true" />Selected planet</li>
              </ul>
              <p className="distance-angle-key">Both axes use log ratios: twice and half the reference radius are equally far from the center. Each dot is one planet-host pair; dot size is constant.</p>
            </div>
            <div id="comparison-notes" className="distance-reading-notes">
              <h3>Earth and the Sun are the origin.</h3>
              <p>The center is one Sun radius on x and one Earth radius on y. Log-ratio coordinates put half-size and double-size equally far from the center. Tick labels show radius ratios, not signed physical sizes.</p>
              <p>Quadrants compare stars with the Sun and planets with Earth. Points exactly equal to either reference lie on an axis. Search and filters preserve the zoom. Scroll over an axis, or use its slider and buttons, to zoom that axis independently from 1 to 16 times. Earth/Sun stays centered.</p>
              <p>Zoom hides pairs outside the displayed radii without clamping them to the edge. Reset axes restores the full catalog range and preserves search and filters; Reset view also clears search and filters.</p>
              <p>Each dot is one confirmed planet paired with its catalog host star, not a whole system's extent. Multiple planets can share a host. For multiple-star systems, we use the reported stellar radius, not a combined radius.</p>
              <p>Radii may be measured or estimated, and composite values can come from different studies. Overlapping dots do not show every pair separately; use search or browsing to inspect them.</p>
              <p className="explore-mobile-source">NASA Exoplanet Archive / {date}. {number.format(planets.length)} with star + planet radii; {number.format(totalPlanets - planets.length)} omitted for missing radii. No missing values are treated as zero.</p>
            </div>
          </aside>
        </div>
        <div className="distance-data-note">
          <span>NASA Exoplanet Archive <span aria-hidden="true">/</span> {date}</span>
          <span>{number.format(planets.length)} with star + planet radii; {number.format(totalPlanets - planets.length)} omitted for missing radii. No missing values are treated as zero.</span>
        </div>
      </div>
      </ChartExplore>
    </section>
  );
}
