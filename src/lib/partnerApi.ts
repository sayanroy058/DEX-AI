import { partnerAuthHeader, setPartnerSession, type PartnerSessionUser } from "@/lib/partnerAuth";

const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL ?? "http://localhost:8081";

async function partnerReq<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${AUTH_API_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...partnerAuthHeader(),
      ...(opts?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function partnerLogin(loginId: string, password: string) {
  const result = await partnerReq<{ token: string; user: PartnerSessionUser }>("/partner/login", {
    method: "POST",
    body: JSON.stringify({ loginId, password }),
  });
  setPartnerSession(result);
  return result;
}

// Matches the admin Fee Revenue page's range convention exactly (see
// FEE_REVENUE_RANGES in adminApi.ts) — "all" (or an omitted range) means
// all-time.
export const PARTNER_PROFIT_RANGES = ["1h", "1d", "1w", "1m", "all"] as const;
export type PartnerProfitRange = (typeof PARTNER_PROFIT_RANGES)[number];

export type PartnerProfitEntry = {
  profitDate: string;
  shareRaw: string;
  sourceTotalRaw: string;
  partnerCount: number;
};

export type PartnerProfit = {
  entries: PartnerProfitEntry[];
  cumulativeRaw: string;
};

export function getPartnerProfit(range: PartnerProfitRange = "all") {
  const query = range === "all" ? "" : `?range=${range}`;
  return partnerReq<PartnerProfit>(`/partner/profit${query}`);
}
