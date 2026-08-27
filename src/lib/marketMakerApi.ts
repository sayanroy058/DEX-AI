// marketMakerApi.ts — admin client for the bots-service market-maker desks.
// Admin routes live on the bots service (VITE_BOTS_API_URL, :8082) and are
// gated by the admin session JWT, sent as a Bearer token (same token the admin
// login stores). Not the dex_session cookie — these are admin-only endpoints.

import { authHeader } from "@/lib/Auth";
import type { BotMarket, BotStats } from "@/lib/botsApi";

const BOTS_API_URL = import.meta.env.VITE_BOTS_API_URL ?? "http://localhost:8082";

export type MarketMaker = {
  id: string;
  base: string;
  market: BotMarket;
  symbol: string;
  walletAddress: string;
  botId: string;
  allocatedUsdc: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  // Live view fields (from the desk-view payload).
  isRunning: boolean;
  indexPrice: string;
  indexFresh: boolean;
  config: Record<string, string>;
  stats: BotStats;
  quoteAsset?: string;
  quoteBalance?: string;
  baseBalance?: string;
};

export type MMFundingEntry = {
  id: string;
  marketMakerId: string;
  direction: "deposit" | "withdraw";
  amount: string;
  balanceAfter: string;
  adminId: string;
  note?: string;
  createdAt: string;
};

export type MMOpenOrder = {
  id: string;
  symbol: string;
  market: string;
  side: string;
  price: string;
  qty: string;
  filled: string;
  status: string;
};

export type CreateMMRequest = {
  base: string;
  market: BotMarket;
  symbol: string;
  config?: Record<string, string>;
};

async function mmReq<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BOTS_API_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
      ...(opts?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function listMarketMakers() {
  return mmReq<{ marketMakers: MarketMaker[] }>("/admin/mm");
}

export function getMarketMaker(id: string) {
  return mmReq<MarketMaker>(`/admin/mm/${id}`);
}

export function createMarketMaker(body: CreateMMRequest) {
  return mmReq<MarketMaker>("/admin/mm", { method: "POST", body: JSON.stringify(body) });
}

export function deleteMarketMaker(id: string) {
  return mmReq<{ status: string }>(`/admin/mm/${id}`, { method: "DELETE" });
}

export function depositMarketMaker(id: string, amount: string, note?: string) {
  return mmReq<MarketMaker>(`/admin/mm/${id}/deposit`, {
    method: "POST",
    body: JSON.stringify({ amount, note: note ?? "" }),
  });
}

export function withdrawMarketMaker(id: string, amount: string, note?: string) {
  return mmReq<MarketMaker>(`/admin/mm/${id}/withdraw`, {
    method: "POST",
    body: JSON.stringify({ amount, note: note ?? "" }),
  });
}

export function setMarketMakerEnabled(id: string, enabled: boolean) {
  return mmReq<MarketMaker>(`/admin/mm/${id}/enable`, {
    method: "POST",
    body: JSON.stringify({ enabled }),
  });
}

export function getMarketMakerHistory(id: string) {
  return mmReq<{ history: MMFundingEntry[] }>(`/admin/mm/${id}/history`);
}

export function getMarketMakerOrders(id: string) {
  return mmReq<{ orders: MMOpenOrder[] }>(`/admin/mm/${id}/orders`);
}

export function updateMarketMakerConfig(id: string, config: Record<string, string>) {
  return mmReq<MarketMaker>(`/admin/mm/${id}`, { method: "PATCH", body: JSON.stringify(config) });
}

export function startAllMarketMakers() {
  return mmReq<{ marketMakers: MarketMaker[] }>("/admin/mm/start-all", { method: "POST" });
}

export function stopAllMarketMakers() {
  return mmReq<{ marketMakers: MarketMaker[] }>("/admin/mm/stop-all", { method: "POST" });
}
