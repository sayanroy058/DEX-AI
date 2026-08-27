import { beforeEach, describe, expect, it, vi } from "vitest";
import { wallet, shortAddress, WALLETS } from "./useWallet";

function createProvider(flags: { metaMask?: boolean; coinbase?: boolean; bitget?: boolean; accounts?: string[] }) {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  const provider = {
    isMetaMask: flags.metaMask,
    isCoinbaseWallet: flags.coinbase,
    isBitgetWallet: flags.bitget,
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
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    wallet.disconnect();
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
    expect(WALLETS.map((wallet) => wallet.id)).toEqual(["metamask", "coinbase", "bitget"]);
  });

  it("subtracts pending withdrawal holds from available balance", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      balances: { USDC: "20669000", USDT: "0", BUSD: "0", OUR_Token: "0" },
      locked: { USDC: "1000000", USDT: "0", BUSD: "0", OUR_Token: "0" },
      withdrawalLocked: { USDC: "15000000", USDT: "0", BUSD: "0", OUR_Token: "0" },
    }), { status: 200, headers: { "Content-Type": "application/json" } })));

    await wallet.refreshBalances();

    const usdc = wallet.get().balances.find((balance) => balance.asset === "USDC");
    expect(usdc?.amount).toBeCloseTo(20.669);
    expect(usdc?.locked).toBeCloseTo(16);
    expect(usdc?.available).toBeCloseTo(4.669);
  });
});


