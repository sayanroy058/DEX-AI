// Mock market data + simulated WebSocket-style updates
export type AssetClass = "crypto" | "forex" | "commodity" | "stocks";
export type MarketKind = "spot" | "perp" | "options";

export type Market = {
  symbol: string;
  base: string;
  quote: string;
  price: number;
  change24h: number;
  volume24h: number;
  category: MarketKind; // perp | spot | options
  asset: AssetClass;    // crypto | forex | commodity | stocks
  trending?: boolean;
  favorite?: boolean;
  funding?: number;
  openInterest?: number;
  // Executable markets are overwritten by the engine's market-summary feed.
  // Non-executable markets intentionally retain their existing display data.
  dataStatus?: "live" | "unavailable" | "stale";
  updatedAt?: number;
};

// Every market below has a REAL live price backing it — the hosted
// price-fetcher (https://price-fetcher-api.onrender.com/healthz) only
// tracks BTC/ETH/SOL/BNB (crypto), EURUSD/GBPUSD/AUDUSD (forex),
// GOLD/SILVER/CrudeOIL (commodity), and AAPL.us/TSLA.us/NVDA.us (stocks).
// Symbols that previously appeared here with no real price source at all
// (HYPE, ARB, AVAX, DOGE, LINK, MATIC, TIA, SUI, PEPE, USDJPY, WTI/NG,
// AAPL/TSLA/NVDA "-PERP"/"-OPT" variants, ETH-OPT) have been removed
// rather than left showing a frozen/fabricated number next to real ones.
// `price` below is only the pre-live-data seed useMarkets() starts from —
// see useLivePrice.ts, which prefers the real feed the instant it resolves.
export const INITIAL_MARKETS: Market[] = [
  // Crypto — perps map to the matching engine's real *-USDC futures markets
  // (BTC-USDC, ETH-USDC); SOL/BNB perps have real pricing but no backend
  // futures market yet, so they trade in simulated-book mode like the
  // forex/commodity/stock entries below.
  { symbol: "BTC-PERP", base: "BTC", quote: "USD", price: 67432.5, change24h: 2.34, volume24h: 1_240_000_000, category: "perp", asset: "crypto", trending: true, favorite: true, funding: 0.012, openInterest: 820_000_000 },
  { symbol: "ETH-PERP", base: "ETH", quote: "USD", price: 3521.8, change24h: 1.87, volume24h: 720_000_000, category: "perp", asset: "crypto", trending: true, favorite: true, funding: 0.008, openInterest: 540_000_000 },
  { symbol: "SOL-PERP", base: "SOL", quote: "USD", price: 168.42, change24h: -3.12, volume24h: 410_000_000, category: "perp", asset: "crypto", trending: true, funding: -0.005, openInterest: 290_000_000 },
  { symbol: "BNB-PERP", base: "BNB", quote: "USD", price: 592.4, change24h: 1.15, volume24h: 210_000_000, category: "perp", asset: "crypto", funding: 0.006 },
  { symbol: "BTC-USDT", base: "BTC", quote: "USDT", price: 67428.1, change24h: 2.31, volume24h: 980_000_000, category: "spot", asset: "crypto", favorite: true },
  { symbol: "ETH-USDT", base: "ETH", quote: "USDT", price: 3520.5, change24h: 1.85, volume24h: 540_000_000, category: "spot", asset: "crypto" },
  { symbol: "SOL-USDT", base: "SOL", quote: "USDT", price: 168.30, change24h: -3.10, volume24h: 280_000_000, category: "spot", asset: "crypto" },
  { symbol: "BNB-USDT", base: "BNB", quote: "USDT", price: 592.1, change24h: 1.12, volume24h: 190_000_000, category: "spot", asset: "crypto" },
  // Crypto options — BTC is the only backend-configured options underlying.
  { symbol: "BTC-OPT", base: "BTC", quote: "USD", price: 67432.5, change24h: 2.34, volume24h: 120_000_000, category: "options", asset: "crypto" },
  // Forex (futures only)
  { symbol: "EURUSD", base: "EURUSD", quote: "USD", price: 1.0842, change24h: 0.21, volume24h: 5_400_000_000, category: "perp", asset: "forex", funding: 0.0001 },
  { symbol: "GBPUSD", base: "GBPUSD", quote: "USD", price: 1.2654, change24h: -0.14, volume24h: 3_100_000_000, category: "perp", asset: "forex", funding: 0.0002 },
  { symbol: "AUDUSD", base: "AUDUSD", quote: "USD", price: 0.6612, change24h: -0.32, volume24h: 1_800_000_000, category: "perp", asset: "forex", funding: 0.00015 },
  // Commodities (futures only)
  { symbol: "XAU-USD", base: "GOLD", quote: "USD", price: 2384.5, change24h: 0.82, volume24h: 980_000_000, category: "perp", asset: "commodity", funding: 0.0008 },
  { symbol: "XAG-USD", base: "SILVER", quote: "USD", price: 28.42, change24h: 1.24, volume24h: 220_000_000, category: "perp", asset: "commodity", funding: 0.001 },
  { symbol: "WTI-USD", base: "CrudeOIL", quote: "USD", price: 78.32, change24h: -1.42, volume24h: 540_000_000, category: "perp", asset: "commodity", funding: 0.002 },
  // Stocks — base carries Live-Rates.com's exact case-sensitive ticker
  // ("AAPL.us", not "AAPL") since that's the real Redis key price-fetcher
  // writes; see useIndexPrice.ts, which now looks these up verbatim.
  { symbol: "AAPL", base: "AAPL.us", quote: "USD", price: 215.42, change24h: 1.42, volume24h: 8_400_000_000, category: "spot", asset: "stocks", favorite: true },
  { symbol: "TSLA", base: "TSLA.us", quote: "USD", price: 248.21, change24h: -2.12, volume24h: 6_200_000_000, category: "spot", asset: "stocks", trending: true },
  { symbol: "NVDA", base: "NVDA.us", quote: "USD", price: 124.84, change24h: 3.42, volume24h: 12_400_000_000, category: "spot", asset: "stocks", trending: true },
];

export function tickPrice(price: number, volatility = 0.0008): number {
  const change = (Math.random() - 0.5) * 2 * volatility;
  return Math.max(price * (1 + change), 0.000001);
}

export function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(3);
  if (p >= 0.01) return p.toFixed(4);
  return p.toFixed(8);
}

export function formatCompact(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return n.toFixed(2);
}

// OrderBookLevel / Trade: shape definitions shared with useOrderBook.ts's
// REAL live data (order-book depth and trade prints from the matching
// engine's WS/REST feeds). generateOrderBook/generateTrade — the functions
// that used to fabricate fake rows in these shapes for symbols with no
// backend market — have been removed; a symbol with no real market now
// shows a "not available" message instead (see RightColumn in Index.tsx),
// not synthetic data pretending to be depth.
export type OrderBookLevel = { price: number; size: number; total: number };

export type Trade = { id: string; price: number; size: number; side: "buy" | "sell"; time: number };

export type OptionContract = {
  id: string;
  underlying: string;
  type: "call" | "put";
  expiry: string;
  strike: number;
  mark: number;
  bid: number;
  ask: number;
  change24h: number;
  iv: number;
  volume: number;
  openInterest: number;
  delta: number;
  updatedAt: number;
};

export function generateOptionChain(symbol: string, underlyingPrice: number): OptionContract[] {
  const underlying = symbol.split("-")[0] || symbol;
  const expiries = ["7D", "30D", "90D"];
  const step = underlyingPrice >= 1000 ? 1000 : underlyingPrice >= 100 ? 10 : underlyingPrice >= 10 ? 2.5 : 0.25;
  const atm = Math.round(underlyingPrice / step) * step;
  const strikeOffsets = [-3, -2, -1, 0, 1, 2, 3];
  const now = Date.now();

  return expiries.flatMap((expiry, expiryIndex) => {
    const days = parseInt(expiry, 10) || 7;
    return strikeOffsets.flatMap(offset => {
      const strike = Math.max(step, atm + offset * step);
      return (["call", "put"] as const).map(type => {
        const intrinsic = type === "call"
          ? Math.max(0, underlyingPrice - strike)
          : Math.max(0, strike - underlyingPrice);
        const distance = Math.abs(strike - underlyingPrice) / Math.max(underlyingPrice, 1);
        const timeValue = underlyingPrice * (0.018 + expiryIndex * 0.012) * Math.sqrt(days / 30) * (1 + distance * 3);
        const mark = Math.max(intrinsic + timeValue, underlyingPrice * 0.001, 0.01);
        const spread = Math.max(mark * (0.018 + distance * 0.08), 0.01);
        const moneyness = (underlyingPrice - strike) / Math.max(underlyingPrice, 1);
        const callDelta = Math.min(0.92, Math.max(0.08, 0.5 + moneyness * 4));
        const delta = type === "call" ? callDelta : callDelta - 1;

        return {
          id: `${underlying}-${expiry}-${strike}-${type}`,
          underlying,
          type,
          expiry,
          strike,
          mark,
          bid: Math.max(mark - spread / 2, 0.01),
          ask: mark + spread / 2,
          change24h: (Math.sin(strike + days + (type === "call" ? 1 : -1)) * 6) + (underlyingPrice % 3),
          iv: 48 + expiryIndex * 7 + distance * 180,
          volume: Math.round((1 / (1 + Math.abs(offset))) * (1200 + expiryIndex * 340) + Math.random() * 160),
          openInterest: Math.round((1 / (1 + Math.abs(offset) * 0.65)) * (6400 + expiryIndex * 1200)),
          delta,
          updatedAt: now,
        };
      });
    });
  });
}

// Candle data for chart
export function generateCandles(basePrice: number, count = 80): { t: number; o: number; h: number; l: number; c: number; v: number }[] {
  const candles = [];
  let price = basePrice * 0.95;
  const now = Date.now();
  for (let i = count; i > 0; i--) {
    const o = price;
    const change = (Math.random() - 0.48) * basePrice * 0.008;
    const c = o + change;
    const h = Math.max(o, c) + Math.random() * basePrice * 0.004;
    const l = Math.min(o, c) - Math.random() * basePrice * 0.004;
    const v = Math.random() * 100 + 20;
    candles.push({ t: now - i * 60_000, o, h, l, c, v });
    price = c;
  }
  return candles;
}
