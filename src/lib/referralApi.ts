const REFERRAL_API_URL = import.meta.env.VITE_AUTH_API_URL ?? "http://localhost:8081";

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${REFERRAL_API_URL}${path}`, { ...options, credentials: "include" });
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
  return response.json() as Promise<T>;
}

export type MyReferral = {
  code: string;
  referredCount: number;
  earningsRaw: string; // BI2XUSD raw units (6 decimals)
  sharePct: string; // the CURRENT global referral %, for display only —
  // an individual referred user's actual split was snapshotted at their own
  // signup and may differ from this if the admin has changed it since.
};

export const getMyReferral = () => req<MyReferral>("/referral/me");

export type AffiliateLinkSummary = {
  ID: string;
  Code: string;
  OwnerUserID: string;
  SharePct: string;
  Active: boolean;
  JoinedCount: number;
  EarningsRaw: string;
  CreatedAt: string;
};

export const getMyAffiliateLinks = () => req<{ links: AffiliateLinkSummary[] | null }>("/affiliate/me");

// Referral-code raw-unit formatting: BI2XUSD uses the same 6-decimal raw
// scale as every other asset in this codebase (see useWallet.ts).
export function formatBI2XUSDRaw(raw: string): string {
  const value = BigInt(raw || "0");
  const whole = value / 1_000_000n;
  const fraction = (value % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
