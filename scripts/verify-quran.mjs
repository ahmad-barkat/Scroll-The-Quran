import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeDatasetChecksum } from './lib/dataset-checksum.mjs';
import {
  TOTAL_AYAHS,
  audioUrl,
  buildIndex,
  normalizeArabic,
  normalizeEnglish,
  parseReference,
  refToGlobal,
  searchVerses,
  RECITERS,
} from '../src/lib/quran.ts';
import { collections, dailyRefs } from '../src/data/collections.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJSON = async (file) => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));

const dataset = await readJSON('public/quran.json');
const report = await readJSON('public/verification-report.json');

let checks = 0;
const failures = [];
const check = (condition, message) => {
  checks += 1;
  if (!condition) failures.push(message);
};
const section = (name) => console.log(`\n${name}`);

const ref = (surah, ayah) => dataset.surahs[surah - 1]?.ayahs[ayah - 1];
const verse = (surah, ayah) => {
  const found = ref(surah, ayah);
  if (!found) throw new Error(`Missing ${surah}:${ayah}`);
  return found;
};

section('Structure');
check(dataset.surahs.length === 114, `Expected 114 surahs, found ${dataset.surahs.length}`);
check(dataset.meta?.surahCount === 114, 'meta.surahCount is not 114');
check(dataset.meta?.ayahCount === TOTAL_AYAHS, `meta.ayahCount is not ${TOTAL_AYAHS}`);
check(dataset.meta?.script === 'Uthmani', 'meta.script is not Uthmani');
check(dataset.meta?.qiraah === 'Hafs ʿan ʿĀṣim', 'meta.qiraah is not Hafs ʿan ʿĀṣim');
check(/Quran\.com/.test(dataset.meta?.arabicSource ?? ''), 'Arabic source is not Quran.com');
check(/Saheeh International/.test(dataset.meta?.translationSource ?? ''), 'Translation source is not Saheeh International');
check(!Number.isNaN(Date.parse(dataset.meta?.generatedAt ?? '')), 'meta.generatedAt is not a valid ISO date');

const revelationOrders = new Set();
for (const surah of dataset.surahs) {
  const label = `surah ${surah.number}`;
  check(surah.number >= 1 && surah.number <= 114, `${label}: invalid number`);
  check(typeof surah.nameArabic === 'string' && surah.nameArabic.length > 0, `${label}: missing Arabic name`);
  check(typeof surah.nameSimple === 'string' && surah.nameSimple.length > 0, `${label}: missing simple name`);
  check(typeof surah.nameEnglish === 'string' && surah.nameEnglish.length > 0, `${label}: missing English name`);
  check(['makkah', 'madinah'].includes(surah.revelationPlace), `${label}: invalid revelation place`);
  check(Number.isInteger(surah.revelationOrder) && surah.revelationOrder >= 1 && surah.revelationOrder <= 114, `${label}: invalid revelation order`);
  revelationOrders.add(surah.revelationOrder);
  check(typeof surah.bismillahPre === 'boolean', `${label}: bismillahPre is not boolean`);
  check(surah.ayahs.length === surah.versesCount, `${label}: ayah count ${surah.ayahs.length} != versesCount ${surah.versesCount}`);
  check(Array.isArray(surah.pages) && surah.pages.length === 2 && surah.pages[0] <= surah.pages[1], `${label}: invalid page range`);
  surah.ayahs.forEach((ayah, index) => {
    if (ayah.n !== index + 1) failures.push(`${label}: ayah sequence breaks at index ${index} (n=${ayah.n})`);
  });
}
check(revelationOrders.size === 114, 'Revelation order is not a unique permutation of 1..114');

const totalAyahs = dataset.surahs.reduce((sum, surah) => sum + surah.ayahs.length, 0);
check(totalAyahs === TOTAL_AYAHS, `Expected ${TOTAL_AYAHS} ayahs, found ${totalAyahs}`);
check(dataset.surahs.every((surah) => surah.number === dataset.surahs.indexOf(surah) + 1), 'Surahs are not ordered 1..114');

section('Integrity checksum');
const checksum = computeDatasetChecksum(dataset);
check(/^[0-9a-f]{64}$/.test(checksum), 'Computed checksum is not SHA-256');
check(dataset.meta?.checksum === checksum, 'Dataset checksum does not match meta.checksum');
check(report.checksum === checksum, 'Verification report checksum does not match the dataset');

section('Basmala');
const bismillah = verse(1, 1).arabic;
check(dataset.bismillah === bismillah, 'dataset.bismillah differs from 1:1');
check(bismillah.startsWith('بِسْمِ'), '1:1 does not begin with the basmala');
check(dataset.surahs[0].bismillahPre === false, 'Surah 1 must not repeat the basmala (it is 1:1)');
check(dataset.surahs[8].bismillahPre === false, 'Surah 9 must not show the basmala');
check(!verse(9, 1).arabic.includes(bismillah), 'Surah 9:1 contains the basmala');
check(dataset.surahs.filter((surah) => surah.bismillahPre).length === 112, 'Expected the basmala before 112 surahs');
for (const surah of dataset.surahs.slice(1)) {
  if (!surah.bismillahPre) continue;
  check(!surah.ayahs[0].arabic.includes(bismillah), `Surah ${surah.number}:1 duplicates the basmala`);
}
check(verse(2, 1).arabic === 'الٓمٓ', '2:1 is not the disjoint letters Alif Lam Meem');
check(
  normalizeArabic(verse(2, 255).arabic).startsWith('الله لا اله الا هو الحي القيوم'),
  '2:255 is missing the tawhid phrase'
);
check(verse(2, 282).arabic.length > 500, '2:282 (the longest verse) is unexpectedly short');
check(normalizeArabic(verse(114, 6).arabic) === 'من الجنه والناس', '114:6 text mismatch');

section('Juz boundaries');
check(dataset.juzs.length === 30, `Expected 30 juzs, found ${dataset.juzs.length}`);
const index = buildIndex(dataset);
check(index.flat.length === TOTAL_AYAHS, 'Index does not contain 6,236 verses');
check(dataset.juzs[0].start.surah === 1 && dataset.juzs[0].start.ayah === 1, 'Juz 1 does not start at 1:1');
const lastJuz = dataset.juzs[29];
check(lastJuz.end.surah === 114 && lastJuz.end.ayah === 6, 'Juz 30 does not end at 114:6');
dataset.juzs.forEach((juz, i) => {
  check(juz.number === i + 1, `Juz ${i + 1}: number mismatch`);
  const start = refToGlobal(index, juz.start);
  const end = refToGlobal(index, juz.end);
  check(start <= end, `Juz ${juz.number}: start is after end`);
  if (i > 0) {
    const previousEnd = refToGlobal(index, dataset.juzs[i - 1].end);
    check(start === previousEnd + 1, `Juz ${juz.number}: gap or overlap at its start`);
  }
});
const juzNumbers = new Set(index.juzByGlobal);
check(juzNumbers.size === 30, `Index covers ${juzNumbers.size} juz numbers`);
check(index.juzByGlobal.every((n) => n >= 1 && n <= 30), 'Index assigns an invalid juz');
check(index.juzByGlobal[6235] === 30, 'The final ayah is not in juz 30');

section('Text hygiene');
const arabicDouble = [];
const englishDouble = [];
const tags = [];
const entities = [];
const latinArabic = [];
const badWhitespace = [];
const empty = [];
const replacement = [];
for (const surah of dataset.surahs) {
  for (const ayah of surah.ayahs) {
    const key = `${surah.number}:${ayah.n}`;
    if (!ayah.arabic.trim() || !ayah.english.trim()) empty.push(key);
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]|[\n\r\t\uFEFF]/.test(ayah.arabic + ayah.english)) badWhitespace.push(key);
    if (/\uFFFD/.test(ayah.arabic + ayah.english)) replacement.push(key);
    if (arabicDouble.length < 5 && /  /.test(ayah.arabic)) arabicDouble.push(key);
    if (englishDouble.length < 5 && /  /.test(ayah.english)) englishDouble.push(key);
    if (/<[^>]+>/.test(ayah.english) || /<[^>]+>/.test(ayah.arabic)) tags.push(key);
    if (/&[a-zA-Z#0-9]+;/.test(ayah.arabic + ayah.english)) entities.push(key);
    if (/[A-Za-z]/.test(ayah.arabic)) latinArabic.push(key);
    if (!/[\u0600-\u06FF]/.test(ayah.arabic)) replacement.push(key);
    if (!/[A-Za-z]/.test(ayah.english)) replacement.push(key);
  }
}
check(empty.length === 0, `Empty verses: ${empty.slice(0, 5).join(', ')}`);
check(badWhitespace.length === 0, `Control/BOM whitespace in: ${badWhitespace.slice(0, 5).join(', ')}`);
check(arabicDouble.length === 0, `Double spaces in Arabic: ${arabicDouble.join(', ')}`);
check(englishDouble.length === 0, `Double spaces in English: ${englishDouble.join(', ')}`);
check(tags.length === 0, `HTML tags leaked: ${tags.slice(0, 5).join(', ')}`);
check(entities.length === 0, `HTML entities leaked: ${entities.slice(0, 5).join(', ')}`);
check(latinArabic.length === 0, `Latin letters inside Arabic: ${latinArabic.slice(0, 5).join(', ')}`);
check(replacement.length === 0, `Missing script or replacement characters in: ${replacement.slice(0, 5).join(', ')}`);

section('Translation punctuation');
const punctuationFixes = new Map([
  ['18:4', 'son."'],
  ['37:92', 'speak?"'],
  ['54:47', 'madness.'],
  ['79:25', '[transgression].'],
  ['114:6', 'mankind."'],
]);
const artifactRefs = [];
for (const surah of dataset.surahs) {
  for (const ayah of surah.ayahs) {
    if (ayah.english.endsWith('".') || /(^|[^.])\.\.$/.test(ayah.english)) {
      artifactRefs.push(`${surah.number}:${ayah.n}`);
    }
  }
}
check(artifactRefs.length === 0, `Terminal punctuation artifacts remain: ${artifactRefs.slice(0, 5).join(', ')}`);
for (const [key, ending] of punctuationFixes) {
  const [surah, ayah] = key.split(':').map(Number);
  check(verse(surah, ayah).english.endsWith(ending), `${key} does not end with ${JSON.stringify(ending)}`);
}

section('Verification report');
check(report.counts?.surahs === 114 && report.counts?.ayahs === TOTAL_AYAHS, 'Report counts mismatch');
check(report.bismillah === dataset.bismillah, 'Report basmala mismatch');
check(report.translationHtmlLeaks === 0, 'Report records HTML leaks');
check(report.crossSource?.comparedVerses === TOTAL_AYAHS, 'Report did not compare every verse');
check(report.crossSource?.wordLevelMismatches === 5, 'Report does not record exactly 5 known variants');
check(
  JSON.stringify(report.crossSource?.knownVariantRefs) === JSON.stringify(['2:181', '8:6', '12:39', '12:41', '13:37']),
  'Known variant references changed unexpectedly'
);
check(
  JSON.stringify(report.translationPunctuationNormalization?.refs) ===
    JSON.stringify(['18:4', '37:92', '54:47', '79:25', '114:6']),
  'Punctuation normalization references changed unexpectedly'
);
check(JSON.stringify(report.firstVerseSample?.['1:1']) === JSON.stringify(verse(1, 1)), 'Report 1:1 sample mismatch');
check(JSON.stringify(report.firstVerseSample?.['2:1']) === JSON.stringify(verse(2, 1)), 'Report 2:1 sample mismatch');
check(JSON.stringify(report.lastVerse?.['114:6']) === JSON.stringify(verse(114, 6)), 'Report 114:6 sample mismatch');
check(report.juzBoundaries?.length === 3, 'Report should sample the first three juz boundaries');
report.juzBoundaries?.forEach((juz, i) => {
  check(JSON.stringify(juz) === JSON.stringify(dataset.juzs[i]), `Report juz ${i + 1} mismatch`);
});

section('Collections and daily verses');
check(collections.length === 16, `Expected 16 collections, found ${collections.length}`);
const slugs = new Set();
const icons = new Set();
for (const collection of collections) {
  check(/^[a-z0-9-]+$/.test(collection.slug), `Invalid collection slug: ${collection.slug}`);
  check(!slugs.has(collection.slug), `Duplicate collection slug: ${collection.slug}`);
  slugs.add(collection.slug);
  check(typeof collection.title === 'string' && collection.title.length > 0, `${collection.slug}: missing title`);
  check(typeof collection.subtitle === 'string' && collection.subtitle.length > 0, `${collection.slug}: missing subtitle`);
  check(/^[a-z]+$/.test(collection.icon), `${collection.slug}: invalid icon key`);
  icons.add(collection.icon);
  check(Array.isArray(collection.refs) && collection.refs.length >= 3, `${collection.slug}: too few verses`);
  const seen = new Set();
  for (const [surah, ayah] of collection.refs) {
    const key = `${surah}:${ayah}`;
    check(Boolean(ref(surah, ayah)), `${collection.slug}: missing verse ${key}`);
    check(!seen.has(key), `${collection.slug}: duplicate verse ${key}`);
    seen.add(key);
  }
}
check(icons.size === 16, 'Collection icons are not unique');
check(dailyRefs.length >= 26, 'Too few daily verses');
const dailyKeys = new Set();
for (const { surah, ayah } of dailyRefs) {
  const key = `${surah}:${ayah}`;
  check(Boolean(ref(surah, ayah)), `Daily verse missing: ${key}`);
  check(!dailyKeys.has(key), `Duplicate daily verse: ${key}`);
  dailyKeys.add(key);
}

section('Search and navigation runtime');
check(normalizeArabic(bismillah) === 'بسم الله الرحمن الرحيم', 'Arabic normalization changed');
check(normalizeEnglish('Allāh, the Entirely Merciful!') === 'allah the entirely merciful', 'English normalization changed');
check(JSON.stringify(parseReference('2:255')) === JSON.stringify({ surah: 2, ayah: 255 }), 'Reference parsing failed');
check(JSON.stringify(parseReference('surah 2 ayah 255')) === JSON.stringify({ surah: 2, ayah: 255 }), 'Verbose reference parsing failed');
const referenceHit = searchVerses(index, '2:255');
check(referenceHit.length === 1 && referenceHit[0].s === 2 && referenceHit[0].a === 255, 'Reference search did not return 2:255');
check(searchVerses(index, '2:300').length === 0, 'Reference search accepted an out-of-range ayah');
check(searchVerses(index, '115:1').length === 0, 'Reference search accepted an invalid surah');
const englishHits = searchVerses(index, 'mercy', 20);
check(englishHits.length > 0, 'English search for "mercy" returned nothing');
check(englishHits.length <= 20, 'Search limit was not respected');
check(englishHits.every((hit) => hit.enNorm.includes('mercy')), 'English search returned a non-matching verse');
const arabicHits = searchVerses(index, 'الرحمن', 20);
check(arabicHits.length > 0, 'Arabic search for الرحمن returned nothing');
const musaHits = searchVerses(index, 'موسى', 20);
check(musaHits.length > 0, 'Arabic search for موسى returned nothing');
check(index.flat.every((verse) => verse.arNorm.length > 0 && verse.enNorm.length > 0), 'Index contains an empty normalized verse');

section('Audio and assets');
check(new Set(RECITERS.map((reciter) => reciter.id)).size === RECITERS.length, 'Duplicate reciter IDs');
check(RECITERS.length === 3, 'Expected three reciters');
for (const reciter of RECITERS) {
  check(/^[A-Za-z0-9_]+$/.test(reciter.dir), `Unsafe recitation directory: ${reciter.dir}`);
}
check(
  [1, 2, 114].every((surah) => /^https:\/\/everyayah\.com\/data\/Alafasy_128kbps\/\d{6}\.mp3$/.test(audioUrl('alafasy', surah, 1))),
  'EveryAyah URL pattern changed'
);

const pngDimensions = async (file) => {
  const buffer = await fs.readFile(path.join(root, file));
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') throw new Error(`${file}: not a PNG`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};
for (const [file, size] of [
  ['public/icons/icon-180.png', 180],
  ['public/icons/icon-192.png', 192],
  ['public/icons/icon-512.png', 512],
  ['public/icons/icon-maskable-512.png', 512],
]) {
  const dimensions = await pngDimensions(file);
  check(dimensions.width === size && dimensions.height === size, `${file}: expected ${size}×${size}, got ${dimensions.width}×${dimensions.height}`);
}
const favicon = await fs.readFile(path.join(root, 'public/favicon.svg'), 'utf8');
check(favicon.includes('<svg') && favicon.includes('aria-label="Scroll the Quran"'), 'favicon.svg is not the brand mark');

const datasetBytes = (await fs.stat(path.join(root, 'public/quran.json'))).size;
check(datasetBytes > 1_000_000, `Dataset is unexpectedly small (${datasetBytes} bytes)`);

section('Result');
console.log(`${totalAyahs.toLocaleString('en-US')} ayahs in ${dataset.surahs.length} surahs · ${collections.length} collections · ${dailyRefs.length} daily verses`);
console.log(`SHA-256 ${checksum}`);
console.log(`${checks} checks run`);
if (failures.length) {
  console.error(`\n${failures.length} check(s) failed:`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exitCode = 1;
} else {
  console.log('All checks passed.');
}
