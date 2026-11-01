import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Download, Loader2, Share2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { downloadBlob, shareImage, verseText } from '../lib/shareFiles';
import type { ShareCardResult } from '../lib/shareImage';
import { copyText } from '../lib/clipboard';
import { useDialog } from '../lib/useDialog';
import type { Ayah, Surah } from '../lib/types';

interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  surah: Surah;
  ayah: Ayah;
}

export function ShareSheet({ open, onClose, surah, ayah }: ShareSheetProps) {
  const { settings, toast } = useApp();
  const [result, setResult] = useState<ShareCardResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const modalRef = useDialog<HTMLDivElement>(open, onClose);

  useEffect(() => {
    if (!open) {
      setResult(null);
      setError(null);
      setCopied(false);
      return;
    }
    let cancelled = false;
    setBusy(true);
    setError(null);
    // The canvas share engine is a separate chunk: it only loads when a card is actually requested.
    import('../lib/shareImage')
      .then(({ createShareCard }) =>
        createShareCard({
          surah,
          ayah,
          theme: settings.theme,
          showTranslation: settings.showTranslation,
        })
      )
      .then((card) => {
        if (!cancelled) setResult(card);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not create the image.');
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, surah, ayah, settings.theme, settings.showTranslation]);

  const filename = `scroll-quran-${surah.number}-${ayah.n}.png`;

  const handleShare = async () => {
    if (!result) return;
    try {
      const shared = await shareImage(result.blob, filename, `${surah.nameSimple} ${surah.number}:${ayah.n}`);
      if (!shared) {
        downloadBlob(result.blob, filename);
        toast('Sharing is not available here — the image was downloaded.');
      }
    } catch {
      toast('The share sheet could not be opened.');
    }
  };

  const handleCopy = async () => {
    const ok = await copyText(verseText(surah, ayah));
    setCopied(ok);
    toast(ok ? 'Verse copied.' : 'Could not copy on this browser.');
    if (ok) window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="overlay-scrim share-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="share-modal"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="share-head">
              <div>
                <p className="eyebrow">Share</p>
                <h2 id="share-title">
                  {surah.nameSimple} · {surah.number}:{ayah.n}
                </h2>
              </div>
              <button type="button" className="icon-btn" onClick={onClose} aria-label="Close share sheet">
                <X size={18} />
              </button>
            </header>

            <div className="share-preview">
              {busy && (
                <div className="share-loading">
                  <Loader2 size={22} className="spin" />
                  <span>Designing your card…</span>
                </div>
              )}
              {error && !busy && <p className="share-error">{error}</p>}
              {result && !busy && (
                <img src={result.dataUrl} alt={`Share card for ${surah.nameSimple} ${surah.number}:${ayah.n}`} />
              )}
            </div>

            {result && (
              <p className="share-note">
                {!result.translationIncluded && settings.showTranslation
                  ? 'This ayah is long, so the card uses the Arabic text only. The full translation is still copied with “Copy text”.'
                  : `Uthmani Arabic with Saheeh International translation · ${result.width} × ${result.height}`}
              </p>
            )}

            <div className="share-actions">
              <button type="button" className="btn btn-gold" onClick={handleShare} disabled={!result}>
                <Share2 size={16} /> Share image
              </button>
              <button
                type="button"
                className="btn btn-soft"
                onClick={() => result && downloadBlob(result.blob, filename)}
                disabled={!result}
              >
                <Download size={16} /> Download
              </button>
              <button type="button" className="btn btn-soft" onClick={handleCopy}>
                {copied ? <Check size={16} /> : <Copy size={16} />} Copy text
              </button>
            </div>
            <p className="share-footnote">
              The Arabic text is reproduced exactly. Please keep the reference with the ayah when sharing.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
