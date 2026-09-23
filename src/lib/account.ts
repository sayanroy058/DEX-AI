import { useWallet } from "@/lib/useWallet";

// Fallback account used for order placement when no wallet is connected
// (anonymous/demo browsing).
export const DEMO_ACCOUNT = "buyer";

// Resolves the account to use for order placement: the real logged-in
// user's Dex-Backend user ID when connected, otherwise the demo account.
//
// A connected wallet's userId is populated asynchronously (after address/
// connected land) by the backend auth handshake — during that window
// connected=true but userId is still undefined. Falling back to DEMO_ACCOUNT
// in that gap would fetch/display the demo account's orders and positions
// instead of the real user's, so callers must treat a connected-but-not-yet-
// authenticated wallet as "no account yet", not as "use the demo account".
export function useAccount(): string {
  const { connected, userId } = useWallet();
  if (connected && !userId) return "";
  return connected && userId ? userId : DEMO_ACCOUNT;
}
