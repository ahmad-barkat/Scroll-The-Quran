import type { Ayah, Surah, ThemeId } from './types';

interface Palette {
  bg1: string;
  bg2: string;
  glow: string;
  gold: string;
  ink: string;
  muted: string;
  line: string;
}

const PALETTES: Record<ThemeId, Palette> = {
  night: {
    bg1: '#070b14',
    bg2: '#121c33',
    glow: '#2b3f6b',
    gold: '#d8b56a',
    ink: '#f5ecdb',
    muted: '#a7b2c7',
    line: 'rgba(216, 181, 106, 0.28)',
  },
  emerald: {
    bg1: '#06120f',
    bg2: '#0d241c',
    glow: '#1f4d3c',
    gold: '#d6b878',
    ink: '#f2ecdc',
    muted: '#a6bcae',
    line: 'rgba(214, 184, 120, 0.28)',
  },
  parchment: {
    bg1: '#f3ead8',
    bg2: '#e7d9bd',
    glow: '#d8c39e',
    gold: '#90682b',
    ink: '#2c2416',
    muted: '#6d6250',
    line: 'rgba(144, 104, 43, 0.3)',
  },
  dawn: {
    bg1: '#1a0f16',
    bg2: '#2b1622',
    glow: '#57304a',
    gold: '#e2b78d',
    ink: '#f8ebe5',
    muted: '#c9a9b8',
    line: 'rgba(226, 183, 141, 0.3)',
  },
};

export interface ShareCardResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  translationIncluded: boolean;
}

export interface ShareCardOptions {
  surah: Surah;
  ayah: Ayah;
  theme: ThemeId;
  showTranslation: boolean;
}

const WIDTH = 1080;
const MAX_HEIGHT = 2160;

export async function createShareCard(options: ShareCardOptions): Promise<ShareCardResult> {
  const { surah, ayah, theme, showTranslation } = options;
  const palette = PALETTES[theme];

  await Promise.allSettled([
    document.fonts.load('64px "Amiri Quran"'),
    document.fonts.load('600 32px "Cormorant Garamond"'),
    document.fonts.load('400 24px "Inter Variable"'),
    document.fonts.ready,
  ]);

  const measure = document.createElement('canvas');
  const ctx = measure.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable in this browser.');

  const measureParagraph = (text: string, font: string, maxWidth: number, lineHeight: number) => {
    ctx.font = font;
    const lines = wrapLines(ctx, text, maxWidth);
    return { lines, height: lines.length * lineHeight };
  };

  let arabicSize = ayah.arabic.length <= 90 ? 88 : ayah.arabic.length <= 170 ? 74 : ayah.arabic.length <= 320 ? 60 : ayah.arabic.length <= 620 ? 50 : 42;
  let translationSize = ayah.english.length <= 220 ? 34 : ayah.english.length <= 520 ? 30 : 26;
  let translationIncluded = showTranslation;
  let arabicLines: string[] = [];
  let translationLines: string[] = [];
  let height = 1350;

  for (let attempt = 0; attempt < 14; attempt++) {
    const arabicLineHeight = Math.round(arabicSize * 1.95);
    const arabic = measureParagraph(ayah.arabic, `${arabicSize}px "Amiri Quran", serif`, 900, arabicLineHeight);
    arabicLines = arabic.lines;

    const translationLineHeight = Math.round(translationSize * 1.55);
    const translation = translationIncluded
      ? measureParagraph(ayah.english, `${translationSize}px "Inter Variable", sans-serif`, 840, translationLineHeight)
      : { lines: [], height: 0 };
    translationLines = translation.lines;

    const content =
      190 + arabic.height + 96 + 50 + (translationIncluded ? translation.height + 60 : 0) + 150;
    height = Math.min(MAX_HEIGHT, Math.max(1350, content));

    if (content <= MAX_HEIGHT) break;

    if (translationIncluded) {
      translationIncluded = false;
      continue;
    }
    if (arabicSize > 30) {
      arabicSize -= 3;
      continue;
    }
    break;
  }

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = height;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('Canvas is unavailable in this browser.');

  // Background
  const gradient = c.createLinearGradient(0, 0, WIDTH, height);
  gradient.addColorStop(0, palette.bg1);
  gradient.addColorStop(0.55, palette.bg2);
  gradient.addColorStop(1, palette.bg1);
  c.fillStyle = gradient;
  c.fillRect(0, 0, WIDTH, height);

  const glow = c.createRadialGradient(WIDTH * 0.24, height * 0.18, 0, WIDTH * 0.24, height * 0.18, WIDTH * 0.9);
  glow.addColorStop(0, hexToRgba(palette.glow, 0.5));
  glow.addColorStop(1, hexToRgba(palette.glow, 0));
  c.fillStyle = glow;
  c.fillRect(0, 0, WIDTH, height);

  const glow2 = c.createRadialGradient(WIDTH * 0.84, height * 0.82, 0, WIDTH * 0.84, height * 0.82, WIDTH * 0.8);
  glow2.addColorStop(0, hexToRgba(palette.gold, 0.12));
  glow2.addColorStop(1, hexToRgba(palette.gold, 0));
  c.fillStyle = glow2;
  c.fillRect(0, 0, WIDTH, height);

  drawPattern(c, WIDTH, height, palette);
  drawVignette(c, WIDTH, height, palette.bg1);

  // Card border
  c.strokeStyle = palette.line;
  c.lineWidth = 2;
  roundedRect(c, 34, 34, WIDTH - 68, height - 68, 28);
  c.stroke();

  // Top brand
  drawStar(c, WIDTH / 2, 92, 12, palette.gold);
  c.fillStyle = palette.muted;
  c.font = '400 17px "Inter Variable", sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  drawSpacedText(c, 'SCROLL THE QURAN', WIDTH / 2, 126, 5);

  // Ornament line
  c.strokeStyle = palette.line;
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(WIDTH / 2 - 120, 158);
  c.lineTo(WIDTH / 2 - 18, 158);
  c.moveTo(WIDTH / 2 + 18, 158);
  c.lineTo(WIDTH / 2 + 120, 158);
  c.stroke();
  drawStar(c, WIDTH / 2, 158, 6, palette.gold);

  // Arabic
  c.fillStyle = palette.ink;
  c.direction = 'rtl';
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.font = `${arabicSize}px "Amiri Quran", serif`;
  const arabicLineHeight = Math.round(arabicSize * 1.95);
  let y = 220 + arabicSize;
  for (const line of arabicLines) {
    c.fillText(line, WIDTH / 2, y);
    y += arabicLineHeight;
  }

  // Divider
  y += 18;
  c.strokeStyle = palette.line;
  c.beginPath();
  c.moveTo(WIDTH / 2 - 150, y);
  c.lineTo(WIDTH / 2 - 24, y);
  c.moveTo(WIDTH / 2 + 24, y);
  c.lineTo(WIDTH / 2 + 150, y);
  c.stroke();
  drawStar(c, WIDTH / 2, y, 7, palette.gold);

  // Reference
  y += 54;
  c.direction = 'ltr';
  c.fillStyle = palette.gold;
  c.font = '500 19px "Inter Variable", sans-serif';
  c.textAlign = 'center';
  const place = surah.revelationPlace === 'makkah' ? 'Makkah' : 'Madinah';
  drawSpacedText(
    c,
    `SURAH ${surah.nameSimple.toUpperCase()} · AYAH ${surah.number}:${ayah.n}`,
    WIDTH / 2,
    y,
    2.2
  );

  // Translation
  if (translationIncluded && translationLines.length) {
    y += 62;
    c.fillStyle = palette.ink;
    c.font = `${translationSize}px "Inter Variable", sans-serif`;
    const translationLineHeight = Math.round(translationSize * 1.55);
    for (const line of translationLines) {
      c.fillText(line, WIDTH / 2, y);
      y += translationLineHeight;
    }
    y += 10;
    c.fillStyle = palette.muted;
    c.font = '400 17px "Inter Variable", sans-serif';
    c.fillText('Saheeh International', WIDTH / 2, y);
  } else if (showTranslation) {
    y += 54;
    c.fillStyle = palette.muted;
    c.font = '400 17px "Inter Variable", sans-serif';
    c.fillText('Translation available in the app', WIDTH / 2, y);
  }

  // Footer
  const footerY = height - 92;
  c.fillStyle = palette.muted;
  c.font = '400 16px "Inter Variable", sans-serif';
  c.textAlign = 'center';
  drawSpacedText(c, `${place.toUpperCase()} · UTHMANI · HAFS ʿAN ʿĀṢIM`, WIDTH / 2, footerY, 2);
  drawStar(c, WIDTH / 2, footerY + 30, 7, palette.gold);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1));
  if (!blob) throw new Error('Could not create the share image.');

  return {
    dataUrl: canvas.toDataURL('image/png'),
    blob,
    width: WIDTH,
    height,
    translationIncluded,
  };
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 8;
    const r = i % 2 === 0 ? radius : radius * 0.42;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  spacing: number
) {
  const chars = Array.from(text);
  const widths = chars.map((char) => ctx.measureText(char).width);
  const total = widths.reduce((sum, width) => sum + width, 0) + spacing * Math.max(0, chars.length - 1);
  let x = centerX - total / 2;
  const previousAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((char, index) => {
    ctx.fillText(char, x, y);
    x += widths[index] + spacing;
  });
  ctx.textAlign = previousAlign;
}

function drawPattern(ctx: CanvasRenderingContext2D, width: number, height: number, palette: Palette) {
  ctx.save();
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 1;
  const step = 120;
  for (let x = -height; x < width + height; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + height, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - height, height);
    ctx.stroke();
  }
  for (let gx = 60; gx < width; gx += step) {
    for (let gy = 80; gy < height; gy += step) {
      drawStar(ctx, gx, gy, 5, palette.line);
    }
  }
  ctx.restore();
}

function drawVignette(ctx: CanvasRenderingContext2D, width: number, height: number, color: string) {
  const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.2, width / 2, height / 2, Math.max(width, height) * 0.75);
  vignette.addColorStop(0, hexToRgba(color, 0));
  vignette.addColorStop(1, hexToRgba(color, 0.55));
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
