import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronRight, Search, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatNumber, normalizeArabic, normalizeEnglish } from '../lib/quran';
import { useDialog } from '../lib/useDialog';
import { Star } from './Ornaments';

type Tab = 'surah' | 'juz';

export function SurahDrawer() {
  const {
    dataset,
    surahDrawerOpen,
    setSurahDrawerOpen,
  } = useApp();
  const [tab, setTab] = useState<Tab>('surah');
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const close = () => setSurahDrawerOpen(false);
  const drawerRef = useDialog<HTMLElement>(surahDrawerOpen, close);

  const pathParts = location.pathname.split('/').filter(Boolean);
  const currentSurah = pathParts[0] === 'read' ? Number(pathParts[1]) || 1 : 0;

  const normalizedQuery = query.trim();
  const surahs = useMemo(() => {
    if (!dataset) return [];
    if (!normalizedQuery) return dataset.surahs;
    const ar = normalizeArabic(normalizedQuery);
    const en = normalizeEnglish(normalizedQuery);
    return dataset.surahs.filter((surah) => {
      return (
        String(surah.number) === normalizedQuery ||
        surah.nameSimple.toLowerCase().includes(normalizedQuery.toLowerCase()) ||
        surah.nameEnglish.toLowerCase().includes(normalizedQuery.toLowerCase()) ||
        surah.nameComplex.toLowerCase().includes(normalizedQuery.toLowerCase()) ||
        (ar.length > 0 && normalizeArabic(surah.nameArabic).includes(ar)) ||
        (en.length > 0 && normalizeEnglish(surah.nameEnglish).includes(en))
      );
    });
  }, [dataset, normalizedQuery]);

  const go = (surah: number, ayah: number) => {
    close();
    navigate(`/read/${surah}/${ayah}`);
  };

  return (
    <AnimatePresence>
      {surahDrawerOpen && (
        <motion.div
          className="overlay-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={close}
        >
          <motion.aside
            className="drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Choose a surah or juz"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="drawer-head">
              <div>
                <p className="eyebrow">The Quran</p>
                <h2 className="drawer-title">114 surahs · 30 juz</h2>
              </div>
              <button type="button" className="icon-btn" onClick={close} aria-label="Close">
                <X size={18} />
              </button>
            </header>

            <div className="segmented" role="tablist" aria-label="Browse by">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'surah'}
                className={tab === 'surah' ? 'is-active' : ''}
                onClick={() => setTab('surah')}
              >
                Surahs
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'juz'}
                className={tab === 'juz' ? 'is-active' : ''}
                onClick={() => setTab('juz')}
              >
                Juz
              </button>
            </div>

            {tab === 'surah' && (
              <label className="drawer-search">
                <Search size={16} />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search surah, meaning, or number"
                  aria-label="Search surahs"
                />
              </label>
            )}

            <div className="drawer-list">
              {tab === 'surah' &&
                surahs.map((surah) => (
                  <button
                    key={surah.number}
                    type="button"
                    className={`surah-row ${surah.number === currentSurah ? 'is-current' : ''}`}
                    onClick={() => go(surah.number, 1)}
                  >
                    <span className="surah-index">
                      <span>{surah.number}</span>
                    </span>
                    <span className="surah-row-main">
                      <span className="surah-row-top">
                        <span className="surah-ar" lang="ar" dir="rtl">
                          {surah.nameArabic}
                        </span>
                        <span className="surah-en">{surah.nameSimple}</span>
                      </span>
                      <span className="surah-row-sub">
                        {surah.nameEnglish} · {formatNumber(surah.versesCount)} ayahs ·{' '}
                        {surah.revelationPlace === 'makkah' ? 'Makkah' : 'Madinah'}
                      </span>
                    </span>
                    {surah.number === currentSurah ? <Check size={16} className="surah-check" /> : <ChevronRight size={16} className="surah-chevron" />}
                  </button>
                ))}

              {tab === 'juz' &&
                dataset?.juzs.map((juz) => (
                  <button
                    key={juz.number}
                    type="button"
                    className="surah-row juz-row"
                    onClick={() => go(juz.start.surah, juz.start.ayah)}
                  >
                    <span className="surah-index juz-index">
                      <Star size={13} />
                      <span>{juz.number}</span>
                    </span>
                    <span className="surah-row-main">
                      <span className="surah-row-top">
                        <span className="surah-en">Juz {juz.number}</span>
                        <span className="juz-range">
                          {dataset.surahs[juz.start.surah - 1].nameSimple} {juz.start.surah}:{juz.start.ayah}
                        </span>
                      </span>
                      <span className="surah-row-sub">
                        Through {dataset.surahs[juz.end.surah - 1].nameSimple} {juz.end.surah}:{juz.end.ayah}
                      </span>
                    </span>
                    <ChevronRight size={16} className="surah-chevron" />
                  </button>
                ))}

              {tab === 'surah' && surahs.length === 0 && <p className="empty-note">No surah matches “{query}”.</p>}
            </div>

            <footer className="drawer-foot">
              <Star size={13} />
              <span>Uthmani text · Hafs ʿan ʿĀṣim</span>
            </footer>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
