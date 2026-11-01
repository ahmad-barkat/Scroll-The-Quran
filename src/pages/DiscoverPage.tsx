import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  BookOpenText,
  ChevronRight,
  Layers,
  Search,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Star } from '../components/Ornaments';
import { useApp } from '../context/AppContext';
import { collections, getDailyRef } from '../data/collections';
import { collectionIcon } from '../lib/collectionIcons';
import {
  TOTAL_AYAHS,
  formatNumber,
  getJuz,
  hijriDate,
  refToGlobal,
} from '../lib/quran';
import { usePageTitle } from '../lib/usePageTitle';

export function DiscoverPage() {
  usePageTitle('Discover — Scroll the Quran');

  const {
    dataset,
    index,
    bookmarks,
    isBookmarked,
    toggleBookmark,
    toast,
    lastRead,
    visitedCount,
    streak,
    setSurahDrawerOpen,
  } = useApp();

  if (!dataset || !index) return null;

  const daily = getDailyRef();
  const dailySurah = dataset.surahs[daily.surah - 1];
  const dailyAyah = dailySurah.ayahs[daily.ayah - 1];
  const dailyJuz = getJuz(index, refToGlobal(index, daily));
  const dailySaved = isBookmarked(daily);

  const lastSurah = dataset.surahs[lastRead.surah - 1];
  const lastAyah = lastSurah.ayahs[lastRead.ayah - 1];
  const percent = Math.min(100, (visitedCount / TOTAL_AYAHS) * 100);

  const handleSaveDaily = () => {
    const added = toggleBookmark(daily);
    toast(added ? 'Verse of the day saved.' : 'Removed from bookmarks.');
  };

  return (
    <div className="page discover-page">
      <PageHeader
        kicker={`${hijriDate()} · 6,236 ayahs`}
        title="Read, reflect, return."
        subtitle="A quiet place for the Quran — one ayah at a time, with verified Uthmani text, Saheeh International translation, and recitation."
      />

      <section className="discover-layout" aria-label="Today">
        <article className="daily-card glass">
          <div className="daily-top">
            <span className="daily-badge">
              <Star size={12} /> Verse of the day
            </span>
            <span className="daily-date">{hijriDate()}</span>
          </div>

          <p className="daily-arabic" lang="ar" dir="rtl">
            {dailyAyah.arabic}
          </p>
          <p className="daily-translation" lang="en">
            {dailyAyah.english}
          </p>

          <div className="daily-foot">
            <div className="daily-ref">
              <span>
                {dailySurah.nameSimple} · {daily.surah}:{daily.ayah}
              </span>
              <span>Juz {dailyJuz}</span>
            </div>
            <div className="daily-actions">
              <Link className="btn btn-gold" to={`/read/${daily.surah}/${daily.ayah}`}>
                Read in context <ArrowRight size={15} />
              </Link>
              <button
                type="button"
                className={`icon-btn ${dailySaved ? 'is-saved' : ''}`}
                onClick={handleSaveDaily}
                aria-pressed={dailySaved}
                aria-label={dailySaved ? 'Remove verse of the day from bookmarks' : 'Save verse of the day'}
              >
                <Bookmark size={18} fill={dailySaved ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>
        </article>

        <div className="discover-side">
          <Link className="continue-card glass" to={`/read/${lastRead.surah}/${lastRead.ayah}`}>
            <span className="continue-icon">
              <BookOpenText size={19} />
            </span>
            <span className="continue-copy">
              <span className="eyebrow">
                {visitedCount > 0 ? 'Continue reading' : 'Begin reading'}
              </span>
              <span className="continue-title">
                {lastSurah.nameSimple} <span>{lastRead.surah}:{lastRead.ayah}</span>
              </span>
              <span className="continue-sub">
                {visitedCount > 0
                  ? lastAyah.english.slice(0, 88) + (lastAyah.english.length > 88 ? '…' : '')
                  : 'Start with the opening of the Book.'}
              </span>
            </span>
            <ArrowUpRight size={17} className="continue-arrow" />
          </Link>

          <div className="continue-progress" aria-label={`${Math.round(percent)} percent of the Quran visited`}>
            <span style={{ width: `${percent}%` }} />
          </div>

          <div className="stat-grid">
            <div className="stat-card glass">
              <span className="stat-value">{formatNumber(visitedCount)}</span>
              <span className="stat-label">Ayahs visited</span>
            </div>
            <div className="stat-card glass">
              <span className="stat-value">{streak}</span>
              <span className="stat-label">Day streak</span>
            </div>
            <div className="stat-card glass">
              <span className="stat-value">{formatNumber(bookmarks.length)}</span>
              <span className="stat-label">Saved verses</span>
            </div>
          </div>

          <button type="button" className="browse-card glass" onClick={() => setSurahDrawerOpen(true)}>
            <span className="browse-icon">
              <Layers size={17} />
            </span>
            <span>
              <strong>Browse all 114 surahs</strong>
              <small>Surah and juz index, with search</small>
            </span>
            <ChevronRight size={16} />
          </button>
        </div>
      </section>

      <section className="section" aria-labelledby="themes-title">
        <div className="section-head">
          <div>
            <p className="eyebrow">Curated collections</p>
            <h2 className="section-title" id="themes-title">
              Find a theme
            </h2>
          </div>
          <p className="section-sub">
            Verses gathered by subject. Every word is drawn directly from the verified text.
          </p>
        </div>

        <div className="collection-grid">
          {collections.map((collection) => {
            const Icon = collectionIcon(collection.icon);
            return (
              <Link
                key={collection.slug}
                className="collection-card glass"
                to={`/discover/${collection.slug}`}
              >
                <span className="collection-icon">
                  <Icon size={20} strokeWidth={1.6} />
                </span>
                <span className="collection-copy">
                  <span className="collection-title">{collection.title}</span>
                  <span className="collection-sub">{collection.subtitle}</span>
                </span>
                <span className="collection-count">
                  {collection.refs.length} {collection.refs.length === 1 ? 'ayah' : 'ayahs'}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section" aria-labelledby="ways-title">
        <div className="section-head">
          <div>
            <p className="eyebrow">Keep going</p>
            <h2 className="section-title" id="ways-title">
              Ways to read
            </h2>
          </div>
        </div>

        <div className="quick-grid">
          <Link className="quick-card glass" to="/search">
            <span className="quick-icon">
              <Search size={19} />
            </span>
            <span className="quick-copy">
              <span className="quick-title">Search every ayah</span>
              <span className="quick-sub">Arabic, English, or a reference like 2:255</span>
            </span>
            <ArrowRight size={15} />
          </Link>

          <button type="button" className="quick-card glass" onClick={() => setSurahDrawerOpen(true)}>
            <span className="quick-icon">
              <Layers size={19} />
            </span>
            <span className="quick-copy">
              <span className="quick-title">Jump to a surah or juz</span>
              <span className="quick-sub">The full index, 114 surahs and 30 juz</span>
            </span>
            <ArrowRight size={15} />
          </button>

          <Link className="quick-card glass" to="/saved">
            <span className="quick-icon">
              <Bookmark size={19} />
            </span>
            <span className="quick-copy">
              <span className="quick-title">Return to your saved verses</span>
              <span className="quick-sub">{bookmarks.length ? `${bookmarks.length} saved on this device` : 'Bookmarks live only on this device'}</span>
            </span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </div>
  );
}
