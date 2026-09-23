// Maps frontend market symbols to backend-registered symbol+market pairs.
// Only pairs actually running in the matching engine get live data; everything
// else keeps the existing mock simulation.
//
// Every pair — spot and futures — quotes in BI2XUSD, the platform's internal
// stable currency (pegged 1:1 to USDT, no on-chain contract of its own) —
// see Dex-Backend's chain.Listener and the matching-engine's
// cmd/engine/markets.go. USDT/USDC are no longer tradable quote currencies;
// futures collateral used to be real USDC, now converts to/settles in BI2XUSD
// like everything else. The engine symbol for a PERP is "BASE-BI2XUSD" too —
// distinct from the SPOT row of the same name via the (symbol, market) key.
const REGISTERED: Record<string, { symbol: string; market: string }> = {
  // --- SPOT: BI2X only (BTC-BI2XUSD SPOT removed 2026-09-13; BTC-PERP
  // FUTURES below is unaffected — same engine symbol string, different
  // market) ---
  // BI2X: not a Binance-tracked asset like BTC — its index price comes from
  // the dedicated BI2X data feed (Price-Fetcher's bitdxfeed client).
  "BI2X-BI2XUSD": { symbol: "BI2X-BI2XUSD", market: "SPOT" },

  // --- FUTURES: BI2X, BTC, ETH, AVAX, LINK, SOL, DOGE, TAO, ADA, XRP ---
  "BTC-PERP": { symbol: "BTC-BI2XUSD", market: "FUTURES" },
  "BI2X-PERP": { symbol: "BI2X-BI2XUSD", market: "FUTURES" },
  // ETH, AVAX, LINK, SOL, DOGE, TAO, ADA, and XRP are FUTURES-ONLY — none has
  // a SPOT row above (unlike BTC/BI2X), so each is priced directly off
  // Price-Fetcher's Binance feed with no spot funding/index underlying (see
  // matching-engine's seed.go — underlying_symbol is empty for all eight).
  // All are real Binance <ASSET>USDT tickers.
  "ETH-PERP": { symbol: "ETH-BI2XUSD", market: "FUTURES" },
  "AVAX-PERP": { symbol: "AVAX-BI2XUSD", market: "FUTURES" },
  "LINK-PERP": { symbol: "LINK-BI2XUSD", market: "FUTURES" },
  "SOL-PERP": { symbol: "SOL-BI2XUSD", market: "FUTURES" },
  "DOGE-PERP": { symbol: "DOGE-BI2XUSD", market: "FUTURES" },
  "TAO-PERP": { symbol: "TAO-BI2XUSD", market: "FUTURES" },
  "ADA-PERP": { symbol: "ADA-BI2XUSD", market: "FUTURES" },
  "XRP-PERP": { symbol: "XRP-BI2XUSD", market: "FUTURES" },

  // BNB (was SPOT+FUTURES) was REMOVED entirely per the 2026-09-12
  // restructure, not just disabled — no BNB-BI2XUSD or BNB-PERP entry exists
  // anywhere in this map any more. ETH-BI2XUSD (spot) and SOL-BI2XUSD (spot)
  // were also removed; both assets remain tradable, but futures-only now
  // (see ETH-PERP/SOL-PERP above).

  // Forex majors, commodities, and US stocks are DISABLED (2026-09-11 product
  // decision: crypto-only for the current launch) — matching-engine no
  // longer registers any of these (see cmd/engine/markets.go's
  // disabledMarkets), so leaving them "REGISTERED" here would make the trade
  // page believe a live order book exists where the engine has none. Not
  // deleted: uncomment together with matching-engine's disabledMarkets,
  // seed.go's commented rows, and Price-Fetcher's DefaultInstruments to
  // bring any of these back.
  //
  // Non-crypto perps. The engine symbol's base is the Price-Fetcher ticker,
  // case-preserved ("CrudeOIL", "AAPL.us"); there is no engine spot book for
  // any of these, so their futures rows carry no funding underlying.
  // EURUSD: { symbol: "EURUSD-BI2XUSD", market: "FUTURES" },
  // GBPUSD: { symbol: "GBPUSD-BI2XUSD", market: "FUTURES" },
  // AUDUSD: { symbol: "AUDUSD-BI2XUSD", market: "FUTURES" },
  // "XAU-USD": { symbol: "GOLD-BI2XUSD", market: "FUTURES" },
  // "XAG-USD": { symbol: "SILVER-BI2XUSD", market: "FUTURES" },
  // "WTI-USD": { symbol: "CrudeOIL-BI2XUSD", market: "FUTURES" },
  // "AAPL-PERP": { symbol: "AAPL.us-BI2XUSD", market: "FUTURES" },
  // "TSLA-PERP": { symbol: "TSLA.us-BI2XUSD", market: "FUTURES" },
  // "NVDA-PERP": { symbol: "NVDA.us-BI2XUSD", market: "FUTURES" },
};

// Underlying spot pair registered as an Options market in the engine, keyed
// by the base asset shown in the trade panel (e.g. "BTC" from "BTC-BI2XUSD").
// The backend's /option-chain endpoint is queried with this underlying symbol.
const OPTIONS_UNDERLYING: Record<string, { underlying: string; quote: string }> = {
  BTC: { underlying: "BTC-BI2XUSD", quote: "BI2XUSD" },
};

export function backendOptionsMarketFor(baseAsset: string) {
  const entry = OPTIONS_UNDERLYING[baseAsset];
  if (!entry) return null;
  return { symbol: entry.underlying, market: "OPTIONS" };
}

export function backendMarketFor(frontendSymbol: string) {
  return REGISTERED[frontendSymbol] ?? null;
}

// All backend-registered FUTURES symbol/market pairs, engine-symbol form
// (e.g. "BTC-USDC", not "BTC-PERP"). Used to batch-fetch real tickers
// (mark price, MMR) for every open position's symbol at once, instead of
// hardcoding maintenance margin rates client-side — that hardcoded map used
// to be the only source for the liquidation-price preview and could
// silently drift from whatever symbol_configs actually says.
export function registeredFuturesSymbols(): { symbol: string; market: string }[] {
  return Object.values(REGISTERED).filter((e) => e.market === "FUTURES");
}

// All backend-registered SPOT symbol/market pairs, engine-symbol form.
// Used the same way registeredFuturesSymbols is — e.g. to populate a bot
// creation form's trading-pair dropdown with only symbols that actually
// have a live order book, instead of a free-text field the user could
// mistype or point at a disabled/nonexistent market.
export function registeredSpotSymbols(): { symbol: string; market: string }[] {
  return Object.values(REGISTERED).filter((e) => e.market === "SPOT");
}

// optionInstrumentSymbol builds the per-instrument symbol the backend now
// expects for option orders. Format: BASE-QUOTE-STRIKE-EXPIRY-TYPE
// (e.g. "BTC-BI2XUSD-55000-20250102-CALL"), matching the backend's seed format.
//
// strike:  numeric strike price (e.g. 55000)
// expiry:  RFC3339 timestamp from the option chain (e.g. "2025-01-15T00:00:00Z")
// type:    "CALL" | "PUT"
// baseAsset: e.g. "BTC"
export function optionInstrumentSymbol(
  baseAsset: string,
  strike: number | string,
  expiry: string,
  type: "CALL" | "PUT"
): string {
  const entry = OPTIONS_UNDERLYING[baseAsset];
  const quote = entry?.quote ?? "BI2XUSD";
  const expiryDate = expiry.slice(0, 10).replace(/-/g, "");
  return `${baseAsset}-${quote}-${strike}-${expiryDate}-${type}`;
}

// Reverse of backendMarketFor: given the raw engine symbol+market (as
// returned in position/order DTOs), find the frontend display symbol used
// as the key into useMarkets()'s live price feed.
export function frontendSymbolFor(engineSymbol: string, engineMarket: string) {
  for (const [frontendSymbol, entry] of Object.entries(REGISTERED)) {
    if (entry.symbol === engineSymbol && entry.market === engineMarket) {
      return frontendSymbol;
    }
  }
  return engineSymbol;
}
