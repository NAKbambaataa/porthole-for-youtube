import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  formatHotkey,
  hotkeyFromEvent,
  matchesHotkey,
  normalizeSettings,
} from './settings';
import { cleanTitle, formatTime } from './util';

const key = (code: string, mods: Partial<Record<'altKey' | 'ctrlKey' | 'shiftKey' | 'metaKey', boolean>> = {}) => ({
  code,
  altKey: false,
  ctrlKey: false,
  shiftKey: false,
  metaKey: false,
  ...mods,
});

describe('normalizeSettings', () => {
  it('returns defaults for garbage', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings('nope')).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ width: 'x', seekStep: 7, showButton: 1 })).toEqual(DEFAULT_SETTINGS);
  });

  it('clamps width and keeps valid values', () => {
    expect(normalizeSettings({ width: 5 }).width).toBe(240);
    expect(normalizeSettings({ width: 99999 }).width).toBe(1280);
    expect(normalizeSettings({ width: 640.4, seekStep: 30, captions: false })).toMatchObject({
      width: 640,
      seekStep: 30,
      captions: false,
    });
  });

  it('rejects hotkeys without a real modifier', () => {
    const s = normalizeSettings({ hotkey: { code: 'KeyP', alt: false, ctrl: false, shift: true, meta: false } });
    expect(s.hotkey).toEqual(DEFAULT_SETTINGS.hotkey);
  });

  it('rejects modifier-only codes', () => {
    const s = normalizeSettings({ hotkey: { code: 'AltLeft', alt: true } });
    expect(s.hotkey).toEqual(DEFAULT_SETTINGS.hotkey);
  });
});

describe('hotkeys', () => {
  it('matches exactly', () => {
    const hk = DEFAULT_SETTINGS.hotkey;
    expect(matchesHotkey(key('KeyP', { altKey: true }), hk)).toBe(true);
    expect(matchesHotkey(key('KeyP', { altKey: true, shiftKey: true }), hk)).toBe(false);
    expect(matchesHotkey(key('KeyP'), hk)).toBe(false);
  });

  it('records from events', () => {
    expect(hotkeyFromEvent(key('KeyK', { ctrlKey: true, shiftKey: true }))).toEqual({
      code: 'KeyK',
      alt: false,
      ctrl: true,
      shift: true,
      meta: false,
    });
    expect(hotkeyFromEvent(key('KeyK'))).toBeNull();
    expect(hotkeyFromEvent(key('ShiftLeft', { shiftKey: true }))).toBeNull();
  });

  it('formats for mac and others', () => {
    expect(formatHotkey(DEFAULT_SETTINGS.hotkey, true)).toBe('⌥P');
    expect(formatHotkey(DEFAULT_SETTINGS.hotkey, false)).toBe('Alt+P');
    expect(formatHotkey({ code: 'ArrowUp', alt: false, ctrl: true, shift: true, meta: false }, false)).toBe('Ctrl+Shift+↑');
  });
});

describe('util', () => {
  it('formats time', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(75.9)).toBe('1:15');
    expect(formatTime(3725)).toBe('1:02:05');
    expect(formatTime(Infinity)).toBe('LIVE');
    expect(formatTime(NaN)).toBe('0:00');
  });

  it('cleans titles', () => {
    expect(cleanTitle('(3) Cool video - YouTube')).toBe('Cool video');
    expect(cleanTitle('Plain')).toBe('Plain');
  });
});
