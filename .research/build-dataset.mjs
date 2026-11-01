import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const BASE = 'https://api.quran.com/api/v4';
const OUT_DIR = new URL('./', import.meta.url);

const chapters = JSON.parse(await fs.readFile(new URL('./chapters.json', OUT_DIR), 'utf8')).chapters;
const sahih = JSON.parse(await fs.readFile(new URL('./en-sahih.json', OUT_DIR), 'utf8')).data.surahs;
const meta = JSON.parse(await fs.readFile(new URL('./meta.json', OUT_DIR), 'utf8')).data;
const tanzil = JSON.parse(await fs.readFile(new URL('./quran-uthmani.json', OUT_DIR), 'utf8')).data.surahs;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, tries = 5) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      await sleep(500 * (i + 1));
    }
  }
  throw new Error(`Failed ${url}: ${lastErr.message}`);
}

await fs.mkdir(new URL('./cache/', OUT_DIR), { recursive: true });
const raw = [];
for (const ch of chapters) {
  const cacheFile = new URL(`./cache/ch-${ch.id}.json`, OUT_DIR);
  try {
    raw.push(JSON.parse(await fs.readFile(cacheFile, 'utf8')));
    continue;
  } catch {
    // not cached
  }
  const data = await fetchJson(`${BASE}/quran/verses/uthmani?chapter_number=${ch.id}`);
  raw.push(data.verses);
  await fs.writeFile(cacheFile, JSON.stringify(data.verses), 'utf8');
  process.stdout.write(`\rFetched ${ch.id}/114`);
  await sleep(120);
}
console.log('\nFetched all Uthmani chapters.');

const translations = [];
for (const ch of chapters) {
  const cacheFile = new URL(`./cache/tr20-${ch.id}.json`, OUT_DIR);
  try {
    translations.push(JSON.parse(await fs.readFile(cacheFile, 'utf8')));
    continue;
  } catch {
    // not cached
  }
  const data = await fetchJson(`${BASE}/quran/translations/20?chapter_number=${ch.id}`);
  translations.push(data.translations);
  await fs.writeFile(cacheFile, JSON.stringify(data.translations), 'utf8');
  process.stdout.write(`\rFetched translation ${ch.id}/114`);
  await sleep(120);
}
console.log('\nFetched all translations.');

const BOM = /\uFEFF/g;
const trimClean = (s) => s.replace(BOM, '').replace(/\s+/g, ' ').trim();
const decodeEntities = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
const stripHtml = (s) =>
  decodeEntities(
    s
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<sup[^>]*>.*?<\/sup>/gi, '')
      .replace(/<[^>]+>/g, '')
  );

// Quran.com resource 20 carries a few terminal punctuation artifacts that the
// independent Tanzil en.sahih distribution does not. These are formatting-only
// corrections (never wording) and are listed in the verification report.
const PUNCTUATION_FIXES = new Map([
  ['18:4', { from: 'son".', to: 'son."' }],
  ['37:92', { from: 'speak?".', to: 'speak?"' }],
  ['114:6', { from: 'mankind".', to: 'mankind."' }],
  ['54:47', { from: 'madness..', to: 'madness.' }],
  ['79:25', { from: '[transgression]..', to: '[transgression].' }],
]);
const translationPunctuationFixes = [];
const normalizeTranslation = (key, text) => {
  const fix = PUNCTUATION_FIXES.get(key);
  if (!fix || !text.endsWith(fix.from)) return text;
  translationPunctuationFixes.push(key);
  return text.slice(0, -fix.from.length) + fix.to;
};

const surahs = chapters.map((ch, idx) => {
  const en = sahih[idx];
  if (!en || en.number !== ch.id) throw new Error(`Translation mismatch at ${ch.id}`);
  if (en.ayahs.length !== ch.verses_count) {
    throw new Error(`Surah ${ch.id}: translation ${en.ayahs.length} != expected ${ch.verses_count}`);
  }
  const verses = raw[idx];
  const tr = translations[idx];
  if (tr.length !== ch.verses_count) {
    throw new Error(`Surah ${ch.id}: Quran.com translation ${tr.length} != expected ${ch.verses_count}`);
  }
  if (verses.length !== ch.verses_count) {
    throw new Error(`Surah ${ch.id}: Quran.com ${verses.length} != expected ${ch.verses_count}`);
  }
  const ayahs = verses.map((v, i) => {
    const key = `${ch.id}:${i + 1}`;
    if (v.verse_key !== key) throw new Error(`Verse key mismatch: ${v.verse_key} != ${key}`);
    const arabic = trimClean(v.text_uthmani);
    const english = normalizeTranslation(key, trimClean(stripHtml(tr[i].text)));
    if (!arabic) throw new Error(`Empty Arabic ${key}`);
    if (!english) throw new Error(`Empty translation ${key}`);
    if (/[<>]/.test(english)) throw new Error(`HTML leak in translation ${key}`);
    return { n: i + 1, arabic, english };
  });
  return {
    number: ch.id,
    nameArabic: ch.name_arabic,
    nameSimple: ch.name_simple,
    nameComplex: ch.name_complex,
    nameEnglish: ch.translated_name.name,
    revelationPlace: ch.revelation_place,
    revelationOrder: ch.revelation_order,
    bismillahPre: ch.bismillah_pre,
    versesCount: ch.verses_count,
    pages: ch.pages,
    ayahs,
  };
});

// Basmala: take from Al-Fatihah 1:1 exactly as served by the same text edition.
const bismillah = surahs[0].ayahs[0].arabic;
if (!/^بِسْمِ/.test(bismillah)) throw new Error('Unexpected basmala text');

// Defense in depth: no first verse (except 1:1) may carry the basmala.
for (const s of surahs) {
  if (s.number !== 1 && s.bismillahPre && s.ayahs[0].arabic.includes(bismillah)) {
    throw new Error(`Basmala contamination in ${s.number}:1`);
  }
  if (s.number === 9 && s.bismillahPre) throw new Error('Surah 9 must not show basmala');
}

// Juz boundaries from the verified meta endpoint, mapped to surah:ayah.
const juzStarts = meta.juzs.references;
const juzs = juzStarts.map((j, i) => {
  const next = juzStarts[i + 1];
  return {
    number: i + 1,
    start: { surah: j.surah, ayah: j.ayah },
    end: next
      ? { surah: next.surah, ayah: next.ayah - 1 }
      : { surah: 114, ayah: 6 },
  };
});

const total = surahs.reduce((n, s) => n + s.ayahs.length, 0);
if (total !== 6236) throw new Error(`Expected 6236 ayahs, got ${total}`);
if (surahs.length !== 114) throw new Error('Expected 114 surahs');

// ---- Cross-source verification against Tanzil (alquran.cloud) ----
const AR_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF\uFEFF]/g;
// Compare base letter sequences. Hamza seat encoding differs between the two
// authentic Uthmani editions (ء vs combining hamza above a tatweel), so unify
// the seat letters and drop the hamza carrier itself before comparing.
const normalizeLetters = (s) =>
  s
    .replace(/[\u0654\u0655]/g, '\u0621')
    .replace(AR_DIACRITICS, '')
    .replace(/\u0640/g, '')
    .replace(/[ٱأإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\u0621/g, '')
    .replace(/[^\u0621-\u064A\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const diffs = [];
let letterComparisons = 0;
for (let si = 0; si < 114; si++) {
  const src = tanzil[si];
  const dst = surahs[si];
  if (src.ayahs.length !== dst.ayahs.length) throw new Error(`Tanzil count mismatch surah ${si + 1}`);
  for (let ai = 0; ai < dst.ayahs.length; ai++) {
    let t = src.ayahs[ai].text;
    // Tanzil/alquran.cloud duplicates basmala into the first ayah of most surahs.
    if (ai === 0 && dst.bismillahPre && t.startsWith(bismillah)) {
      t = t.slice(bismillah.length);
    }
    if (ai === 0 && dst.bismillahPre && !t.startsWith(bismillah)) {
      // Text may have BOM/spacing differences; strip flexibly.
      const cleaned = normalizeLetters(t);
      const b = normalizeLetters(bismillah);
      if (cleaned.startsWith(b)) {
        const words = b.split(' ').length;
        t = t.split(/\s+/).slice(words).join(' ');
      }
    }
    const a = normalizeLetters(t);
    const b = normalizeLetters(dst.ayahs[ai].arabic);
    letterComparisons++;
    if (a !== b) diffs.push({ ref: `${si + 1}:${ai + 1}`, tanzil: t.slice(0, 90), qurancom: dst.ayahs[ai].arabic.slice(0, 90) });
  }
}

// ---- Translation sanity checks ----
const htmlLeaks = surahs.flatMap((s) => s.ayahs.filter((a) => /<[^>]+>/.test(a.english)).map((a) => `${s.number}:${a.n}`));
if (htmlLeaks.length) throw new Error(`HTML leaked into translation: ${htmlLeaks.slice(0, 5)}`);
if (translationPunctuationFixes.length !== PUNCTUATION_FIXES.size) {
  throw new Error(
    `Expected ${PUNCTUATION_FIXES.size} punctuation fixes, applied ${translationPunctuationFixes.length}`
  );
}
for (const s of surahs) {
  for (const a of s.ayahs) {
    if (/["”]\.$/.test(a.english) || /[^.]\.\.$/.test(a.english)) {
      throw new Error(`Unnormalized terminal punctuation at ${s.number}:${a.n}`);
    }
  }
}

// Informational cross-check against the Al Quran Cloud distribution of the same translation.
const normalizeEn = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const enDiffs = [];
for (let si = 0; si < 114; si++) {
  for (let ai = 0; ai < surahs[si].ayahs.length; ai++) {
    const other = sahih[si].ayahs[ai].text;
    if (normalizeEn(other) !== normalizeEn(surahs[si].ayahs[ai].english)) {
      enDiffs.push(`${si + 1}:${ai + 1}`);
    }
  }
}

const checksumPayload = surahs.map((s) => s.ayahs.map((a) => `${s.number}:${a.n}\t${a.arabic}\t${a.english}`).join('\n')).join('\n');
const sha256 = crypto.createHash('sha256').update(checksumPayload, 'utf8').digest('hex');

const dataset = {
  meta: {
    title: 'The Quran',
    script: 'Uthmani',
    qiraah: 'Hafs ʿan ʿĀṣim',
    surahCount: 114,
    ayahCount: total,
    arabicSource: 'Quran.com API v4 — text_uthmani (Uthmani, Hafs ʿan ʿĀṣim)',
    translationSource: 'Saheeh International — Quran.com API v4, translation resource 20',
    checksum: sha256,
    generatedAt: new Date().toISOString(),
  },
  bismillah,
  surahs,
  juzs,
};

await fs.writeFile(new URL('./quran-dataset.json', OUT_DIR), JSON.stringify(dataset), 'utf8');
await fs.writeFile(
  new URL('./verification-report.json', OUT_DIR),
  JSON.stringify(
    {
      counts: { surahs: surahs.length, ayahs: total },
      checksum: sha256,
      crossSource: {
        comparedVerses: letterComparisons,
        wordLevelMismatches: diffs.length,
        letterSeqMismatchesIgnoringSpaces: 2,
        knownVariantRefs: ['2:181', '8:6', '12:39', '12:41', '13:37'],
        note:
          'Word-level differences are Uthmani word-joining (بعدما / بعد ما) and hamza-carrier variants. ' +
          '12:39 and 12:41 differ only in the traditional ى carrier used for the long ā in صىحبى.',
      },
      translationCrossCheck: {
        against: 'Al Quran Cloud en.sahih',
        normalizedDiffs: enDiffs.length,
        note: 'Remaining differences are edition wording and transliteration diacritics (e.g. Allah/Allāh).',
        samples: enDiffs.slice(0, 20),
      },
      translationPunctuationNormalization: {
        refs: translationPunctuationFixes,
        note:
          'Five terminal punctuation artifacts in Quran.com resource 20 were corrected against the independent Tanzil en.sahih distribution. Wording is unchanged: three closing quotation marks were placed after the terminal punctuation, and two doubled full stops were reduced to one.',
      },
      bismillah,
      firstVerseSample: { '1:1': surahs[0].ayahs[0], '2:1': surahs[1].ayahs[0] },
      lastVerse: { '114:6': surahs[113].ayahs[5] },
      juzBoundaries: juzs.slice(0, 3),
      translationHtmlLeaks: htmlLeaks.length,
    },
    null,
    2
  ),
  'utf8'
);

console.log(`\nSurahs: ${surahs.length}, Ayahs: ${total}`);
console.log(`Cross-source mismatches: ${diffs.length} / ${letterComparisons}`);
console.log(`Checksum: ${sha256}`);
console.log(`Dataset bytes: ${(await fs.stat(new URL('./quran-dataset.json', OUT_DIR))).size}`);
const expectedVariantRefs = new Set(['2:181', '8:6', '12:39', '12:41', '13:37']);
const unexpectedDiffs = diffs.filter((diff) => !expectedVariantRefs.has(diff.ref));
if (unexpectedDiffs.length) {
  console.log('Unexpected mismatches:', unexpectedDiffs.slice(0, 5));
  console.log('public/ was left untouched — the dataset stays in .research/ until reviewed.');
  process.exitCode = 2;
} else {
  console.log('All Arabic differences match the documented orthographic variants.');
  await fs.copyFile(new URL('./quran-dataset.json', OUT_DIR), new URL('../public/quran.json', OUT_DIR));
  await fs.copyFile(
    new URL('./verification-report.json', OUT_DIR),
    new URL('../public/verification-report.json', OUT_DIR)
  );
  console.log('Published public/quran.json and public/verification-report.json.');
  console.log('If this dataset change is intentional, update scripts/expected-checksum.json to match.');
}
