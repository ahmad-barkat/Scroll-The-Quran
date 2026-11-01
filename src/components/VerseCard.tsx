import { Bookmark, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getJuz, refToGlobal } from '../lib/quran';
import type { Ayah, Surah } from '../lib/types';

export function VerseCard({ surah, ayah }: { surah: Surah; ayah: Ayah }) {
  const { index, isBookmarked, toggleBookmark, toast } = useApp();
  const ref = { surah: surah.number, ayah: ayah.n };
  const saved = isBookmarked(ref);
  const juz = index ? getJuz(index, refToGlobal(index, ref)) : null;

  const handleSave = () => {
    const added = toggleBookmark(ref);
    toast(added ? 'Saved to bookmarks.' : 'Removed from bookmarks.');
  };

  return (
    <article className={`verse-card glass ${saved ? 'is-saved' : ''}`}>
      <Link
        className="verse-card-main"
        to={`/read/${surah.number}/${ayah.n}`}
        aria-label={`Read ${surah.nameSimple}, ayah ${ayah.n}`}
      >
        <p className="verse-card-arabic" lang="ar" dir="rtl">
          {ayah.arabic}
        </p>
        <p className="verse-card-translation" lang="en">
          {ayah.english}
        </p>
        <span className="verse-card-meta">
          <span className="verse-card-ref">
            {surah.nameSimple} · {surah.number}:{ayah.n}
          </span>
          {juz !== null && <span className="verse-card-juz">Juz {juz}</span>}
          <ChevronRight size={14} className="verse-card-chevron" />
        </span>
      </Link>
      <button
        type="button"
        className={`verse-save ${saved ? 'is-saved' : ''}`}
        onClick={handleSave}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${surah.number}:${ayah.n} from bookmarks` : `Save ${surah.number}:${ayah.n}`}
      >
        <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />
      </button>
    </article>
  );
}
