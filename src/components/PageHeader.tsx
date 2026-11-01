import { ArrowLeft, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { BrandMark } from './Ornaments';

interface PageHeaderProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  back?: { to: string; label: string };
}

export function PageHeader({ kicker, title, subtitle, back }: PageHeaderProps) {
  const { setSettingsOpen } = useApp();

  return (
    <header className="page-header">
      <div className="page-topline">
        {back ? (
          <Link className="back-link" to={back.to}>
            <ArrowLeft size={15} />
            {back.label}
          </Link>
        ) : (
          <div className="page-brand">
            <BrandMark size={25} />
            <span>Scroll the Quran</span>
          </div>
        )}
        <button
          type="button"
          className="icon-btn"
          onClick={() => setSettingsOpen(true)}
          aria-label="Reading settings"
        >
          <Settings2 size={18} />
        </button>
      </div>
      <div className="page-heading">
        {kicker && <p className="eyebrow">{kicker}</p>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
    </header>
  );
}
