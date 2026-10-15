// Browser-side cache of the most recent candles per chart feed/resolution.
//
// The datafeeds use it stale-while-revalidate: on a chart's first history
// request the cached bars are handed to the library immediately (so the chart
// paints without waiting on the network), then a fresh fetch runs in the
// background and any bars newer than the cached ones are streamed into the
// chart through the same onTick path live updates use. Nothing here touches
// the server — it only avoids re-waiting for data the browser already saw.

export interface CachedBar {
  time: number; // ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

type TickFn = (bar: CachedBar) => void;

const PREFIX = "dex-candles-v1:";
const MAX_BARS = 300; // per key — enough for the initial view, small on disk
const MAX_KEYS = 24; // oldest keys are evicted beyond this
const MAX_AGE_MS = 7 * 24 * 60 * 60_000;

const memory = new Map<string, CachedBar[]>();

export function readCandles(key: string): CachedBar[] | null {
  const hit = memory.get(key);
  if (hit) return hit;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { savedAt, bars } = JSON.parse(raw) as { savedAt: number; bars: CachedBar[] };
    if (!Array.isArray(bars) || bars.length === 0 || Date.now() - savedAt > MAX_AGE_MS) return null;
    memory.set(key, bars);
    return bars;
  } catch {
    return null;
  }
}

export function writeCandles(key: string, bars: CachedBar[]): void {
  if (bars.length === 0) return;
  const trimmed = bars.slice(-MAX_BARS);
  memory.set(key, trimmed);
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ savedAt: Date.now(), bars: trimmed }));
    evictOld();
  } catch {
    // Storage full or blocked — the in-memory copy still serves this session.
  }
}

function evictOld(): void {
  try {
    const entries: { k: string; savedAt: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(PREFIX)) continue;
      const savedAt = (JSON.parse(localStorage.getItem(k) ?? "{}") as { savedAt?: number }).savedAt ?? 0;
      entries.push({ k, savedAt });
    }
    if (entries.length <= MAX_KEYS) return;
    entries.sort((a, b) => a.savedAt - b.savedAt);
    for (const e of entries.slice(0, entries.length - MAX_KEYS)) localStorage.removeItem(e.k);
  } catch {
    /* ignore */
  }
}

// ─── Delivering the background-refresh bars into a live chart ───────────────

const listeners = new Map<string, Map<string, TickFn>>(); // key -> guid -> onTick
const pending = new Map<string, CachedBar[]>(); // refresh finished before subscribeBars
const lastTickTime = new Map<string, number>(); // newest bar the chart has seen via ticks
const guidKey = new Map<string, string>();

// Wrap the library's onTick so we know the newest bar time it has received;
// late refresh bars older than that are skipped (the library rejects ticks
// that go backwards in time).
export function trackTicks(key: string, guid: string, onTick: TickFn): TickFn {
  guidKey.set(guid, key);
  let set = listeners.get(key);
  if (!set) listeners.set(key, (set = new Map()));
  const wrapped: TickFn = (bar) => {
    const prev = lastTickTime.get(key) ?? 0;
    if (bar.time >= prev) lastTickTime.set(key, bar.time);
    onTick(bar);
  };
  set.set(guid, wrapped);
  const late = pending.get(key);
  if (late) {
    pending.delete(key);
    deliver(key, late);
  }
  return wrapped;
}

export function untrackTicks(guid: string): void {
  const key = guidKey.get(guid);
  if (!key) return;
  guidKey.delete(guid);
  listeners.get(key)?.delete(guid);
}

// Bars newer than what the chart painted from cache; queued if the chart
// hasn't subscribed yet.
export function deliverLateBars(key: string, bars: CachedBar[]): void {
  if (bars.length === 0) return;
  if ((listeners.get(key)?.size ?? 0) === 0) {
    pending.set(key, bars);
    return;
  }
  deliver(key, bars);
}

function deliver(key: string, bars: CachedBar[]): void {
  const fns = listeners.get(key);
  if (!fns) return;
  const floor = lastTickTime.get(key) ?? 0;
  for (const bar of bars) {
    if (bar.time < floor) continue;
    fns.forEach((fn) => fn(bar));
  }
}

// Test helper: forget everything (memory + localStorage + pending delivery).
export function clearCandleCache(): void {
  memory.clear();
  pending.clear();
  lastTickTime.clear();
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}
