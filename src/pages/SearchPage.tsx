import { useDeferredValue, useMemo, useRef, useState } from 'react';
import {
  BookOpenCheck,
  CornerDownLeft,
  Languages,
  Search,
  SearchX,
  Sparkles,
  X,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { VerseCard } from '../components/VerseCard';
import { useApp } from '../context/AppContext';
import { searchVerses } from '../lib/quran';
import { usePageTitle } from '../lib/usePageTitle';

const SUGGESTIONS = ['mercy', 'patience', 'light', '2:255', 'الرحمن', 'موسى'];

export function SearchPage() {
  usePageTitle('Search — Scroll the Quran');

  const { index, dataset } = useApp();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    if (!index || !deferredQuery.trim()) return [];
    return searchVerses(index, deferredQuery, 60);
  }, [index, deferredQuery]);

  if (!index || !dataset) return null;

  const trimmed = deferredQuery.trim();
  const isStale = query !== deferredQuery;
  const isReference = /^(?:surah\s*)?\d{1,3}\s*(?:[:.·]\s*|\s+)(?:ayah\s*)?\d{1,3}$/i.test(trimmed);

  const chooseSuggestion = (value: string) => {
    setQuery(value);
    inputRef.current?.focus();
  };

  return (
    <div className="page search-page">
      <PageHeader
        kicker="6,236 ayahs indexed"
        title="Search the Quran"
        subtitle="Search Arabic with or without diacritics, English from Saheeh International, or jump straight to a reference such as 2:255."
      />

      <form
        className="search-box glass"
        onSubmit={(event) => event.preventDefault()}
        role="search"
      >
        <Search size={19} className="search-box-icon" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try “mercy”, “الرحمن”, or “2:255”"
          aria-label="Search the Quran"
          autoComplete="off"
          spellCheck={false}
          autoFocus
        />
        {query ? (
          <button
            type="button"
            className="search-clear"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        ) : (
          <span className="search-key" aria-hidden="true">
            <CornerDownLeft size={13} />
          </span>
        )}
      </form>

      <div className="suggestion-row" aria-label="Suggested searches">
        <span className="suggestion-label">
          <Sparkles size={13} /> Try
        </span>
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className={`chip ${query === suggestion ? 'is-active' : ''}`}
            onClick={() => chooseSuggestion(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>

      {trimmed && (
        <div className="search-results-head" aria-live="polite" aria-busy={isStale}>
          <span className="results-count">
            {isStale
              ? 'Searching…'
              : `${results.length}${results.length === 60 ? '+' : ''} ${
                  results.length === 1 ? 'ayah' : 'ayahs'
                }`}
          </span>
          <span className="results-query">
            for <strong>“{trimmed}”</strong>
            {isReference && results.length === 1 && ' · reference'}
          </span>
        </div>
      )}

      {trimmed && results.length > 0 && (
        <div className="verse-list search-results">
          {results.map((verse) => (
            <VerseCard
              key={`${verse.s}:${verse.a}`}
              surah={dataset.surahs[verse.s - 1]}
              ayah={dataset.surahs[verse.s - 1].ayahs[verse.a - 1]}
            />
          ))}
        </div>
      )}

      {trimmed && !results.length && !isStale && (
        <section className="empty-state glass">
          <span className="empty-icon">
            <SearchX size={24} />
          </span>
          <h2>No ayah matched “{trimmed}”</h2>
          <p>
            Try fewer words, a different spelling, an Arabic word without diacritics, or a reference
            such as <strong>2:255</strong>.
          </p>
          <button
            type="button"
            className="btn btn-soft"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
          >
            Clear search
          </button>
        </section>
      )}

      {!trimmed && (
        <section className="search-guide" aria-label="Search guide">
          <div className="search-guide-card glass">
            <p className="eyebrow">How search works</p>
            <h2 className="section-title">Find by word or reference</h2>
            <ul className="search-tips">
              <li>
                <span className="search-tip-icon">
                  <Languages size={17} />
                </span>
                <span>
                  <strong>English</strong>
                  <span>Search the Saheeh International translation by word or phrase.</span>
                </span>
              </li>
              <li>
                <span className="search-tip-icon">
                  <BookOpenCheck size={17} />
                </span>
                <span>
                  <strong>Arabic</strong>
                  <span>Type with or without harakat; the search normalizes the Uthmani script.</span>
                </span>
              </li>
              <li>
                <span className="search-tip-icon">
                  <CornerDownLeft size={17} />
                </span>
                <span>
                  <strong>Reference</strong>
                  <span>Enter 2:255, 2.255, or “surah 2 ayah 255” to open one ayah directly.</span>
                </span>
              </li>
            </ul>
          </div>

          <div className="search-guide-side glass">
            <p className="eyebrow">A quiet start</p>
            <p className="search-guide-ar" lang="ar" dir="rtl">
              وَقُل رَّبِّ زِدْنِي عِلْمًا
            </p>
            <p className="search-guide-en">
              “And say, ‘My Lord, increase me in knowledge.’”
            </p>
            <span className="search-guide-ref">Ta-Ha · 20:114</span>
          </div>
        </section>
      )}
    </div>
  );
}
