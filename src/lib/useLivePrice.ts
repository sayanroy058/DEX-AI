import { useMarket } from "./useMarkets";
import { useIndexPrice } from "./useIndexPrice";
import { backendMarketFor } from "./backendMarkets";

// The single "what price is this symbol at right now" answer for the trade
// page — real index price (Redis-backed, from price-fetcher's Binance and
// Live-Rates.com feeds) when the feed is live for this symbol's base, the
// client-side mock simulator otherwise.
//
// This priority order previously lived only inside MarketHeader.tsx, so the
// header showed the real price while everything else on the page (order
// entry default price, TP/SL target seeds, liquidation preview, the chart,
// the option chain, position sizing) kept reading straight from the mock
// simulator — e.g. header at $79,602 while the order panel defaulted to a
// stale $67,432.50 baked into mockData.ts. Anything that needs "the current
// price for this symbol" should use this hook instead of useMarket(...).price
// directly, so there's exactly one place this priority order is decided.
//
// Not gated to crypto: price-fetcher also carries real forex/commodity/
// stock tickers now, and every base still in INITIAL_MARKETS (mockData.ts)
// is one price-fetcher genuinely supports — a symbol with no real feed at
// all simply gets an always-stale useIndexPrice response and falls through
// to the mock, same as before.
export function useLivePrice(symbol: string): number {
  const market = useMarket(symbol);
  const index = useIndexPrice(market?.base);
  // The external index is the authoritative displayed reference for both
  // executable and display-only markets. The executable order book is quoted
  // around this value, but its tick-rounded bid/ask midpoint can differ by a
  // fraction of a tick; showing the index avoids that presentation drift.
  if (backendMarketFor(symbol)) return index?.lastPrice ?? market?.price ?? 0;
  return index?.lastPrice ?? market?.price ?? 0;
}
