import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { wallet, shortAddress, WALLETS } from "./useWallet";

// EthereumProvider.init() normally opens a real relay-server connection —
// stub it with a fake provider exposing the same request/on/removeListener
// shape as the injected-provider mocks below, plus WalletConnect-specific
// bits (connect(), disconnect(), a "display_uri" event, and an `accounts`
// property restoreSession reads to confirm a persisted WC session is live).
function createWalletConnectProvider(opts: { accounts?: string[]; startConnected?: boolean } = {}) {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  const finalAccounts = opts.accounts ?? ["0x9999000000000000000000000000000000000009"];
  const provider = {
    // A fresh WalletConnect provider has no session/accounts until connect()
    // resolves — matches the real SDK, and exercises useWallet.ts's "call
    // connect() before eth_requestAccounts" branch. startConnected:true
    // simulates a restored/already-paired session instead.
    accounts: opts.startConnected ? finalAccounts : ([] as string[]),
    request: vi.fn(async ({ method }: { method: string }) => {
      if (method === "eth_requestAccounts" || method === "eth_accounts") {
        return finalAccounts;
      }
      return null;
    }),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
    }),
    removeListener: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      listeners.get(event)?.delete(handler);
    }),
    connect: vi.fn(async function (this: { accounts: string[] }) {
      listeners.get("display_uri")?.forEach((handler) => handler("wc:fake-pairing-uri@2"));
      this.accounts = finalAccounts;
    }),
    disconnect: vi.fn(async () => {}),
  };
  return provider as any;
}

const walletConnectInitMock = vi.fn();
vi.mock("@walletconnect/ethereum-provider", () => ({
  EthereumProvider: { init: (...args: unknown[]) => walletConnectInitMock(...args) },
}));

function createProvider(flags: { metaMask?: boolean; coinbase?: boolean; bitget?: boolean; trust?: boolean; binance?: boolean; accounts?: string[] }) {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  const provider = {
    isMetaMask: flags.metaMask,
    isCoinbaseWallet: flags.coinbase,
    isBitgetWallet: flags.bitget,
    isTrustWallet: flags.trust,
    isBinanceWallet: flags.binance,
    request: vi.fn(async ({ method }: { method: string }) => {
      if (method === "eth_requestAccounts" || method === "eth_accounts") {
        return flags.accounts ?? ["0x1111111111111111111111111111111111111111"];
      }
      if (method === "wallet_revokePermissions") return null;
      return null;
    }),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
    }),
    removeListener: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      listeners.get(event)?.delete(handler);
    }),
  };
  return provider as any;
}

describe("wallet state", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    walletConnectInitMock.mockReset();
    // Clear the module-level cached WalletConnect provider singleton so each
    // test's fresh walletConnectInitMock mock is actually exercised, rather
    // than a previous test's already-resolved provider being reused.
    await wallet.disconnect();
  });

  it("shortens addresses consistently", () => {
    expect(shortAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe("0x1234...5678");
  });

  it("connects the selected MetaMask provider when multiple providers exist", async () => {
    const metaMask = createProvider({ metaMask: true, accounts: ["0xaaaa000000000000000000000000000000000001"] });
    const coinbase = createProvider({ coinbase: true, accounts: ["0xbbbb000000000000000000000000000000000002"] });

    Object.defineProperty(window as any, "ethereum", {
      configurable: true,
      value: { providers: [coinbase, metaMask] },
    });

    await wallet.connect("metamask");

    expect(metaMask.request).toHaveBeenCalledWith({ method: "eth_requestAccounts", params: undefined });
    expect(coinbase.request).not.toHaveBeenCalledWith({ method: "eth_requestAccounts", params: undefined });
    expect(wallet.get().walletId).toBe("metamask");
    expect(wallet.get().address).toBe("0xaaaa000000000000000000000000000000000001");
  });

  it("connects the Coinbase provider explicitly", async () => {
    const metaMask = createProvider({ metaMask: true, accounts: ["0xaaaa000000000000000000000000000000000001"] });
    const coinbase = createProvider({ coinbase: true, accounts: ["0xbbbb000000000000000000000000000000000002"] });

    Object.defineProperty(window as any, "ethereum", {
      configurable: true,
      value: { providers: [metaMask, coinbase] },
    });

    await wallet.connect("coinbase");

    expect(coinbase.request).toHaveBeenCalledWith({ method: "eth_requestAccounts", params: undefined });
    expect(wallet.get().walletId).toBe("coinbase");
    expect(wallet.get().address).toBe("0xbbbb000000000000000000000000000000000002");
  });

  it("connects the Bitget provider explicitly", async () => {
    const bitget = createProvider({ bitget: true, accounts: ["0xcccc000000000000000000000000000000000003"] });

    Object.defineProperty(window as any, "ethereum", {
      configurable: true,
      value: bitget,
    });

    await wallet.connect("bitget");

    expect(bitget.request).toHaveBeenCalledWith({ method: "eth_requestAccounts", params: undefined });
    expect(wallet.get().walletId).toBe("bitget");
    expect(wallet.get().address).toBe("0xcccc000000000000000000000000000000000003");
  });

  it("connects the Trust Wallet provider explicitly", async () => {
    const metaMask = createProvider({ metaMask: true });
    const trust = createProvider({ trust: true, accounts: ["0xdddd000000000000000000000000000000000004"] });

    Object.defineProperty(window as any, "ethereum", {
      configurable: true,
      value: { providers: [metaMask, trust] },
    });

    await wallet.connect("trust");

    expect(trust.request).toHaveBeenCalledWith({ method: "eth_requestAccounts", params: undefined });
    expect(metaMask.request).not.toHaveBeenCalledWith({ method: "eth_requestAccounts", params: undefined });
    expect(wallet.get().walletId).toBe("trust");
  });

  it("discovers Trust Wallet through EIP-6963", async () => {
    const trust = createProvider({ trust: true, accounts: ["0xffff000000000000000000000000000000000006"] });
    window.dispatchEvent(new CustomEvent("eip6963:announceProvider", {
      detail: {
        info: { uuid: "123e4567-e89b-42d3-a456-426614174000", name: "Trust Wallet", icon: "data:image/svg+xml,<svg/>", rdns: "com.trustwallet.app" },
        provider: trust,
      },
    }));

    await wallet.connect("trust");

    expect(trust.request).toHaveBeenCalledWith({ method: "eth_requestAccounts", params: undefined });
    expect(wallet.get().walletId).toBe("trust");
  });

  it("connects the Binance Wallet provider explicitly", async () => {
    const metaMask = createProvider({ metaMask: true });
    const binance = createProvider({ binance: true, accounts: ["0xeeee000000000000000000000000000000000005"] });

    Object.defineProperty(window as any, "ethereum", {
      configurable: true,
      value: { providers: [metaMask, binance] },
    });

    await wallet.connect("binance");

    expect(binance.request).toHaveBeenCalledWith({ method: "eth_requestAccounts", params: undefined });
    expect(metaMask.request).not.toHaveBeenCalledWith({ method: "eth_requestAccounts", params: undefined });
    expect(wallet.get().walletId).toBe("binance");
  });

  it("disconnect clears session state and cached storage", async () => {
    const metaMask = createProvider({ metaMask: true });
    Object.defineProperty(window as any, "ethereum", {
      configurable: true,
      value: metaMask,
    });

    await wallet.connect("metamask");
    expect(window.localStorage.getItem("dexai.wallet.session.v1")).toContain("metamask");

    await wallet.disconnect();

    expect(wallet.get().connected).toBe(false);
    expect(wallet.get().walletId).toBeUndefined();
    expect(wallet.get().address).toBeUndefined();
    expect(window.localStorage.getItem("dexai.wallet.session.v1")).toBeNull();
    expect(window.localStorage.getItem("dexai.wallet.disconnected.v1")).toBe("true");
  });

  it("does not restore a session when the user explicitly disconnected", async () => {
    const metaMask = createProvider({ metaMask: true });
    Object.defineProperty(window as any, "ethereum", {
      configurable: true,
      value: metaMask,
    });

    window.localStorage.setItem("dexai.wallet.session.v1", JSON.stringify({ walletId: "metamask", address: "0x123" }));
    window.localStorage.setItem("dexai.wallet.disconnected.v1", "true");

    await wallet.restoreSession();

    expect(wallet.get().connected).toBe(false);
    expect(metaMask.request).not.toHaveBeenCalledWith({ method: "eth_accounts", params: undefined });
  });

  it("exposes only supported wallets in the modal list", () => {
    expect(WALLETS.map((wallet) => wallet.id)).toEqual(["metamask", "trust", "binance", "coinbase", "bitget", "walletconnect"]);
  });

  it("connects via WalletConnect and goes through the shared attach/auth path", async () => {
    const wc = createWalletConnectProvider({ accounts: ["0x9999000000000000000000000000000000000009"] });
    walletConnectInitMock.mockResolvedValue(wc);

    await wallet.connect("walletconnect");

    expect(walletConnectInitMock).toHaveBeenCalled();
    expect(wc.request).toHaveBeenCalledWith({ method: "eth_requestAccounts", params: undefined });
    expect(wallet.get().walletId).toBe("walletconnect");
    expect(wallet.get().address).toBe("0x9999000000000000000000000000000000000009");
  });

  it("tears down the WalletConnect session on disconnect", async () => {
    const wc = createWalletConnectProvider();
    walletConnectInitMock.mockResolvedValue(wc);

    await wallet.connect("walletconnect");
    await wallet.disconnect();

    expect(wc.disconnect).toHaveBeenCalled();
    expect(wallet.get().connected).toBe(false);
  });

  it("deep-links a mobile-only wallet (e.g. Bitget Wallet) via its WalletConnect pairing URI", async () => {
    // Uses "bitget", not "trust" — an earlier test in this file announces a
    // fake Trust Wallet provider via the module-level EIP-6963 registry,
    // which (correctly) has no expiry/cleanup, so matchProvider("trust")
    // would find it here too and this test wouldn't exercise the no-injected-
    // provider deep-link path it's meant to cover. Bitget has no such
    // announced provider anywhere else in this file.
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" });
    // No window.ethereum injected at all, matching a normal mobile browser.
    Object.defineProperty(window as any, "ethereum", { configurable: true, value: undefined });

    const wc = createWalletConnectProvider({ accounts: ["0xdead000000000000000000000000000000dead"] });
    walletConnectInitMock.mockResolvedValue(wc);

    const originalLocation = window.location;
    // @ts-expect-error - deleting to redefine as a writable stub for this test only
    delete window.location;
    window.location = { ...originalLocation, href: "" } as Location;

    await wallet.connect("bitget");

    expect(wc.connect).toHaveBeenCalled();
    expect(window.location.href).toBe(
      "https://bkcode.vip/wc?uri=" + encodeURIComponent("wc:fake-pairing-uri@2"),
    );
    expect(wallet.get().walletId).toBe("bitget");
    expect(wallet.get().address).toBe("0xdead000000000000000000000000000000dead");

    window.location = originalLocation;
  });

  it("subtracts pending withdrawal holds from available balance", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      balances: { USDC: "20669000", USDT: "0" },
      locked: { USDC: "1000000", USDT: "0" },
      withdrawalLocked: { USDC: "15000000", USDT: "0" },
    }), { status: 200, headers: { "Content-Type": "application/json" } })));

    await wallet.refreshBalances();

    const usdc = wallet.get().balances.find((balance) => balance.asset === "USDC");
    expect(usdc?.amount).toBeCloseTo(20.669);
    expect(usdc?.locked).toBeCloseTo(16);
    expect(usdc?.available).toBeCloseTo(4.669);
  });
});

// These are a regression test for a real gap: before this feature, `available`
// only ever updated when a specific action (place/cancel order, swap,
// transfer) explicitly called refreshBalances right after itself. Anything
// else that locked or moved funds elsewhere — a Predict order, an admin
// credit, a resting limit order that fills later — left the last-fetched
// figure on screen indefinitely with no way to self-correct short of a
// manual page reload, which on a trading platform risks a user believing
// they have more spendable balance than they actually do.
describe("wallet balance polling", () => {
  function balanceFetchMock(balance = "1000000") {
    return vi.fn(async () => new Response(JSON.stringify({
      balances: { USDC: balance, USDT: "0" },
      locked: { USDC: "0", USDT: "0" },
      withdrawalLocked: { USDC: "0", USDT: "0" },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
  }

  async function connectProvider() {
    const provider = createProvider({ metaMask: true, accounts: ["0xcccc000000000000000000000000000000000003"] });
    Object.defineProperty(window as any, "ethereum", { configurable: true, value: provider });
    // connect() awaits a real promise chain (requestWithTimeout ->
    // provider.request) before setState({connected: true, ...}) runs, which
    // is what actually starts the poll — under fake timers that promise
    // chain still needs a real await here to resolve, since
    // advanceTimersByTimeAsync only drives timers, not unrelated pending
    // microtasks from a call the test never awaited.
    await wallet.connect("metamask");
    return provider;
  }

  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    wallet.disconnect();
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });

  afterEach(() => {
    wallet.disconnect();
    vi.useRealTimers();
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });

  it("polls balances automatically after connecting, without any explicit refresh call", async () => {
    vi.useFakeTimers();
    const fetchMock = balanceFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    await connectProvider();

    // The scheduled poll's first tick fires after the 5s baseline interval
    // — nothing before that is expected (connect()'s own balance fetch is
    // gated behind authenticateWithBackend, which fails fast in this test
    // environment with no real backend, so it never reaches fetch at all;
    // this test isolates the scheduled poll specifically, not that path).
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
    const callsAfterFirstPoll = fetchMock.mock.calls.length;

    // A second tick must still be scheduled after the first fires.
    await vi.advanceTimersByTimeAsync(10000);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterFirstPoll);
  });

  it("stops polling once disconnected", async () => {
    vi.useFakeTimers();
    const fetchMock = balanceFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    await connectProvider();
    await vi.advanceTimersByTimeAsync(5000);
    const callsBeforeDisconnect = fetchMock.mock.calls.length;
    expect(callsBeforeDisconnect).toBeGreaterThan(0);

    await wallet.disconnect();
    const callsAfterDisconnect = fetchMock.mock.calls.length;

    await vi.advanceTimersByTimeAsync(60000);
    expect(fetchMock.mock.calls.length).toBe(callsAfterDisconnect);
  });

  it("pauses polling while the tab is hidden and resumes immediately on visibility return", async () => {
    vi.useFakeTimers();
    const fetchMock = balanceFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    await connectProvider();
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(0);

    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    const callsWhileHiddenStart = fetchMock.mock.calls.length;

    await vi.advanceTimersByTimeAsync(30000);
    expect(fetchMock.mock.calls.length).toBe(callsWhileHiddenStart);

    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsWhileHiddenStart);
  });

  it("refreshBalances resets the poll back to the short interval even after backoff", async () => {
    vi.useFakeTimers();
    const fetchMock = balanceFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    await connectProvider();

    // Let the poll back off across several idle ticks (5s, then doubling:
    // 10s, 20s) so its interval grows past the 5s baseline before the
    // manual refresh below is expected to reset it.
    await vi.advanceTimersByTimeAsync(5000 + 10000 + 20000);
    const callsAfterBackoff = fetchMock.mock.calls.length;
    expect(callsAfterBackoff).toBeGreaterThan(0);

    // A user's own action (order/swap/etc.) calls refreshBalances directly —
    // this must both fetch immediately AND reset the interval, so the very
    // next scheduled poll is back at the short baseline, not still backed off.
    await wallet.refreshBalances();
    const callsAfterManualRefresh = fetchMock.mock.calls.length;
    expect(callsAfterManualRefresh).toBeGreaterThan(callsAfterBackoff);

    // If the reset worked, the next poll fires at the 5s baseline, not the
    // 40s+ the backoff had grown to.
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterManualRefresh);
  });
});


