import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  Badge, Button, Dialog, DialogActions, DialogBody, DialogContent, DialogTrigger,
  DialogSurface, DialogTitle, FluentProvider, Select,
  webDarkTheme, webLightTheme, type Theme,
} from '@fluentui/react-components';
import {
  ArrowRightRegular, ArrowUpRightRegular, DismissRegular,
  WeatherMoonRegular, WeatherSunnyRegular,
} from '@fluentui/react-icons';
import data from './data/planets.json';
import { DistanceChart } from './DistanceChart';
import './styles.css';

type Planet = (typeof data.featured)[number];
const archive = 'https://exoplanetarchive.ipac.caltech.edu/';
const number = new Intl.NumberFormat('en-US');
const decimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const descriptions: Record<string, { label: string; text: string }> = {
  'TRAPPIST-1 e': { label: 'A remarkable neighborhood', text: 'One of seven known planets orbiting the ultracool dwarf TRAPPIST-1. This compact system offers a window into worlds very different from our own.' },
  '51 Peg b': { label: 'A discovery that changed everything', text: 'The first exoplanet discovered around a Sun-like star. Its short orbit helped reveal that planetary systems need not look like our solar system.' },
  'Kepler-186 f': { label: 'A world of possibilities', text: 'An Earth-sized planet discovered in its star\'s habitable zone. That describes possible conditions for liquid water, not evidence of life or habitability.' },
  'TOI-700 d': { label: 'A TESS discovery', text: 'An Earth-sized world in the habitable zone of a small, cool star. Discovered with TESS, it helps scientists investigate the diversity of small planets.' },
  '55 Cnc e': { label: 'An extreme super-Earth', text: 'A close-in planet that races around its star in less than a day. It is a compelling target for studying the conditions on intensely heated rocky worlds.' },
  'Kepler-16 b': { label: 'Two stars. One planet.', text: 'A circumbinary planet: a world that orbits two stars. Its discovery showed that planets can form in environments unlike our single-star solar system.' },
};
const resources = [
  { category: 'START HERE', title: 'The universe next door', text: 'Meet the worlds beyond our solar system with NASA\'s guide to exoplanets.', url: 'https://science.nasa.gov/exoplanets/', tag: 'NASA Exoplanets' },
  { category: 'GO DEEPER', title: 'Follow the data', text: 'Explore planet measurements, published references, and the original scientific catalog.', url: archive, tag: 'NASA Exoplanet Archive' },
  { category: 'THE SCIENCE', title: 'How do we find them?', text: 'Tiny dips in starlight. A star\'s subtle wobble. Discover the methods behind the discoveries.', url: 'https://science.nasa.gov/exoplanets/how-we-find-and-characterize/', tag: 'Detection & characterization' },
  { category: 'PLANET HUNTER', title: 'Meet TESS', text: 'Learn how the Transiting Exoplanet Survey Satellite searches for worlds around nearby stars.', url: 'https://science.nasa.gov/mission/tess/', tag: 'NASA missions' },
  { category: 'LOOKING CLOSER', title: 'A new view with Webb', text: 'Discover how infrared observations help scientists investigate exoplanet atmospheres.', url: 'https://science.nasa.gov/mission/webb/', tag: 'NASA missions' },
  { category: 'WHAT COMES NEXT', title: 'The next chapter', text: 'Explore the science goals and current mission information for the Roman Space Telescope.', url: 'https://science.nasa.gov/mission/roman-space-telescope/', tag: 'NASA missions' },
];

function overview(planet: Planet) {
  return `${archive}cgi-bin/DisplayOverview/nph-DisplayOverview?objname=${encodeURIComponent(planet.pl_name)}&type=CONFIRMED_PLANET`;
}

function measurement(value: number | null, unit: string) {
  return value === null ? 'Not available' : `${decimal.format(value)} ${unit}`;
}

function PlanetDetails({ planet, date }: { planet: Planet; date: string }) {
  return (
    <Dialog>
      <DialogTrigger disableButtonEnhancement>
        <Button appearance="subtle" icon={<ArrowRightRegular />} aria-label={`Explore ${planet.pl_name}`} />
      </DialogTrigger>
      <DialogSurface className="planet-dialog">
        <DialogBody>
          <DialogTitle action={<DialogTrigger action="close" disableButtonEnhancement><Button appearance="subtle" icon={<DismissRegular />} aria-label="Close planet details" /></DialogTrigger>}>{planet.pl_name}</DialogTitle>
          <DialogContent>
            <p>{descriptions[planet.pl_name].text}</p>
            <dl className="detail-grid">
              <div><dt>Host star / system</dt><dd>{planet.hostname}</dd></div>
              <div><dt>Discovery year</dt><dd>{planet.disc_year}</dd></div>
              <div><dt>Discovery method</dt><dd>{planet.discoverymethod}</dd></div>
              <div><dt>Planet radius</dt><dd>{measurement(planet.pl_rade, 'Earth radii')}</dd></div>
              <div><dt>Orbital period</dt><dd>{measurement(planet.pl_orbper, 'days')}</dd></div>
              <div><dt>Distance from Earth</dt><dd>{measurement(planet.sy_dist === null ? null : planet.sy_dist * 3.26156, 'light-years')}</dd></div>
            </dl>
            <p className="detail-note">Rounded composite catalog values, retrieved {date}. Values can come from different studies; see the archive for uncertainties, measurement methods, and original references. Illustrations are not observations.</p>
          </DialogContent>
          <DialogActions>
            <Button as="a" href={planet.scienceUrl} target="_blank" rel="noopener noreferrer" title="Opens in a new tab" appearance="primary" icon={<ArrowUpRightRegular />} iconPosition="after" aria-label={`${planet.scienceName} - NASA Science (opens in a new tab)`}>NASA Science</Button>
            <Button as="a" href={overview(planet)} target="_blank" rel="noopener noreferrer" title="Opens in a new tab" appearance="outline" icon={<ArrowUpRightRegular />} iconPosition="after" aria-label={`${planet.pl_name} - NASA Exoplanet Archive (opens in a new tab)`}>Archive data</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

function App() {
  const [dark, setDark] = React.useState(document.documentElement.dataset.theme === 'dark');
  const [method, setMethod] = React.useState('all');
  React.useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);
  const theme: Theme = {
    ...(dark ? webDarkTheme : webLightTheme),
    colorBrandBackground: 'var(--cp-brand)',
    colorBrandBackgroundHover: 'var(--cp-brand-hover)',
    colorBrandBackgroundPressed: 'var(--cp-brand-hover)',
    colorNeutralForegroundOnBrand: 'var(--cp-accent-fg)',
    colorBrandForeground1: 'var(--cp-accent)',
    colorCompoundBrandStroke: 'var(--cp-accent)',
    colorNeutralBackground1: 'var(--cp-surface)',
    colorNeutralBackground1Hover: 'var(--cp-surface-soft)',
    colorNeutralBackground1Pressed: 'var(--cp-highlight)',
    colorNeutralBackground2: 'var(--cp-surface-soft)',
    colorNeutralBackground3: 'var(--cp-surface-soft)',
    colorNeutralBackground1Selected: 'var(--cp-accent-soft)',
    colorNeutralForeground1: 'var(--cp-text)',
    colorNeutralForeground1Hover: 'var(--cp-text)',
    colorNeutralForeground1Pressed: 'var(--cp-text)',
    colorNeutralForeground2: 'var(--cp-text-muted)',
    colorNeutralForeground2Hover: 'var(--cp-accent)',
    colorNeutralForeground2Pressed: 'var(--cp-accent-hover)',
    colorNeutralForeground3: 'var(--cp-text-soft)',
    colorNeutralStroke1: 'var(--cp-border-strong)',
    colorNeutralStroke1Hover: 'var(--cp-accent)',
    colorNeutralStroke2: 'var(--cp-border)',
    fontFamilyBase: '"Segoe UI", Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif',
    borderRadiusMedium: '10px',
  };
  const visiblePlanets = data.featured.filter(planet => method === 'all' || planet.discoverymethod === method);
  const retrieved = new Date(data.retrievedAt);
  const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(retrieved);
  const ageDays = (Date.now() - retrieved.getTime()) / 86_400_000;
  const maxMethod = Math.max(...data.methods.map(item => item.count));

  return (
    <FluentProvider theme={theme} className="app-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header page-width">
        <a className="wordmark" href="#" aria-label="Exoplanet Explorer home">
          <span className="logo-orbit" aria-hidden="true" />
          <span>exoplanet<span className="wordmark-light"> explorer</span></span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#distance">Distances</a>
          <a href="#science">The science</a>
          <a href="#resources">NASA resources <ArrowUpRightRegular aria-hidden="true" /></a>
        </nav>
        <Button appearance="subtle" className="theme-toggle"
          icon={dark ? <WeatherSunnyRegular /> : <WeatherMoonRegular />}
          aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={() => setDark(!dark)} />
      </header>

      <main id="main">
        <section className="hero page-width" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="eyebrow"><span className="status-dot" /> A LITTLE PERSPECTIVE ON A BIG UNIVERSE</div>
            <h1 id="hero-title">There are worlds<br />beyond <em>our own.</em></h1>
            <p className="hero-description">Thousands discovered. Countless still out there. Get to know the planets beyond our solar system, and the science that brings them a little closer.</p>
            <div className="hero-actions">
              <Button as="a" href="#distance" appearance="primary" size="large" icon={<ArrowRightRegular />} iconPosition="after">Start exploring</Button>
              <a className="text-link" href="https://science.nasa.gov/exoplanets/" target="_blank" rel="noopener noreferrer" title="Opens in a new tab">What is an exoplanet? <ArrowUpRightRegular aria-hidden="true" /></a>
            </div>
            <p className="hero-note">Real discoveries. Open data. An extraordinary universe.</p>
          </div>
          <div className="universe" role="img" aria-label="Decorative illustration of a planet and orbital paths, not an actual observation">
            <div className="universe-grid" />
            <span className="orbit orbit-one" /><span className="orbit orbit-two" /><span className="orbit orbit-three" />
            <span className="little-star star-one">+</span><span className="little-star star-two">+</span><span className="little-star star-three">+</span>
            <div className="hero-planet"><span /></div>
            <div className="moon" />
            <div className="coordinate coordinate-top">BEYOND THE SOLAR SYSTEM</div>
            <div className="planet-caption"><span className="caption-line" /><span>A universe of possibilities<br /><small>Illustration, not an observation</small></span></div>
            <div className="coordinate coordinate-bottom">OUR CURIOSITY HAS NO HORIZON</div>
          </div>
        </section>

        <section className="stats-section page-width" aria-labelledby="stats-title">
          <div className="section-topline">
            <h2 id="stats-title" className="eyebrow">THE DISCOVERIES SO FAR</h2>
            <a className="source-link" href={data.source} target="_blank" rel="noopener noreferrer" title="Opens in a new tab">NASA Archive snapshot <span aria-hidden="true">/</span> <time dateTime={data.retrievedAt}>{date}</time> <ArrowUpRightRegular aria-hidden="true" /></a>
          </div>
          <div className="stats-grid">
            <div className="stat"><strong>{number.format(data.totalPlanets)}</strong><span>Confirmed exoplanets</span><p>Worlds beyond our solar system</p></div>
            <div className="stat"><strong>{number.format(data.totalSystems)}</strong><span>Planetary systems</span><p>Distinct host systems in the catalog</p></div>
            <div className="stat"><strong>{data.methods.length}</strong><span>Discovery methods</span><p>Different ways to find another world</p></div>
            <div className="stat stat-perspective"><strong>One</strong><span>Shared sense of wonder</span><p>And so much left to discover</p></div>
          </div>
          {ageDays > 30 && <p className="data-notice" role="note">This snapshot is over 30 days old. Visit the <a href={archive} target="_blank" rel="noopener noreferrer" title="Opens in a new tab">NASA Exoplanet Archive</a> for the latest counts.</p>}
        </section>

        <DistanceChart planets={data.plot} totalPlanets={data.totalPlanets} date={date} />

        <section id="discover" className="discover-section page-width" aria-labelledby="discover-title">
          <div className="section-heading">
            <div><p className="eyebrow">MEET THE NEIGHBORS</p><h2 id="discover-title">Not quite like home.</h2><p>Six remarkable worlds. Six different stories.</p></div>
            <div className="planet-filter">
              <label htmlFor="discovery-method">Discovery method</label>
              <Select id="discovery-method" value={method} onChange={event => setMethod(event.target.value)}>
                <option value="all">All featured worlds</option>
                {[...new Set(data.featured.map(planet => planet.discoverymethod))].map(name => <option key={name}>{name}</option>)}
              </Select>
            </div>
          </div>
          <p className="sr-only" role="status">{visiblePlanets.length} featured planets shown</p>
          <div className="planet-grid">
            {visiblePlanets.map(planet => (
              <article className="planet-card" key={planet.pl_name}>
                <div className={`planet-art planet-art-${data.featured.indexOf(planet)}`} aria-hidden="true">
                  <span className="card-orbit" /><span className="small-planet" />
                  <span className="art-index">0{data.featured.indexOf(planet) + 1} / FEATURED WORLD</span>
                  <span className="art-label">ILLUSTRATION</span>
                </div>
                <div className="planet-card-body">
                  <div className="card-kicker">{descriptions[planet.pl_name].label}</div>
                  <h3><a className="planet-name-link" href={planet.scienceUrl} target="_blank" rel="noopener noreferrer" title="Opens in a new tab" aria-label={`${planet.scienceName} - NASA Science (opens in a new tab)`}>{planet.pl_name}<ArrowUpRightRegular aria-hidden="true" /></a></h3>
                  <p>{descriptions[planet.pl_name].text}</p>
                  <div className="planet-card-footer">
                    <Badge appearance="tint" color="subtle">{planet.discoverymethod}</Badge>
                    <PlanetDetails planet={planet} date={date} />
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="catalog-link"><span>This is just the beginning.</span><a className="text-link" href="https://science.nasa.gov/exoplanets/exoplanet-catalog/" target="_blank" rel="noopener noreferrer" title="Opens in a new tab">Explore NASA's planet catalog <ArrowUpRightRegular aria-hidden="true" /></a></div>
        </section>

        <section id="science" className="science-section" aria-labelledby="science-title">
          <div className="page-width science-layout">
            <div className="science-copy"><p className="eyebrow">SMALL SIGNALS. BIG DISCOVERIES.</p><h2 id="science-title">How do you find<br />a distant world?</h2>
              <p>Most exoplanets are too faint to see directly. Instead, scientists look for the clues they leave behind: a dip in starlight, a gentle stellar wobble, or a bend in light.</p>
              <Button as="a" href="https://science.nasa.gov/exoplanets/how-we-find-and-characterize/" target="_blank" rel="noopener noreferrer" title="Opens in a new tab" appearance="outline" icon={<ArrowUpRightRegular />} iconPosition="after">Discover the methods</Button>
              <aside className="science-note"><strong>A note on perspective</strong><p>What we find depends on how we look. Transits favor planets whose orbits cross our view of their star. These counts reflect discovery biases, not the true mix of planets in the universe.</p></aside>
            </div>
            <div className="methods-panel">
              <h3>How confirmed planets were discovered</h3>
              <p>Planets by discovery method <span className="chart-unit">COUNT</span></p>
              <ul className="method-chart" aria-label="Confirmed planet counts by discovery method">
                {data.methods.map(item => <li key={item.name}>
                  <div className="bar-label"><span>{item.name}</span><strong>{number.format(item.count)}</strong></div>
                  <div className="bar-track" aria-hidden="true"><div className="bar-fill" style={{ width: `${item.count / maxMethod * 100}%` }} /></div>
                </li>)}
              </ul>
              <p className="chart-source">Source: NASA Exoplanet Archive. Confirmed planets only.<br />Snapshot: {date}. Bar lengths use a linear scale.</p>
            </div>
          </div>
        </section>

        <section id="resources" className="resources-section page-width" aria-labelledby="resources-title">
          <div className="section-heading"><div><p className="eyebrow">KEEP YOUR CURIOSITY GOING</p><h2 id="resources-title">Your next small step.</h2><p>Go straight to the source with these NASA resources.</p></div><span className="resource-aside">Good questions lead to great journeys. <ArrowUpRightRegular aria-hidden="true" /></span></div>
          <div className="resource-grid">
            {resources.map(resource => <a className="resource-card" key={resource.url} href={resource.url} target="_blank" rel="noopener noreferrer" title="Opens in a new tab">
              <div className="resource-top"><span className="eyebrow">{resource.category}</span><ArrowUpRightRegular aria-hidden="true" /></div>
              <h3>{resource.title}</h3><p>{resource.text}</p><span className="resource-tag">{resource.tag}</span>
            </a>)}
          </div>
        </section>
        <section className="closing page-width"><span className="logo-orbit" aria-hidden="true" /><p>The universe is vast.<br /><em>Stay curious.</em></p><a className="text-link" href="#main">Back to the stars <span aria-hidden="true">&uarr;</span></a></section>
      </main>
      <footer className="site-footer page-width">
        <div><a className="footer-brand" href="#">exoplanet explorer</a><p>An independent exploration of NASA's open science.<br />Not affiliated with or endorsed by NASA.</p></div>
        <div className="footer-data"><a href={archive} target="_blank" rel="noopener noreferrer" title="Opens in a new tab">NASA Exoplanet Archive <ArrowUpRightRegular aria-hidden="true" /></a><p>Composite catalog snapshot, not live data. Confirmed planets only.<br /><time dateTime={data.retrievedAt}>Retrieved {date} (UTC)</time>. <a href="https://exoplanetarchive.ipac.caltech.edu/docs/acknowledge.html" target="_blank" rel="noopener noreferrer" title="Opens in a new tab">Data attribution</a></p></div>
      </footer>

    </FluentProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
