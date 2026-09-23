// View-model types and pure formatting/calculation helpers for the real
// prediction market feature. Data comes from the prediction-service backend
// (see src/lib/predictionApi.ts) — this file only holds types and math that
// don't depend on where the data came from.

export type PredictionOutcomeTone = "positive" | "negative";
export type PredictionOutcome = { id: string; label: string; price: number; tone: PredictionOutcomeTone };
export type PredictionPricePoint = { timestamp: string; price: number };
export type PredictionBookLevel = { price: number; shares: number };
export type PredictionOutcomeBook = { outcomeId: string; bids: PredictionBookLevel[]; asks: PredictionBookLevel[]; lastPrice: number };

export type PredictionMarketStatus = "OPEN" | "CLOSED" | "RESOLVED";

// One of the 6 real, always-rolling rounds: BTC/ETH/SOL x 5m/15m. There is
// exactly one active round per (symbol, intervalMinutes) pair at any time —
// see prediction-service's Round Manager.
export type PredictionMarket = {
  id: string; // `${symbol}-${intervalMinutes}m`, stable across rounds
  windowId: number | null; // current backend round id, null while committed/not yet revealed
  slug: string;
  title: string;
  shortTitle: string;
  icon: string;
  symbol: "BTC" | "ETH" | "SOL";
  interval: string;
  intervalMinutes: 5 | 15;
  status: PredictionMarketStatus;
  startTime: string;
  endTime: string;
  referencePrice?: number; // target price to beat
  currentPrice?: number;
  priceHistory: PredictionPricePoint[];
  outcomes: PredictionOutcome[]; // [YES, NO]
  orderBooks: PredictionOutcomeBook[];
  relatedMarketIds: string[];
};

export type PredictionTradeEstimate = { amount: number; contractPrice: number; shares: number; payout: number; profit: number };
export type PredictionCumulativeBookLevel = PredictionBookLevel & { total: number; depthPercent: number };
export type CountdownParts = { days: number; hours: number; minutes: number; seconds: number; expired: boolean };

export function getCountdownParts(endTime: string, now = Date.now()): CountdownParts {
  const target = new Date(endTime).getTime();
  const remaining = Number.isFinite(target) ? Math.max(0, target - now) : 0;
  return {
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor((remaining % 86_400_000) / 3_600_000),
    minutes: Math.floor((remaining % 3_600_000) / 60_000),
    seconds: Math.floor((remaining % 60_000) / 1_000),
    expired: remaining === 0,
  };
}

export function getPredictionOutcome(market: PredictionMarket, outcomeId: string | undefined): PredictionOutcome {
  return market.outcomes.find((outcome) => outcome.id === outcomeId) ?? market.outcomes[0];
}

export function calculateBuyEstimate(amountInput: string | number, contractPrice: number): PredictionTradeEstimate {
  const amount = typeof amountInput === "number" ? amountInput : Number(amountInput);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(contractPrice) || contractPrice <= 0 || contractPrice > 1) {
    return { amount: 0, contractPrice: Number.isFinite(contractPrice) ? contractPrice : 0, shares: 0, payout: 0, profit: 0 };
  }
  const shares = amount / contractPrice;
  return { amount, contractPrice, shares, payout: shares, profit: shares - amount };
}

export function calculateSellEstimate(sharesInput: string | number, contractPrice: number, availableShares: number): PredictionTradeEstimate {
  const requested = typeof sharesInput === "number" ? sharesInput : Number(sharesInput);
  if (!Number.isFinite(requested) || requested <= 0 || !Number.isFinite(contractPrice) || contractPrice <= 0 || contractPrice > 1 || availableShares <= 0) {
    return { amount: 0, contractPrice: Number.isFinite(contractPrice) ? contractPrice : 0, shares: 0, payout: 0, profit: 0 };
  }
  const shares = Math.min(requested, availableShares);
  const proceeds = shares * contractPrice;
  return { amount: proceeds, contractPrice, shares, payout: proceeds, profit: 0 };
}

export function calculateCumulativeBookLevels(levels: PredictionBookLevel[]): PredictionCumulativeBookLevel[] {
  const maxShares = Math.max(0, ...levels.map((level) => level.shares));
  let total = 0;
  return levels.map((level) => {
    total += level.price * level.shares;
    return { ...level, total: Number(total.toFixed(2)), depthPercent: maxShares > 0 ? (level.shares / maxShares) * 100 : 0 };
  });
}

export function calculateBookSpread(book: PredictionOutcomeBook): number {
  if (book.bids.length === 0 || book.asks.length === 0) return 0;
  return Math.max(0, Number((Math.min(...book.asks.map((level) => level.price)) - Math.max(...book.bids.map((level) => level.price))).toFixed(2)));
}

export const formatContractPrice = (price: number) => `${Math.round(price * 100)}¢`;
export const formatPredictionCurrency = (value: number, maximumFractionDigits = 2) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits }).format(value);
export const formatPredictionVolume = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value);
export const formatPredictionDate = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));

export type PredictionSide = "YES" | "NO";
export type PredictionOrderStatus = "Open" | "Won" | "Lost" | "Cancelled" | "Unfilled";
export type PredictionOrderView = { id: string; marketId: string; question: string; side: PredictionSide; status: PredictionOrderStatus; placedAt: string; priceCents: number; shares: number; filledShares: number; cost: number };

export function orderStatusBadgeClass(status: PredictionOrderStatus): string {
  if (status === "Open") return "bg-primary/15 text-primary border-primary/30";
  if (status === "Won") return "bg-buy/15 text-buy border-buy/30";
  if (status === "Cancelled" || status === "Unfilled") return "bg-muted/40 text-muted-foreground border-border/50";
  return "bg-sell/15 text-sell border-sell/30";
}

export function sidePillClass(side: PredictionSide): string {
  return side === "YES" ? "rounded bg-buy/15 px-2 py-0.5 text-[10px] font-bold text-buy" : "rounded bg-sell/15 px-2 py-0.5 text-[10px] font-bold text-sell";
}

export const PREDICTION_ICON: Record<"BTC" | "ETH" | "SOL", string> = { BTC: "BTC", ETH: "ETH", SOL: "SOL" };
export const PREDICTION_DURATIONS: { minutes: 5 | 15; label: string }[] = [
  { minutes: 5, label: "5 Minutes" },
  { minutes: 15, label: "15 Minutes" },
];
export const PREDICTION_SYMBOLS: ("BTC" | "ETH" | "SOL")[] = ["BTC", "ETH", "SOL"];

export function predictionMarketId(symbol: string, intervalMinutes: number): string {
  return `${symbol}-${intervalMinutes}m`;
}
