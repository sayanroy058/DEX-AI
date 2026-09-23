const FEES_API_URL = import.meta.env.VITE_AUTH_API_URL ?? "http://localhost:8081";

export type FeeTier = {
  tier: number;
  bi2xusdValue: string;
  discountPct: string;
  active: boolean;
  bi2xCost?: string; // live preview only — the server recomputes at purchase time
  bi2xCostError?: string;
};

export type MySubscription =
  | { active: false }
  | { active: true; tier: number; discountPct: string; purchasedAt: string; expiresAt: string };

export type SubscribeResult = {
  tier: number;
  discountPct: string;
  bi2xPriceUsed: string;
  bi2xAmountPaid: string;
  purchasedAt: string;
  expiresAt: string;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${FEES_API_URL}${path}`, { ...options, credentials: "include" });
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

export const getFeeTiers = () => request<{ tiers: FeeTier[] }>("/fees/tiers");
export const getMyFeeSubscription = () => request<MySubscription>("/fees/my-subscription");
export const subscribeFeeTier = (tier: number) =>
  request<SubscribeResult>("/fees/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tier }),
  });
