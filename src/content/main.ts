// Runs in the page's own JS world (manifest "world": "MAIN") so it can use
// window.documentPictureInPicture. Settings arrive from isolated.ts via CustomEvents.
import { applyCss, h, icon, ICONS } from '../shared/dom';
import { DEFAULT_SETTINGS, matchesHotkey, normalizeSettings, type Settings } from '../shared/settings';
import { cleanTitle } from '../shared/util';
import { mountPipUi, type PipHost, type PipUi } from './pip-ui';

const BTN_CLASS = 'porthole-btn';
const LABEL = 'Pop out video (Porthole)';

interface Session {
  win: Window;
  video: HTMLVideoElement;
  parent: Node;
  nextSibling: ChildNode | null;
  styleAttr: string | null;
  overlay: HTMLElement;
  ui: PipUi;
}

let settings: Settings = DEFAULT_SETTINGS;
let session: Session | null = null;
let opening = false;

const PAGE_CSS = `
.${BTN_CLASS}{display:inline-flex!important;align-items:center;justify-content:center;width:48px;opacity:.9;color:#fff;cursor:pointer}
.${BTN_CLASS}:hover{opacity:1}
.${BTN_CLASS}[aria-pressed="true"]{color:#46dccd}
.${BTN_CLASS} svg{width:24px;height:24px}
.porthole-overlay{position:absolute;inset:0;z-index:12;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;
  background:radial-gradient(circle at 50% 40%,#12485c,#07131d);color:#fff;font:500 16px system-ui,sans-serif}
.porthole-overlay button{padding:8px 16px;border:1px solid rgba(255,255,255,.45);border-radius:999px;background:rgba(255,255,255,.08);
  color:#fff;font:600 14px system-ui,sans-serif;cursor:pointer}
.porthole-overlay button:hover{background:rgba(255,255,255,.2)}
.porthole-toast{position:fixed;left:50%;bottom:32px;transform:translateX(-50%);z-index:2147483647;max-width:80vw;padding:10px 16px;
  border-radius:8px;background:#0b2236;color:#fff;font:500 14px system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.4)}
`;

// ---------- helpers ----------

const docPip = (): PortholeDocPipApi | undefined =>
  (window as unknown as { documentPictureInPicture?: PortholeDocPipApi }).documentPictureInPicture;

const isWatchPage = (): boolean => location.pathname === '/watch';

function findVideo(): HTMLVideoElement | null {
  return (
    document.querySelector<HTMLVideoElement>('#movie_player video.html5-main-video') ??
    document.querySelector<HTMLVideoElement>('video.html5-main-video') ??
    document.querySelector<HTMLVideoElement>('#movie_player video')
  );
}

function toast(message: string): void {
  const el = h(document, 'div', 'porthole-toast', { role: 'status' });
  el.textContent = message;
  document.body.append(el);
  window.setTimeout(() => el.remove(), 3500);
}

function visible(el: Element | null): el is HTMLElement {
  return !!el && getComputedStyle(el).display !== 'none' && el.getAttribute('aria-disabled') !== 'true';
}

const host: PipHost = {
  title: () => cleanTitle(document.title),
  nav: () => ({
    prev: visible(document.querySelector('#movie_player .ytp-prev-button')),
    next: visible(document.querySelector('#movie_player .ytp-next-button')),
  }),
  prev: () => document.querySelector<HTMLElement>('#movie_player .ytp-prev-button')?.click(),
  next: () => document.querySelector<HTMLElement>('#movie_player .ytp-next-button')?.click(),
  close: () => closePip(),
  captionsRoot: () => document.querySelector('#movie_player .ytp-caption-window-container'),
};

// ---------- floating window lifecycle ----------

async function openPip(): Promise<void> {
  if (session) return closePip();
  if (opening || !isWatchPage()) return;

  const api = docPip();
  if (!api) {
    toast('Porthole needs Chrome or Edge 116 or newer.');
    return;
  }
  const video = findVideo();
  if (!video) {
    toast('No video found on this page.');
    return;
  }

  opening = true;
  try {
    const ratio = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9;
    const width = settings.width;
    const win = await api.requestWindow({ width, height: Math.round(width / ratio) });
    startSession(win, video);
  } catch (err) {
    console.warn('[Porthole] could not open floating window', err);
    toast("Couldn't open the floating window.");
  } finally {
    opening = false;
  }
}

function startSession(win: Window, video: HTMLVideoElement): void {
  const overlay = buildOverlay();
  document.querySelector('#movie_player')?.append(overlay);

  const s: Session = {
    win,
    video,
    parent: video.parentNode ?? document.body,
    nextSibling: video.nextSibling,
    styleAttr: video.getAttribute('style'),
    overlay,
    ui: undefined as unknown as PipUi,
  };
  s.ui = mountPipUi(win, video, settings, host); // moves the <video> into the new window
  session = s;
  win.addEventListener('pagehide', () => restore(s));
  refreshButton();
}

function restore(s: Session): void {
  if (session !== s) return;
  session = null;
  s.ui.destroy();
  try {
    if (s.nextSibling && s.nextSibling.parentNode === s.parent) s.parent.insertBefore(s.video, s.nextSibling);
    else s.parent.appendChild(s.video);
    if (s.styleAttr === null) s.video.removeAttribute('style');
    else s.video.setAttribute('style', s.styleAttr);
  } catch (err) {
    console.warn('[Porthole] could not restore video', err);
  }
  s.overlay.remove();
  try {
    if (!s.win.closed) s.win.close();
  } catch {
    /* already gone */
  }
  refreshButton();
  window.dispatchEvent(new Event('resize')); // nudge YouTube to re-lay out the player
}

function closePip(): void {
  if (session) restore(session);
}

function buildOverlay(): HTMLElement {
  const el = h(document, 'div', 'porthole-overlay');
  const msg = h(document, 'div');
  msg.textContent = 'Playing in Porthole';
  const back = h(document, 'button', undefined, { type: 'button' });
  back.textContent = 'Return video to tab';
  back.addEventListener('click', (e) => {
    e.stopPropagation();
    closePip();
  });
  el.append(msg, back);
  el.addEventListener('click', (e) => e.stopPropagation());
  return el;
}

// ---------- player button ----------

function refreshButton(): void {
  const btn = document.querySelector<HTMLElement>(`.${BTN_CLASS}`);
  btn?.setAttribute('aria-pressed', String(!!session));
}

function ensureButton(): void {
  const existing = document.querySelector(`.${BTN_CLASS}`);
  if (!settings.showButton || !isWatchPage()) {
    existing?.remove();
    return;
  }
  if (existing?.isConnected) return;

  const controls = document.querySelector('#movie_player .ytp-right-controls');
  if (!controls) return;

  const btn = h(document, 'button', `ytp-button ${BTN_CLASS}`, {
    type: 'button',
    'aria-label': LABEL,
    'aria-pressed': String(!!session),
    title: LABEL,
  });
  btn.append(icon(document, ICONS.pop));
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    void openPip();
  });

  const fullscreen = controls.querySelector('.ytp-fullscreen-button');
  if (fullscreen) fullscreen.before(btn);
  else controls.append(btn);
}

// ---------- auto pop-out when switching tabs (Chrome's "auto picture-in-picture") ----------

function applyAutoPop(): void {
  try {
    navigator.mediaSession.setActionHandler(
      'enterpictureinpicture' as MediaSessionAction,
      settings.autoPopOnTabSwitch
        ? () => {
            if (!session && isWatchPage()) void openPip();
          }
        : null,
    );
  } catch {
    /* action not supported in this Chrome version */
  }
}

// ---------- wiring ----------

function onSettings(): void {
  ensureButton();
  applyAutoPop();
  session?.ui.applySettings(settings);
}

window.addEventListener('porthole:settings', (e) => {
  try {
    settings = normalizeSettings(JSON.parse((e as CustomEvent<string>).detail));
  } catch {
    return;
  }
  onSettings();
});

window.addEventListener(
  'keydown',
  (e) => {
    if (e.repeat || !isWatchPage() || !matchesHotkey(e, settings.hotkey)) return;
    e.preventDefault();
    e.stopPropagation();
    void openPip();
  },
  true,
);

document.addEventListener('yt-navigate-finish', () => {
  if (session && !isWatchPage()) closePip();
  ensureButton();
  applyAutoPop();
});

function init(): void {
  applyCss(window, PAGE_CSS, 'porthole-page-style');
  ensureButton();
  window.setInterval(ensureButton, 1000);
  applyAutoPop();
  window.dispatchEvent(new CustomEvent('porthole:hello'));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
// Ask for settings as early as possible (document_start) too.
window.dispatchEvent(new CustomEvent('porthole:hello'));
