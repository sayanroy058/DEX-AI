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

export function login(address: string, signature: string, walletType: string) {
  return authReq<{ user: AuthUser; token: string }>(`/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, signature, walletType }),
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
    BIUSD: string;
    USDC: string;
    USDT: string;
    BI: string;
  };
  locked: {
    BTC: string;
    BIUSD: string;
    USDC: string;
    USDT: string;
    BI: string;
  };
  withdrawalLocked?: {
    BTC: string;
    BIUSD: string;
    USDC: string;
    USDT: string;
    BI: string;
  };
  token: string;
  amount: string;
};

export function getWalletBalances() {
  return authReq<WalletBalanceResponse>(`/wallet/balance`);
}

export function requestWithdrawal(asset: string, amount: string) {
  return authReq<{ id: string; asset: string; status: string; txHash?: string }>(`/wallet/withdraw-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ asset, amount }),
  });
}

// Converts deposit-intake stables and the platform's internal stable, one
// direction only: USDT→BIUSD and USDC→BIUSD are free (1:1); BIUSD→USDT and
// BIUSD→USDC carry a 1% conversion fee deducted from the credited amount.
// `amount` is raw 6-decimal integer units of the source asset.
export function swapAssets(sourceAsset: string, destinationAsset: string, amount: string) {
  return authReq<{ status: string; sourceAsset: string; destinationAsset: string; amount: string; creditedAmount: string; feeAmount?: string }>(`/wallet/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceAsset, destinationAsset, amount }),
  });
}



