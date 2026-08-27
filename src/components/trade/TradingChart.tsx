import { useEffect, useRef } from "react";
import { INITIAL_MARKETS } from "@/lib/mockData";
import { createBinanceDatafeed } from "@/lib/binanceDatafeed";

function marketFor(symbol: string) {
  return INITIAL_MARKETS.find(m => m.symbol === symbol);
}

function toTradingViewSymbol(symbol: string): string {
  const market = marketFor(symbol);
  const asset = market?.asset;
  const base = (market?.base ?? symbol.split("-")[0]).toUpperCase();

  if (asset === "forex") return `FX:${symbol}`;
  if (asset === "stocks") {
    // market.base carries price-fetcher's exact Redis key casing
    // ("AAPL.us") for the index-price lookup elsewhere — TradingView's own
    // resolver wants the bare uppercase ticker, so strip the ".us" suffix
    // rather than reuse the upper-cased `base` above (which would send the
    // nonsensical "NASDAQ:AAPL.US").
    const ticker = (market?.base ?? symbol).replace(/\.us$/i, "").toUpperCase();
    return `NASDAQ:${ticker}`;
  }
  if (asset === "commodity") {
    // Keyed against mockData.ts's `base` values (upper-cased above) — only
    // GOLD, SILVER, and CrudeOIL are currently real (backed by
    // price-fetcher's Live-Rates.com feed); WTI-USD's base is "CrudeOIL",
    // not "OIL".
    const commodityMap: Record<string, string> = {
      GOLD: "TVC:GOLD",
      SILVER: "TVC:SILVER",
      CRUDEOIL: "TVC:USOIL",
    };
    return commodityMap[base] ?? `TVC:${base}`;
  }
  // crypto (perp/spot/options) -> Binance live price feed on TradingView,
  // using the {BASE}USD pair (e.g. BINANCE:BTCUSD).
  return `BINANCE:${base}USD`;
}

declare global {
  interface Window {
    TradingView?: any;
  }
}

// ─── Licensed Advanced Charting Library (crypto pairs) ─────────────────────
//
// The licensed library ships as a static bundle (public/charting_library/,
// copied from the vendor drop — see .gitignore) and, unlike the free tv.js
// embed, has no data of its own: it always needs an explicit `datafeed`.
// Crypto pairs get a small custom datafeed backed by Binance's public REST +
// WS APIs (binanceDatafeed.ts) — the same data source the previous free
// widget used via TradingView's own BINANCE: resolver, just fetched
// ourselves since the licensed library can't resolve TradingView-hosted
// symbols on its own.

// The two libraries both define window.TradingView.widget, and whichever
// loads second overwrites the first's — they cannot coexist on one page. In
// practice a session only ever needs one (all-crypto vs. mixed-asset
// layouts are rare in the same view), but track which is currently loaded
// so a layout that mixes asset classes reloads the right script instead of
// silently reusing the wrong one.
let loadedVariant: "advanced" | "embed" | null = null;
let advancedLibScriptPromise: Promise<void> | null = null;
function loadAdvancedChartingLibrary(): Promise<void> {
  if (loadedVariant === "advanced") return Promise.resolve();
  advancedLibScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/charting_library/charting_library.standalone.js";
    script.async = true;
    script.onload = () => {
      loadedVariant = "advanced";
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return advancedLibScriptPromise;
}

// ─── Free tv.js embed (non-crypto: forex / stocks / commodity) ─────────────
//
// These asset classes are UI-only today (no live backend, mock prices) and
// were previously charted via TradingView's own hosted data through the free
// widget's built-in resolver, which the Binance-only custom datafeed above
// cannot serve. Keeping tv.js for this slice avoids losing that chart
// entirely; swap it to the licensed library once a real data source for
// these asset classes exists.

let tvScriptPromise: Promise<void> | null = null;
function loadTradingViewEmbedScript(): Promise<void> {
  if (loadedVariant === "embed") return Promise.resolve();
  tvScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      loadedVariant = "embed";
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return tvScriptPromise;
}

function ChartPane({ symbol, timeframe }: { symbol: string; timeframe: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const isCrypto = marketFor(symbol)?.asset === "crypto" || !marketFor(symbol);
  const base = (marketFor(symbol)?.base ?? symbol.split("-")[0]).toUpperCase();
  const tvSymbol = toTradingViewSymbol(symbol);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";

    const isLight = document.documentElement.getAttribute("data-theme") === "light";

    const commonOptions = {
      autosize: true,
      interval: timeframe,
      timezone: "Etc/UTC",
      theme: isLight ? "light" : "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_side_toolbar: false,
      // Pass the DOM element directly rather than an id string for the
      // widget to look up itself (the previous `container_id: widgetId`
      // approach threw "There is no such element - #" — the id-based
      // lookup wasn't finding the container reliably). `container` accepts
      // `HTMLElement | string` per charting_library.d.ts; passing the
      // element we already hold via containerRef sidesteps the lookup
      // entirely.
      container,
      disabled_features: [
        "header_compare",
        "compare_symbol",
        "header_symbol_search",
        "symbol_search_hot_key",
        "study_templates",
        "popup_hints",
      ],
    };

    if (isCrypto) {
      loadAdvancedChartingLibrary().then(() => {
        if (cancelled || !window.TradingView) return;
        widgetRef.current = new window.TradingView.widget({
          ...commonOptions,
          symbol: base,
          datafeed: createBinanceDatafeed(),
          library_path: "/charting_library/",
          studies_overrides: {},
        });
      });
    } else {
      loadTradingViewEmbedScript().then(() => {
        if (cancelled || !window.TradingView) return;
        widgetRef.current = new window.TradingView.widget({
          ...commonOptions,
          symbol: tvSymbol,
          studies: ["Volume@tv-basicstudies"],
        });
      });
    }

    return () => {
      cancelled = true;
      if (widgetRef.current?.remove && container.isConnected) {
        try {
          widgetRef.current.remove();
        } catch {
          // Widget teardown can throw if its internal DOM node was already
          // detached (e.g. rapid symbol switches); safe to ignore.
        }
      }
      widgetRef.current = null;
    };
  }, [isCrypto, base, tvSymbol, timeframe]);

  return <div ref={containerRef} className="h-full w-full" />;
}

const LAYOUTS = [
  { id: "1", label: "1", cols: 1, rows: 1 },
  { id: "2v", label: "2 ↔", cols: 2, rows: 1 },
  { id: "2h", label: "2 ↕", cols: 1, rows: 2 },
  { id: "4", label: "4", cols: 2, rows: 2 },
];

export function TradingChart({ symbol }: { symbol: string; price?: number }) {
  const tf = "15";
  const layout = LAYOUTS[0];
  const panes = layout.cols * layout.rows;

  return (
    <div className="glass rounded-b-xl rounded-t-none flex flex-col h-full overflow-hidden">
      <div
        className="flex-1 grid gap-1 p-1 min-h-0"
        style={{
          gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: panes }).map((_, i) => (
          <div key={i} className="glass-strong rounded-lg overflow-hidden border border-border/40 min-h-0">
            <ChartPane symbol={symbol} timeframe={tf} />
          </div>
        ))}
      </div>
    </div>
  );
}
