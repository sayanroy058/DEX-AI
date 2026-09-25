import { useSyncExternalStore } from "react";
import { EthereumProvider } from "@walletconnect/ethereum-provider";
import { getNonce, getWalletBalances, login as apiLogin, logout as apiLogout, me } from "@/lib/authApi";
import { setWsAuthToken } from "@/lib/wsAuthToken";

export type WalletId = "metamask" | "trust" | "binance" | "coinbase" | "bitget" | "walletconnect";

export type WalletInfo = {
  id: WalletId;
  name: string;
  tag: string;
  desc: string;
  popular?: boolean;
};

// "trust" has no dedicated row here by design — Trust Wallet is reached via
// the generic "WalletConnect" entry below instead (deep link on mobile via
// WALLET_DEEPLINK_SCHEMES, or QR on desktop). The WalletId itself, its
// deep-link scheme, and matchProvider's injected-provider detection are
// kept so restoring an existing session or an in-app-browser connection
// still works — only the standalone selector button is gone.
export const WALLETS: WalletInfo[] = [
  { id: "metamask", name: "MetaMask", tag: "Most popular", desc: "Connect via the MetaMask browser extension", popular: true },
  { id: "binance", name: "Binance Wallet", tag: "Popular", desc: "Connect via the Binance Wallet browser extension", popular: true },
  { id: "coinbase", name: "Coinbase Wallet", tag: "Easy", desc: "Connect via the Coinbase Wallet extension", popular: true },
  { id: "bitget", name: "Bitget Wallet", tag: "Easy", desc: "Connect via the Bitget Wallet app", popular: true },
  { id: "walletconnect", name: "WalletConnect", tag: "Any wallet", desc: "Scan a QR code (desktop) or connect from any mobile wallet", popular: false },
];

// Wallets without a browser extension injecting window.ethereum on mobile
// (i.e. every entry here except "walletconnect" itself) get a direct deep
// link into their own app, built from a WalletConnect pairing URI, instead
// of falling back to the generic WalletConnect QR modal — this matches the
// "tap Trust Wallet, it opens Trust Wallet" UX rather than "tap Trust
// Wallet, get a QR code to scan with some other device."
const WALLET_DEEPLINK_SCHEMES: Partial<Record<WalletId, (wcUri: string) => string>> = {
  trust: (uri) => `https://link.trustwallet.com/wc?uri=${encodeURIComponent(uri)}`,
  bitget: (uri) => `https://bkcode.vip/wc?uri=${encodeURIComponent(uri)}`,
  binance: (uri) => `bnc://app.binance.com/mp/app?appId=wc&uri=${encodeURIComponent(uri)}`,
  coinbase: (uri) => `https://go.cb-w.com/wc?uri=${encodeURIComponent(uri)}`,
  metamask: (uri) => `https://metamask.app.link/wc?uri=${encodeURIComponent(uri)}`,
};

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

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
  isTrust?: boolean;
  isTrustWallet?: boolean;
  isBinance?: boolean;
  isBinanceWallet?: boolean;
  providers?: Eip1193Provider[];
};

type WalletNamespace = Eip1193Provider & { ethereum?: Eip1193Provider };
type EthereumWindow = Window & {
  ethereum?: Eip1193Provider;
  bitkeep?: WalletNamespace;
  bitKeep?: WalletNamespace;
  bitget?: WalletNamespace;
  trustwallet?: WalletNamespace;
  BinanceChain?: Eip1193Provider;
  binancew3w?: { ethereum?: Eip1193Provider };
};

type Eip6963ProviderDetail = {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: Eip1193Provider;
};

type SendTransactionParams = {
  from: string;
  to: string;
  value?: string;
  data?: string;
};

// BI2XUSD is the platform's internal stable quote currency (pegged 1:1 to
// USDT, no on-chain contract of its own) — every market trades against it.
// USDC/USDT stay listed as deposit-intake assets (a real on-chain deposit
// lands there first, then converts to BI2XUSD — see Dex-Backend's
// chain.Listener), not because they're still tradable quote currencies.
//
// ETH, SOL, and BNB removed (2026-09-12): they backed the ETH-BI2XUSD/
// SOL-BI2XUSD/BNB-BI2XUSD SPOT markets, which no longer exist (ETH/SOL are
// FUTURES-only now, settled entirely in BI2XUSD; BNB has no market at all) —
// see Dex-Backend's user_balances migration dropping these columns.
//
// BI (the platform's own native token, distinct from BI2X/BI2XUSD) removed
// (2026-09-13): never wired into any matching-engine market, same reasoning
// as ETH/SOL/BNB above.
const SUPPORTED_ASSETS = ["BTC", "BI2X", "BI2XUSD", "USDC", "USDT"] as const;
type SupportedAsset = (typeof SUPPORTED_ASSETS)[number];

const ASSET_DECIMALS: Record<SupportedAsset, number> = {
	// The backend ledger stores every supported asset as a fixed-point raw
	// integer with six fractional digits. BTC must use that same scale here:
	// decoding it as eight decimals displayed balances 100x too small (for
	// example, a real 0.000250 BTC appeared as 0.00000250 BTC).
	BTC: 6,
	BI2X: 6,
	BI2XUSD: 6,
	USDC: 6,
	USDT: 6,
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

// Balance polling: before this, `available` only ever updated when a
// specific action (place/cancel order, swap, transfer) explicitly called
// syncBalancesWithBackend right after itself — everywhere else (a Predict
// order locking funds, an admin credit, a resting limit order that fills
// hours or days later) left the last-fetched figure on screen indefinitely
// with no way to self-correct short of a manual page reload. A user reading
// a stale "available" that's actually higher than what they can really
// spend is exactly the kind of thing that must not happen on a trading
// platform — this closes that gap for every action, not just the ones some
// feature happened to remember to refresh after.
//
// Deliberately module-level, not a React hook (usePollingResource, used
// elsewhere for exactly this poll/backoff/visibility shape, can't be used
// here — this store is a plain module singleton, not a component), but
// mirrors that hook's behavior: a short baseline interval while connected,
// exponential backoff up to a ceiling while nothing changes, reset back to
// baseline by any action that's already known to move a balance (so the
// user's OWN order/swap/transfer still updates promptly, this poll is only
// the safety net for everything else), and a full pause while the tab is
// hidden with an immediate refresh on return.
const BALANCE_POLL_BASE_MS = 5000;
const BALANCE_POLL_MAX_MS = 30000;
let balancePollIntervalMs = BALANCE_POLL_BASE_MS;
let balancePollTimer: ReturnType<typeof setTimeout> | null = null;

function clearBalancePoll() {
  if (balancePollTimer) {
    clearTimeout(balancePollTimer);
    balancePollTimer = null;
  }
}

function scheduleBalancePoll() {
  clearBalancePoll();
  if (!state.connected || (typeof document !== "undefined" && document.hidden)) return;
  balancePollTimer = setTimeout(() => {
    syncBalancesWithBackend()
      .catch(() => {
        // Transient failure (network blip, momentary backend slowness):
        // leave the last-known balances on screen rather than clearing
        // them, and just try again on the next tick.
      })
      .finally(() => {
        balancePollIntervalMs = Math.min(balancePollIntervalMs * 2, BALANCE_POLL_MAX_MS);
        scheduleBalancePoll();
      });
  }, balancePollIntervalMs);
}

// Called by refreshBalances (i.e. every existing "just did something that
// moves a balance" call site already in this file/other features) so a
// user's own action both refreshes immediately AND resets the poll back to
// the short baseline interval — otherwise an account that had been idle
// long enough to back off to BALANCE_POLL_MAX_MS would keep polling that
// slowly even right after the user's own trade, defeating the point of
// resetting on real activity.
function markBalanceActivity() {
  balancePollIntervalMs = BALANCE_POLL_BASE_MS;
  if (balancePollTimer) scheduleBalancePoll();
}

async function refreshBalancesAndMarkActive() {
  const result = await syncBalancesWithBackend();
  markBalanceActivity();
  return result;
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearBalancePoll();
    } else if (state.connected) {
      markBalanceActivity();
      syncBalancesWithBackend().catch(() => {});
    }
  });
}

const STORAGE_KEY = "dexai.wallet.session.v1";
const DISCONNECT_KEY = "dexai.wallet.disconnected.v1";
const CONNECT_REQUEST_TIMEOUT_MS = 15000;
const DEFAULT_TREASURY_ADDRESS = "0x402a3f89b21c77d4e10e4a52c908f8ab13c4F981";

let state: WalletState = { connected: false, balances: DEFAULT_BALANCES, restored: false, pending: null };
const listeners = new Set<() => void>();
const providerListeners = new WeakMap<object, { accountsChanged: (...args: unknown[]) => void; chainChanged: (...args: unknown[]) => void; disconnect: (...args: unknown[]) => void }>();
let activeProvider: Eip1193Provider | null = null;
const announcedProviders = new Map<string, Eip6963ProviderDetail>();

const emit = () => listeners.forEach((l) => l());
const setState = (next: Partial<WalletState>) => {
  const wasConnected = state.connected;
  state = { ...state, ...next };
  emit();
  // Start/stop the balance poll on every connected-state transition, from
  // this single choke point, rather than at each of the several call sites
  // that can flip `connected` (accountsChanged, connect(), restoreSession())
  // — a future call site that sets connected:true and forgets to also start
  // polling would silently reintroduce the exact "stale until reload" bug
  // this feature exists to close. disconnect() bypasses setState entirely
  // (see its own comment on writing `state =` directly for ordering
  // reasons) and stops the poll itself.
  if (state.connected && !wasConnected) {
    markBalanceActivity();
    scheduleBalancePoll();
  } else if (!state.connected && wasConnected) {
    clearBalancePoll();
  }
};

function getWindowEthereum() {
  return typeof window === "undefined" ? undefined : (window as EthereumWindow).ethereum;
}

function getInjectedProviders(): Eip1193Provider[] {
  const eth = getWindowEthereum();
  if (!eth) return [];
  return Array.isArray(eth.providers) && eth.providers.length > 0 ? eth.providers : [eth];
}

function isProvider(value: unknown): value is Eip1193Provider {
  return typeof value === "object" && value !== null && "request" in value && typeof (value as Eip1193Provider).request === "function";
}

function rememberAnnouncedProvider(event: Event) {
  const detail = (event as CustomEvent<Eip6963ProviderDetail>).detail;
  if (!detail?.info?.uuid || !isProvider(detail.provider)) return;
  announcedProviders.set(detail.info.uuid, detail);
}

function requestAnnouncedProviders() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("eip6963:requestProvider"));
}

function getAnnouncedProvider(source: WalletId): Eip1193Provider | null {
  requestAnnouncedProviders();
  for (const { info, provider } of announcedProviders.values()) {
    const identity = `${info.rdns} ${info.name}`.toLowerCase();
    if (source === "trust" && (info.rdns.toLowerCase() === "com.trustwallet.app" || identity.includes("trust wallet"))) return provider;
    if (source === "binance" && identity.includes("binance")) return provider;
    if (source === "metamask" && identity.includes("metamask")) return provider;
    if (source === "coinbase" && identity.includes("coinbase")) return provider;
    if (source === "bitget" && (identity.includes("bitget") || identity.includes("bitkeep"))) return provider;
  }
  return null;
}

function getBitgetProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  const win = window as EthereumWindow;
  const candidates: Array<Eip1193Provider | undefined> = [win.bitkeep?.ethereum, win.bitkeep, win.bitKeep?.ethereum, win.bitKeep, win.bitget?.ethereum, win.bitget];
  for (const provider of candidates) {
    if (!isProvider(provider)) continue;
    return provider;
  }
  return null;
}

function getTrustProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  const trust = (window as EthereumWindow).trustwallet;
  if (isProvider(trust?.ethereum)) return trust.ethereum;
  return isProvider(trust) ? trust : null;
}

function getBinanceProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  const win = window as EthereumWindow;
  if (isProvider(win.binancew3w?.ethereum)) return win.binancew3w.ethereum;
  return isProvider(win.BinanceChain) ? win.BinanceChain : null;
}

function matchProvider(source: WalletId): Eip1193Provider | null {
  const announced = getAnnouncedProvider(source);
  if (announced) return announced;

  const providers = getInjectedProviders();

  if (source === "metamask") {
    return providers.find((provider) => provider.isMetaMask && !provider.isCoinbaseWallet && !provider.isTrust && !provider.isTrustWallet) ?? providers[0] ?? null;
  }

  if (source === "trust") {
    return getTrustProvider() ?? providers.find((provider) => provider.isTrustWallet || provider.isTrust) ?? null;
  }

  if (source === "binance") {
    return getBinanceProvider() ?? providers.find((provider) => provider.isBinanceWallet || provider.isBinance) ?? null;
  }

  if (source === "coinbase") {
    return providers.find((provider) => provider.isCoinbaseWallet) ?? null;
  }

  if (source === "bitget") {
    return providers.find((provider) => provider.isBitgetWallet || provider.isBitKeep) ?? getBitgetProvider();
  }

  return null;
}

// Lazily created, cached singleton — EthereumProvider.init() spins up a
// relay-server connection and pairing state, so it's expensive to create
// and must be reused (not re-init'd) across a connect/disconnect/reconnect
// cycle within the same page load.
let walletConnectProviderPromise: ReturnType<typeof EthereumProvider.init> | null = null;

function getFujiChainId(): number {
  const raw = import.meta.env.VITE_FUJI_CHAIN_ID;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : 43113;
}

// Avalanche Fuji (43113) is a testnet most wallet apps, including Trust
// Wallet, don't have registered for WalletConnect sessions — passing it as
// a REQUIRED chain (the SDK's `chains` option) makes the wallet reject the
// whole session with "requested chain not supported" the moment the user
// approves, before any account is even returned. `optionalChains` instead
// asks for it without making the wallet's support a hard precondition;
// Ethereum mainnet (1) is included first purely as a chain every wallet is
// guaranteed to recognize, so session approval itself always succeeds —
// the actual chain used for transactions is still driven by whatever the
// connected account/provider reports, same as before.
const WALLETCONNECT_OPTIONAL_CHAINS = [1, getFujiChainId()];

async function getWalletConnectProvider() {
  if (!walletConnectProviderPromise) {
    const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
    if (!projectId) throw new Error("WalletConnect is not configured (missing VITE_WALLETCONNECT_PROJECT_ID)");
    walletConnectProviderPromise = EthereumProvider.init({
      projectId,
      optionalChains: WALLETCONNECT_OPTIONAL_CHAINS,
      showQrModal: true,
      metadata: {
        name: "BitDx",
        description: "BitDx",
        url: typeof window !== "undefined" ? window.location.origin : "https://bitdx.me",
        icons: [],
      },
    });
  }
  return (await walletConnectProviderPromise) as unknown as Eip1193Provider;
}

// Used for the "tap a specific wallet on mobile" path (see
// WALLET_DEEPLINK_SCHEMES): builds a fresh, un-modal'd WalletConnect
// provider so its pairing URI can be captured off the "display_uri" event
// and turned into that wallet's own deep link, instead of showing the
// generic QR modal. Deliberately NOT the cached singleton above — this one
// is only used to obtain a URI and is discarded/reused per connect attempt.
async function createWalletConnectProviderForDeepLink() {
  const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
  if (!projectId) throw new Error("WalletConnect is not configured (missing VITE_WALLETCONNECT_PROJECT_ID)");
  return EthereumProvider.init({
    projectId,
    optionalChains: WALLETCONNECT_OPTIONAL_CHAINS,
    showQrModal: false,
    metadata: {
      name: "BitDx",
      description: "BitDx",
      url: typeof window !== "undefined" ? window.location.origin : "https://bitdx.me",
      icons: [],
    },
  });
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
    if (WALLETS.some((walletInfo) => walletInfo.id === parsed.walletId) && typeof parsed.address === "string") {
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

// Deep-links out to a specific wallet's app using a WalletConnect pairing
// URI, then waits for that same provider to finish connecting (the wallet
// app calls back into the WC relay after the user approves, same as if the
// generic QR modal had been scanned). Only reachable on mobile, and only
// for wallets with a known deep-link scheme — see WALLET_DEEPLINK_SCHEMES.
async function connectViaWalletDeepLink(source: WalletId) {
  const buildLink = WALLET_DEEPLINK_SCHEMES[source];
  if (!buildLink) return null;

  const provider = await createWalletConnectProviderForDeepLink();
  const wcEvents = provider as unknown as { on: (event: string, handler: (...args: unknown[]) => void) => void };
  const opened = new Promise<void>((resolve) => {
    wcEvents.on("display_uri", (uri: unknown) => {
      if (typeof uri !== "string") return;
      window.location.href = buildLink(uri);
      resolve();
    });
  });

  await provider.connect();
  await opened;
  return provider as unknown as Eip1193Provider;
}

async function connect(source: WalletId) {
  let provider: Eip1193Provider | null;

  if (source === "walletconnect") {
    provider = await getWalletConnectProvider();
    // Unlike an injected provider, a fresh (or previously-disconnected)
    // WalletConnect provider has no live session yet — eth_requestAccounts
    // via the shared request() path below throws "Please call connect()
    // before request()" until .connect() has opened the QR modal/pairing
    // and a session exists. An already-restored session (accounts already
    // populated) skips straight to the shared eth_requestAccounts call,
    // which then resolves immediately from the existing session.
    const wcAccounts = (provider as unknown as { accounts?: string[] }).accounts;
    if (!wcAccounts || wcAccounts.length === 0) {
      await (provider as unknown as { connect: () => Promise<void> }).connect();
    }
  } else if (isMobileDevice() && !matchProvider(source)) {
    provider = await connectViaWalletDeepLink(source);
  } else {
    provider = matchProvider(source);
  }

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

// Referral/affiliate signup capture. App.tsx stashes a "?ref=CODE" URL param
// here on first load (before any wallet connects); the code is only ever
// meaningful for a NEW user's first login, so it's read (and cleared) once,
// right at the login call, rather than kept around indefinitely.
const PENDING_REFERRAL_CODE_KEY = "dex_pending_referral_code";

export function stashPendingReferralCode(code: string) {
  try {
    localStorage.setItem(PENDING_REFERRAL_CODE_KEY, code);
  } catch {
    // localStorage may be unavailable (private browsing, etc.) — losing the
    // code just means this signup won't be attributed, not a hard failure.
  }
}

function consumePendingReferralCode(): string {
  try {
    const code = localStorage.getItem(PENDING_REFERRAL_CODE_KEY) ?? "";
    if (code) localStorage.removeItem(PENDING_REFERRAL_CODE_KEY);
    return code;
  } catch {
    return "";
  }
}

async function authenticateWithBackend(provider: Eip1193Provider, source: WalletId, address: string) {
  const { message } = await getNonce(address);
  const signature = (await requestWithTimeout(provider, "personal_sign", [message, address])) as string;
  const { user, token } = await apiLogin(address, signature, source, consumePendingReferralCode());
  setWsAuthToken(token);
  setState({ userId: user.id });
}

async function disconnect() {
  const provider = getConnectedProvider();
  const walletId = state.walletId;

  // Clear local state immediately so network cleanup cannot erase a newer connection.
  detachProvider(provider);
  activeProvider = null;
  // Reset the cached WC provider singleton on every disconnect, not just a
  // WalletConnect one — a WC connect attempt abandoned mid-flow (e.g. the
  // user closes the QR modal) can leave a half-initialized/stale provider
  // promise cached, which the next connect() call should not reuse.
  walletConnectProviderPromise = null;
  clearPersistedSession();
  setWsAuthToken(null);
  state = { connected: false, walletId: undefined, address: undefined, userId: undefined, balances: DEFAULT_BALANCES, error: undefined, pending: null, restored: true, provider: null };
  clearBalancePoll();
  emit();

  if (walletId === "walletconnect" && provider) {
    // A WC session is tracked relay-side, not just locally — leaving it
    // open would keep showing "connected" in the wallet app even though
    // this site has moved on, so it needs its own explicit teardown rather
    // than just the generic wallet_revokePermissions call below.
    try {
      await (provider as unknown as { disconnect: () => Promise<void> }).disconnect();
    } catch {
      // Session may already be closed relay-side; not fatal to local disconnect.
    }
  } else if (provider) {
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
  // WalletConnect's own SDK persists its session (pairing + accounts) across
  // reloads internally; re-init'ing it here reconnects to that existing
  // session rather than scanning window.ethereum, which a WC connection
  // never touches.
  const provider = stored.walletId === "walletconnect" ? await getWalletConnectProvider() : matchProvider(stored.walletId);
  if (!provider) return null;
  if (stored.walletId === "walletconnect") {
    const wcAccounts = (provider as unknown as { accounts?: string[] }).accounts;
    if (!wcAccounts || wcAccounts.length === 0) return null;
  }

  const accounts = (await requestWithTimeout(provider, "eth_accounts")) as string[] | unknown;
  const address = Array.isArray(accounts) ? accounts[0] : undefined;
  if (typeof address !== "string" || !address) return null;

  attachProvider(provider, stored.walletId);
  setState({ connected: true, walletId: stored.walletId, address, provider, restored: true, pending: null, error: undefined });

  try {
    const { user } = await me();
    setState({ userId: user.id });
  } catch {
    // No active backend session (e.g. expired cookie) - re-authenticate.
    // This prompts a wallet signature; if the user dismisses it or it
    // otherwise fails, surface that into state.error instead of silently
    // leaving `connected: true` with no real backend session — previously
    // this rejection propagated to a bare `.catch(() => {})` at both call
    // sites, so the UI kept showing "connected" while every authenticated
    // request (e.g. placing a prediction order) failed with an opaque
    // "unauthorized" and no indication why.
    try {
      await authenticateWithBackend(provider, stored.walletId, address);
    } catch (err) {
      setState({ userId: undefined, error: "Sign the wallet message to finish signing in." });
      throw err;
    }
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
  refreshBalances: refreshBalancesAndMarkActive,
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
  window.addEventListener("eip6963:announceProvider", rememberAnnouncedProvider);
  requestAnnouncedProviders();
  queueMicrotask(() => {
    if (canRestoreWallet()) {
      wallet.restoreSession().catch(() => {});
    } else {
      setState({ restored: true });
    }
  });
}
