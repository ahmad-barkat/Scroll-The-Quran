import type { SVGProps } from 'react';

export function Star({ size = 18, ...props }: { size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M32 4 39.8 15.2 53.9 12.4 51.1 26.5 62 34 51.1 41.5 53.9 55.6 39.8 52.8 32 64 24.2 52.8 10.1 55.6 12.9 41.5 2 34 12.9 26.5 10.1 12.4 24.2 15.2 32 4Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="34" r="8.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="32" cy="34" r="2" fill="currentColor" />
    </svg>
  );
}

export function Ornament({ className = '' }: { className?: string }) {
  return (
    <div className={`ornament ${className}`.trim()} aria-hidden="true">
      <span className="ornament-line" />
      <Star size={14} />
      <span className="ornament-line" />
    </div>
  );
}

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" className="brand-mark">
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeOpacity="0.28" />
      <path
        d="M32 8 38.4 17.4 49.6 15.1 47.3 26.3 56.7 32 47.3 37.7 49.6 48.9 38.4 46.6 32 56 25.6 46.6 14.4 48.9 16.7 37.7 7.3 32 16.7 26.3 14.4 15.1 25.6 17.4 32 8Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="32" r="6.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="32" cy="32" r="1.6" fill="currentColor" />
    </svg>
  );
}
