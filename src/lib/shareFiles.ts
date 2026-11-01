import type { Ayah, Surah } from './types';

export function verseText(surah: Surah, ayah: Ayah): string {
  return `${ayah.arabic}\n\n${ayah.english}\n\n— ${surah.nameSimple} ${surah.number}:${ayah.n} · Saheeh International`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function shareImage(blob: Blob, filename: string, title: string): Promise<boolean> {
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return false;
      throw err;
    }
  }
  return false;
}
