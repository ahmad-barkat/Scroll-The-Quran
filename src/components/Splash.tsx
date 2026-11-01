import { RotateCcw } from 'lucide-react';
import { BrandMark, Star } from './Ornaments';

export function Splash() {
  return (
    <div className="boot-screen">
      <div className="boot-brand">
        <BrandMark size={64} />
        <p className="boot-title">Scroll the Quran</p>
        <p className="boot-sub">Preparing the text</p>
        <div className="boot-stars" aria-hidden="true">
          <Star size={10} />
          <Star size={10} />
          <Star size={10} />
        </div>
      </div>
    </div>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="boot-screen">
      <div className="boot-brand">
        <BrandMark size={56} />
        <p className="boot-title">The text could not be loaded</p>
        <p className="boot-sub error-copy">{message}</p>
        <button type="button" className="btn btn-gold" onClick={onRetry}>
          <RotateCcw size={16} /> Try again
        </button>
        <p className="boot-note">
          The Quran is bundled with the app. If this persists, reload the page or check that
          <code> /quran.json</code> is available.
        </p>
      </div>
    </div>
  );
}
