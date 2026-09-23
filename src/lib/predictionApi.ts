const PREDICTION_API_URL = import.meta.env.VITE_PREDICTION_API_URL ?? "http://localhost:8084";
export const PREDICTION_WS_URL = import.meta.env.VITE_PREDICTION_WS_URL ?? "ws://localhost:8084/prediction/ws";

export type PredictionMarketSymbol = "BTC" | "ETH" | "SOL";
export type PredictionDuration = "5m" | "15m";
export type PredictionWindowStatus = "committed" | "open" | "locked" | "settled";
export type PredictionSide = "yes" | "no";
export type PredictionOrderStatus = "open" | "filled" | "cancelled";

export type PredictionWindow = {
  id: number;
  market: PredictionMarketSymbol;
  duration: PredictionDuration;
  status: PredictionWindowStatus;
  openingPrice?: string;
  targetPrice?: string;
  resolutionPrice?: string;
  commitHash: string;
  startTime: string;
  endTime: string;
};

export type PredictionOrder = {
  ID: number;
  WindowID: number;
  UserID: string;
  Side: PredictionSide;
  Price: string;
  Size: string;
  FilledSize: string;
  Status: PredictionOrderStatus;
  CreatedAt: string;
  UpdatedAt: string;
};

export type PredictionPosition = {
  ID: number;
  WindowID: number;
  UserID: string;
  Side: PredictionSide;
  Shares: string;
  AvgPrice: string;
  Realized: string;
  CreatedAt: string;
  UpdatedAt: string;
};

export type PredictionTick = {
  type: "tick";
  windowId: number;
  market: PredictionMarketSymbol;
  duration: PredictionDuration;
  currentPrice: string;
  targetPrice: string;
  yesPrice: string;
  noPrice: string;
  timeRemaining: number; // ms
  status: PredictionWindowStatus;
};

// Wallet-authenticated sessions live entirely in the dex_session HttpOnly
// cookie Dex-Backend sets on login (see authApi.ts) — never in
// localStorage/Authorization headers, which is only how the separate admin
// panel session works (Auth.ts's setSession, called only from adminApi.ts).
// Using Authorization here meant this request could never carry a real
// wallet session's credentials at all. credentials: "include" sends that
// cookie the same way every other authenticated request in the app does
// (see authApi.ts's authReq) — cookies are host-scoped, not port-scoped, so
// the same localhost cookie reaches this service on its own port.
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${PREDICTION_API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { ...(options?.headers ?? {}) },
  });
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* non-JSON error */
    }
    throw new Error(message);
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const getPredictionWindows = () => request<PredictionWindow[]>("/prediction/windows");
export const getPredictionWindow = (id: number) => request<PredictionWindow>(`/prediction/windows/${id}`);

export type PredictionHistoryPoint = { timestampMs: number; currentPrice: string; yesPrice: string };
export const getPredictionHistory = (windowId: number) =>
  request<PredictionHistoryPoint[]>(`/prediction/history?windowId=${windowId}`);

export type PredictionBookLevelDTO = { price: string; size: string };
export const getPredictionOrderBook = (windowId: number) =>
  request<{ yes: PredictionBookLevelDTO[]; no: PredictionBookLevelDTO[] }>(`/prediction/book?windowId=${windowId}`);

export const placePredictionOrder = (windowId: number, side: PredictionSide, price: string, size: string) =>
  request<{ orderId: number; filledSize: string; status: PredictionOrderStatus; fillCount: number }>(
    "/prediction/orders",
    json({ windowId, side, price, size }),
  );

export const cancelPredictionOrder = (orderId: number) =>
  request<{ status: string }>(`/prediction/orders/${orderId}/cancel`, { method: "POST" });

export const sellPredictionPosition = (windowId: number, side: PredictionSide, size: string, minPrice: string) =>
  request<{ orderId: number; filledSize: string }>("/prediction/positions/sell", json({ windowId, side, size, minPrice }));

// Backend now always returns [] instead of Go's default null-for-nil-slice
// marshaling (PRED-L2) — kept as PredictionOrder[] here (not | null) so this
// type reflects that guarantee; existing `?? []` call sites still work fine
// against a non-null array.
export const getPredictionOrders = () => request<PredictionOrder[]>("/prediction/orders");

export const getPredictionPositions = () => request<PredictionPosition[]>("/prediction/positions");
