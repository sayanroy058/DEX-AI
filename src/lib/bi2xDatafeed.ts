// A custom datafeed for the licensed TradingView Advanced Charting Library,
// backed by the BI2X data feed's TradingView UDF-compatible endpoints
// (https://bitdx-feed-jk3y.onrender.com/api/datafeed/*).
//
// This mirrors binanceDatafeed.ts's shape (same IDatafeedChartApi/
// IExternalDatafeed-satisfying object, same Bar/PeriodParams types) so
// TradingChart.tsx can plug either one in without changing its own code.
//
// Requests go through OUR backend (VITE_AUTH_API_URL + /bi2x-chart/*), not
// the feed's own domain directly — that server sends no
// Access-Control-Allow-Origin header at all (confirmed via a real preflight
// request, 2026-09-12), so every browser call to it directly is silently
// CORS-blocked. Dex-Backend's BI2XChartProxy (internal/api/bi2xchart.go)
// forwards server-to-server and adds CORS on our own response instead. If
// the feed owner ever adds CORS on their end, BI2X_CHART_BASE_URL below is
// the only line that would need to change back to calling them directly.
//
// A hand-rolled UDF client rather than TradingView's own
// Datafeeds.UDFCompatibleDatafeed wrapper: that wrapper ships as a separate
// bundle (datafeeds/udf/dist/bundle.js) alongside the licensed library and
// isn't currently vendored into public/charting_library/ (see that
// directory's own contents) — adding a second vendored TradingView asset
// for this one asset's chart isn't worth it when the UDF protocol itself is
// simple enough to implement directly against the same interface
// binanceDatafeed.ts already satisfies.

const BI2X_CHART_BASE_URL = (import.meta.env.VITE_AUTH_API_URL ?? "http://localhost:8081") + "/bi2x-chart";

type ResolutionString = string;

interface Bar {
  time: number; // ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface PeriodParams {
  from: number; // unix seconds
  to: number; // unix seconds
  countBack: number;
  firstDataRequest: boolean;
}

interface LibrarySymbolInfo {
  name: string;
  ticker: string;
  description: string;
  type: string;
  session: string;
  timezone: string;
  exchange: string;
  listed_exchange: string;
  format: "price";
  pricescale: number;
  minmov: number;
  has_intraday: boolean;
  has_seconds: boolean;
  has_daily: boolean;
  has_weekly_and_monthly: boolean;
  supported_resolutions: ResolutionString[];
  volume_precision: number;
  data_status: "streaming";
}

type OnReadyCallback = (config: {
  supported_resolutions: ResolutionString[];
  supports_marks: boolean;
  supports_timescale_marks: boolean;
  supports_time: boolean;
}) => void;
type ResolveCallback = (symbolInfo: LibrarySymbolInfo) => void;
type ErrorCallback = (reason: string) => void;
type HistoryCallback = (bars: Bar[], meta: { noData: boolean }) => void;
type SubscribeBarsCallback = (bar: Bar) => void;

// The feed's own UDF config (confirmed live 2026-09-12) minus "1D" and the
// four sub-second resolutions ("1S"/"5S"/"15S"/"30S") — this chart's
// resolution picker (TradingChart.tsx's `tf`) only ever offers the same
// minute/hour/day granularities every other pair on this exchange does, so
// those are the only ones mapped below. The feed supports more than this if
// the picker is ever extended to seconds-level bars.
const SUPPORTED_RESOLUTIONS: ResolutionString[] = ["1", "5", "15", "30", "60", "240", "D"];

// Maps OUR resolution strings (used by the chart's timeframe picker and by
// binanceDatafeed.ts) to the feed's own resolution codes. Everything is
// identical except daily: the feed uses "1D", not the bare "D" every other
// TradingView convention (and our own SUPPORTED_RESOLUTIONS above) uses.
function toFeedResolution(resolution: ResolutionString): string {
  return resolution === "D" ? "1D" : resolution;
}

/** ms-per-bar for each of OUR resolution codes — used only to size the
 * default lookback window on the first history request. */
const RESOLUTION_TO_MS: Record<string, number> = {
  "1": 60_000,
  "5": 5 * 60_000,
  "15": 15 * 60_000,
  "30": 30 * 60_000,
  "60": 60 * 60_000,
  "240": 4 * 60 * 60_000,
  "D": 24 * 60 * 60_000,
};

interface UDFHistoryResponse {
  s: "ok" | "no_data" | "error";
  t?: number[]; // unix seconds
  o?: number[];
  h?: number[];
  l?: number[];
  c?: number[];
  v?: number[];
  nextTime?: number;
  errmsg?: string;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`bi2x chart proxy ${res.status}`);
  return res.json() as Promise<T>;
}

// One shared poll per resolution, fanned out to however many chart panes are
// currently subscribed (mirrors binanceDatafeed.ts's wsRegistry, but polling
// instead of a socket — the feed has no live stream, see the spec sent to
// its owner). 3s matches Price-Fetcher's own BI2X poll cadence (see
// Price-Fetcher's config.go BitDxFeedPoll default) — polling faster than
// the upstream feed itself updates would just repeat the same tick.
const POLL_MS = 3000;
type PollEntry = {
  timer: ReturnType<typeof setInterval> | null;
  listeners: Map<string, SubscribeBarsCallback>;
  lastBarTime: number;
  tick: () => Promise<void>;
};
const pollRegistry = new Map<string, PollEntry>();

// Pause every resolution's poll while the tab is hidden and resume (with an
// immediate tick, same as usePollingResource's visibility handling) when it
// becomes visible again — see PERFORMANCE-CODE-REVIEW-FINDINGS.md frontend
// item #7: this poll previously never paused, so a backgrounded chart tab
// kept hitting the BI2X chart proxy every 3s indefinitely. One listener for
// the whole module (not per-resolution) is enough since it just iterates
// pollRegistry's current entries.
let visibilityListenerAttached = false;
function ensureVisibilityListener(): void {
  if (visibilityListenerAttached || typeof document === "undefined") return;
  visibilityListenerAttached = true;
  document.addEventListener("visibilitychange", () => {
    for (const entry of pollRegistry.values()) {
      if (document.hidden) {
        if (entry.timer) {
          clearInterval(entry.timer);
          entry.timer = null;
        }
      } else if (!entry.timer) {
        void entry.tick();
        entry.timer = setInterval(() => void entry.tick(), POLL_MS);
      }
    }
  });
}

function startPolling(resolution: ResolutionString, guid: string, onTick: SubscribeBarsCallback): void {
  const key = resolution;
  let entry = pollRegistry.get(key);
  if (!entry) {
    const listeners = new Map<string, SubscribeBarsCallback>();
    const state: PollEntry = { timer: null, listeners, lastBarTime: 0, tick: async () => {} };

    state.tick = async () => {
      try {
        const nowSec = Math.floor(Date.now() / 1000);
        const res = await fetchJSON<UDFHistoryResponse>(
          `${BI2X_CHART_BASE_URL}/history?symbol=BI2X&resolution=${toFeedResolution(resolution)}&to=${nowSec}&countback=2`
        );
        if (res.s !== "ok" || !res.t || res.t.length === 0) return;
        const i = res.t.length - 1;
        const bar: Bar = {
          time: res.t[i] * 1000,
          open: res.o![i],
          high: res.h![i],
          low: res.l![i],
          close: res.c![i],
          volume: res.v?.[i],
        };
        // Only forward a bar the library hasn't already seen — a bar with
        // the same open time as last poll is the same still-forming candle
        // (an update, which the library also accepts via onTick), a NEWER
        // open time is a genuinely new bar. Recording it either way keeps
        // lastBarTime meaningful; the library itself decides update-vs-new
        // from the bar's own `time` field, so this dedup is purely to avoid
        // redundant calls with a byte-identical bar between polls.
        if (bar.time < state.lastBarTime) return;
        state.lastBarTime = bar.time;
        listeners.forEach((fn) => fn(bar));
      } catch {
        // Transient feed/proxy hiccup: skip this tick, the next one retries.
      }
    };

    if (typeof document === "undefined" || !document.hidden) {
      state.timer = setInterval(() => void state.tick(), POLL_MS);
    }
    void state.tick(); // first tick immediately, don't wait a full interval
    ensureVisibilityListener();
    entry = state;
    pollRegistry.set(key, entry);
  }
  entry.listeners.set(guid, onTick);
}

function stopPolling(guid: string): void {
  for (const [key, entry] of pollRegistry.entries()) {
    if (entry.listeners.delete(guid) && entry.listeners.size === 0) {
      if (entry.timer) clearInterval(entry.timer);
      pollRegistry.delete(key);
    }
  }
}

export function createBI2XDatafeed() {
  return {
    onReady(callback: OnReadyCallback) {
      setTimeout(() => {
        callback({
          supported_resolutions: SUPPORTED_RESOLUTIONS,
          supports_marks: false,
          supports_timescale_marks: false,
          supports_time: true,
        });
      }, 0);
    },

    searchSymbols(): void {
      // Not exposed in the trade UI — the pair is chosen via the exchange's
      // own market selector, same as binanceDatafeed.ts.
    },

    resolveSymbol(symbolName: string, onResolve: ResolveCallback, onError: ErrorCallback) {
      if (!symbolName) {
        onError("invalid symbol");
        return;
      }
      const symbolInfo: LibrarySymbolInfo = {
        name: "BI2X",
        ticker: "BI2X",
        description: "BI2X / BI2XUSD",
        type: "crypto",
        session: "24x7",
        timezone: "UTC",
        exchange: "BITDX",
        listed_exchange: "BITDX",
        format: "price",
        // Matches the feed's own /symbols response (pricescale 100000,
        // tick_size 0.00001) — BI2X trades with 5 decimal places, unlike
        // BTC/ETH's 2 (binanceDatafeed.ts's pricescale 100).
        pricescale: 100000,
        minmov: 1,
        has_intraday: true,
        has_seconds: false,
        has_daily: true,
        has_weekly_and_monthly: false,
        supported_resolutions: SUPPORTED_RESOLUTIONS,
        volume_precision: 2,
        data_status: "streaming",
      };
      setTimeout(() => onResolve(symbolInfo), 0);
    },

    async getBars(
      _symbolInfo: LibrarySymbolInfo,
      resolution: ResolutionString,
      periodParams: PeriodParams,
      onResult: HistoryCallback,
      onError: ErrorCallback
    ) {
      const limit = Math.min(Math.max(periodParams.countBack, 1), 5000); // feed caps at 5000/request
      const url =
        `${BI2X_CHART_BASE_URL}/history?symbol=BI2X&resolution=${toFeedResolution(resolution)}` +
        `&to=${periodParams.to}&countback=${limit}`;
      try {
        const res = await fetchJSON<UDFHistoryResponse>(url);
        if (res.s === "no_data") {
          onResult([], { noData: true });
          return;
        }
        if (res.s === "error" || !res.t) {
          onError(res.errmsg ?? "bi2x history error");
          return;
        }
        const bars: Bar[] = res.t.map((t, i) => ({
          time: t * 1000,
          open: res.o![i],
          high: res.h![i],
          low: res.l![i],
          close: res.c![i],
          volume: res.v?.[i],
        }));
        onResult(bars, { noData: bars.length === 0 });
      } catch (err) {
        onError(err instanceof Error ? err.message : String(err));
      }
    },

    subscribeBars(
      _symbolInfo: LibrarySymbolInfo,
      resolution: ResolutionString,
      onTick: SubscribeBarsCallback,
      listenerGuid: string
    ) {
      startPolling(resolution, listenerGuid, onTick);
    },

    unsubscribeBars(listenerGuid: string) {
      stopPolling(listenerGuid);
    },
  };
}
