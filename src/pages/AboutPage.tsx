import { useEffect, useState } from 'react';
import {
  AudioLines,
  Database,
  ExternalLink,
  Languages,
  ShieldCheck,
  WifiOff,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import { usePageTitle } from '../lib/usePageTitle';

interface VerificationReport {
  checksum: string;
  crossSource?: {
    comparedVerses: number;
    wordLevelMismatches: number;
    letterSeqMismatchesIgnoringSpaces: number;
    knownVariantRefs: string[];
    note?: string;
  };
  translationPunctuationNormalization?: {
    refs: string[];
    note?: string;
  };
  translationHtmlLeaks?: number;
}

const FALLBACK_VARIANTS = ['2:181', '8:6', '12:39', '12:41', '13:37'];
const FALLBACK_PUNCTUATION = ['18:4', '37:92', '54:47', '79:25', '114:6'];

export function AboutPage() {
  usePageTitle('Text & sources — Scroll the Quran');

  const { dataset } = useApp();
  const [report, setReport] = useState<VerificationReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}verification-report.json`, { cache: 'no-cache' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: VerificationReport | null) => {
        if (!cancelled && data) setReport(data);
      })
      .catch(() => {
        // The report is supplementary; the bundled dataset remains authoritative.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!dataset) return null;

  const { meta } = dataset;
  const variants = report?.crossSource?.knownVariantRefs ?? FALLBACK_VARIANTS;
  const punctuation = report?.translationPunctuationNormalization?.refs ?? FALLBACK_PUNCTUATION;

  return (
    <div className="page about-page">
      <PageHeader
        back={{ to: '/read/1/1', label: 'Back to the reader' }}
        kicker="About this app"
        title="Text, sources & verification"
        subtitle="The Quran is presented exactly as received in the Uthmani script. This page records where every word came from and how it was checked."
      />

      <div className="about-grid">
        <section className="about-card glass about-wide">
          <div className="about-card-head">
            <span className="about-icon">
              <Database size={18} />
            </span>
            <div>
              <p className="eyebrow">The Arabic text</p>
              <h2>Uthmani · Hafs ʿan ʿĀṣim</h2>
            </div>
          </div>
          <p>
            The Arabic is the Uthmani mushaf text served by the Quran.com API v4{' '}
            <code>text_uthmani</code> field. It contains all 114 surahs and 6,236 ayahs, with the
            basmala shown only where the mushaf shows it — never prefixed to the first ayah of a
            surah by mistake.
          </p>
          <dl className="about-facts">
            <div>
              <dt>Script</dt>
              <dd>{meta.script}</dd>
            </div>
            <div>
              <dt>Qiraah</dt>
              <dd>{meta.qiraah}</dd>
            </div>
            <div>
              <dt>Surahs</dt>
              <dd>114</dd>
            </div>
            <div>
              <dt>Ayahs</dt>
              <dd>6,236</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>
                <a href="https://quran.com" target="_blank" rel="noreferrer">
                  Quran.com API v4 <ExternalLink size={12} />
                </a>
              </dd>
            </div>
            <div>
              <dt>Generated</dt>
              <dd>{new Date(meta.generatedAt).toLocaleDateString('en', { dateStyle: 'medium' })}</dd>
            </div>
          </dl>
        </section>

        <section className="about-card glass">
          <div className="about-card-head">
            <span className="about-icon">
              <ShieldCheck size={18} />
            </span>
            <div>
              <p className="eyebrow">Integrity</p>
              <h2>Checked, not assumed</h2>
            </div>
          </div>
          <ul className="about-list">
            <li>All 6,236 ayahs were compared letter-by-letter against the independent Tanzil Uthmani distribution.</li>
            <li>
              Five differences remain. They are documented orthographic variants — word joining and
              hamza-carrier conventions — not missing or added words.
            </li>
            <li>The basmala is checked against 1:1 and must not contaminate 2:1 or appear before Surah 9.</li>
            <li>Juz boundaries are validated so every one of the 6,236 ayahs belongs to exactly one juz.</li>
            <li>No HTML, footnotes, or commentary leak into the translation field.</li>
          </ul>
          <div className="about-mini">
            <span>Documented variants</span>
            <div className="about-ref-chips">
              {variants.map((ref) => {
                const [surah, ayah] = ref.split(':');
                return (
                  <Link key={ref} className="chip chip-small" to={`/read/${surah}/${ayah}`}>
                    {ref}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="about-card glass">
          <div className="about-card-head">
            <span className="about-icon">
              <Languages size={18} />
            </span>
            <div>
              <p className="eyebrow">Translation</p>
              <h2>Saheeh International</h2>
            </div>
          </div>
          <p>
            The English is Saheeh International, translation resource 20 from the Quran.com API. It is
            displayed without paraphrase, commentary, or generated text.
          </p>
          <p>
            Five terminal punctuation placements were normalized against the independent Tanzil
            distribution: three closing quotation marks moved after the sentence punctuation, and two
            doubled full stops reduced to one. Wording is unchanged.
          </p>
          <div className="about-mini">
            <span>Normalized punctuation</span>
            <div className="about-ref-chips">
              {punctuation.map((ref) => {
                const [surah, ayah] = ref.split(':');
                return (
                  <Link key={ref} className="chip chip-small" to={`/read/${surah}/${ayah}`}>
                    {ref}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="about-card glass">
          <div className="about-card-head">
            <span className="about-icon">
              <AudioLines size={18} />
            </span>
            <div>
              <p className="eyebrow">Recitation</p>
              <h2>Three murattal reciters</h2>
            </div>
          </div>
          <p>
            Per-ayah MP3 audio streams from EveryAyah: Mishary Rashid Alafasy, Abdul Basit Abdus
            Samad, and Mahmoud Khalil Al-Husary. Audio is cached after first play by the service
            worker.
          </p>
          <p className="about-fine">
            Quran text and translation work offline; a connection is needed for recitations that have
            not yet been cached.
          </p>
        </section>

        <section className="about-card glass">
          <div className="about-card-head">
            <span className="about-icon">
              <WifiOff size={18} />
            </span>
            <div>
              <p className="eyebrow">Privacy & offline</p>
              <h2>No accounts. No tracking.</h2>
            </div>
          </div>
          <p>
            The app is a static progressive web app. It has no accounts, analytics, advertising, or
            server-side profile. Bookmarks, reading progress, settings, and streak are stored in this
            browser's local storage.
          </p>
          <p>
            The Quran text, translation, fonts, and app shell are precached. You can install the app
            from your browser's menu and read without a connection.
          </p>
        </section>

        <section className="about-card glass about-wide">
          <div className="about-card-head">
            <span className="about-icon">
              <ShieldCheck size={18} />
            </span>
            <div>
              <p className="eyebrow">What this app does not do</p>
              <h2>No additions to the text</h2>
            </div>
          </div>
          <ul className="about-list about-list-columns">
            <li>No AI-generated Quran text or translation.</li>
            <li>No invented commentary or tafsir.</li>
            <li>No alteration of the Uthmani script.</li>
            <li>No ads and no tracking scripts.</li>
            <li>Tafsir links open Quran.com in a new tab.</li>
            <li>Every share card keeps the surah and ayah reference.</li>
          </ul>
        </section>

        <section className="about-card glass about-wide">
          <div className="about-card-head">
            <span className="about-icon">
              <ExternalLink size={18} />
            </span>
            <div>
              <p className="eyebrow">Credits</p>
              <h2>Built on the work of others</h2>
            </div>
          </div>
          <div className="about-credits">
            <a href="https://quran.com" target="_blank" rel="noreferrer">
              <strong>Quran.com API</strong>
              <span>Uthmani text and Saheeh International translation</span>
            </a>
            <a href="https://tanzil.net" target="_blank" rel="noreferrer">
              <strong>Tanzil</strong>
              <span>Independent Uthmani cross-check</span>
            </a>
            <a href="https://everyayah.com" target="_blank" rel="noreferrer">
              <strong>EveryAyah</strong>
              <span>Per-ayah recitation audio</span>
            </a>
            <a href="https://fontsource.org" target="_blank" rel="noreferrer">
              <strong>Fontsource</strong>
              <span>Amiri, Amiri Quran, Inter, Cormorant Garamond</span>
            </a>
          </div>
        </section>

        <section className="about-card glass about-wide about-checksum-card">
          <p className="eyebrow">Dataset checksum · SHA-256</p>
          <code className="about-checksum">{meta.checksum}</code>
          <div className="about-checksum-actions">
            <a className="btn btn-soft" href={`${import.meta.env.BASE_URL}verification-report.json`} target="_blank" rel="noreferrer">
              View verification report <ExternalLink size={14} />
            </a>
            <span>
              {report?.translationHtmlLeaks === 0
                ? '0 HTML leaks · 6,236 ayahs checked'
                : 'Counts, checksum, and cross-source results'}
            </span>
          </div>
        </section>
      </div>

      <p className="about-note">
        Scroll the Quran is an independent reader. It is not affiliated with Scroll Bible, Quran.com,
        Tanzil, or EveryAyah. May the reading be of benefit.
      </p>
    </div>
  );
}
