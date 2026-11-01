import type { Bookmark, QuranDataset, ReciterId, Ref, Settings, ThemeId } from './types';

export const TOTAL_AYAHS = 6236;

export const THEMES: { id: ThemeId; label: string; hint: string }[] = [
  { id: 'night', label: 'Night', hint: 'Midnight and gold' },
  { id: 'emerald', label: 'Emerald', hint: 'Deep green and brass' },
  { id: 'parchment', label: 'Parchment', hint: 'Warm paper and ink' },
  { id: 'dawn', label: 'Dawn', hint: 'Plum and rose gold' },
];

export const RECITERS: { id: ReciterId; name: string; note: string; dir: string }[] = [
  { id: 'alafasy', name: 'Mishary Rashid Alafasy', note: 'Murattal · 128 kbps', dir: 'Alafasy_128kbps' },
  { id: 'abdulbasit', name: 'Abdul Basit Abdus Samad', note: 'Murattal · 192 kbps', dir: 'Abdul_Basit_Murattal_192kbps' },
  { id: 'husary', name: 'Mahmoud Khalil Al-Husary', note: 'Murattal · 128 kbps', dir: 'Husary_128kbps' },
];

export const DEFAULT_SETTINGS: Settings = {
  theme: 'night',
  arabicScale: 1,
  showTranslation: true,
  reciter: 'alafasy',
  autoAdvance: true,
  autoScroll: false,
  autoScrollSeconds: 25,
};

const ARABIC_MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF\uFEFF]/g;

/**
 * Normalization used only for searching — never for display. It mirrors the
 * base-letter comparison used to verify the dataset against Tanzil.
 */
export function normalizeArabic(input: string): string {
  return input
    .replace(/[\u0654\u0655]/g, '\u0621')
    .replace(ARABIC_MARKS, '')
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
}

export function normalizeEnglish(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isArabicText(input: string): boolean {
  return /[\u0600-\u06FF]/.test(input);
}

export interface FlatVerse {
  s: number;
  a: number;
  global: number;
  arabic: string;
  english: string;
  arNorm: string;
  enNorm: string;
}

export interface QuranIndex {
  dataset: QuranDataset;
  offsets: number[];
  flat: FlatVerse[];
  juzByGlobal: number[];
}

export function buildIndex(dataset: QuranDataset): QuranIndex {
  const offsets: number[] = [];
  const flat: FlatVerse[] = [];
  let global = 0;
  for (const surah of dataset.surahs) {
    offsets[surah.number] = global;
    for (const ayah of surah.ayahs) {
      flat.push({
        s: surah.number,
        a: ayah.n,
        global,
        arabic: ayah.arabic,
        english: ayah.english,
        arNorm: normalizeArabic(ayah.arabic),
        enNorm: normalizeEnglish(ayah.english),
      });
      global += 1;
    }
  }

  const juzByGlobal: number[] = new Array(flat.length).fill(1);
  for (const juz of dataset.juzs) {
    const start = refToGlobalWithOffsets(offsets, juz.start);
    const end = refToGlobalWithOffsets(offsets, juz.end);
    for (let i = start; i <= end && i < flat.length; i++) juzByGlobal[i] = juz.number;
  }

  return { dataset, offsets, flat, juzByGlobal };
}

function refToGlobalWithOffsets(offsets: number[], ref: Ref): number {
  return offsets[ref.surah] + ref.ayah - 1;
}

export function refToGlobal(index: QuranIndex, ref: Ref): number {
  return refToGlobalWithOffsets(index.offsets, ref);
}

export function globalToRef(index: QuranIndex, global: number): Ref {
  const safe = Math.min(Math.max(global, 0), index.flat.length - 1);
  return { surah: index.flat[safe].s, ayah: index.flat[safe].a };
}

export function getAyah(index: QuranIndex, ref: Ref) {
  const surah = index.dataset.surahs[ref.surah - 1];
  return surah?.ayahs[ref.ayah - 1] ?? null;
}

export function getJuz(index: QuranIndex, global: number): number {
  return index.juzByGlobal[Math.min(Math.max(global, 0), index.juzByGlobal.length - 1)] ?? 1;
}

export function parseReference(input: string): Ref | null {
  const match = input
    .trim()
    .match(/^(?:surah\s*)?(\d{1,3})\s*(?:[:.·]\s*|\s+)(?:ayah\s*)?(\d{1,3})$/i);
  if (!match) return null;
  const surah = Number(match[1]);
  const ayah = Number(match[2]);
  if (!Number.isInteger(surah) || !Number.isInteger(ayah) || surah < 1 || ayah < 1) return null;
  return { surah, ayah };
}

export interface SearchHit {
  verse: FlatVerse;
  score: number;
}

export function searchVerses(index: QuranIndex, rawQuery: string, limit = 60): FlatVerse[] {
  const query = rawQuery.trim();
  if (!query) return [];

  const direct = parseReference(query);
  if (direct) {
    const surah = index.dataset.surahs[direct.surah - 1];
    if (!surah || direct.ayah > surah.versesCount) return [];
    return [index.flat[refToGlobal(index, direct)]];
  }

  const arabic = isArabicText(query);
  const normalized = arabic ? normalizeArabic(query) : normalizeEnglish(query);
  if (!normalized) return [];
  const tokens = normalized.split(' ').filter(Boolean);
  if (!tokens.length) return [];

  const hits: SearchHit[] = [];
  for (const verse of index.flat) {
    const haystack = arabic ? verse.arNorm : verse.enNorm;
    if (!haystack || !haystack.includes(tokens[0])) continue;
    let score = haystack.includes(normalized) ? 120 : 0;
    let matchedAll = true;
    for (const token of tokens) {
      const at = haystack.indexOf(token);
      if (at === -1) {
        matchedAll = false;
        break;
      }
      score += 6;
      if (at === 0) score += 4;
    }
    if (matchedAll) hits.push({ verse, score });
  }

  hits.sort((a, b) => b.score - a.score || a.verse.global - b.verse.global);
  return hits.slice(0, limit).map((hit) => hit.verse);
}

export function audioUrl(reciter: ReciterId, surah: number, ayah: number): string {
  const dir = RECITERS.find((item) => item.id === reciter)?.dir ?? RECITERS[0].dir;
  const pad = (n: number) => String(n).padStart(3, '0');
  return `https://everyayah.com/data/${dir}/${pad(surah)}${pad(ayah)}.mp3`;
}

export function bookmarkKey(ref: Ref): string {
  return `${ref.surah}:${ref.ayah}`;
}

export function sortBookmarks(bookmarks: Bookmark[]): Bookmark[] {
  return [...bookmarks].sort((a, b) => b.at - a.at);
}

export function arabicAdapt(text: string): number {
  const length = text.length;
  if (length <= 60) return 1.2;
  if (length <= 120) return 1.08;
  if (length <= 240) return 0.96;
  if (length <= 420) return 0.82;
  if (length <= 700) return 0.68;
  return 0.57;
}

export function translationAdapt(text: string): number {
  const length = text.length;
  if (length <= 120) return 1;
  if (length <= 260) return 0.94;
  if (length <= 500) return 0.86;
  return 0.78;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function localDayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function hijriDate(date = new Date()): string {
  try {
    const formatted = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
    return /AH|A\.H\./i.test(formatted) ? formatted : `${formatted} AH`;
  } catch {
    return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  }
}

export function streakFromDays(days: string[], now = new Date()): number {
  if (!days.length) return 0;
  const set = new Set(days);
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!set.has(localDayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(localDayKey(cursor))) return 0;
  }
  let streak = 0;
  while (set.has(localDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function dayOfYear(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}
