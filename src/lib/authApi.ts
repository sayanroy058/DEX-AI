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
    USDC: string;
    USDT: string;
    BUSD: string;
    OUR_Token: string;
  };
  locked: {
    USDC: string;
    USDT: string;
    BUSD: string;
    OUR_Token: string;
  };
  withdrawalLocked?: {
    USDC: string;
    USDT: string;
    BUSD: string;
    OUR_Token: string;
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

// Test-only fixed 1:1 conversion between USDC and USDT ledger balances.
export function swapAssets(sourceAsset: string, destinationAsset: string, amount: string) {
  return authReq<{ status: string; sourceAsset: string; destinationAsset: string; amount: string }>(`/wallet/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceAsset, destinationAsset, amount }),
  });
}



