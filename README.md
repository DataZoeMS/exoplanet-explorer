# Exoplanet Explorer

A public, responsive website built with React, TypeScript, Vite, and Microsoft Fluent UI (formerly Fabric). Discover confirmed exoplanet statistics, interactive distance and Earth/Sun size charts, six featured worlds, discovery methods, and official NASA resources. No sign-in, API key, or backend is required.

## Run locally

Requires Node.js 22.12+ (or a newer supported LTS version) and npm.

```powershell
npm ci
npm run dev
```

Open the localhost URL printed by Vite. The page supports light and dark themes, keyboard navigation, distance, size-quadrant, and discovery-method filters, and planet detail dialogs. Use `?scoutTheme=light` or `?scoutTheme=dark` to select the initial theme; otherwise it follows the operating system.

Page-layout styles for `.app-shell` are scoped to the provider directly inside `#root`. Fluent UI copies provider classes to tooltip and dialog portal containers; applying the page's full-height background to those containers can cover the landing page.

The supplied eight-color palette is defined by `--cp-color-1` through `--cp-color-8` in `src/styles.css`: `#65A4F8`, `#72D2F1`, `#818CF7`, `#BD80F8`, `#E479CC`, `#F09066`, `#E1C964`, and `#ED7479`. Blue is the primary button and distance-plot color; coral marks selected planets. The comparison plot uses the palette for labeled size quadrants; the remaining colors also appear in decorative planets and discovery-method bars. Text accents use contrast-adjusted blue variants in light and dark themes. Illustration colors do not encode physical planet characteristics; discovery-method colors cycle after eight entries, with labels identifying each method.

```powershell
npm test
npm run build
npm run preview
```

## Public deployment

GitHub Pages URL: **https://datazoems.github.io/exoplanet-explorer/**

The site is static and can be served by any static host. GitHub Pages is configured to use **GitHub Actions** as its deployment source. The included workflow builds and deploys on pushes to `main`, or can be run manually from Actions. Local development does not publish the site.

The workflow sets `GITHUB_PAGES=true` for the `/exoplanet-explorer/` base path. Other hosts use the default `/` base path. There is no client-side router or server-side configuration.

## NASA data

The committed `src/data/planets.json` is a dated snapshot from the NASA Exoplanet Archive's `pscomppars` (Planetary Systems Composite Parameters) table, with one row per confirmed planet. Statistics count confirmed planets, distinct `hostname` systems, and discovery methods; they do not include candidates. The chart uses every method in the snapshot. Featured worlds are an editorial selection, not a representative sample.

To update the snapshot:

```powershell
npm run data:refresh
npm test
```

The refresh requests NASA's public TAP JSON endpoint and the NASA Science exoplanet catalog API, validates both responses, and atomically replaces the snapshot only on success. A failed request or invalid response exits with an error; it never substitutes sample counts. Commit the updated snapshot and redeploy to publish new figures. Builds use the committed snapshot rather than depending on NASA's availability. After 30 days, the page displays a stale-data notice and directs readers to the live archive.

Every featured and plotted planet includes a verified NASA Science catalog URL and display name. The refresh reads all pages of `https://science.nasa.gov/wp-json/wp/v2/exoplanet` and joins archive names to the catalog's `acf.exo_id` (spaces become underscores), retaining NASA's canonical `link`. It does not guess URL slugs: for example, archive name `51 Peg b` maps to `51-pegasi-b`, not `51-peg-b`. Missing or ambiguous identities, incomplete pagination, and invalid link destinations fail the refresh without replacing the snapshot. `scienceCatalog` records that source, its retrieval date, and catalog size.

Planet-name links, the chart's selection panel, and featured detail dialogs link to NASA Science. Archive data links remain available alongside them for scientific measurements and references. All external NASA links open in a new tab/window (depending on browser settings) with `noopener noreferrer`; in-page navigation stays in the current tab.

Planet radius (`pl_rade`) is in Earth radii, host-star radius (`st_rad`) in Sun radii, and orbital period in days. Distance is converted from parsecs to light-years using 1 pc = 3.26156 light-years. Null measurements display as "Not available." Rounded composite values can combine different publications; archive links provide uncertainties, measurement methods, and scientific references. Decorative planets are CSS illustrations, not NASA imagery or observations.

Data attribution: [NASA Exoplanet Archive acknowledgment guidelines](https://exoplanetarchive.ipac.caltech.edu/docs/acknowledge.html). The archive is operated by the California Institute of Technology under contract with NASA under the Exoplanet Exploration Program. This independent site is not affiliated with or endorsed by NASA.

## Quarter-circle distance chart

Earth is the lower-left origin. The snapshot's `plot` array includes **every** confirmed planet with both a positive catalog distance and radius, sorted by distance. The chart reports the number omitted for missing values; it never replaces missing distances or radii with zero. Search by planet name, select a distance range, or click a point to inspect it. Previous/Next buttons browse the filtered planets in distance order without requiring pointer interaction. On narrow screens the plot scrolls horizontally to keep labels readable.

The legend above the plot identifies Earth, exoplanets, selected planets, distance bands, and the marker-size scale. Hovering a dot shows a Fluent UI tooltip with its name, distance, and catalog radius; selecting the dot keeps those details in the sidebar. Keyboard users can focus the plot to preview the selected planet. Tooltips remain visible when hovered and can be dismissed with Escape; changing filters or resetting the view dismisses them.

The radial coordinate is `600 * log(1 + distanceLy) / log(1 + limitLy)`. This includes Earth at zero and is approximately logarithmic beyond one light-year. The full view's limit is the next power of ten containing the farthest planet; distance-range filters set the limit to 100, 1,000, or 10,000 light-years. Concentric quarter-circle arcs show distances in light-years. A search does not change the distance scale.

SVG marker radius is `2.6 * sqrt(radiusEarth)`, so **marker area is proportional to planet radius**, not mass, volume, or physical cross-sectional area. A 4-Earth-radius planet has twice the marker diameter of a 1-Earth-radius planet. The size legend and Earth's central dot use the same mapping, with no minimum/maximum clamps; Earth's outline halo and the selection ring are annotations, not size measurements. Markers are exaggerated relative to the distance scale.

Angle encodes **log catalog radius**, clockwise from the smallest planets near the left vertical axis to the largest near the bottom horizontal axis. The full catalog's minimum and maximum radii map to 84 and 6 degrees above the horizontal; the angle bounds stay fixed across searches and distance filters. If all radii are equal, they share the 45-degree diagonal. Radii also control marker area, so size is encoded twice for comparison.

Angles do **not** encode sky direction, and separation between dots is not interplanetary distance. Dots with equal distance and radius overlap; this is neither a sky map nor an unbiased population-density map. Catalog radii may be measured or estimated; individual NASA records provide methods and uncertainties. `npm test` checks the distance transform, exact radial placement and monotonic size-angle ordering of every catalog point, proportional marker area, missing-value handling, and snapshot consistency.

## Earth/Sun size comparison

The second plot compares **host-star radius relative to the Sun on x** with **planet radius relative to Earth on y**. Its origin is the Earth/Sun pair at `(1, 1)` in radius ratios, which becomes `(0, 0)` in log-ratio coordinates. This is not zero physical size. The axes use different reference bodies, so equal ratios do not imply equal absolute star and planet sizes.

Coordinates use `log2(st_rad)` and `log2(pl_rade)`, with larger planets plotted upward. Symmetric full-catalog bounds include the reference and all valid pairs; they stay fixed across search and quadrant filters. Doubling a radius and halving it give equal, opposite displacements from the origin. Tick labels show the original ratios. Each quadrant is labeled and colored by whether the star is larger or smaller than the Sun and the planet larger or smaller than Earth. Values exactly equal to either reference are on an axis, with their own filter.

The generated `comparison` array includes every record with positive, non-null `st_rad` and `pl_rade`, independently of distance availability. It preserves host names and canonical NASA Science links, sorted by star radius, planet radius, and name. The plot reports excluded records without zero-filling missing radii. Each dot is a planet-host pair, not a unique system or total system extent; multiple planets can share a host. Multiple-star records use the archive's reported stellar radius, not a sum of stellar radii.

Search accepts planet names, NASA Science display names, and host names. Quadrant filters, Reset, click selection, rich hover/focus tooltips, Escape dismissal, and Previous/Next browsing mirror the distance chart. Both plots share tooltip timing and cleanup in `usePlanetTooltip.ts`. NASA links open separately. On narrow screens the plot scrolls inside its own panel. Constant dot sizes avoid encoding planet radius twice; the Earth/Sun diamond and coral selection halo are reference/selection markers, not measurements.

Tests cover reference placement, reciprocal symmetry, axis direction, quadrant and boundary classification, missing-value handling, independent comparison coverage, canonical links, and exact coordinates of every committed comparison point.

## Intended capabilities

- Explore and compare exoplanets by properties such as radius, mass, orbital period, distance, discovery year, and detection method.
- Visualize patterns in planet populations while explaining measurement uncertainty and detection biases.
- Learn how transits, radial velocity, microlensing, direct imaging, and astrometry reveal planets around other stars.
- Link planet details and scientific explanations back to NASA resources and the NASA Exoplanet Archive.
- Explore missions and future mission plans, with links to official NASA pages for current status and schedules.

## NASA resources

| Resource | Purpose |
| --- | --- |
| [NASA Exoplanets](https://science.nasa.gov/exoplanets/) | Exoplanet science, discoveries, and educational resources |
| [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/) | Scientific data for exoplanet analysis |
| [NASA Exoplanet Catalog](https://science.nasa.gov/exoplanets/exoplanet-catalog/) | Accessible planet profiles |
| [How We Find and Characterize Exoplanets](https://science.nasa.gov/exoplanets/how-we-find-and-characterize/) | Detection and characterization methods |
| [TESS](https://science.nasa.gov/mission/tess/) | Transit surveys and planet discovery |
| [James Webb Space Telescope](https://science.nasa.gov/mission/webb/) | Observations and atmospheric characterization |
| [Nancy Grace Roman Space Telescope](https://science.nasa.gov/mission/roman-space-telescope/) | Mission information and exoplanet science |
| [Habitable Worlds Observatory](https://science.nasa.gov/astrophysics/programs/habitable-worlds-observatory/) | Future observatory planning and science goals |

## Data and interpretation principles

- Preserve source links, units, uncertainties, and retrieval dates.
- Distinguish confirmed planets from candidates, and measured properties from estimates.
- Treat missing measurements as unavailable, not zero; distinguish mass from minimum mass.
- Account for detection biases when comparing populations.
- A planet in a habitable zone is not evidence that it is habitable or inhabited.
- Verify mission status and upcoming milestones against current official sources; distinguish proposed concepts from approved missions and avoid hardcoded launch promises.
- Follow dataset and media usage requirements, retain attribution, and do not imply NASA endorsement.

## Project status

The landing page, quarter-circle distance chart, Earth/Sun size comparison, and static NASA data integration are implemented. The broader comparison and analysis capabilities listed above remain future work. This is a Fluent UI website, not a Microsoft Fabric workspace app.
