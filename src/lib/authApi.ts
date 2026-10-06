const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL ?? "http://localhost:8081";

export type AuthUser = {
  id: string;
  walletAddress: string;
  walletType: string;
  createdAt: string;
  lastLoginAt?: string;
};

async function authReq<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${AUTH_API_URL}${path}`, { ...opts, credentials: "include" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function getNonce(address: string) {
  const params = new URLSearchParams({ address });
  return authReq<{ nonce: string; message: string }>(`/auth/nonce?${params}`);
}

// referralCode is an optional referral or affiliate code (see
// pendingReferralCode in useWallet.ts, which captures "?ref=CODE" from the
// URL on first visit). Only ever consulted by the backend the first time
// this wallet address logs in — a returning user is never (re-)linked.
export function login(address: string, signature: string, walletType: string, referralCode?: string) {
  return authReq<{ user: AuthUser; token: string }>(`/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, signature, walletType, referralCode: referralCode || undefined }),
  });
}

export function logout() {
  return authReq<{ status: string }>(`/auth/logout`, { method: "POST" });
}

export function me() {
  return authReq<{ user: AuthUser }>(`/auth/me`);
}
export type WalletBalanceResponse = {
  balances: {
    BTC: string;
    BI2X: string;
    BI2XUSD: string;
    USDC: string;
    USDT: string;
  };
  locked: {
    BTC: string;
    BI2X: string;
    BI2XUSD: string;
    USDC: string;
    USDT: string;
  };
  withdrawalLocked?: {
    BTC: string;
    BI2X: string;
    BI2XUSD: string;
    USDC: string;
    USDT: string;
  };
  token: string;
  amount: string;
};

export function getWalletBalances() {
  return authReq<WalletBalanceResponse>(`/wallet/balance`);
}

// AreaBalance is one wallet area's figures (Futures/Staking/Prediction),
// raw integer strings at the platform's standard 6-decimal scale — same
// convention as every other balance figure in this API. See
// BalancesByAreaResponse's doc comment for what "area" means here.
export type AreaBalance = {
  availableRaw: string;
  reservedRaw: string;
  totalRaw: string;
};

// SpotAreaBalance is Spot's own shape, kept distinct from AreaBalance since
// Spot is multi-asset (BTC/BI2X/BI2XUSD/USDC/USDT) while Futures/Staking/
// Prediction are each a single BI2XUSD pool — see Dex-Backend's
// WalletServer.BalancesByArea doc comment.
export type SpotAreaBalance = {
  assets: Record<string, string>;
  locked: Record<string, string>;
};

// BalancesByAreaResponse is Phase 6 of ~/.claude/plans/wallet-separation.md:
// the per-area breakdown backing the unified wallet view (Spot/Futures/
// Staking/Prediction), one HTTP round trip instead of four. An area the
// backend couldn't load (e.g. the engine briefly unreachable for Futures)
// is simply absent from `areas` rather than the whole response failing —
// callers should treat a missing key as "unknown right now", not "zero".
export type BalancesByAreaResponse = {
  areas: {
    SPOT?: SpotAreaBalance;
    FUTURES?: AreaBalance;
    STAKING?: AreaBalance;
    PREDICTION?: AreaBalance;
  };
};

export function getBalancesByArea() {
  return authReq<BalancesByAreaResponse>(`/wallet/balances-by-area`);
}

export function requestWithdrawal(asset: string, amount: string) {
  return authReq<{ id: string; asset: string; status: string; txHash?: string }>(`/wallet/withdraw-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ asset, amount }),
  });
}

// Converts deposit-intake stables and the platform's internal stable, one
// direction only: USDT→BI2XUSD and USDC→BI2XUSD are free (1:1); BI2XUSD→USDT and
// BI2XUSD→USDC carry a 1% conversion fee deducted from the credited amount.
// `amount` is raw 6-decimal integer units of the source asset.
export function swapAssets(sourceAsset: string, destinationAsset: string, amount: string) {
  return authReq<{ status: string; sourceAsset: string; destinationAsset: string; amount: string; creditedAmount: string; feeAmount?: string }>(`/wallet/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceAsset, destinationAsset, amount }),
  });
}

// Returns the amount of `asset` currently available in that asset's
// swappable pool — the exact figure a BI2XUSD -> USDT/USDC swap is capped
// at right now (see Dex-Backend's swap_pool_balances / DebitSwapPoolCapped).
// `asset` must be "USDT" or "USDC" (BI2XUSD -> BI2XUSD has no pool). Called
// before a user confirms a BI2XUSD -> stablecoin swap so the cap is visible
// upfront rather than only surfacing as a submit-time rejection — the
// server-side check in Swap is still the real enforcement point, since this
// figure can go stale between the read and the actual swap.
export function getSwapPoolMax(asset: string) {
  return authReq<{ asset: string; maxSwappable: string }>(`/wallet/swap/max?asset=${encodeURIComponent(asset)}`);
}



