import { ArrowUpRight, BookOpenText } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { VerseCard } from '../components/VerseCard';
import { useApp } from '../context/AppContext';
import { collections } from '../data/collections';
import { collectionIcon } from '../lib/collectionIcons';
import { usePageTitle } from '../lib/usePageTitle';

export function CollectionPage() {
  const { slug } = useParams();
  const { dataset } = useApp();
  const collection = collections.find((item) => item.slug === slug);

  usePageTitle(collection ? `${collection.title} — Scroll the Quran` : 'Collection — Scroll the Quran');

  if (!collection) return <Navigate to="/discover" replace />;
  if (!dataset) return null;

  const Icon = collectionIcon(collection.icon);
  const verses = collection.refs.map(([surah, ayah]) => ({
    surah: dataset.surahs[surah - 1],
    ayah: dataset.surahs[surah - 1].ayahs[ayah - 1],
  }));
  const first = collection.refs[0];

  return (
    <div className="page collection-page">
      <PageHeader
        back={{ to: '/discover', label: 'Back to Discover' }}
        kicker={`${collection.refs.length} ${collection.refs.length === 1 ? 'ayah' : 'ayahs'} · curated theme`}
        title={collection.title}
        subtitle={collection.subtitle}
      />

      <section className="collection-banner glass">
        <span className="collection-banner-icon">
          <Icon size={26} strokeWidth={1.5} />
        </span>
        <div className="collection-banner-copy">
          <strong>{collection.title}</strong>
          <span>
            A reading path through {collection.refs.length}{' '}
            {collection.refs.length === 1 ? 'ayah' : 'ayahs'}, in mushaf order. Text and translation
            are shown without added commentary.
          </span>
        </div>
        <Link className="btn btn-gold" to={`/read/${first[0]}/${first[1]}`}>
          Start reading <ArrowUpRight size={15} />
        </Link>
      </section>

      <div className="verse-list">
        {verses.map(({ surah, ayah }) => (
          <VerseCard key={`${surah.number}:${ayah.n}`} surah={surah} ayah={ayah} />
        ))}
      </div>

      <div className="collection-foot glass">
        <BookOpenText size={16} />
        <span>
          Tap any verse to open it in the reader, or use the bookmark button to keep it on this
          device.
        </span>
      </div>
    </div>
  );
}
