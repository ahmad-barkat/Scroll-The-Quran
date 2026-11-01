import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeDatasetChecksum } from './lib/dataset-checksum.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJSON = async (file) => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));

const dataset = await readJSON('public/quran.json');
const pinned = await readJSON('scripts/expected-checksum.json');

const actual = computeDatasetChecksum(dataset);

if (actual !== pinned.sha256) {
  console.error('Quran dataset checksum drifted from the pinned value.');
  console.error(`  expected (scripts/expected-checksum.json): ${pinned.sha256}`);
  console.error(`  actual   (public/quran.json):               ${actual}`);
  console.error('');
  console.error('If the dataset change is intentional, rebuild with `npm run data:build` and');
  console.error('update scripts/expected-checksum.json in the same commit so the change is reviewable.');
  console.error('If it is not intentional, restore public/quran.json before committing.');
  process.exitCode = 1;
} else {
  console.log(`Pinned dataset checksum matches: ${actual}`);
}
