import { authHeader, clearSession } from "./Auth";

// Public market-data endpoints remain on the matching engine. Account-scoped
// trading actions use Dex-Backend, which authenticates the wallet session and
// derives the account server-side.
const ENGINE_API_URL = import.meta.env.VITE_ENGINE_API_URL ?? import.meta.env.VITE_API_URL ?? "http://localhost:8080";
const TRADE_API_URL = import.meta.env.VITE_AUTH_API_URL ?? "http://localhost:8081";

/**
 * ApiError carries the HTTP status alongside the message so callers (and the
 * UI) can react to *why* a request failed instead of treating every failure as
 * an opaque string. Previously every non-2xx response became a bare Error, so a
 * 401 (session expired), a 429 (rate limited), a 400 (engine rejected the order
 * — bad price/insufficient balance) and a 503 (engine down) were all
 * indistinguishable, and the app could not, e.g., log the user out on expiry or
 * back off on a rate limit.
 */
export class ApiError extends Error {
  status: number;
  /** True for transient failures where a retry may succeed (5xx / network). */
  retryable: boolean;
  /** True when the server rejected auth (expired/invalid session). */
  isAuthError: boolean;
  /** True when rate-limited (HTTP 429). */
  isRateLimited: boolean;
  /** Seconds the server asked us to wait before retrying (from Retry-After). */
  retryAfter?: number;

  constructor(status: number, message: string, retryAfter?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    // status === 0 is our sentinel for "the fetch itself threw" (offline / DNS /
    // CORS), which is always worth retrying.
    this.retryable = status === 0 || status >= 500;
    this.isAuthError = status === 401 || status === 403;
    this.isRateLimited = status === 429;
    this.retryAfter = retryAfter;
  }
}

/** Registered callback invoked once whenever a request fails auth (401/403). */
let onAuthExpired: (() => void) | null = null;
export function setAuthExpiredHandler(fn: (() => void) | null) {
  onAuthExpired = fn;
}

export type DepthLevel = { price: string; size: string; total: string };
export type DepthResponse = { symbol: string; market: string; bids: DepthLevel[]; asks: DepthLevel[] };

export type TradeDTO = {
  id: string;
  symbol: string;
  market: string;
  price: string;
  quantity: string;
  side: "BUY" | "SELL";
  timestamp: number;
};
export type TradesResponse = { symbol: string; market: string; trades: TradeDTO[] };

export type OrderResponse = { orderId: string; status: string; filled: string; trades: number };

export type BalanceResponse = {
  account: string;
  asset: string;
  balance: string;
  reserved: string;
  available: string;
};

function parseRetryAfter(res: Response): number | undefined {
  const h = res.headers.get("Retry-After");
  if (!h) return undefined;
  const secs = Number(h);
  return Number.isFinite(secs) ? secs : undefined;
}

async function doFetch<T>(baseURL: string, path: string, opts?: RequestInit, includeCredentials = false): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${baseURL}${path}`, {
      ...opts,
      ...(includeCredentials ? { credentials: "include" as const } : {}),
      headers: { ...authHeader(), ...(opts?.headers ?? {}) },
    });
  } catch (e) {
    // Network-level failure (offline, DNS, CORS): surface as retryable status 0.
    throw new ApiError(0, e instanceof Error ? e.message : "network error");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const message = text || `${res.status} ${res.statusText}`;
    const err = new ApiError(res.status, message, parseRetryAfter(res));
    if (err.isAuthError) {
      // Session expired or was revoked server-side: drop the stale token and
      // let the app react (redirect to login) exactly once.
      clearSession();
      onAuthExpired?.();
    }
    throw err;
  }
  // 204/empty bodies: don't blow up trying to JSON-parse nothing.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/**
 * req wraps doFetch with a small bounded retry for transient failures (5xx and
 * network errors) using exponential backoff, honoring Retry-After on 429. Auth
 * errors and 4xx (client/engine rejections) are NOT retried — they won't
 * succeed on retry and doing so would, e.g., re-submit a rejected order.
 */
async function req<T>(path: string, opts?: RequestInit, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await doFetch<T>(ENGINE_API_URL, path, opts);
    } catch (e) {
      lastErr = e;
      if (!(e instanceof ApiError)) throw e;
      const isLast = i === attempts - 1;
      if (e.isRateLimited) {
        if (isLast) throw e;
        await sleep((e.retryAfter ?? 1) * 1000);
        continue;
      }
      if (e.retryable && !isLast) {
        await sleep(Math.min(2 ** i * 250, 2000));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

// Account-scoped operations are deliberately not retried: successful order
// placement/cancellation can be followed by a dropped response, and retrying
// would create a second action. Dex-Backend authenticates using dex_session.
async function tradeReq<T>(path: string, opts?: RequestInit): Promise<T> {
  return doFetch<T>(TRADE_API_URL, path, opts, true);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function getDepth(symbol: string, market: string, levels = 20) {
  const params = new URLSearchParams({ symbol, market, levels: String(levels) });
  return req<DepthResponse>(`/depth?${params}`);
}

// Real order-book-derived and settlement-derived numbers — no 24h
// high/low/volume (the engine doesn't track rolling windows; use
// useIndexPrice for that). indexPrice/fundingRatePct/maintenanceMarginRatePct
// are only present for FUTURES.
export type TickerResponse = {
  symbol: string;
  market: string;
  bestBid: string;
  bestAsk: string;
  midPrice: string;
  markPrice: string;
  indexPrice?: string;
  spread: string;
  fundingRatePct?: string;
  makerFeePct?: string;
  takerFeePct?: string;
  maintenanceMarginRatePct?: string;
};

export function getTicker(symbol: string, market: string) {
  const params = new URLSearchParams({ symbol, market });
  return req<TickerResponse>(`/ticker?${params}`);
}

export type MarketSummaryResponse = {
  symbol: string;
  market: string;
  price: string;
  change24hPct?: string;
  volume24h?: string;
  has24hData: boolean;
  updatedAt: string;
};

export function getMarketSummary(symbol: string, market: string) {
  const params = new URLSearchParams({ symbol, market });
  return req<MarketSummaryResponse>(`/market-summary?${params}`);
}

export type MarketMetadata = {
  displaySymbol: string;
  symbol: string;
  market: string;
  baseCurrency: string;
  quoteCurrency: string;
  tickSize: string;
  lotSize: string;
  minNotional: string;
  maxPrice: string;
  maxQuantity: string;
  makerFeePct: string;
  takerFeePct: string;
  maintenanceMarginRatePct?: string;
  maxLeverage?: number;
  enabledOrderTypes: string[];
};

export function getMarkets() {
  return req<MarketMetadata[]>("/markets");
}

export function getTrades(symbol: string, market: string, limit = 50) {
  const params = new URLSearchParams({ symbol, market, limit: String(limit) });
  return req<TradesResponse>(`/trades?${params}`);
}

export function getBalance(account: string, asset: string) {
  void account; // Account identity is derived from the wallet session server-side.
  const params = new URLSearchParams({ asset });
  return tradeReq<BalanceResponse>(`/trade/balance?${params}`);
}

export type SubmitOrderParams = {
  account: string;
  symbol: string;
  market: string;
  side: "BUY" | "SELL";
  type?: "LIMIT" | "MARKET" | "IOC" | "FOK" | "POST_ONLY" | "STOP";
  price?: string;
  qty: string;
  // STOP / STOP-LIMIT: the trigger price. A STOP order with `price` also set
  // becomes a stop-limit (rests as a limit once triggered); without `price`
  // it becomes a stop-market.
  stopPrice?: string;
  // Futures-only: reject the order instead of letting it increase or flip
  // the position (enforced server-side against the live position).
  reduceOnly?: boolean;
  // MARKET-only: caps how far a market order may walk the book from the
  // best opposite quote, in basis points. The engine converts the order to
  // an equivalent slippage-bounded IOC limit. Omit for uncapped (legacy)
  // market-order behaviour.
  slippageBps?: number;
  // Futures-only.
  leverage?: number;
  marginMode?: "ISOLATED" | "CROSS";
  // Options-only.
  optionType?: "CALL" | "PUT";
  strike?: string;
  expiry?: string; // RFC3339
};

export function submitOrder(p: SubmitOrderParams) {
  const { account: _account, reduceOnly, ...order } = p;
  void _account; // Dex-Backend resolves the account from dex_session.
  return tradeReq<OrderResponse>(`/trade/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...order,
      ...(reduceOnly ? { reduceOnly: true } : {}),
      type: order.type ?? "LIMIT",
      price: order.price ?? "0",
    }),
  });
}

export function submitAttachedOrder(parent: SubmitOrderParams, takeProfit?: SubmitOrderParams, stopLoss?: SubmitOrderParams) {
  const clean = (order?: SubmitOrderParams) => order ? { ...order, account: undefined } : undefined;
  return tradeReq<OrderResponse>(`/trade/attached-order`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parent: clean(parent), takeProfit: clean(takeProfit), stopLoss: clean(stopLoss) }),
  });
}

export function cancelOrder(symbol: string, market: string, orderId: string) {
  return tradeReq<OrderResponse>(`/trade/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol, market, orderId }),
  });
}

export type FuturesPositionDTO = {
  symbol: string;
  side: "BUY" | "SELL";
  size: string;
  entryPrice: string;
  markPrice: string;
  margin: string;
  leverage: number;
  unrealizedPnl: string;
};

export type OptionsPositionDTO = {
  symbol: string;
  optionType: "CALL" | "PUT";
  strikePrice: string;
  expiry: string;
  size: string;
  premium: string;
};

export type PositionsResponse = {
  futures: FuturesPositionDTO[];
  options: OptionsPositionDTO[];
};

export type OpenOrderDTO = {
  id: string;
  symbol: string;
  market: string;
  side: "BUY" | "SELL";
  price?: string;
  qty: string;
  filled: string;
  status: string;
  // Set only for a take-profit or stop-loss leg belonging to an attached
  // order group; empty for a regular standalone order.
  groupId?: string;
  groupRole?: "TP" | "SL";
};
export type OrdersResponse = { orders: OpenOrderDTO[] };

export function getOrders(account: string) {
  void account;
  return tradeReq<OrdersResponse>(`/trade/orders`);
}

export type OrderHistoryDTO = {
  id: string; symbol: string; market: string; side: "BUY" | "SELL"; type: string;
  price: string; quantity: string; filled: string; status: string;
  rejectReason?: string; avgFillPrice: string; feePaid: string;
  createdAt: string; updatedAt: string;
};
export type OrderHistoryResponse = { orders: OrderHistoryDTO[]; nextCursor?: string };
export type HistoryFilters = { limit?: number; before?: string; after?: string; symbol?: string; market?: string };
export function getOrderHistory(filters: HistoryFilters = {}) {
  const { limit = 50, before, after, symbol, market } = filters;
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set("before", before);
  if (after) params.set("after", after);
  if (symbol) params.set("symbol", symbol);
  if (market) params.set("market", market);
  return tradeReq<OrderHistoryResponse>(`/trade/order-history?${params}`);
}

export type FillDTO = {
  tradeId: string; orderId: string; symbol: string; market: string; side: "BUY" | "SELL";
  price: string; quantity: string; feePaid: string; executedAt: string;
};
export type FillsResponse = { fills: FillDTO[]; nextCursor?: string };
export function getFills(filters: HistoryFilters = {}) {
  const { limit = 50, before, after, symbol, market } = filters;
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set("before", before);
  if (after) params.set("after", after);
  if (symbol) params.set("symbol", symbol);
  if (market) params.set("market", market);
  return tradeReq<FillsResponse>(`/trade/fills?${params}`);
}

export type FundingPaymentDTO = { symbol: string; rate: string; amount: string; createdAt: string };
export type FundingHistoryResponse = { payments: FundingPaymentDTO[]; nextCursor?: string };
export function getFundingHistory(filters: HistoryFilters = {}) {
  const { limit = 50, before, after, symbol } = filters;
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set("before", before);
  if (after) params.set("after", after);
  if (symbol) params.set("symbol", symbol);
  return tradeReq<FundingHistoryResponse>(`/trade/funding-history?${params}`);
}

export type RealizedPnlDTO = {
  symbol: string; closedQty: string; pnl: string; marginReturned: string;
  isLiquidation: boolean; createdAt: string;
};
export type PnlHistoryResponse = { entries: RealizedPnlDTO[]; nextCursor?: string };
export function getPnlHistory(filters: HistoryFilters = {}) {
  const { limit = 50, before, after, symbol } = filters;
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set("before", before);
  if (after) params.set("after", after);
  if (symbol) params.set("symbol", symbol);
  return tradeReq<PnlHistoryResponse>(`/trade/pnl-history?${params}`);
}

export function getPositions(account: string) {
  void account;
  return tradeReq<PositionsResponse>(`/trade/positions`);
}

export type OptionChainEntry = {
  symbol: string;
  optionType: "CALL" | "PUT";
  strike: string;
  expiry: string;
  bid: string;
  ask: string;
  mid: string;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
};

export type OptionChainResponse = {
  underlying: string;
  spot: string;
  chain: OptionChainEntry[];
};

export function getOptionChain(underlying: string) {
  const params = new URLSearchParams({ underlying });
  return req<OptionChainResponse>(`/option-chain?${params}`);
}
