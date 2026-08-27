import { useEffect, useId, useRef } from "react";
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
let embedScriptEl: HTMLScriptElement | null = null;
let advancedLibScriptEl: HTMLScriptElement | null = null;

// The two script tags mutate the same `window.TradingView` global and
// cannot coexist (see note below) — switching asset classes mid-session
// must fully discard whichever variant is currently loaded (both its
// script tag and the cached load promise) before the other can load, or
// the new script's init runs against a global left half-clobbered by the
// old one, corrupting the still-live widget it's replacing (surfaced as
// "FEED [...]: Destroying with not-empty state" from the old widget and a
// "Cannot read properties of null (reading 'parentNode')" crash from the
// new one).
function discardLoadedVariant() {
  window.TradingView = undefined;
  advancedLibScriptPromise = null;
  tvScriptPromise = null;
  advancedLibScriptEl?.remove();
  advancedLibScriptEl = null;
  embedScriptEl?.remove();
  embedScriptEl = null;
  loadedVariant = null;
}

function loadAdvancedChartingLibrary(): Promise<void> {
  if (loadedVariant === "advanced") return advancedLibScriptPromise!;
  if (loadedVariant === "embed") discardLoadedVariant();
  advancedLibScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/charting_library/charting_library.standalone.js";
    script.async = true;
    script.onload = () => {
      loadedVariant = "advanced";
      resolve();
    };
    script.onerror = reject;
    advancedLibScriptEl = script;
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
  if (loadedVariant === "embed") return tvScriptPromise!;
  if (loadedVariant === "advanced") discardLoadedVariant();
  tvScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      loadedVariant = "embed";
      resolve();
    };
    script.onerror = reject;
    embedScriptEl = script;
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
  // useId gives a stable id across re-renders (unlike a counter/random value
  // generated in the render body) without ever colliding with another
  // ChartPane's id — tv.js's embed widget looks its container up by id
  // string (container_id), not a DOM element reference, so it needs one.
  const reactId = useId();
  const containerId = `tv-embed-${reactId.replace(/:/g, "")}`;

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
      // Advanced Charting Library path: pass the DOM element directly
      // (`container` accepts `HTMLElement | string` per
      // charting_library.d.ts). The free tv.js embed path below strips this
      // back out in favor of container_id — a previous container_id attempt
      // failed with "There is no such element - #" only because the id it
      // referenced was never actually set on the container's JSX (see
      // containerId/useId above), not because tv.js can't take an id.
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
      // tv.js's free embed widget resolves its container by id string at
      // construction time rather than accepting the DOM element directly —
      // pass container_id (and drop the element-based `container` option,
      // which this widget doesn't understand) with the id set on the JSX
      // node below.
      const { container: _container, ...embedOptions } = commonOptions;
      loadTradingViewEmbedScript().then(() => {
        if (cancelled || !window.TradingView) return;
        if (!document.getElementById(containerId)) return;
        widgetRef.current = new window.TradingView.widget({
          ...embedOptions,
          container_id: containerId,
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

  return <div ref={containerRef} id={containerId} className="h-full w-full" />;
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
