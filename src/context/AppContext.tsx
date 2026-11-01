import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { buildIndex, localDayKey, streakFromDays, DEFAULT_SETTINGS, type QuranIndex } from '../lib/quran';
import type { Bookmark, QuranDataset, ReciterId, Ref, Settings, ThemeId } from '../lib/types';
import { loadJSON, saveJSON } from '../lib/storage';

const THEME_COLORS: Record<ThemeId, string> = {
  night: '#070b14',
  emerald: '#06120f',
  parchment: '#f3ead8',
  dawn: '#1a0f16',
};

interface AppContextValue {
  dataset: QuranDataset | null;
  index: QuranIndex | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  setReciter: (reciter: ReciterId) => void;
  bookmarks: Bookmark[];
  toggleBookmark: (ref: Ref) => boolean;
  isBookmarked: (ref: Ref) => boolean;
  lastRead: Ref;
  setLastRead: (ref: Ref) => void;
  visited: Set<number>;
  markVisited: (global: number) => void;
  visitedCount: number;
  streak: number;
  days: string[];
  resetReading: () => void;
  toast: (message: string) => void;
  toastMessage: string | null;
  surahDrawerOpen: boolean;
  setSurahDrawerOpen: (open: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
  reciting: boolean;
  setReciting: (reciting: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function validateDataset(data: QuranDataset): string | null {
  if (!data || !Array.isArray(data.surahs)) return 'The Quran data could not be read.';
  if (data.surahs.length !== 114) return `Expected 114 surahs, found ${data.surahs.length}.`;
  const total = data.surahs.reduce((sum, surah) => sum + surah.ayahs.length, 0);
  if (total !== 6236) return `Expected 6,236 ayahs, found ${total}.`;
  for (const surah of data.surahs) {
    if (surah.ayahs.length !== surah.versesCount) return `Ayah count mismatch in surah ${surah.number}.`;
    if (surah.ayahs.some((ayah) => !ayah.arabic.trim() || !ayah.english.trim())) {
      return `An empty verse was found in surah ${surah.number}.`;
    }
  }
  return null;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [dataset, setDataset] = useState<QuranDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [settings, setSettings] = useState<Settings>(() => ({
    ...DEFAULT_SETTINGS,
    ...loadJSON<Partial<Settings>>('settings', {}),
  }));
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => loadJSON<Bookmark[]>('bookmarks', []));
  const [lastRead, setLastReadState] = useState<Ref>(() =>
    loadJSON<Ref>('lastRead', { surah: 1, ayah: 1 })
  );
  const [visited, setVisited] = useState<Set<number>>(
    () => new Set(loadJSON<number[]>('visited', []).filter((n) => Number.isInteger(n) && n >= 0 && n < 6236))
  );
  const [days, setDays] = useState<string[]>(() => loadJSON<string[]>('days', []));
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [surahDrawerOpen, setSurahDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [reciting, setReciting] = useState(false);

  const toastTimer = useRef<number | undefined>(undefined);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`${import.meta.env.BASE_URL}quran.json`, { cache: 'no-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<QuranDataset>;
      })
      .then((data) => {
        if (cancelled) return;
        const problem = validateDataset(data);
        if (problem) {
          setError(problem);
          return;
        }
        setDataset(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unable to load the Quran data.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const index = useMemo(() => (dataset ? buildIndex(dataset) : null), [dataset]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.style.setProperty('--user-arabic-scale', String(settings.arabicScale));
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', THEME_COLORS[settings.theme]);
  }, [settings.theme, settings.arabicScale]);

  useEffect(() => saveJSON('settings', settings), [settings]);
  useEffect(() => saveJSON('bookmarks', bookmarks), [bookmarks]);
  useEffect(() => saveJSON('lastRead', lastRead), [lastRead]);
  useEffect(() => saveJSON('visited', Array.from(visited).sort((a, b) => a - b)), [visited]);
  useEffect(() => saveJSON('days', days), [days]);

  useEffect(() => {
    if (!index) return;
    const surah = index.dataset.surahs[lastRead.surah - 1];
    if (!surah || lastRead.ayah > surah.versesCount) {
      setLastReadState({ surah: 1, ayah: 1 });
    }
  }, [index, lastRead]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const setReciter = useCallback((reciter: ReciterId) => {
    setSettings((prev) => ({ ...prev, reciter }));
  }, []);

  const isBookmarked = useCallback(
    (ref: Ref) => bookmarks.some((bookmark) => bookmark.surah === ref.surah && bookmark.ayah === ref.ayah),
    [bookmarks]
  );

  const toggleBookmark = useCallback(
    (ref: Ref) => {
      const exists = bookmarks.some((bookmark) => bookmark.surah === ref.surah && bookmark.ayah === ref.ayah);
      if (exists) {
        setBookmarks((prev) => prev.filter((bookmark) => !(bookmark.surah === ref.surah && bookmark.ayah === ref.ayah)));
        return false;
      }
      setBookmarks((prev) => [{ ...ref, at: Date.now() }, ...prev]);
      return true;
    },
    [bookmarks]
  );

  const setLastRead = useCallback((ref: Ref) => setLastReadState(ref), []);

  const markVisited = useCallback((global: number) => {
    setVisited((prev) => {
      if (prev.has(global)) return prev;
      const next = new Set(prev);
      next.add(global);
      return next;
    });
    const today = localDayKey();
    setDays((prev) => (prev.includes(today) ? prev : [...prev, today].slice(-400)));
  }, []);

  const resetReading = useCallback(() => {
    setVisited(new Set());
    setDays([]);
    setBookmarks([]);
    setLastReadState({ surah: 1, ayah: 1 });
  }, []);

  const toast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMessage(null), 2800);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    },
    []
  );

  const visitedCount = visited.size;
  const streak = useMemo(() => streakFromDays(days), [days]);

  const value = useMemo<AppContextValue>(
    () => ({
      dataset,
      index,
      loading,
      error,
      reload,
      settings,
      updateSettings,
      setReciter,
      bookmarks,
      toggleBookmark,
      isBookmarked,
      lastRead,
      setLastRead,
      visited,
      markVisited,
      visitedCount,
      streak,
      days,
      resetReading,
      toast,
      toastMessage,
      surahDrawerOpen,
      setSurahDrawerOpen,
      settingsOpen,
      setSettingsOpen,
      shortcutsOpen,
      setShortcutsOpen,
      reciting,
      setReciting,
    }),
    [
      dataset,
      index,
      loading,
      error,
      reload,
      settings,
      updateSettings,
      setReciter,
      bookmarks,
      toggleBookmark,
      isBookmarked,
      lastRead,
      setLastRead,
      visited,
      markVisited,
      visitedCount,
      streak,
      days,
      resetReading,
      toast,
      toastMessage,
      surahDrawerOpen,
      settingsOpen,
      shortcutsOpen,
      reciting,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
