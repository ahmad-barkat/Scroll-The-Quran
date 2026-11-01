import type { CSSProperties } from 'react';

const SCENES = [
  { ax: '16%', ay: '18%', bx: '84%', by: '68%', cx: '44%', cy: '112%', rotate: '0deg' },
  { ax: '82%', ay: '14%', bx: '12%', by: '74%', cx: '68%', cy: '108%', rotate: '12deg' },
  { ax: '24%', ay: '82%', bx: '78%', by: '22%', cx: '52%', cy: '118%', rotate: '-9deg' },
  { ax: '78%', ay: '86%', bx: '18%', by: '16%', cx: '62%', cy: '104%', rotate: '18deg' },
  { ax: '10%', ay: '46%', bx: '92%', by: '38%', cx: '38%', cy: '112%', rotate: '-16deg' },
  { ax: '62%', ay: '8%', bx: '30%', by: '92%', cx: '86%', cy: '116%', rotate: '7deg' },
];

export function Backdrop({ scene }: { scene: number }) {
  const layer = SCENES[Math.abs(scene) % SCENES.length];
  const style = {
    '--ax': layer.ax,
    '--ay': layer.ay,
    '--bx': layer.bx,
    '--by': layer.by,
    '--cx': layer.cx,
    '--cy': layer.cy,
    '--pattern-rotate': layer.rotate,
  } as CSSProperties;

  return (
    <div className="backdrop" style={style} aria-hidden="true">
      <div className="backdrop-base" />
      <div className="backdrop-orb orb-a" />
      <div className="backdrop-orb orb-b" />
      <div className="backdrop-orb orb-c" />
      <div className="backdrop-pattern">
        <svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="khatim" width="96" height="96" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
              <path d="M48 5 91 48 48 91 5 48Z" />
              <path d="M18 18H78V78H18Z" />
              <circle cx="48" cy="48" r="11" />
            </pattern>
          </defs>
          <rect width="600" height="600" fill="url(#khatim)" />
        </svg>
      </div>
      <div className="backdrop-stars">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="backdrop-grain" />
      <div className="backdrop-vignette" />
    </div>
  );
}
