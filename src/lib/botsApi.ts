// botsApi.ts — client for the trading-bots service. Authenticated with the
// same dex_session cookie the backend issues (credentials: "include"), so a
// logged-in user's bots are scoped to their wallet automatically.

const BOTS_API_URL = import.meta.env.VITE_BOTS_API_URL ?? "http://localhost:8082";

export type BotMarket = "SPOT" | "FUTURES";
export type BotStatus = "draft" | "running" | "paused" | "stopped" | "error";

export type TemplateParam = {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "interval";
  required: boolean;
  default: string;
  help?: string;
  options?: string[];
};

export type BotTemplate = {
  key: string;
  title: string;
  desc: string;
  category: "Spot" | "Futures";
  available: boolean;
  params: TemplateParam[];
};

export type BotStats = {
  realizedPnl: string;
  unrealizedPnl: string;
  netPnl: string;
  roi: string;
  runtimeSec: number;
  matchedTrades: number;
  trades24h: number;
  maxDrawdownPct: string;
  baseHeld: string;
  avgEntryPrice: string;
};

export type Bot = {
  id: string;
  userId: string;
  walletAddress: string;
  name: string;
  strategy: string;
  market: BotMarket;
  symbol: string;
  investment: string;
  config: Record<string, string>;
  isPublic: boolean;
  status: BotStatus;
  isRunning: boolean;
  state?: Record<string, unknown>;
  stats: BotStats;
  error?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  stoppedAt?: string | null;
};

export type CreateBotRequest = {
  name: string;
  strategy: string;
  market: BotMarket;
  symbol: string;
  investment: string;
  config: Record<string, string>;
  isPublic: boolean;
};

async function botsReq<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BOTS_API_URL}${path}`, {
    ...opts,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function getTemplates() {
  return botsReq<{ templates: BotTemplate[] }>("/bots/templates");
}

export function getMarketplace(strategy?: string) {
  const params = new URLSearchParams();
  if (strategy) params.set("strategy", strategy);
  const qs = params.toString();
  return botsReq<{ bots: Bot[] }>(`/bots/marketplace${qs ? `?${qs}` : ""}`);
}

export function getMyBots() {
  return botsReq<{ bots: Bot[] }>("/bots");
}

export function createBot(body: CreateBotRequest) {
  return botsReq<Bot>("/bots", { method: "POST", body: JSON.stringify(body) });
}

export function startBot(id: string) {
  return botsReq<{ status: string }>(`/bots/${id}/start`, { method: "POST" });
}

export function stopBot(id: string) {
  return botsReq<{ status: string }>(`/bots/${id}/stop`, { method: "POST" });
}

export function deleteBot(id: string) {
  return botsReq<{ status: string }>(`/bots/${id}`, { method: "DELETE" });
}

export function copyBot(id: string) {
  return botsReq<Bot>(`/bots/${id}/copy`, { method: "POST" });
}

// Marketplace tab label -> strategy key (matches the Go Templates() list).
export const MARKETPLACE_TAB_TO_STRATEGY: Record<string, string> = {
  "Spot Grid": "spot_grid",
  "Futures Grid": "futures_grid",
  "Futures DCA": "futures_dca",
  Arbitrage: "arbitrage",
};

export const MARKETPLACE_TABS = ["Spot Grid", "Futures Grid", "Futures DCA", "Arbitrage"] as const;
