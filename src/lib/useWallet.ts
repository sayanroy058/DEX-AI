import { useSyncExternalStore } from "react";
import { getNonce, getWalletBalances, login as apiLogin, logout as apiLogout, me } from "@/lib/authApi";

export type WalletId = "metamask" | "coinbase" | "bitget";

export type WalletInfo = {
  id: WalletId;
  name: string;
  tag: string;
  desc: string;
  popular?: boolean;
};

export const WALLETS: WalletInfo[] = [
  { id: "metamask", name: "MetaMask", tag: "Most popular", desc: "Connect via the MetaMask browser extension", popular: true },
  { id: "coinbase", name: "Coinbase Wallet", tag: "Easy", desc: "Connect via the Coinbase Wallet extension", popular: true },
  { id: "bitget", name: "Bitget Wallet", tag: "Easy", desc: "Connect via the Bitget Wallet extension", popular: true },
];

// locked = tradingLocked + withdrawalLocked, kept for existing callers that
// only care about the combined figure. tradingLocked/withdrawalLocked are
// exposed separately for the holdings view (available / order-reserved /
// withdrawal-locked), matching plan.md 4.3's required breakdown.
export type Balance = {
  asset: string;
  amount: number;
  locked: number;
  available: number;
  tradingLocked: number;
  withdrawalLocked: number;
};
export type WalletSource = WalletId;

export type WalletState = {
  connected: boolean;
  walletId?: WalletId;
  address?: string;
  userId?: string;
  balances: Balance[];
  error?: string;
  pending?: WalletId | null;
  restored: boolean;
  provider?: Eip1193Provider | null;
};

export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isBitgetWallet?: boolean;
  isBitKeep?: boolean;
  providers?: Eip1193Provider[];
};

type EthereumWindow = Window & { ethereum?: Eip1193Provider; bitkeep?: Eip1193Provider & { ethereum?: Eip1193Provider }; bitKeep?: Eip1193Provider & { ethereum?: Eip1193Provider }; bitget?: Eip1193Provider & { ethereum?: Eip1193Provider } };

type SendTransactionParams = {
  from: string;
  to: string;
  value?: string;
  data?: string;
};

const SUPPORTED_ASSETS = ["BTC", "USDC", "USDT", "BUSD", "OUR_Token"] as const;
type SupportedAsset = (typeof SUPPORTED_ASSETS)[number];

const ASSET_DECIMALS: Record<SupportedAsset, number> = {
	// The backend ledger stores every supported asset as a fixed-point raw
	// integer with six fractional digits. BTC must use that same scale here:
	// decoding it as eight decimals displayed balances 100x too small (for
	// example, a real 0.000250 BTC appeared as 0.00000250 BTC).
	BTC: 6,
	USDC: 6,
	USDT: 6,
	BUSD: 6,
	OUR_Token: 6,
};

const DEFAULT_BALANCES: Balance[] = SUPPORTED_ASSETS.map((asset) => ({
  asset, amount: 0, locked: 0, available: 0, tradingLocked: 0, withdrawalLocked: 0,
}));

function rawBalanceToNumber(raw: string, decimals: number) {
  const normalized = raw.trim();
  if (!/^\d+$/.test(normalized)) return 0;
  const padded = normalized.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals) || "0";
  const fraction = decimals === 0 ? "" : padded.slice(-decimals).replace(/0+$/, "");
  return Number(fraction ? `${whole}.${fraction}` : whole);
}

async function syncBalancesWithBackend() {
  const response = await getWalletBalances();
  const balances = SUPPORTED_ASSETS.map((asset) => {
    const amount = rawBalanceToNumber(response.balances[asset] ?? "0", ASSET_DECIMALS[asset]);
    const tradingLocked = rawBalanceToNumber(response.locked?.[asset] ?? "0", ASSET_DECIMALS[asset]);
    const withdrawalLocked = rawBalanceToNumber(response.withdrawalLocked?.[asset] ?? "0", ASSET_DECIMALS[asset]);
    const locked = tradingLocked + withdrawalLocked;
    return { asset, amount, locked, available: Math.max(0, amount - locked), tradingLocked, withdrawalLocked };
  });
  setState({ balances });
  return balances;
}

const STORAGE_KEY = "dexai.wallet.session.v1";
const DISCONNECT_KEY = "dexai.wallet.disconnected.v1";
const CONNECT_REQUEST_TIMEOUT_MS = 15000;
const DEFAULT_TREASURY_ADDRESS = "0x402a3f89b21c77d4e10e4a52c908f8ab13c4F981";

let state: WalletState = { connected: false, balances: DEFAULT_BALANCES, restored: false, pending: null };
const listeners = new Set<() => void>();
const providerListeners = new WeakMap<object, { accountsChanged: (...args: unknown[]) => void; chainChanged: (...args: unknown[]) => void; disconnect: (...args: unknown[]) => void }>();
let activeProvider: Eip1193Provider | null = null;

const emit = () => listeners.forEach((l) => l());
const setState = (next: Partial<WalletState>) => {
  state = { ...state, ...next };
  emit();
};

function getWindowEthereum() {
  return typeof window === "undefined" ? undefined : (window as EthereumWindow).ethereum;
}

function getInjectedProviders(): Eip1193Provider[] {
  const eth = getWindowEthereum();
  if (!eth) return [];
  return Array.isArray(eth.providers) && eth.providers.length > 0 ? eth.providers : [eth];
}

function getBitgetProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  const win = window as EthereumWindow;
  const candidates: Array<Eip1193Provider | undefined> = [win.bitkeep?.ethereum, win.bitkeep, win.bitKeep?.ethereum, win.bitKeep, win.bitget?.ethereum, win.bitget, win.ethereum];
  for (const provider of candidates) {
    if (!provider) continue;
    return provider;
  }
  return null;
}

function matchProvider(source: WalletId): Eip1193Provider | null {
  const providers = getInjectedProviders();
  if (providers.length === 0) return source === "bitget" ? getBitgetProvider() : null;

  if (source === "metamask") {
    return providers.find((provider) => provider.isMetaMask && !provider.isCoinbaseWallet) ?? providers[0] ?? null;
  }

  if (source === "coinbase") {
    return providers.find((provider) => provider.isCoinbaseWallet) ?? null;
  }

  if (source === "bitget") {
    return getBitgetProvider() ?? providers.find((provider) => provider.isBitgetWallet || provider.isBitKeep) ?? null;
  }

  return null;
}

function detachProvider(provider: Eip1193Provider | null | undefined) {
  if (!provider || !provider.removeListener) return;
  const handlers = providerListeners.get(provider as object);
  if (!handlers) return;
  provider.removeListener("accountsChanged", handlers.accountsChanged);
  provider.removeListener("chainChanged", handlers.chainChanged);
  provider.removeListener("disconnect", handlers.disconnect);
  providerListeners.delete(provider as object);
}

function attachProvider(provider: Eip1193Provider, source: WalletId) {
  detachProvider(activeProvider);
  activeProvider = provider;

  if (!provider.on) return;

  const accountsChanged = (accounts: unknown) => {
    const next = Array.isArray(accounts) ? accounts[0] : undefined;
    if (typeof next === "string" && next) {
      setState({ connected: true, walletId: source, address: next, provider, balances: DEFAULT_BALANCES });
      authenticateWithBackend(provider, source, next)
        .then(syncBalancesWithBackend)
        .catch((error) => setState({ error: toWalletError(error) }));
      persistSession(source, next);
      return;
    }
    wallet.disconnect();
  };

  const chainChanged = () => {
    const stored = loadSession();
    if (stored?.walletId === source) {
      restoreSession().catch(() => {});
    }
  };

  const disconnect = () => {
    wallet.disconnect();
  };

  provider.on("accountsChanged", accountsChanged);
  provider.on("chainChanged", chainChanged);
  provider.on("disconnect", disconnect);
  providerListeners.set(provider as object, { accountsChanged, chainChanged, disconnect });
}

function persistSession(walletId: WalletId, address: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ walletId, address }));
  window.localStorage.removeItem(DISCONNECT_KEY);
}

function loadSession(): { walletId: WalletId; address: string } | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<{ walletId: WalletId; address: string }>;
    if ((parsed.walletId === "metamask" || parsed.walletId === "coinbase" || parsed.walletId === "bitget") && typeof parsed.address === "string") {
      return { walletId: parsed.walletId, address: parsed.address };
    }
  } catch {
    return null;
  }
  return null;
}

function clearPersistedSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.setItem(DISCONNECT_KEY, "true");
}

async function requestWithTimeout(provider: Eip1193Provider, method: string, params?: unknown[] | object) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      provider.request({ method, params }),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Wallet request timed out")), CONNECT_REQUEST_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function toWalletError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  return "Wallet request failed";
}

export function getConnectedProvider() {
  return activeProvider ?? state.provider ?? null;
}

async function connect(source: WalletId) {
  const provider = matchProvider(source);
  if (!provider) {
    setState({ error: `${WALLETS.find((w) => w.id === source)?.name ?? "Selected wallet"} provider not found`, pending: null });
    throw new Error("Provider not found");
  }

  setState({ pending: source, error: undefined });

  try {
    const accounts = (await requestWithTimeout(provider, "eth_requestAccounts")) as string[] | unknown;
    const address = Array.isArray(accounts) ? accounts[0] : undefined;
    if (typeof address !== "string" || !address) throw new Error("No account returned by provider");

    attachProvider(provider, source);
    persistSession(source, address);
    setState({ connected: true, walletId: source, address, provider, restored: true, pending: null });

    try {
      await authenticateWithBackend(provider, source, address);
      await syncBalancesWithBackend();
    } catch (authError) {
      // Wallet is connected on-chain even if backend session creation fails; surface but don't block.
      console.warn("Backend login failed", authError);
    }

    return { walletId: source, address };
  } catch (error) {
    const message = toWalletError(error);
    setState({ error: message, pending: null });
    throw error instanceof Error ? error : new Error(message);
  }
}

async function authenticateWithBackend(provider: Eip1193Provider, source: WalletId, address: string) {
  const { message } = await getNonce(address);
  const signature = (await requestWithTimeout(provider, "personal_sign", [message, address])) as string;
  const { user } = await apiLogin(address, signature, source);
  setState({ userId: user.id });
}

async function disconnect() {
  const provider = getConnectedProvider();

  // Clear local state immediately so network cleanup cannot erase a newer connection.
  detachProvider(provider);
  activeProvider = null;
  clearPersistedSession();
  state = { connected: false, walletId: undefined, address: undefined, userId: undefined, balances: DEFAULT_BALANCES, error: undefined, pending: null, restored: true, provider: null };
  emit();

  if (provider) {
    try {
      await requestWithTimeout(provider, "wallet_revokePermissions", [{ eth_accounts: {} }]);
    } catch {
      // Not all providers support permission revocation.
    }
  }
  try {
    await apiLogout();
  } catch {
    // Backend session may already be gone; not fatal to local disconnect.
  }
}
async function restoreSession() {
  if (!canRestoreWallet()) return null;
  const stored = loadSession();
  if (!stored) return null;
  const provider = matchProvider(stored.walletId);
  if (!provider) return null;

  const accounts = (await requestWithTimeout(provider, "eth_accounts")) as string[] | unknown;
  const address = Array.isArray(accounts) ? accounts[0] : undefined;
  if (typeof address !== "string" || !address) return null;

  attachProvider(provider, stored.walletId);
  setState({ connected: true, walletId: stored.walletId, address, provider, restored: true, pending: null, error: undefined });

  try {
    const { user } = await me();
    setState({ userId: user.id });
  } catch {
    // No active backend session (e.g. expired cookie) - re-authenticate silently.
    await authenticateWithBackend(provider, stored.walletId, address);
  }

  await syncBalancesWithBackend();
  return { walletId: stored.walletId, address };
}

async function sendTransfer(params: SendTransactionParams) {
  const provider = getConnectedProvider();
  if (!provider) throw new Error("Connect a wallet first");
  return requestWithTimeout(provider, "eth_sendTransaction", [params]);
}

export const wallet = {
  connect,
  disconnect,
  restoreSession,
  sendTransfer,
  refreshBalances: syncBalancesWithBackend,
  clearError() {
    setState({ error: undefined });
  },
  deposit(_asset?: string, _amount?: number) {},
  withdraw(_asset?: string, _amount?: number) {},
  get(): WalletState {
    return state;
  },
};

export function useWallet(): WalletState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

export function shortAddress(addr?: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function getWalletSourceLabel(walletId?: WalletId) {
  return walletId ? WALLETS.find((w) => w.id === walletId)?.name ?? walletId : "";
}

export function canRestoreWallet() {
  return typeof window !== "undefined" && !window.localStorage.getItem(DISCONNECT_KEY);
}

export function getTreasuryAddress() {
  return import.meta.env.VITE_TREASURY_ADDRESS || DEFAULT_TREASURY_ADDRESS;
}

if (typeof window !== "undefined") {
  queueMicrotask(() => {
    if (canRestoreWallet()) {
      wallet.restoreSession().catch(() => {});
    } else {
      setState({ restored: true });
    }
  });
}
