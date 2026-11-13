export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** 75 -> "1:15", 3725 -> "1:02:05", Infinity (live) -> "LIVE", NaN -> "0:00". */
export function formatTime(seconds: number): string {
  if (seconds === Infinity) return 'LIVE';
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** "(3) Some video - YouTube" -> "Some video" */
export function cleanTitle(raw: string): string {
  return raw.replace(/^\(\d+\)\s*/, '').replace(/\s+-\s+YouTube$/, '');
}
