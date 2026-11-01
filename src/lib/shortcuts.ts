export interface ShortcutBinding {
  command: string;
  keys: string[];
  /** false means the key is inert while a recitation is playing. */
  worksWhileReciting: boolean;
}

export interface ShortcutGroup {
  title: string;
  items: ShortcutBinding[];
}

/**
 * The reader's keyboard map. The key tokens here are matched by ReadPage's
 * handler, so adding a binding means adding both a token and a branch.
 */
export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Move through the Quran',
    items: [
      { command: 'Next ayah', keys: ['↓', 'PgDn', 'J', 'Space'], worksWhileReciting: false },
      { command: 'Previous ayah', keys: ['↑', 'PgUp', 'K'], worksWhileReciting: false },
    ],
  },
  {
    title: 'This ayah',
    items: [
      { command: 'Play or pause recitation', keys: ['P'], worksWhileReciting: true },
      { command: 'Save or unsave', keys: ['B'], worksWhileReciting: false },
      { command: 'Share as an image card', keys: ['S'], worksWhileReciting: false },
      { command: 'Copy with reference', keys: ['C'], worksWhileReciting: false },
      { command: 'Show or hide translation', keys: ['T'], worksWhileReciting: false },
    ],
  },
  {
    title: 'Interface',
    items: [{ command: 'Open or close this list', keys: ['?', 'Ctrl / ⌘ + /'], worksWhileReciting: true }],
  },
];

export const SHORTCUT_COUNTS = {
  commands: SHORTCUT_GROUPS.reduce((sum, group) => sum + group.items.length, 0),
  bindings: SHORTCUT_GROUPS.reduce(
    (sum, group) => sum + group.items.reduce((n, item) => n + item.keys.length, 0),
    0
  ),
};

export const RECITATION_LOCK_NOTE =
  'While a recitation plays, the keys above stay with the audio — P still pauses, and scrolling, swiping and the on-screen arrows always work.';

export const POINTER_NOTE = 'Scroll wheel, swipe, and the on-screen arrows navigate too, and are never locked.';

/** Ctrl/Cmd must keep owning the browser's own shortcuts. */
export function isHelpShortcut(event: KeyboardEvent): boolean {
  return event.key === '?' || ((event.ctrlKey || event.metaKey) && event.key === '/');
}

export function hasForeignModifier(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey || event.altKey;
}
