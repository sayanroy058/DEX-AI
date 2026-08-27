// A minimal custom datafeed for the licensed TradingView Advanced Charting
// Library, backed by Binance's public REST + WebSocket kline APIs.
//
// This intentionally mirrors the data source the previous free tv.js widget
// used (BINANCE:{BASE}USD via TradingView's own resolver) — the exchange has
// no OHLCV candle storage of its own yet (see useBinancePrice.ts, which hits
// the same public Binance REST API for the ticker strip). This is NOT
// TradingView's UDF protocol; the licensed library has no data of its own,
// so any datafeed object satisfying its IDatafeedChartApi/IExternalDatafeed
// interfaces works, and a small custom one avoids standing up a UDF server
// for data we don't produce ourselves.
//
// Swap this out for a datafeed backed by the exchange's own trade/candle
// history once that exists on the backend — nothing else in TradingChart.tsx
// needs to change, the widget only knows about this interface.

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

const SUPPORTED_RESOLUTIONS: ResolutionString[] = ["1", "5", "15", "30", "60", "240", "D", "W"];

// Binance kline interval strings for each resolution the chart offers.
const RESOLUTION_TO_INTERVAL: Record<string, string> = {
  "1": "1m",
  "5": "5m",
  "15": "15m",
  "30": "30m",
  "60": "1h",
  "240": "4h",
  "D": "1d",
  "W": "1w",
};

function resolutionToMs(resolution: string): number {
  const interval = RESOLUTION_TO_INTERVAL[resolution] ?? "1m";
  const unit = interval.slice(-1);
  const n = parseInt(interval.slice(0, -1), 10);
  const unitMs: Record<string, number> = { m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };
  return n * (unitMs[unit] ?? 60_000);
}

/** Binance spot ticker for a base asset — same convention as useBinancePrice.ts. */
function toBinanceSymbol(base: string): string {
  return `${base.toUpperCase()}USDT`;
}

type KlineWSHandler = (bar: Bar, isFinal: boolean) => void;

// One shared WebSocket per Binance symbol+interval combo, fanned out to
// however many chart panes are currently subscribed to it (multi-pane
// layouts would otherwise open duplicate sockets).
const wsRegistry = new Map<string, { socket: WebSocket; listeners: Map<string, KlineWSHandler> }>();

function subscribeKlineStream(binanceSymbol: string, interval: string, guid: string, handler: KlineWSHandler): void {
  const key = `${binanceSymbol.toLowerCase()}@kline_${interval}`;
  let entry = wsRegistry.get(key);
  if (!entry) {
    const socket = new WebSocket(`wss://stream.binance.com:9443/ws/${key}`);
    const listeners = new Map<string, KlineWSHandler>();
    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const k = msg.k;
        if (!k) return;
        const bar: Bar = {
          time: k.t,
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
          volume: parseFloat(k.v),
        };
        listeners.forEach((fn) => fn(bar, k.x === true));
      } catch {
        // Malformed frame: drop it, the next tick will self-correct.
      }
    };
    entry = { socket, listeners };
    wsRegistry.set(key, entry);
  }
  entry.listeners.set(guid, handler);
}

function unsubscribeKlineStream(guid: string): void {
  for (const [key, entry] of wsRegistry.entries()) {
    if (entry.listeners.delete(guid) && entry.listeners.size === 0) {
      entry.socket.close();
      wsRegistry.delete(key);
    }
  }
}

export function createBinanceDatafeed() {
  return {
    onReady(callback: OnReadyCallback) {
      // Deferred so the library finishes its own init before we call back,
      // matching the documented contract (calling back synchronously is
      // explicitly disallowed by the datafeed API).
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
      // Symbol search isn't exposed in the trade UI (the pair is chosen via
      // the exchange's own market selector), so this is intentionally a
      // no-op rather than a real search implementation.
    },

    resolveSymbol(symbolName: string, onResolve: ResolveCallback, onError: ErrorCallback) {
      // symbolName arrives as e.g. "BTC" (the base asset) — TradingChart.tsx
      // passes the base, not a prefixed ticker, since this datafeed only
      // ever talks to one exchange (Binance).
      const base = symbolName.replace(/USDT?$/i, "").toUpperCase();
      if (!base) {
        onError("invalid symbol");
        return;
      }
      const symbolInfo: LibrarySymbolInfo = {
        name: base,
        ticker: base,
        description: `${base} / USDT`,
        type: "crypto",
        session: "24x7",
        timezone: "Etc/UTC",
        exchange: "BINANCE",
        listed_exchange: "BINANCE",
        format: "price",
        pricescale: 100, // 2 decimal places; fine for a display-only chart
        minmov: 1,
        has_intraday: true,
        has_seconds: false,
        has_daily: true,
        has_weekly_and_monthly: true,
        supported_resolutions: SUPPORTED_RESOLUTIONS,
        volume_precision: 4,
        data_status: "streaming",
      };
      setTimeout(() => onResolve(symbolInfo), 0);
    },

    async getBars(
      symbolInfo: LibrarySymbolInfo,
      resolution: ResolutionString,
      periodParams: PeriodParams,
      onResult: HistoryCallback,
      onError: ErrorCallback
    ) {
      const interval = RESOLUTION_TO_INTERVAL[resolution] ?? "1m";
      const binanceSymbol = toBinanceSymbol(symbolInfo.ticker);
      const limit = Math.min(Math.max(periodParams.countBack, 1), 1000);
      const url =
        `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}` +
        `&endTime=${periodParams.to * 1000}&limit=${limit}`;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`binance klines ${res.status}`);
        const raw: unknown[] = await res.json();
        const bars: Bar[] = raw.map((k) => {
          const row = k as [number, string, string, string, string, string];
          return {
            time: row[0],
            open: parseFloat(row[1]),
            high: parseFloat(row[2]),
            low: parseFloat(row[3]),
            close: parseFloat(row[4]),
            volume: parseFloat(row[5]),
          };
        });
        onResult(bars, { noData: bars.length === 0 });
      } catch (err) {
        onError(err instanceof Error ? err.message : String(err));
      }
    },

    subscribeBars(
      symbolInfo: LibrarySymbolInfo,
      resolution: ResolutionString,
      onTick: SubscribeBarsCallback,
      listenerGuid: string
    ) {
      const interval = RESOLUTION_TO_INTERVAL[resolution] ?? "1m";
      const binanceSymbol = toBinanceSymbol(symbolInfo.ticker);
      subscribeKlineStream(binanceSymbol, interval, listenerGuid, (bar) => {
        onTick(bar);
      });
    },

    unsubscribeBars(listenerGuid: string) {
      unsubscribeKlineStream(listenerGuid);
    },
  };
}

// Exported for tests / other callers that need the same ms-per-bar math the
// live subscription relies on to detect a new bar boundary.
export { resolutionToMs, toBinanceSymbol, RESOLUTION_TO_INTERVAL };
