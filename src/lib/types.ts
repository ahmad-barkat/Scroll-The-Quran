export interface Ref {
  surah: number;
  ayah: number;
}

export interface Ayah {
  n: number;
  arabic: string;
  english: string;
}

export interface Surah {
  number: number;
  nameArabic: string;
  nameSimple: string;
  nameComplex: string;
  nameEnglish: string;
  revelationPlace: 'makkah' | 'madinah';
  revelationOrder: number;
  bismillahPre: boolean;
  versesCount: number;
  pages: [number, number];
  ayahs: Ayah[];
}

export interface Juz {
  number: number;
  start: Ref;
  end: Ref;
}

export interface QuranDataset {
  meta: {
    title: string;
    script: string;
    qiraah: string;
    surahCount: number;
    ayahCount: number;
    arabicSource: string;
    translationSource: string;
    checksum: string;
    generatedAt: string;
  };
  bismillah: string;
  surahs: Surah[];
  juzs: Juz[];
}

export type ThemeId = 'night' | 'emerald' | 'parchment' | 'dawn';
export type ReciterId = 'alafasy' | 'abdulbasit' | 'husary';

export interface Settings {
  theme: ThemeId;
  arabicScale: number;
  showTranslation: boolean;
  reciter: ReciterId;
  autoAdvance: boolean;
  autoScroll: boolean;
  autoScrollSeconds: number;
}

export interface Bookmark extends Ref {
  at: number;
}
