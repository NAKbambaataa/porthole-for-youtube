export interface Hotkey {
  /** KeyboardEvent.code, so the shortcut is layout independent (Option+P on macOS types "π"). */
  code: string;
  alt: boolean;
  ctrl: boolean;
  shift: boolean;
  meta: boolean;
}

export interface Settings {
  showButton: boolean;
  hotkey: Hotkey;
  seekStep: number;
  width: number;
  captions: boolean;
  autoHideControls: boolean;
  autoPopOnTabSwitch: boolean;
}

export const SETTINGS_KEY = 'settings';
export const SEEK_STEPS = [5, 10, 15, 30] as const;
export const WIDTH_MIN = 240;
export const WIDTH_MAX = 1280;

export const DEFAULT_SETTINGS: Settings = {
  showButton: true,
  hotkey: { code: 'KeyP', alt: true, ctrl: false, shift: false, meta: false },
  seekStep: 10,
  width: 480,
  captions: true,
  autoHideControls: true,
  autoPopOnTabSwitch: false,
};

const MODIFIER_CODES = /^(Alt|Control|Shift|Meta|OS)(Left|Right)?$/;

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

export function normalizeHotkey(raw: unknown): Hotkey {
  const fallback = DEFAULT_SETTINGS.hotkey;
  if (!raw || typeof raw !== 'object') return { ...fallback };
  const r = raw as Record<string, unknown>;
  const code = typeof r.code === 'string' ? r.code : '';
  if (!code || code.length > 24 || MODIFIER_CODES.test(code)) return { ...fallback };
  const hk: Hotkey = {
    code,
    alt: bool(r.alt, false),
    ctrl: bool(r.ctrl, false),
    shift: bool(r.shift, false),
    meta: bool(r.meta, false),
  };
  // Require a "real" modifier so the shortcut can never fire while typing.
  if (!hk.alt && !hk.ctrl && !hk.meta) return { ...fallback };
  return hk;
}

/** Validates untrusted/old stored data and fills in defaults. */
export function normalizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  const seek = typeof r.seekStep === 'number' && (SEEK_STEPS as readonly number[]).includes(r.seekStep);
  const width = typeof r.width === 'number' && Number.isFinite(r.width) ? r.width : d.width;
  return {
    showButton: bool(r.showButton, d.showButton),
    hotkey: normalizeHotkey(r.hotkey),
    seekStep: seek ? (r.seekStep as number) : d.seekStep,
    width: Math.round(Math.min(WIDTH_MAX, Math.max(WIDTH_MIN, width))),
    captions: bool(r.captions, d.captions),
    autoHideControls: bool(r.autoHideControls, d.autoHideControls),
    autoPopOnTabSwitch: bool(r.autoPopOnTabSwitch, d.autoPopOnTabSwitch),
  };
}

export async function loadSettings(): Promise<Settings> {
  try {
    const stored = await chrome.storage.sync.get(SETTINGS_KEY);
    return normalizeSettings(stored[SETTINGS_KEY]);
  } catch {
    return { ...DEFAULT_SETTINGS, hotkey: { ...DEFAULT_SETTINGS.hotkey } };
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.sync.set({ [SETTINGS_KEY]: normalizeSettings(settings) });
}

export interface KeyLike {
  code: string;
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

export function matchesHotkey(e: KeyLike, hk: Hotkey): boolean {
  return (
    e.code === hk.code &&
    e.altKey === hk.alt &&
    e.ctrlKey === hk.ctrl &&
    e.shiftKey === hk.shift &&
    e.metaKey === hk.meta
  );
}

/** Builds a hotkey from a keydown event, or null if it isn't a valid shortcut yet. */
export function hotkeyFromEvent(e: KeyLike): Hotkey | null {
  if (!e.code || MODIFIER_CODES.test(e.code)) return null;
  if (!e.altKey && !e.ctrlKey && !e.metaKey) return null;
  return { code: e.code, alt: e.altKey, ctrl: e.ctrlKey, shift: e.shiftKey, meta: e.metaKey };
}

const CODE_LABELS: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Space: 'Space',
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backslash: '\\',
};

export function codeLabel(code: string): string {
  if (code in CODE_LABELS) return CODE_LABELS[code]!;
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  return code;
}

export function formatHotkey(hk: Hotkey, mac: boolean): string {
  const parts: string[] = [];
  if (hk.ctrl) parts.push(mac ? '⌃' : 'Ctrl');
  if (hk.alt) parts.push(mac ? '⌥' : 'Alt');
  if (hk.shift) parts.push(mac ? '⇧' : 'Shift');
  if (hk.meta) parts.push(mac ? '⌘' : 'Win');
  parts.push(codeLabel(hk.code));
  return mac ? parts.join('') : parts.join('+');
}
