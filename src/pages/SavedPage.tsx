import { ArrowRight, Bookmark, CalendarDays, Compass, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { VerseCard } from '../components/VerseCard';
import { useApp } from '../context/AppContext';
import { TOTAL_AYAHS, formatNumber, sortBookmarks } from '../lib/quran';
import { usePageTitle } from '../lib/usePageTitle';

export function SavedPage() {
  usePageTitle('Saved — Scroll the Quran');

  const { dataset, bookmarks, lastRead, visitedCount, streak, days } = useApp();

  if (!dataset) return null;

  const saved = sortBookmarks(bookmarks);
  const lastSurah = dataset.surahs[lastRead.surah - 1];
  const percent = Math.min(100, (visitedCount / TOTAL_AYAHS) * 100);

  return (
    <div className="page saved-page">
      <PageHeader
        kicker="Your library"
        title="Saved verses"
        subtitle="Bookmarks, reading progress, and your streak are stored only in this browser. Nothing is sent to a server."
      />

      <section className="saved-summary glass">
        <div className="saved-progress-head">
          <div>
            <p className="eyebrow">Quran visited</p>
            <p className="saved-progress-value">
              {formatNumber(visitedCount)} <span>of {formatNumber(TOTAL_AYAHS)} ayahs</span>
            </p>
          </div>
          <span className="saved-percent">{Math.round(percent * 10) / 10}%</span>
        </div>

        <div className="progress-track progress-track-lg">
          <span style={{ width: `${percent}%` }} />
        </div>

        <div className="saved-stats">
          <span>
            <Flame size={15} /> {streak} day streak
          </span>
          <span>
            <CalendarDays size={15} /> {days.length} reading {days.length === 1 ? 'day' : 'days'}
          </span>
          <span>
            <Bookmark size={15} /> {bookmarks.length} saved
          </span>
        </div>

        <div className="saved-summary-actions">
          <Link className="btn btn-soft" to={`/read/${lastRead.surah}/${lastRead.ayah}`}>
            Continue {lastSurah.nameSimple} {lastRead.surah}:{lastRead.ayah} <ArrowRight size={14} />
          </Link>
          <Link className="btn btn-ghost" to="/discover">
            Find a theme
          </Link>
        </div>
      </section>

      {saved.length > 0 ? (
        <section className="saved-list-section" aria-labelledby="saved-list-title">
          <div className="section-head">
            <div>
              <p className="eyebrow">Keep close</p>
              <h2 className="section-title" id="saved-list-title">
                Your bookmarks
              </h2>
            </div>
            <p className="section-sub">Most recently saved first.</p>
          </div>

          <div className="verse-list">
            {saved.map((bookmark) => {
              const surah = dataset.surahs[bookmark.surah - 1];
              const ayah = surah.ayahs[bookmark.ayah - 1];
              return <VerseCard key={`${bookmark.surah}:${bookmark.ayah}`} surah={surah} ayah={ayah} />;
            })}
          </div>
        </section>
      ) : (
        <section className="empty-state glass saved-empty">
          <span className="empty-icon">
            <Bookmark size={24} />
          </span>
          <h2>Nothing saved yet</h2>
          <p>
            Tap the bookmark icon beside any ayah while you read, and it will appear here — ready when
            you return.
          </p>
          <div className="empty-actions">
            <Link className="btn btn-gold" to={`/read/${lastRead.surah}/${lastRead.ayah}`}>
              Open the reader <ArrowRight size={15} />
            </Link>
            <Link className="btn btn-soft" to="/discover">
              <Compass size={15} /> Explore themes
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
