import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Loader2,
  Pause,
  Play,
  Repeat2,
  Settings2,
  Share2,
  X,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  TOTAL_AYAHS,
  arabicAdapt,
  audioUrl,
  getJuz,
  refToGlobal,
  translationAdapt,
  RECITERS,
  formatNumber,
} from '../lib/quran';
import { loadFlag, saveFlag } from '../lib/storage';
import { hasForeignModifier, isHelpShortcut } from '../lib/shortcuts';
import { copyText } from '../lib/clipboard';
import { verseText } from '../lib/shareFiles';
import type { QuranIndex } from '../lib/quran';
import { Ornament, Star } from '../components/Ornaments';
import { ShareSheet } from '../components/ShareSheet';

type AudioStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function ReadPage() {
  const { index } = useApp();
  if (!index) return null;
  return <Reader index={index} />;
}

function Reader({ index }: { index: QuranIndex }) {
  const {
    settings,
    updateSettings,
    lastRead,
    setLastRead,
    markVisited,
    toggleBookmark,
    isBookmarked,
    toast,
    setSurahDrawerOpen,
    setSettingsOpen,
    setShortcutsOpen,
    setReciting,
    surahDrawerOpen,
    settingsOpen,
    shortcutsOpen,
  } = useApp();
  const navigate = useNavigate();
  const { surah: surahParam, ayah: ayahParam } = useParams();
  const reduceMotion = useReducedMotion();

  const parsedSurah = Number(surahParam);
  const parsedAyah = Number(ayahParam);
  const hasParams =
    Boolean(surahParam && ayahParam) && Number.isInteger(parsedSurah) && Number.isInteger(parsedAyah);

  const canonicalSurah = hasParams
    ? Math.min(Math.max(parsedSurah, 1), 114)
    : Math.min(Math.max(lastRead.surah, 1), 114);
  const surah = index.dataset.surahs[canonicalSurah - 1];
  const canonicalAyah = hasParams
    ? Math.min(Math.max(parsedAyah, 1), surah.versesCount)
    : Math.min(Math.max(lastRead.ayah, 1), surah.versesCount);
  const ayah = surah.ayahs[canonicalAyah - 1];
  const global = refToGlobal(index, { surah: canonicalSurah, ayah: canonicalAyah });
  const juz = getJuz(index, global);
  const hasPrev = global > 0;
  const hasNext = global < TOTAL_AYAHS - 1;
  const isFirst = ayah.n === 1;
  const showBismillah = isFirst && surah.bismillahPre;
  const place = surah.revelationPlace === 'makkah' ? 'Makkan' : 'Medinan';
  const currentUrl = audioUrl(settings.reciter, surah.number, ayah.n);
  const reciter = RECITERS.find((item) => item.id === settings.reciter) ?? RECITERS[0];

  const [direction, setDirection] = useState(1);
  const [showHint, setShowHint] = useState(() => !loadFlag('hintSeen'));
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeat, setRepeat] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingAutoplay = useRef(false);
  const repeatRef = useRef(repeat);
  const autoAdvanceRef = useRef(settings.autoAdvance);
  const toastRef = useRef(toast);
  const goNextRef = useRef<(autoplay?: boolean) => void>(() => {});
  const touchStartRef = useRef<{ y: number; atTop: boolean; atBottom: boolean } | null>(null);
  const lockNotified = useRef(false);

  repeatRef.current = repeat;
  autoAdvanceRef.current = settings.autoAdvance;
  toastRef.current = toast;

  useEffect(() => {
    if (!hasParams) {
      navigate(`/read/${lastRead.surah}/${lastRead.ayah}`, { replace: true });
      return;
    }
    if (surahParam !== String(canonicalSurah) || ayahParam !== String(canonicalAyah)) {
      navigate(`/read/${canonicalSurah}/${canonicalAyah}`, { replace: true });
    }
  }, [hasParams, surahParam, ayahParam, canonicalSurah, canonicalAyah, lastRead.surah, lastRead.ayah, navigate]);

  const goToGlobal = useCallback(
    (target: number, nextDirection: 1 | -1, autoplay = false) => {
      if (target < 0 || target >= TOTAL_AYAHS) return;
      const next = index.flat[target];
      pendingAutoplay.current = autoplay;
      setDirection(nextDirection);
      setShowHint(false);
      saveFlag('hintSeen', true);
      navigate(`/read/${next.s}/${next.a}`);
    },
    [index, navigate]
  );

  const goNext = useCallback(
    (autoplay = false) => goToGlobal(global + 1, 1, autoplay),
    [global, goToGlobal]
  );
  const goPrev = useCallback(() => goToGlobal(global - 1, -1, false), [global, goToGlobal]);
  goNextRef.current = goNext;

  useEffect(() => {
    markVisited(global);
    setLastRead({ surah: surah.number, ayah: ayah.n });
  }, [global, markVisited, setLastRead, surah.number, ayah.n]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    setShareOpen(false);
    document.title = `${surah.nameSimple} · ${surah.number}:${ayah.n} — Scroll the Quran`;
    return () => {
      document.title = 'Scroll the Quran — The Quran, one ayah at a time';
    };
  }, [global, surah.nameSimple, surah.number, ayah.n]);

  useEffect(() => {
    if (!showHint) return;
    const timer = window.setTimeout(() => {
      setShowHint(false);
      saveFlag('hintSeen', true);
    }, 9000);
    return () => window.clearTimeout(timer);
  }, [showHint]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const onTime = () => setElapsed(audio.currentTime || 0);
    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlaying = () => {
      setAudioStatus('playing');
      onMeta();
    };
    const onPause = () =>
      setAudioStatus((prev) => (prev === 'playing' || prev === 'loading' ? 'paused' : prev));
    const onWaiting = () => setAudioStatus((prev) => (prev === 'playing' ? 'loading' : prev));
    const onEnded = () => {
      setElapsed(0);
      if (repeatRef.current) {
        try {
          audio.currentTime = 0;
          void audio.play();
        } catch {
          setAudioStatus('paused');
        }
        return;
      }
      setAudioStatus('idle');
      if (autoAdvanceRef.current) goNextRef.current(true);
    };
    const onError = () => {
      setAudioStatus('error');
      toastRef.current('Recitation unavailable. Check your connection and try again.');
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('durationchange', onMeta);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('durationchange', onMeta);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    audio.dataset.url = '';
    setElapsed(0);
    setDuration(0);
    setAudioStatus('idle');

    if (pendingAutoplay.current) {
      pendingAutoplay.current = false;
      audio.src = currentUrl;
      audio.dataset.url = currentUrl;
      setAudioStatus('loading');
      audio
        .play()
        .then(() => setAudioStatus('playing'))
        .catch(() => {
          setAudioStatus('error');
          toast('Recitation could not start. Check your connection and try again.');
        });
    }
  }, [currentUrl, toast]);

  useEffect(() => {
    const live = audioStatus === 'playing' || audioStatus === 'loading';
    setReciting(live);
    if (!live) lockNotified.current = false;
  }, [audioStatus, setReciting]);

  const toggleAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audioStatus === 'playing' || audioStatus === 'loading') {
      audio.pause();
      setAudioStatus('paused');
      return;
    }
    if (audio.dataset.url !== currentUrl) {
      audio.src = currentUrl;
      audio.dataset.url = currentUrl;
    }
    if (audio.ended) audio.currentTime = 0;
    setAudioStatus('loading');
    audio
      .play()
      .then(() => setAudioStatus('playing'))
      .catch(() => {
        setAudioStatus('error');
        toast('Recitation could not play. Check your connection and try again.');
      });
  }, [audioStatus, currentUrl, toast]);

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    audio.dataset.url = '';
    setAudioStatus('idle');
    setElapsed(0);
    setDuration(0);
  }, []);

  const seekAudio = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio || !duration) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
      audio.currentTime = ratio * duration;
      setElapsed(ratio * duration);
    },
    [duration]
  );

  const dismissHint = useCallback(() => {
    setShowHint(false);
    saveFlag('hintSeen', true);
  }, []);

  const handleBookmark = useCallback(() => {
    const added = toggleBookmark({ surah: surah.number, ayah: ayah.n });
    toast(added ? 'Saved to bookmarks.' : 'Removed from bookmarks.');
  }, [ayah.n, surah.number, toast, toggleBookmark]);

  const handleCopy = useCallback(async () => {
    const ok = await copyText(verseText(surah, ayah));
    setCopied(ok);
    toast(ok ? 'Ayah copied with reference.' : 'Could not copy on this browser.');
    if (ok) window.setTimeout(() => setCopied(false), 1800);
  }, [ayah, surah, toast]);

  const handleShare = useCallback(() => setShareOpen(true), []);

  // A pointer tap must not leave focus on the control, or Space stops navigating.
  const blurOnTap = (event: ReactMouseEvent<HTMLElement>) => {
    if (event.detail > 0) event.currentTarget.blur();
  };
  const tap = (fn: () => void) => (event: ReactMouseEvent<HTMLElement>) => {
    blurOnTap(event);
    fn();
  };

  useEffect(() => {
    if (!settings.autoScroll || audioStatus === 'playing' || audioStatus === 'loading' || !hasNext) return;
    const timer = window.setInterval(() => goNextRef.current(false), settings.autoScrollSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [settings.autoScroll, settings.autoScrollSeconds, audioStatus, hasNext, global]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let accumulated = 0;
    let lastNavigation = 0;

    const onWheel = (event: WheelEvent) => {
      if (surahDrawerOpen || settingsOpen || shareOpen) return;
      const scroller = scrollRef.current;
      const down = event.deltaY > 0;
      if (scroller) {
        const canScrollDown = scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 2;
        const canScrollUp = scroller.scrollTop > 2;
        if ((down && canScrollDown) || (!down && canScrollUp)) return;
      }
      if (Math.abs(event.deltaY) < 1) return;
      event.preventDefault();
      const now = performance.now();
      if (now - lastNavigation < 450) {
        accumulated = 0;
        return;
      }
      accumulated += event.deltaY;
      if (Math.abs(accumulated) < 28) return;
      const dir = accumulated > 0 ? 1 : -1;
      accumulated = 0;
      lastNavigation = now;
      if (dir > 0) goNext();
      else goPrev();
    };

    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [goNext, goPrev, settingsOpen, shareOpen, surahDrawerOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;

      const key = event.key;

      if (isHelpShortcut(event)) {
        event.preventDefault();
        setShortcutsOpen(!shortcutsOpen);
        return;
      }

      // Ctrl/Cmd/Alt combinations stay the browser's — Ctrl+C, Ctrl+S, Ctrl+T.
      if (hasForeignModifier(event)) return;

      if (surahDrawerOpen || settingsOpen || shareOpen || shortcutsOpen) return;

      const isReciting = audioStatus === 'playing' || audioStatus === 'loading';
      if (isReciting && key !== 'p' && key !== 'P') {
        event.preventDefault();
        if (!lockNotified.current) {
          lockNotified.current = true;
          toast('Shortcuts are paused while the ayah plays — press P to pause the recitation.');
        }
        return;
      }

      if (key === 'ArrowDown' || key === 'PageDown' || key === 'j' || key === 'J') {
        event.preventDefault();
        goNext();
      } else if (key === 'ArrowUp' || key === 'PageUp' || key === 'k' || key === 'K') {
        event.preventDefault();
        goPrev();
      } else if (key === ' ') {
        // Space belongs to whichever control has focus; do not steal it twice.
        if (tag === 'BUTTON' || tag === 'A') return;
        event.preventDefault();
        goNext();
      } else if (key === 'b' || key === 'B') {
        handleBookmark();
      } else if (key === 'p' || key === 'P') {
        toggleAudio();
      } else if (key === 's' || key === 'S') {
        handleShare();
      } else if (key === 'c' || key === 'C') {
        void handleCopy();
      } else if (key === 't' || key === 'T') {
        updateSettings({ showTranslation: !settings.showTranslation });
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    audioStatus,
    goNext,
    goPrev,
    handleBookmark,
    handleCopy,
    handleShare,
    settings.showTranslation,
    setShortcutsOpen,
    settingsOpen,
    shareOpen,
    shortcutsOpen,
    surahDrawerOpen,
    toast,
    toggleAudio,
    updateSettings,
  ]);

  const onTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) return;
    const scroller = scrollRef.current;
    touchStartRef.current = {
      y: event.touches[0].clientY,
      atTop: !scroller || scroller.scrollTop <= 2,
      atBottom:
        !scroller || scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2,
    };
  };

  const onTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const delta = start.y - touch.clientY;
    if (Math.abs(delta) < 55) return;
    if (delta > 0 && start.atBottom) goNext();
    else if (delta < 0 && start.atTop) goPrev();
  };

  const bookmarked = isBookmarked({ surah: surah.number, ayah: ayah.n });
  const withinSurah = (ayah.n / surah.versesCount) * 100;
  const overall = ((global + 1) / TOTAL_AYAHS) * 100;
  const audioVisible = audioStatus !== 'idle';
  const audioPercent = duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0;
  const bodyStyle = {
    '--adapt': arabicAdapt(ayah.arabic),
    '--trans-adapt': translationAdapt(ayah.english),
  } as CSSProperties;

  const variants = {
    enter: (dir: number) => ({ opacity: 0, y: reduceMotion ? 0 : dir > 0 ? 42 : -42 }),
    center: { opacity: 1, y: 0 },
    exit: (dir: number) => ({ opacity: 0, y: reduceMotion ? 0 : dir > 0 ? -24 : 24 }),
  };

  return (
    <div
      className="reader-page"
      ref={stageRef}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="global-line" aria-hidden="true">
        <span style={{ width: `${overall}%` }} />
      </div>

      <header className="reader-top">
        <button
          type="button"
          className="reader-surah-btn"
          onClick={tap(() => setSurahDrawerOpen(true))}
          aria-label="Choose a surah or juz"
          data-testid="surah-button"
        >
          <span className="reader-surah-index">{surah.number}</span>
          <span className="reader-surah-names">
            <span className="reader-surah-ar" lang="ar" dir="rtl">
              {surah.nameArabic}
            </span>
            <span className="reader-surah-meta">
              {surah.nameSimple} · {place}
            </span>
          </span>
        </button>

        <div className="reader-progress" aria-hidden="true">
          <div className="reader-progress-row">
            <span>
              Ayah {ayah.n} / {formatNumber(surah.versesCount)}
            </span>
            <span>Juz {juz}</span>
          </div>
          <div className="progress-track">
            <span style={{ width: `${withinSurah}%` }} />
          </div>
        </div>

        <button
          type="button"
          className="icon-btn"
          onClick={tap(() => setSettingsOpen(true))}
          aria-label="Reading settings"
          data-testid="settings-button"
        >
          <Settings2 size={18} />
        </button>
      </header>

      {settings.autoScroll && (
        <button
          type="button"
          className="auto-chip glass"
          onClick={tap(() => updateSettings({ autoScroll: false }))}
          data-testid="auto-chip"
        >
          <span className="auto-dot" /> Auto-scroll · {settings.autoScrollSeconds}s
        </button>
      )}

      <div className={`reader-stage ${audioVisible ? 'has-audio' : ''}`}>
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.article
            key={`${surah.number}:${ayah.n}`}
            className="ayah-card"
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduceMotion ? 0.01 : 0.36, ease: [0.22, 1, 0.36, 1] }}
            aria-label={`Surah ${surah.nameSimple}, ayah ${ayah.n}`}
          >
            <div className="ayah-scroll" ref={scrollRef}>
              {isFirst && (
                <header className="surah-intro">
                  <p className="eyebrow">
                    Surah {surah.number} · {place}
                  </p>
                  <h1 className="surah-intro-ar" lang="ar" dir="rtl">
                    {surah.nameArabic}
                  </h1>
                  <p className="surah-intro-en">
                    {surah.nameSimple} <span>· {surah.nameEnglish}</span>
                  </p>
                  <div className="surah-intro-meta">
                    <span>{formatNumber(surah.versesCount)} ayahs</span>
                    <span>Juz {juz}</span>
                    <span>
                      Pages {surah.pages[0]}–{surah.pages[1]}
                    </span>
                  </div>
                  <Ornament className="surah-ornament" />
                </header>
              )}

              {showBismillah && (
                <p className="bismillah" lang="ar" dir="rtl">
                  {index.dataset.bismillah}
                </p>
              )}

              <div className="ayah-body" style={bodyStyle}>
                <p className="ayah-arabic" lang="ar" dir="rtl">
                  {ayah.arabic}
                </p>

                {settings.showTranslation && (
                  <>
                    <Ornament className="ayah-ornament" />
                    <p className="ayah-translation" lang="en">
                      {ayah.english}
                    </p>
                    <p className="translation-credit">Saheeh International</p>
                  </>
                )}
              </div>

              <footer className="ayah-meta">
                <span>
                  {surah.nameSimple} · {surah.number}:{ayah.n}
                </span>
                <span className="ayah-meta-dot" aria-hidden="true">
                  <Star size={9} />
                </span>
                <span>Juz {juz}</span>
                <span className="ayah-meta-dot" aria-hidden="true">
                  <Star size={9} />
                </span>
                <span>{formatNumber(global + 1)} of {formatNumber(TOTAL_AYAHS)}</span>
              </footer>
            </div>
          </motion.article>
        </AnimatePresence>

        <aside className="action-rail" aria-label="Ayah actions">
          <button
            type="button"
            className={`rail-btn is-primary ${audioStatus === 'playing' ? 'is-playing' : ''}`}
            onClick={tap(toggleAudio)}
            aria-label={audioStatus === 'playing' ? 'Pause recitation' : 'Play recitation'}
            aria-keyshortcuts="P"
            data-tip={audioStatus === 'playing' ? 'Pause · P' : 'Listen · P'}
            data-testid="audio-toggle"
          >
            {audioStatus === 'loading' ? (
              <Loader2 size={20} className="spin" />
            ) : audioStatus === 'playing' ? (
              <Pause size={19} />
            ) : (
              <Play size={19} className="play-nudge" />
            )}
          </button>
          <button
            type="button"
            className={`rail-btn ${bookmarked ? 'is-saved' : ''}`}
            onClick={tap(handleBookmark)}
            aria-label={bookmarked ? 'Remove bookmark' : 'Save ayah'}
            aria-pressed={bookmarked}
            aria-keyshortcuts="B"
            data-tip={bookmarked ? 'Saved · B' : 'Save · B'}
            data-testid="bookmark-toggle"
          >
            <Bookmark size={19} fill={bookmarked ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            className="rail-btn"
            onClick={tap(handleShare)}
            aria-label="Share ayah"
            aria-keyshortcuts="S"
            data-tip="Share · S"
            data-testid="share-button"
          >
            <Share2 size={19} />
          </button>
          <button
            type="button"
            className={`rail-btn ${copied ? 'is-saved' : ''}`}
            onClick={tap(() => void handleCopy())}
            aria-label="Copy ayah with reference"
            aria-keyshortcuts="C"
            data-tip={copied ? 'Copied · C' : 'Copy · C'}
            data-testid="copy-button"
          >
            {copied ? <Check size={19} /> : <Copy size={19} />}
          </button>
          <a
            className="rail-btn"
            href={`https://quran.com/${surah.number}/${ayah.n}`}
            target="_blank"
            rel="noreferrer"
            aria-label="Read tafsir on Quran.com"
            data-tip="Tafsir"
            onClick={blurOnTap}
          >
            <ExternalLink size={19} />
          </a>
        </aside>

        <div className="reader-bottom-stack">
          {showHint && audioStatus === 'idle' && (
            <button type="button" className="swipe-hint glass" onClick={tap(dismissHint)} data-testid="swipe-hint">
              <ChevronUp size={14} className="hint-chevron" />
              <span>Swipe or scroll for the next ayah</span>
            </button>
          )}

          {audioVisible && (
            <div className="audio-dock glass" role="group" aria-label="Recitation player">
              <button
                type="button"
                className="audio-main"
                onClick={tap(toggleAudio)}
                aria-label={audioStatus === 'playing' ? 'Pause recitation' : 'Play recitation'}
                aria-keyshortcuts="P"
              >
                {audioStatus === 'loading' ? (
                  <Loader2 size={16} className="spin" />
                ) : audioStatus === 'playing' ? (
                  <Pause size={16} />
                ) : (
                  <Play size={16} />
                )}
              </button>
              <div className="audio-body">
                <div className="audio-line">
                  <span>{audioStatus === 'error' ? 'Recitation unavailable' : reciter.name}</span>
                  <span>
                    {formatTime(elapsed)} / {formatTime(duration)}
                  </span>
                </div>
                <div
                  className="audio-progress"
                  onClick={seekAudio}
                  role="presentation"
                  title="Seek"
                >
                  <span style={{ width: `${audioPercent}%` }} />
                </div>
              </div>
              <button
                type="button"
                className={`audio-mini ${repeat ? 'is-on' : ''}`}
                onClick={tap(() => setRepeat((value) => !value))}
                aria-label={repeat ? 'Repeat off' : 'Repeat ayah'}
                aria-pressed={repeat}
                data-testid="audio-repeat"
              >
                <Repeat2 size={15} />
              </button>
              <button type="button" className="audio-mini" onClick={tap(stopAudio)} aria-label="Stop recitation" data-testid="audio-stop">
                <X size={15} />
              </button>
            </div>
          )}

          <div className="verse-stepper glass">
            <button
              type="button"
              className="stepper-btn"
              onClick={tap(goPrev)}
              disabled={!hasPrev}
              aria-label="Previous ayah"
              aria-keyshortcuts="ArrowUp"
              data-testid="prev-ayah"
            >
              <ChevronUp size={18} />
            </button>
            <div className="stepper-count">
              <span className="stepper-main">
                {ayah.n}
                <span className="stepper-total"> / {formatNumber(surah.versesCount)}</span>
              </span>
              <span className="stepper-sub">
                {hasNext ? 'Swipe up for next' : 'End of the Quran'}
              </span>
            </div>
            <button
              type="button"
              className="stepper-btn"
              onClick={tap(goNext)}
              disabled={!hasNext}
              aria-label="Next ayah"
              aria-keyshortcuts="ArrowDown"
              data-testid="next-ayah"
            >
              <ChevronDown size={18} />
            </button>
          </div>
        </div>
      </div>

      <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} surah={surah} ayah={ayah} />
    </div>
  );
}
