import { useMemo, useState } from 'react';
import { Button, Input, Select, Tooltip } from '@fluentui/react-components';
import { ArrowLeftRegular, ArrowRightRegular, ArrowUpRightRegular, SearchRegular } from '@fluentui/react-icons';
import {
  comparisonBounds, comparisonChart as chart, comparisonPosition, comparisonTicks,
  quadrantFor, quadrantLabels, type ComparisonPlanet, type Quadrant,
} from './comparison-scale';
import { usePlanetTooltip } from './usePlanetTooltip';
import './comparison-chart.css';

type CatalogPlanet = ComparisonPlanet & { scienceName: string; scienceUrl: string };
type Props = { planets: CatalogPlanet[]; totalPlanets: number; date: string };
const number = new Intl.NumberFormat('en-US');
const decimal = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 3 });
const tickLabel = (exponent: number) => exponent < 0
  ? `1/${2 ** -exponent}\u00d7` : `${2 ** exponent}\u00d7`;

const quadrants: { key: Quadrant; x: number; y: number; star: string; planet: string }[] = [
  { key: 'smaller-star-larger-planet', x: chart.left, y: chart.top, star: 'SMALLER STAR', planet: 'LARGER PLANET' },
  { key: 'larger-star-larger-planet', x: chart.originX, y: chart.top, star: 'LARGER STAR', planet: 'LARGER PLANET' },
  { key: 'smaller-star-smaller-planet', x: chart.left, y: chart.originY, star: 'SMALLER STAR', planet: 'SMALLER PLANET' },
  { key: 'larger-star-smaller-planet', x: chart.originX, y: chart.originY, star: 'LARGER STAR', planet: 'SMALLER PLANET' },
];

export function ComparisonChart({ planets, totalPlanets, date }: Props) {
  const [query, setQuery] = useState('');
  const [quadrant, setQuadrant] = useState('all');
  const [selectedName, setSelectedName] = useState('TRAPPIST-1 e');
  const { hovered, cancelHide, dismissTooltip, scheduleHide, showTooltip } = usePlanetTooltip<CatalogPlanet>();
  const bounds = useMemo(() => comparisonBounds(planets), [planets]);
  const catalog = useMemo(() => planets.map(planet => ({
    planet, quadrant: quadrantFor(planet), ...comparisonPosition(planet, bounds),
  })), [planets, bounds]);
  const visible = useMemo(() => {
    const text = query.trim().toLocaleLowerCase('en-US');
    return catalog.filter(entry => (quadrant === 'all' || entry.quadrant === quadrant)
      && [entry.planet.name, entry.planet.scienceName, entry.planet.hostName]
        .some(name => name.toLocaleLowerCase('en-US').includes(text)));
  }, [catalog, query, quadrant]);
  const selectedIndex = Math.max(0, visible.findIndex(entry => entry.planet.name === selectedName));
  const selected = visible[selectedIndex];
  const xTicks = comparisonTicks(bounds.star);
  const yTicks = comparisonTicks(bounds.planet);
  const xFor = (tick: number) => chart.originX + tick / bounds.star * (chart.right - chart.originX);
  const yFor = (tick: number) => chart.originY - tick / bounds.planet * (chart.originY - chart.top);

  function step(direction: number) {
    dismissTooltip();
    if (visible.length) setSelectedName(visible[(selectedIndex + direction + visible.length) % visible.length].planet.name);
  }

  function reset() {
    dismissTooltip();
    setQuery('');
    setQuadrant('all');
    setSelectedName('TRAPPIST-1 e');
  }

  return (
    <section id="comparison" className="distance-section comparison-section page-width" aria-labelledby="comparison-title">
      <div className="section-heading">
        <div><p className="eyebrow">OUR SOLAR SYSTEM AS THE YARDSTICK</p><h2 id="comparison-title">How do they compare to home?</h2>
          <p>Compare a planet and its host star to Earth and the Sun. Our reference sits at the center.</p></div>
        <a className="text-link" href="#comparison-notes">How to read this chart <ArrowRightRegular aria-hidden="true" /></a>
      </div>
      <div className="distance-panel">
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
        <div className="distance-body">
          <figure className="distance-figure">
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
            <p className="distance-count" role="status">{number.format(visible.length)} of {number.format(planets.length)} comparable planets <span>/</span> fixed log-ratio axes</p>
            <p className="comparison-scroll-hint">Scroll the plot sideways to see every quadrant.</p>
            <Tooltip visible={hovered !== null} relationship="description" withArrow hideDelay={200}
              positioning={{ target: hovered?.target, position: 'above', align: 'center', offset: 12 }}
              onVisibleChange={(_, state) => { if (!state.visible) dismissTooltip(); }}
              content={{
                id: 'comparison-planet-tooltip', className: 'planet-hover-card',
                onPointerEnter: cancelHide, onPointerLeave: scheduleHide,
                children: hovered && <>
                  <div className="planet-hover-heading"><span className="planet-hover-orb" aria-hidden="true" /><div>
                    <span className="planet-hover-kicker">PLANET + HOST STAR</span><strong>{hovered.planet.name}</strong>
                  </div></div>
                  <p className="comparison-host">Host: {hovered.planet.hostName}</p>
                  <dl className="planet-hover-values">
                    <div><dt>Star radius</dt><dd>{decimal.format(hovered.planet.starRadiusSun)}<span>Sun radii</span></dd></div>
                    <div><dt>Planet radius</dt><dd>{decimal.format(hovered.planet.radiusEarth)}<span>Earth radii</span></dd></div>
                  </dl>
                  <p className="planet-hover-note">{quadrantLabels[quadrantFor(hovered.planet)]}.<br />Catalog radii may be measured or estimated. Select the dot for NASA links.</p>
                </>,
              }}>
              <div className="distance-stage comparison-stage" tabIndex={0} role="region" aria-label="Scrollable Earth and Sun size comparison"
                aria-describedby="comparison-notes comparison-planet-tooltip"
                onFocus={event => { if (event.target === event.currentTarget && selected) showTooltip(selected.planet, event.currentTarget); }}
                onBlur={dismissTooltip}>
                <svg className="comparison-svg" viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-labelledby="comparison-plot-title comparison-plot-description">
                  <title id="comparison-plot-title">Planet and host-star radii relative to Earth and the Sun</title>
                  <desc id="comparison-plot-description">The horizontal axis is stellar radius in Sun radii; the vertical axis is planetary radius in Earth radii. Both use logarithmic ratios. The axes cross at one Sun radius and one Earth radius, not at zero physical size. Larger stars are right, smaller stars left; larger planets above, smaller planets below. Search, quadrant filters, and Previous or Next provide access to every planet.</desc>
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
                      onPointerEnter={event => showTooltip(entry.planet, event.currentTarget)} onPointerLeave={scheduleHide}
                      onClick={event => { setSelectedName(entry.planet.name); showTooltip(entry.planet, event.currentTarget); }} />)}
                  </g>
                  {selected && <g className="comparison-selected" pointerEvents="none">
                    <line x1={selected.x} y1={chart.originY} x2={selected.x} y2={selected.y} />
                    <line x1={chart.originX} y1={selected.y} x2={selected.x} y2={selected.y} />
                    <circle className="selection-halo" cx={selected.x} cy={selected.y} r="8" />
                    <circle className="selection-point" cx={selected.x} cy={selected.y} r="4" />
                  </g>}
                  <g className="comparison-quadrant-labels" pointerEvents="none">
                    {quadrants.map(item => <text key={item.key} x={item.x + 14} y={item.y === chart.top ? chart.top + 24 : chart.bottom - 34}>
                      <tspan x={item.x + 14}>{item.star}</tspan><tspan x={item.x + 14} dy="16">{item.planet}</tspan>
                    </text>)}
                  </g>
                  <g className="comparison-axis-labels">
                    {xTicks.map(tick => <text key={`x${tick}`} x={xFor(tick)} y={chart.bottom + 25} textAnchor="middle">{tickLabel(tick)}</text>)}
                    {yTicks.map(tick => <text key={`y${tick}`} x={chart.left - 10} y={yFor(tick) + 4} textAnchor="end">{tickLabel(tick)}</text>)}
                    <text className="comparison-axis-title" x={chart.originX} y={chart.height - 24} textAnchor="middle">HOST STAR RADIUS / SUN RADIUS</text>
                    <text className="comparison-axis-title" x="20" y={chart.originY} textAnchor="middle" transform={`rotate(-90 20 ${chart.originY})`}>PLANET RADIUS / EARTH RADIUS</text>
                  </g>
                  <g className="comparison-earth" pointerEvents="none">
                    <circle className="selection-halo" cx={chart.originX} cy={chart.originY} r="11" />
                    <path d={`M ${chart.originX} ${chart.originY - 6} l 6 6 -6 6 -6 -6 Z`} />
                    <text x={chart.originX + 16} y={chart.originY + 27}>EARTH / SUN (1&times;, 1&times;)</text>
                  </g>
                  {/* Keep selection visible when a pair overlaps the Earth/Sun marker. */}
                  {selected && <circle className="comparison-selection-ring" cx={selected.x} cy={selected.y} r="10" pointerEvents="none" />}
                  {!selected && <text className="distance-empty-label" x={chart.originX} y={chart.originY + 70} textAnchor="middle">No matching planet-host pairs</text>}
                </svg>
              </div>
            </Tooltip>
            <figcaption className="distance-caption">Hover a dot for its two radii; select it for details. Focus the plot to preview the selected planet; press Escape to dismiss.</figcaption>
          </figure>
          <aside className="distance-sidebar" aria-label="Selected size comparison and chart notes">
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
                  </dl>
                  <p className="comparison-category">{quadrantLabels[selected.quadrant]}</p>
                  <div className="distance-source-links">
                    <a className="text-link" href={selected.planet.scienceUrl} target="_blank" rel="noopener noreferrer" title="Opens in a new tab">NASA Science <ArrowUpRightRegular aria-hidden="true" /></a>
                    <a className="text-link" href={`https://exoplanetarchive.ipac.caltech.edu/cgi-bin/DisplayOverview/nph-DisplayOverview?objname=${encodeURIComponent(selected.planet.name)}&type=CONFIRMED_PLANET`}
                      target="_blank" rel="noopener noreferrer" title="Opens in a new tab">NASA Archive data <ArrowUpRightRegular aria-hidden="true" /></a>
                  </div>
                </> : <div className="distance-no-results"><h3>No matching systems.</h3><p>Try a different name or choose all quadrants.</p></div>}
              </div>
              <div className="distance-browse">
                <Button appearance="outline" icon={<ArrowLeftRegular />} disabled={visible.length < 2} aria-label="Previous planet by star radius" onClick={() => step(-1)} />
                <span>{visible.length ? `${number.format(selectedIndex + 1)} / ${number.format(visible.length)}` : '0 results'}</span>
                <Button appearance="outline" icon={<ArrowRightRegular />} disabled={visible.length < 2} aria-label="Next planet by star radius" onClick={() => step(1)} />
              </div>
              <p className="distance-browse-note">Browse by increasing star radius, then planet radius. Search and these buttons work without using the plot.</p>
            </div>
            <div id="comparison-notes" className="distance-reading-notes">
              <h3>Earth and the Sun are the origin.</h3>
              <p>The center is one Sun radius on x and one Earth radius on y. Log-ratio coordinates put half-size and double-size equally far from the center. Tick labels show radius ratios, not signed physical sizes.</p>
              <p>Quadrants compare stars with the Sun and planets with Earth. Points exactly equal to either reference lie on an axis. The axes stay fixed when searching or filtering.</p>
              <p>Each dot is one confirmed planet paired with its catalog host star, not a whole system's extent. Multiple planets can share a host. For multiple-star systems, we use the reported stellar radius, not a combined radius.</p>
              <p>Radii may be measured or estimated, and composite values can come from different studies. Overlapping dots do not show every pair separately; use search or browsing to inspect them.</p>
            </div>
          </aside>
        </div>
        <div className="distance-data-note">
          <span>NASA Exoplanet Archive <span aria-hidden="true">/</span> {date}</span>
          <span>{number.format(planets.length)} with star + planet radii; {number.format(totalPlanets - planets.length)} omitted for missing radii. No missing values are treated as zero.</span>
        </div>
      </div>
    </section>
  );
}
