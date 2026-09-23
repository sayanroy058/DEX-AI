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
// Not gated to crypto in general — price-fetcher can carry other real
// tickers too — but as of 2026-09-11 (crypto-only launch) the only bases with
// a genuinely live feed behind them are BTC/ETH/SOL/BNB; a symbol with no
// real feed simply gets an always-stale useIndexPrice response.
export function useLivePrice(symbol: string): number {
  const market = useMarket(symbol);
  const index = useIndexPrice(market?.base);
  if (backendMarketFor(symbol)) {
    // Executable markets take their price EXCLUSIVELY from the matching
    // engine's own market-summary feed (market.dataStatus === "live"), never
    // from the external index or the static mock seed. Before this, the two
    // branches here were identical, so an executable market silently showed
    // the external index price (or a stale mock number) whenever the engine
    // summary hadn't arrived yet — order entry could default to, and size a
    // position against, a price the matching engine was never actually
    // quoting. dataStatus starts "unavailable" (see useMarkets.ts) until the
    // first real summary lands, so this correctly reports 0 until then.
    return market?.dataStatus === "live" ? market.price : 0;
  }
  // Non-executable / display-only markets: the external index is the
  // authoritative reference when live, falling back to the static mock seed.
  return index?.lastPrice ?? market?.price ?? 0;
}
