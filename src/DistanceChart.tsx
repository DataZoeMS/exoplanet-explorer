import { useMemo, useState } from 'react';
import { Button, Input, Select, Tooltip } from '@fluentui/react-components';
import { ArrowLeftRegular, ArrowRightRegular, ArrowUpRightRegular, SearchRegular } from '@fluentui/react-icons';
import { chart, distanceBands, distanceLimit, distanceRadius, markerRadius, planetPosition, quarterArc, radiusBounds, type PlotPlanet } from './distance-scale';
import { usePlanetTooltip } from './usePlanetTooltip';
import { ChartExplore, useChartExplore } from './ChartExplore';
import { spacedTicks } from './explore-scale';
import './distance-chart.css';

const number = new Intl.NumberFormat('en-US');
const decimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 0 });

type CatalogPlanet = PlotPlanet & { scienceName: string; scienceUrl: string };

type Props = {
  planets: CatalogPlanet[];
  totalPlanets: number;
  date: string;
};

export function DistanceChart({ planets, totalPlanets, date }: Props) {
  const [query, setQuery] = useState('');
  const [range, setRange] = useState('all');
  const [selectedName, setSelectedName] = useState('TRAPPIST-1 e');
  const { hovered, cancelHide, dismissTooltip, scheduleHide, showTooltip } = usePlanetTooltip<CatalogPlanet>();
  const explore = useChartExplore(dismissTooltip, chart.width, chart.height);
  const fullLimit = useMemo(() => distanceLimit(Math.max(1, ...planets.map(planet => planet.distanceLy))), [planets]);
  const sizeBounds = useMemo(() => radiusBounds(planets), [planets]);
  const limit = range === 'all' ? fullLimit : Number(range);
  const visible = useMemo(() => {
    const text = query.trim().toLocaleLowerCase('en-US');
    return planets.filter(planet => planet.distanceLy <= limit && planet.name.toLocaleLowerCase('en-US').includes(text));
  }, [planets, query, limit]);
  const selectedIndex = Math.max(0, visible.findIndex(planet => planet.name === selectedName));
  const selected = visible[selectedIndex];
  const positions = useMemo(() => sizeBounds ? visible
    .map(planet => ({ planet, ...planetPosition(planet, limit, sizeBounds) }))
    .sort((a, b) => b.radius - a.radius) : [], [visible, limit, sizeBounds]);
  const selectedPosition = selected && sizeBounds ? planetPosition(selected, limit, sizeBounds) : null;
  const bands = distanceBands(limit);
  const labeledBands = explore.active
    ? spacedTicks(bands, distance => distanceRadius(distance, limit) * explore.scale, 56)
    : bands;
  const excluded = totalPlanets - planets.length;

  function step(direction: number) {
    dismissTooltip();
    if (visible.length) setSelectedName(visible[(selectedIndex + direction + visible.length) % visible.length].name);
  }

  function reset() {
    dismissTooltip();
    setQuery('');
    setRange('all');
    setSelectedName('TRAPPIST-1 e');
  }

  return (
    <section id="distance" className="distance-section page-width" aria-labelledby="distance-title">
      <div className="section-heading">
        <div><p className="eyebrow">A SENSE OF DISTANCE</p><h2 id="distance-title">How far is another world?</h2>
          <p>Start at Earth. Follow the distance bands out into our galactic neighborhood.</p></div>
        <div className="chart-heading-actions">
          <Button appearance="primary" onClick={explore.open}>Expand distance chart</Button>
          <a className="text-link" href="#distance-notes">How to read this chart <ArrowRightRegular aria-hidden="true" /></a>
        </div>
      </div>
      <ChartExplore explore={explore} id="distance" title="Distance explorer"
        selected={selected?.name ?? 'No matching worlds'} canBrowse={visible.length > 1}
        onPrevious={() => step(-1)} onNext={() => step(1)}>
      <div className="distance-panel">
        <div className="explore-filters">
        <div className="distance-toolbar">
          <div className="distance-search">
            <label htmlFor="planet-search">Find a planet</label>
            <Input id="planet-search" type="search" value={query} contentBefore={<SearchRegular aria-hidden="true" />}
              placeholder="Try TRAPPIST, Kepler, or Proxima" onChange={(_, state) => { dismissTooltip(); setQuery(state.value); }} />
          </div>
          <div className="distance-range">
            <label htmlFor="distance-range">Maximum distance</label>
            <Select id="distance-range" value={range} onChange={event => { dismissTooltip(); setRange(event.target.value); }}>
              <option value="all">All catalog distances</option>
              <option value="100">100 light-years</option>
              <option value="1000">1,000 light-years</option>
              <option value="10000">10,000 light-years</option>
            </Select>
          </div>
          <Button appearance="subtle" onClick={reset}>Reset view</Button>
        </div>
        </div>
        <div className="distance-body">
          <figure className="distance-figure">
            <div className="distance-inspector">
              <p className="eyebrow">A WORLD IN PERSPECTIVE</p>
              <div aria-live="polite" aria-atomic="true">
                {selected ? <>
                  <h3><a className="planet-name-link" href={selected.scienceUrl} target="_blank" rel="noopener noreferrer" title="Opens in a new tab" aria-label={`${selected.scienceName} - NASA Science (opens in a new tab)`}>{selected.name}<ArrowUpRightRegular aria-hidden="true" /></a></h3>
                  <dl>
                    <div><dt>Distance from Earth</dt><dd>{decimal.format(selected.distanceLy)} <span>light-years</span></dd></div>
                    <div><dt>Catalog planet radius</dt><dd>{decimal.format(selected.radiusEarth)} <span>Earth radii</span></dd></div>
                  </dl>
                  <div className="distance-source-links">
                    <a className="text-link" href={selected.scienceUrl} target="_blank" rel="noopener noreferrer" title="Opens in a new tab">NASA Science <ArrowUpRightRegular aria-hidden="true" /></a>
                    <a className="text-link" href={`https://exoplanetarchive.ipac.caltech.edu/cgi-bin/DisplayOverview/nph-DisplayOverview?objname=${encodeURIComponent(selected.name)}&type=CONFIRMED_PLANET`} target="_blank" rel="noopener noreferrer" title="Opens in a new tab">NASA Archive data <ArrowUpRightRegular aria-hidden="true" /></a>
                  </div>
                </> : <div className="distance-no-results"><h3>No matching worlds.</h3><p>Try a different name or a wider distance range.</p></div>}
              </div>
              <div className="distance-browse">
                <Button appearance="outline" icon={<ArrowLeftRegular />} disabled={visible.length < 2} aria-label="Previous planet by distance" onClick={() => step(-1)} />
                <span>{visible.length ? `${number.format(selectedIndex + 1)} / ${number.format(visible.length)}` : '0 results'}</span>
                <Button appearance="outline" icon={<ArrowRightRegular />} disabled={visible.length < 2} aria-label="Next planet by distance" onClick={() => step(1)} />
              </div>
              <p className="distance-browse-note">Browse in order of distance. Search and these buttons work without using the plot.</p>
            </div>
            <p className="distance-count" role="status">{number.format(visible.length)} of {number.format(planets.length)} plottable planets <span>/</span> {explore.active ? 'distance from Earth (ly), log scale' : 'log distance scale'}</p>
            <p className="distance-scroll-hint">Scroll the plot sideways to see every distance band.</p>
            <Tooltip visible={hovered !== null} relationship="description" withArrow hideDelay={200}
              mountNode={explore.active ? explore.dialogRef.current : undefined}
              positioning={{ target: hovered?.target, position: 'above', align: 'center', offset: 12 }}
              onVisibleChange={(_, state) => { if (!state.visible) dismissTooltip(); }}
              content={{
                id: 'distance-planet-tooltip',
                className: 'planet-hover-card',
                onPointerEnter: cancelHide,
                onPointerLeave: scheduleHide,
                children: hovered && <>
                  <div className="planet-hover-heading"><span className="planet-hover-orb" aria-hidden="true" /><div><span className="planet-hover-kicker">CONFIRMED EXOPLANET</span><strong>{hovered.planet.name}</strong></div></div>
                  <dl className="planet-hover-values">
                    <div><dt>Distance from Earth</dt><dd>{decimal.format(hovered.planet.distanceLy)}<span>light-years</span></dd></div>
                    <div><dt>Catalog radius</dt><dd>{decimal.format(hovered.planet.radiusEarth)}<span>Earth radii</span></dd></div>
                  </dl>
                  <p className="planet-hover-note">Radius may be measured or estimated.<br />Select the dot for NASA Science and archive links.</p>
                </>,
              }}>
            <div ref={explore.stageRef} className="distance-stage" tabIndex={0} role="region" aria-label="Exoplanet distance chart"
              aria-describedby="distance-notes distance-planet-tooltip"
              onFocus={event => { if (event.target === event.currentTarget && selected) showTooltip(selected, event.currentTarget); }}
              onBlur={dismissTooltip}>
              <svg className="distance-svg" viewBox={explore.active ? `-24 0 ${chart.width + 24} ${chart.height}` : `0 0 ${chart.width} ${chart.height}`} role="img" aria-labelledby="plot-title plot-description"
                onPointerDown={explore.startTouch} onPointerMove={explore.moveTouch} onPointerCancel={explore.cancelTouch}
                onPointerUp={event => explore.selectNearTouch(event, positions, point => setSelectedName(point.planet.name))}>
                <title id="plot-title">Exoplanet distances from Earth, in a quarter circle</title>
                <desc id="plot-description">Earth is at the lower-left origin. Arcs mark distances in light-years on a logarithmic scale. Circle area is proportional to catalog planet radius. Angle uses log radius: smallest planets near the left vertical axis, largest near the bottom horizontal axis. This is not sky position. Search and Previous or Next controls provide access to every plotted planet.</desc>
                <path className="distance-wedge" d={`M ${chart.originX} ${chart.originY} L ${chart.originX + chart.radius} ${chart.originY} A ${chart.radius} ${chart.radius} 0 0 0 ${chart.originX} ${chart.originY - chart.radius} Z`} />
                <g className="distance-grid">
                  {bands.map(distance => <path key={distance} d={quarterArc(distanceRadius(distance, limit))} />)}
                  <path d={`M ${chart.originX} ${chart.originY - chart.radius} L ${chart.originX} ${chart.originY} L ${chart.originX + chart.radius} ${chart.originY}`} />
                </g>
                <g className="distance-points">
                  {positions.map(({ planet, x, y, radius }) => (
                    <circle className="distance-point" key={planet.name} cx={x} cy={y} r={radius}
                      data-name={planet.name} onPointerEnter={event => { if (event.pointerType !== 'touch') showTooltip(planet, event.currentTarget); }}
                      onPointerLeave={scheduleHide}
                      onClick={event => {
                        setSelectedName(planet.name);
                        if (explore.active && explore.compact) explore.showPanel('details');
                        else showTooltip(planet, event.currentTarget);
                      }} />
                  ))}
                </g>
                {selected && selectedPosition && <g className="distance-selected" pointerEvents="none">
                  <line x1={chart.originX} y1={chart.originY} x2={selectedPosition.x} y2={selectedPosition.y} />
                  <circle className="selection-halo" cx={selectedPosition.x} cy={selectedPosition.y} r={selectedPosition.radius + 6} />
                  <circle className="selection-point" cx={selectedPosition.x} cy={selectedPosition.y} r={selectedPosition.radius} />
                </g>}
                <g className="distance-axis-labels">
                  {labeledBands.map(distance => <g key={distance}>
                    <text x={chart.originX + distanceRadius(distance, limit)} y={chart.originY + 27} textAnchor="middle">{compact.format(distance)} ly</text>
                    {distance >= 10 && <text x={chart.originX - 12} y={chart.originY - distanceRadius(distance, limit) + 4} textAnchor="end">{compact.format(distance)}</text>}
                  </g>)}
                  {!explore.active && <text x={chart.originX + chart.radius / 2} y={chart.originY + 62} textAnchor="middle">DISTANCE FROM EARTH / LIGHT-YEARS</text>}
                </g>
                <g className="distance-size-axis">
                  <text x={explore.active ? chart.originX + 8 : 14} y={explore.active ? chart.originY - chart.radius - 20 : 430}
                    textAnchor={explore.active ? 'start' : 'middle'} transform={explore.active ? undefined : 'rotate(-90 14 430)'}>{explore.active ? 'SMALLER' : 'SMALLER PLANETS'}</text>
                  <text x={chart.originX + chart.radius - 16} y={explore.active ? chart.originY - 16 : chart.originY + 48} textAnchor="end">{explore.active ? 'LARGER' : 'LARGER PLANETS'}</text>
                </g>
                <g className="earth-origin">
                  <circle className="earth-halo" cx={chart.originX} cy={chart.originY} r={12} />
                  <circle cx={chart.originX} cy={chart.originY} r={markerRadius(1)} />
                  <text x={explore.active ? chart.originX + 16 : chart.originX - 16} y={explore.active ? chart.originY - 20 : chart.originY + 29} textAnchor={explore.active ? 'start' : 'end'}>{explore.active ? 'Earth (0 ly)' : 'EARTH'}</text>
                  {!explore.active && <text x={chart.originX - 16} y={chart.originY + 45} textAnchor="end" className="earth-zero">0 ly</text>}
                </g>
                {!selected && <text className="distance-empty-label" x={chart.width / 2} y={chart.height / 2} textAnchor="middle">No matching planets</text>}
              </svg>
            </div>
            </Tooltip>
            <figcaption className="distance-caption">{explore.active && explore.compact
              ? 'Tap a dot for details. Use Filters to search or change the distance range.'
              : 'Hover a dot for a quick look, or select it to keep its details in the panel. Focus the plot to preview the selected planet; press Escape to dismiss the tooltip.'}</figcaption>
          </figure>

          <aside className="distance-sidebar" aria-label="Chart legend and reading notes">
            <div className="distance-legend" role="group" aria-labelledby="distance-legend-title">
              <div className="distance-legend-heading">
                <h3 id="distance-legend-title">Chart legend</h3><span>Distances in light-years</span>
              </div>
              <ul className="distance-symbol-key">
                <li><svg viewBox="0 0 28 24" aria-hidden="true"><circle className="legend-earth-halo" cx="14" cy="12" r="8" /><circle className="legend-earth-dot" cx="14" cy="12" r={markerRadius(1)} /></svg>Earth / origin</li>
                <li><svg viewBox="0 0 28 24" aria-hidden="true"><circle className="legend-planet-dot" cx="14" cy="12" r="5" /></svg>Exoplanet</li>
                <li><svg viewBox="0 0 28 24" aria-hidden="true"><circle className="legend-selected-halo" cx="14" cy="12" r="8" /><circle className="legend-selected-dot" cx="14" cy="12" r="4" /></svg>Selected planet</li>
                <li><svg viewBox="0 0 28 24" aria-hidden="true"><path className="legend-distance-band" d="M 4 21 A 18 18 0 0 1 24 3" /></svg>Distance band</li>
              </ul>
              <div className="distance-size-key">
                <span>Planet radius</span>
                <svg viewBox="0 0 240 52" role="img" aria-label="Size legend: one, four, and sixteen Earth radii. Circle area, not diameter, scales with planet radius.">
                  {[1, 4, 16].map((radius, index) => <g key={radius}>
                    <circle cx={32 + index * 84} cy={16} r={markerRadius(radius)} />
                    <text x={32 + index * 84} y={44} textAnchor="middle">{radius} Earth radii</text>
                  </g>)}
                </svg>
                <p>Marker <strong>area</strong> scales with planet radius, not diameter. A 4-Earth-radius planet has twice the marker diameter of an Earth-sized planet. Halos indicate selection or Earth's origin, not size.</p>
              </div>
              <p className="distance-angle-key"><strong>Size around the arc:</strong> smallest near the left vertical axis, largest near the bottom horizontal axis. Angular spacing uses log radius, not sky direction.</p>
            </div>

            <div id="distance-notes" className="distance-reading-notes">
              <h3>A distance view, not a sky map</h3>
              <p>Arcs mark equal distances from Earth. The radial scale uses log(1 + distance in light-years), so nearby and distant worlds can share a view. Angle uses log catalog radius: smaller planets toward the left axis and larger planets toward the bottom axis. The size-angle scale stays fixed when filtering.</p>
              <p>Angles do not represent sky directions, and separation between dots is not the distance between planets. Marker sizes are exaggerated relative to distances.</p>
              <p>Catalog radii may be measured or estimated. See NASA records for uncertainties and methods. Dots can overlap; this is not a map of the true density of planets.</p>
              <p className="explore-mobile-source">NASA Exoplanet Archive / {date}. {number.format(planets.length)} with distance + radius; {number.format(excluded)} omitted for missing measurements. No missing values are treated as zero.</p>
            </div>
          </aside>
        </div>
        <div className="distance-data-note">
          <span>NASA Exoplanet Archive <span aria-hidden="true">/</span> {date}</span>
          <span>{number.format(planets.length)} with distance + radius; {number.format(excluded)} omitted because distance or radius is unavailable. No missing values are treated as zero.</span>
        </div>
      </div>
      </ChartExplore>
    </section>
  );
}
