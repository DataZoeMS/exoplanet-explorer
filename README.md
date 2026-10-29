# Exoplanet Explorer

A public, responsive website built with React, TypeScript, Vite, and Microsoft Fluent UI (formerly Fabric). Discover confirmed exoplanet statistics, an interactive distance-and-size chart, six featured worlds, discovery methods, and official NASA resources. No sign-in, API key, or backend is required.

## Run locally

Requires Node.js 22.12+ (or a newer supported LTS version) and npm.

```powershell
npm ci
npm run dev
```

Open the localhost URL printed by Vite. The page supports light and dark themes, keyboard navigation, distance and discovery-method filters, and planet detail dialogs. Use `?scoutTheme=light` or `?scoutTheme=dark` to select the initial theme; otherwise it follows the operating system.

Page-layout styles for `.app-shell` are scoped to the provider directly inside `#root`. Fluent UI copies provider classes to tooltip and dialog portal containers; applying the page's full-height background to those containers can cover the landing page.

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

Planet-name links, the chart's selection panel, and featured detail dialogs link to NASA Science. Archive data links remain available alongside them for scientific measurements and references.

Planet radius is in Earth radii; orbital period is in days. Distance is converted from parsecs to light-years using 1 pc = 3.26156 light-years. Null measurements display as "Not available." Rounded composite values can combine different publications; archive links provide uncertainties, measurement methods, and scientific references. Decorative planets are CSS illustrations, not NASA imagery or observations.

Data attribution: [NASA Exoplanet Archive acknowledgment guidelines](https://exoplanetarchive.ipac.caltech.edu/docs/acknowledge.html). The archive is operated by the California Institute of Technology under contract with NASA under the Exoplanet Exploration Program. This independent site is not affiliated with or endorsed by NASA.

## Quarter-circle distance chart

Earth is the lower-left origin. The snapshot's `plot` array includes **every** confirmed planet with both a positive catalog distance and radius, sorted by distance. The chart reports the number omitted for missing values; it never replaces missing distances or radii with zero. Search by planet name, select a distance range, or click a point to inspect it. Previous/Next buttons browse the filtered planets in distance order without requiring pointer interaction. On narrow screens the plot scrolls horizontally to keep labels readable.

The legend above the plot identifies Earth, exoplanets, selected planets, distance bands, and the marker-size scale. Hovering a dot shows a Fluent UI tooltip with its name, distance, and catalog radius; selecting the dot keeps those details in the sidebar. Keyboard users can focus the plot to preview the selected planet. Tooltips remain visible when hovered and can be dismissed with Escape; changing filters or resetting the view dismisses them.

The radial coordinate is `600 * log(1 + distanceLy) / log(1 + limitLy)`. This includes Earth at zero and is approximately logarithmic beyond one light-year. The full view's limit is the next power of ten containing the farthest planet; distance-range filters set the limit to 100, 1,000, or 10,000 light-years. Concentric quarter-circle arcs show distances in light-years. A search does not change the distance scale.

SVG marker radius is `2.6 * sqrt(radiusEarth)`, so **marker area is proportional to planet radius**, not mass, volume, or physical cross-sectional area. A 4-Earth-radius planet has twice the marker diameter of a 1-Earth-radius planet. The size legend and Earth's central dot use the same mapping, with no minimum/maximum clamps; Earth's outline halo and the selection ring are annotations, not size measurements. Markers are exaggerated relative to the distance scale.

Angle encodes **log catalog radius**, clockwise from the smallest planets near the left vertical axis to the largest near the bottom horizontal axis. The full catalog's minimum and maximum radii map to 84 and 6 degrees above the horizontal; the angle bounds stay fixed across searches and distance filters. If all radii are equal, they share the 45-degree diagonal. Radii also control marker area, so size is encoded twice for comparison.

Angles do **not** encode sky direction, and separation between dots is not interplanetary distance. Dots with equal distance and radius overlap; this is neither a sky map nor an unbiased population-density map. Catalog radii may be measured or estimated; individual NASA records provide methods and uncertainties. `npm test` checks the distance transform, exact radial placement and monotonic size-angle ordering of every catalog point, proportional marker area, missing-value handling, and snapshot consistency.

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

The landing page, quarter-circle distance chart, and static NASA data integration are implemented. The broader comparison and analysis capabilities listed above remain future work. This is a Fluent UI website, not a Microsoft Fabric workspace app.
