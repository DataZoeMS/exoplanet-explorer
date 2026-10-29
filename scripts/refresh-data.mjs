import { mkdir, rename, writeFile } from 'node:fs/promises';
import { endpoint, summarize } from './data.mjs';
import { attachScienceLinks, fetchScienceCatalog } from './nasa-science.mjs';

const response = await fetch(endpoint, { signal: AbortSignal.timeout(120_000) });
if (!response.ok) throw new Error(`NASA Archive request failed: ${response.status} ${response.statusText}`);
const planets = summarize(await response.json(), new Date().toISOString());
const catalog = await fetchScienceCatalog();
const snapshot = attachScienceLinks(planets, catalog);
const target = new URL('../src/data/planets.json', import.meta.url);
await mkdir(new URL('../src/data/', import.meta.url), { recursive: true });
const temporary = new URL('../src/data/planets.json.tmp', import.meta.url);
await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`);
await rename(temporary, target);
console.log(`Saved ${snapshot.totalPlanets} confirmed planets across ${snapshot.totalSystems} systems (${snapshot.retrievedAt}).`);
console.log(`Linked every featured and plotted planet to verified NASA Science pages (${catalog.total} catalog entries).`);
