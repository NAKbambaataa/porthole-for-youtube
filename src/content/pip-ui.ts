import { applyCss, h, icon, ICONS } from '../shared/dom';
import { matchesHotkey, type Settings } from '../shared/settings';
import { clamp, formatTime } from '../shared/util';

export interface PipHost {
  title(): string;
  nav(): { prev: boolean; next: boolean };
  prev(): void;
  next(): void;
  /** Close the floating window and return the video to the tab. */
  close(): void;
  /** YouTube's caption container in the main page, if present. */
  captionsRoot(): Element | null;
}

export interface PipUi {
  applySettings(settings: Settings): void;
  destroy(): void;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const CSS = `
*{box-sizing:border-box}
[hidden]{display:none!important}
html,body{margin:0;height:100%;background:#000;overflow:hidden;color:#fff;user-select:none;-webkit-user-select:none;
  font:13px/1.3 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.root{position:relative;width:100%;height:100%;overflow:hidden}
.stage{position:absolute;inset:0;background:#000}
.stage video{position:absolute!important;inset:0!important;left:0!important;top:0!important;
  width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;
  margin:0!important;transform:none!important;object-fit:contain!important}
.captions{position:absolute;left:6%;right:6%;bottom:64px;text-align:center;pointer-events:none;
  font-size:clamp(12px,3.4vw,24px);line-height:1.35;transition:bottom .2s}
.captions span{display:inline-block;max-width:100%;white-space:pre-line;padding:2px 8px;border-radius:4px;
  background:rgba(8,8,8,.78)}
.root.idle .captions{bottom:14px}
.top,.bottom{position:absolute;left:0;right:0;display:flex;transition:opacity .2s}
.top{top:0;align-items:flex-start;gap:8px;padding:8px 8px 22px;background:linear-gradient(rgba(0,0,0,.75),transparent)}
.title{flex:1;min-width:0;padding-top:5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bottom{bottom:0;flex-direction:column;gap:0;padding:22px 8px 6px;background:linear-gradient(transparent,rgba(0,0,0,.85))}
.root.idle .top,.root.idle .bottom{opacity:0;pointer-events:none}
.root.idle{cursor:none}
.row{display:flex;align-items:center;gap:2px}
.spacer{flex:1}
.btn{display:inline-flex;align-items:center;justify-content:center;min-width:32px;height:32px;padding:0 6px;border:0;border-radius:6px;
  background:transparent;color:inherit;font:inherit;font-weight:600;cursor:pointer}
.btn:hover{background:rgba(255,255,255,.16)}
.btn:focus-visible{outline:2px solid #46dccd;outline-offset:-2px}
.btn:disabled{opacity:.35;cursor:default;background:transparent}
.time{padding:0 8px;font-variant-numeric:tabular-nums;white-space:nowrap;opacity:.9}
.vol{width:70px;accent-color:#46dccd;cursor:pointer}
.track{position:relative;height:16px;cursor:pointer;touch-action:none}
.rail,.buf,.fill{position:absolute;left:0;top:6px;height:4px;border-radius:2px;transition:height .1s,top .1s}
.rail{right:0;background:rgba(255,255,255,.3)}
.buf{background:rgba(255,255,255,.35);width:0}
.fill{background:#46dccd;width:0}
.thumb{position:absolute;top:3px;width:10px;height:10px;margin-left:-5px;border-radius:50%;background:#46dccd;
  transform:scale(0);transition:transform .1s;left:0}
.track:hover .rail,.track:hover .buf,.track:hover .fill{top:5px;height:6px}
.track:hover .thumb,.track.drag .thumb{transform:scale(1)}
@media (max-width:420px){.vol,.speed{display:none}.time{padding:0 4px}}
@media (max-width:300px){.mute{display:none}}
`;

function btn(doc: Document, label: string, content: Node | string, onClick: () => void, extra = ''): HTMLButtonElement {
  const b = h(doc, 'button', `btn ${extra}`.trim(), { type: 'button', 'aria-label': label, title: label });
  b.append(content);
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return b;
}

export function mountPipUi(win: Window, video: HTMLVideoElement, initial: Settings, host: PipHost): PipUi {
  const doc = win.document;
  let settings = initial;
  doc.title = 'Porthole';
  applyCss(win, CSS, 'porthole-pip-style');

  // ---- build DOM ----
  const root = h(doc, 'div', 'root');
  const stage = h(doc, 'div', 'stage');
  stage.append(video);

  const captionsEl = h(doc, 'div', 'captions');
  const captionsText = h(doc, 'span');
  captionsEl.append(captionsText);
  captionsEl.hidden = true;

  const titleEl = h(doc, 'div', 'title');
  const returnBtn = btn(doc, 'Return video to tab', icon(doc, ICONS.returnTab), () => host.close());
  const top = h(doc, 'div', 'top');
  top.append(titleEl, returnBtn);

  const track = h(doc, 'div', 'track', { role: 'slider', 'aria-label': 'Seek' });
  const rail = h(doc, 'div', 'rail');
  const buf = h(doc, 'div', 'buf');
  const fill = h(doc, 'div', 'fill');
  const thumb = h(doc, 'div', 'thumb');
  track.append(rail, buf, fill, thumb);

  const toggle = () => {
    if (video.paused) void video.play().catch(() => {});
    else video.pause();
  };
  const seekBy = (s: number) => {
    if (Number.isFinite(video.duration)) video.currentTime = clamp(video.currentTime + s, 0, video.duration);
  };
  const volumeBy = (d: number) => {
    video.muted = false;
    video.volume = clamp(Math.round((video.volume + d) * 100) / 100, 0, 1);
  };
  const speedBy = (dir: 1 | -1) => {
    let i = SPEEDS.findIndex((s) => s >= video.playbackRate - 0.001);
    if (i < 0) i = SPEEDS.length - 1;
    video.playbackRate = SPEEDS[clamp(i + dir, 0, SPEEDS.length - 1)]!;
  };

  const prevBtn = btn(doc, 'Previous video (Shift+P)', icon(doc, ICONS.prev), () => host.prev());
  const playBtn = btn(doc, 'Play / pause (Space)', icon(doc, ICONS.play), toggle);
  const nextBtn = btn(doc, 'Next video (Shift+N)', icon(doc, ICONS.next), () => host.next());
  const muteBtn = btn(doc, 'Mute (M)', icon(doc, ICONS.volume), () => (video.muted = !video.muted), 'mute');
  const vol = h(doc, 'input', 'vol', { type: 'range', min: '0', max: '1', step: '0.05', 'aria-label': 'Volume' });
  vol.addEventListener('input', () => {
    video.volume = Number(vol.value);
    video.muted = video.volume === 0;
  });
  const timeEl = h(doc, 'div', 'time');
  const speedBtn = btn(doc, 'Playback speed (click to cycle, Shift+click to go back)', '1×', () => {}, 'speed');
  speedBtn.addEventListener('click', (e) => {
    const next = SPEEDS[(SPEEDS.indexOf(video.playbackRate) + 1) % SPEEDS.length] ?? 1;
    const prev = SPEEDS[(SPEEDS.indexOf(video.playbackRate) - 1 + SPEEDS.length) % SPEEDS.length] ?? 1;
    video.playbackRate = e.shiftKey ? prev : next;
  });

  const row = h(doc, 'div', 'row');
  row.append(prevBtn, playBtn, nextBtn, muteBtn, vol, timeEl, h(doc, 'div', 'spacer'), speedBtn);
  const bottom = h(doc, 'div', 'bottom');
  bottom.append(track, row);

  root.append(stage, captionsEl, top, bottom);
  doc.body.append(root);

  // ---- state sync ----
  let shownPlaying: boolean | null = null;
  let shownMuted: boolean | null = null;

  function sync(): void {
    const d = video.duration;
    const t = video.currentTime;
    const pct = Number.isFinite(d) && d > 0 ? clamp(t / d, 0, 1) * 100 : 0;
    fill.style.width = `${pct}%`;
    thumb.style.left = `${pct}%`;
    let bufPct = 0;
    if (Number.isFinite(d) && d > 0 && video.buffered.length) {
      bufPct = (video.buffered.end(video.buffered.length - 1) / d) * 100;
    }
    buf.style.width = `${clamp(bufPct, 0, 100)}%`;
    track.setAttribute('aria-valuenow', String(Math.round(pct)));
    timeEl.textContent = Number.isFinite(d) ? `${formatTime(t)} / ${formatTime(d)}` : formatTime(d);

    const playing = !video.paused;
    if (playing !== shownPlaying) {
      shownPlaying = playing;
      playBtn.replaceChildren(icon(doc, playing ? ICONS.pause : ICONS.play));
      if (!playing) wake();
    }
    const muted = video.muted || video.volume === 0;
    if (muted !== shownMuted) {
      shownMuted = muted;
      muteBtn.replaceChildren(icon(doc, muted ? ICONS.muted : ICONS.volume));
    }
    vol.value = String(muted ? 0 : video.volume);
    speedBtn.textContent = `${video.playbackRate}×`;
  }

  function slowSync(): void {
    const title = host.title();
    if (titleEl.textContent !== title) titleEl.textContent = title;
    const nav = host.nav();
    prevBtn.disabled = !nav.prev;
    nextBtn.disabled = !nav.next;
    attachCaptions();
  }

  // ---- captions mirror (YouTube draws captions as DOM, so they don't travel with the <video>) ----
  let capRoot: Element | null = null;
  let capObserver: MutationObserver | null = null;

  function readCaptions(): string {
    if (!capRoot) return '';
    const lines: string[] = [];
    for (const w of capRoot.querySelectorAll('.caption-window')) {
      const visual = w.querySelectorAll('.caption-visual-line');
      if (visual.length) visual.forEach((l) => lines.push((l.textContent ?? '').trim()));
      else lines.push((w.textContent ?? '').trim());
    }
    return lines.filter(Boolean).join('\n');
  }

  function renderCaptions(): void {
    const text = settings.captions ? readCaptions() : '';
    captionsText.textContent = text;
    captionsEl.hidden = !text;
  }

  function attachCaptions(): void {
    const r = host.captionsRoot();
    if (r === capRoot && (!r || r.isConnected)) return;
    capObserver?.disconnect();
    capObserver = null;
    capRoot = r;
    if (r) {
      capObserver = new MutationObserver(renderCaptions);
      capObserver.observe(r, { subtree: true, childList: true, characterData: true });
    }
    renderCaptions();
  }

  // ---- auto-hide controls ----
  let idleTimer = 0;
  function wake(): void {
    root.classList.remove('idle');
    win.clearTimeout(idleTimer);
    if (settings.autoHideControls) {
      idleTimer = win.setTimeout(() => {
        if (!video.paused) root.classList.add('idle');
      }, 2500);
    }
  }
  root.addEventListener('mousemove', wake);
  root.addEventListener('pointerdown', wake);
  root.addEventListener('mouseleave', () => {
    if (settings.autoHideControls && !video.paused) root.classList.add('idle');
  });

  // ---- input ----
  stage.addEventListener('click', toggle);

  let dragging = false;
  const scrub = (e: PointerEvent) => {
    const r = track.getBoundingClientRect();
    if (Number.isFinite(video.duration) && r.width > 0) {
      video.currentTime = clamp((e.clientX - r.left) / r.width, 0, 1) * video.duration;
      sync();
    }
  };
  track.addEventListener('pointerdown', (e) => {
    dragging = true;
    track.classList.add('drag');
    track.setPointerCapture(e.pointerId);
    scrub(e);
  });
  track.addEventListener('pointermove', (e) => dragging && scrub(e));
  const endDrag = () => {
    dragging = false;
    track.classList.remove('drag');
  };
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);

  doc.addEventListener('keydown', (e) => {
    if (matchesHotkey(e, settings.hotkey)) {
      e.preventDefault();
      host.close();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    let handled = true;
    if (e.shiftKey && k === 'n') host.next();
    else if (e.shiftKey && k === 'p') host.prev();
    else if (k === ' ' || k === 'k') toggle();
    else if (k === 'arrowleft' || k === 'j') seekBy(-settings.seekStep);
    else if (k === 'arrowright' || k === 'l') seekBy(settings.seekStep);
    else if (k === 'arrowup') volumeBy(0.05);
    else if (k === 'arrowdown') volumeBy(-0.05);
    else if (k === 'm') video.muted = !video.muted;
    else if (e.key === '>') speedBy(1);
    else if (e.key === '<') speedBy(-1);
    else handled = false;
    if (handled) {
      e.preventDefault();
      wake();
    }
  });

  // ---- wiring ----
  const events = ['play', 'pause', 'volumechange', 'ratechange', 'timeupdate', 'durationchange', 'loadedmetadata', 'progress', 'seeking'];
  for (const ev of events) video.addEventListener(ev, sync);
  const tick = window.setInterval(() => {
    sync();
    slowSync();
  }, 500);
  sync();
  slowSync();
  wake();

  return {
    applySettings(next) {
      settings = next;
      renderCaptions();
      wake();
    },
    destroy() {
      window.clearInterval(tick);
      win.clearTimeout(idleTimer);
      capObserver?.disconnect();
      for (const ev of events) video.removeEventListener(ev, sync);
    },
  };
}
