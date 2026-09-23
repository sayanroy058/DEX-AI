import type { PropFirmProgram, PropFirmSize } from "@/lib/propFirmPlans";

const PROP_FIRM_PURCHASE_API_URL = import.meta.env.VITE_AUTH_API_URL ?? "http://localhost:8081";

// Maps the frontend's display program label to the track string
// Dex-Backend's /prop-firm/purchase (and the prop-firm backend's own
// package catalog) actually use.
const trackFor: Record<PropFirmProgram, string> = {
  "One-Step": "1step",
  "Two-Step": "2step",
  "Instant Funding": "instant",
};

export type PropFirmPurchaseResult = {
  purchaseId: string;
  propFirmAccountId: string;
  username: string;
  password: string;
};

// purchasePropFirmAccount calls the real purchase endpoint: it debits the
// signed-in user's BI2XUSD wallet, records the purchase, and provisions a
// real BitDX Prop Firm account server-to-server. Throws on any failure
// (insufficient balance, prop-firm backend unavailable, etc.) with the
// server's own error message.
export async function purchasePropFirmAccount(program: PropFirmProgram, size: PropFirmSize): Promise<PropFirmPurchaseResult> {
  const response = await fetch(`${PROP_FIRM_PURCHASE_API_URL}/prop-firm/purchase`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ track: trackFor[program], accountSize: size }),
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
  return response.json() as Promise<PropFirmPurchaseResult>;
}
