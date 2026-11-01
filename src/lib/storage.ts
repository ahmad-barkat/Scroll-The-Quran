const PREFIX = 'scroll-quran.v1.';

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in private mode or full; reading still works.
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

export function loadFlag(key: string): boolean {
  try {
    return localStorage.getItem(PREFIX + key) === '1';
  } catch {
    return false;
  }
}

export function saveFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(PREFIX + key, value ? '1' : '0');
  } catch {
    // ignore
  }
}
