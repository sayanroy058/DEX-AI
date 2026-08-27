// Maps frontend market symbols to backend-registered symbol+market pairs.
// Only pairs actually running in the matching engine get live data; everything
// else keeps the existing mock simulation.
const REGISTERED: Record<string, { symbol: string; market: string }> = {
  "BTC-USDT": { symbol: "BTC-USDT", market: "SPOT" },
  "ETH-USDT": { symbol: "ETH-USDT", market: "SPOT" },
  "SOL-USDT": { symbol: "SOL-USDT", market: "SPOT" },
  "BTC-PERP": { symbol: "BTC-USDC", market: "FUTURES" },
  "ETH-PERP": { symbol: "ETH-USDC", market: "FUTURES" },
};

// Underlying spot pair registered as an Options market in the engine, keyed
// by the base asset shown in the trade panel (e.g. "BTC" from "BTC-USDT").
// The backend's /option-chain endpoint is queried with this underlying symbol.
const OPTIONS_UNDERLYING: Record<string, { underlying: string; quote: string }> = {
  BTC: { underlying: "BTC-USDT", quote: "USDT" },
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

// optionInstrumentSymbol builds the per-instrument symbol the backend now
// expects for option orders. Format: BASE-QUOTE-STRIKE-EXPIRY-TYPE
// (e.g. "BTC-USDT-55000-20250102-CALL"), matching the backend's seed format.
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
  const quote = entry?.quote ?? "USDT";
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
