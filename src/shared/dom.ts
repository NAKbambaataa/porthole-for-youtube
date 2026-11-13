// DOM helpers. YouTube enforces Trusted Types, so never use innerHTML: build nodes explicitly.

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface IconPart {
  d: string;
  /** Draw as a stroked line instead of a filled shape. */
  stroke?: boolean;
}

export const ICONS = {
  play: [{ d: 'M8 5v14l11-7z' }],
  pause: [{ d: 'M6 5h4v14H6zM14 5h4v14h-4z' }],
  next: [{ d: 'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z' }],
  prev: [{ d: 'M6 6h2v12H6zM9.5 12l8.5 6V6z' }],
  volume: [
    { d: 'M3 9v6h4l5 5V4L7 9H3z' },
    { d: 'M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12', stroke: true },
  ],
  muted: [{ d: 'M3 9v6h4l5 5V4L7 9H3z' }, { d: 'M16 9.5l5 5M21 9.5l-5 5', stroke: true }],
  returnTab: [{ d: 'M8 16L18 6M10 6h8v8', stroke: true }],
  // Porthole button: a window with a round porthole in it.
  pop: [
    { d: 'M5.5 4.5h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2z', stroke: true },
    { d: 'M15 10a3.2 3.2 0 1 0 0.01 0z' },
  ],
} satisfies Record<string, IconPart[]>;

export function icon(doc: Document, parts: IconPart[], size = 24): SVGSVGElement {
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const part of parts) {
    const path = doc.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', part.d);
    if (part.stroke) {
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
    } else {
      path.setAttribute('fill', 'currentColor');
    }
    svg.append(path);
  }
  return svg;
}

export function h<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  className?: string,
  attrs?: Record<string, string>,
): HTMLElementTagNameMap[K] {
  const el = doc.createElement(tag);
  if (className) el.className = className;
  if (attrs) for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

/**
 * Applies CSS to a document. Prefers constructable stylesheets (not affected by a page's
 * inline-style CSP) and falls back to a <style> element.
 */
export function applyCss(win: Window, css: string, id?: string): void {
  const doc = win.document;
  try {
    const Sheet = (win as unknown as { CSSStyleSheet: typeof CSSStyleSheet }).CSSStyleSheet;
    const sheet = new Sheet();
    sheet.replaceSync(css);
    doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, sheet];
    return;
  } catch {
    /* fall through */
  }
  const style = doc.createElement('style');
  if (id) style.id = id;
  style.textContent = css;
  (doc.head ?? doc.documentElement).append(style);
}
