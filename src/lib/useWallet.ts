import { useSyncExternalStore } from "react";

export type WalletId = "metamask" | "coinbase" | "binance" | "trust" | "bitget";

export type WalletInfo = {
  id: WalletId;
  name: string;
  tag: string;
  desc: string;
  popular?: boolean;
};

export const WALLETS: WalletInfo[] = [
  { id: "metamask", name: "MetaMask", tag: "Most popular", desc: "Connect via MetaMask browser extension", popular: true },
  { id: "coinbase", name: "Coinbase Wallet", tag: "Easy", desc: "Sign in with Coinbase Wallet", popular: true },
  { id: "binance", name: "Binance Wallet", tag: "CEX", desc: "Connect using Binance Web3 Wallet" },
  { id: "trust", name: "Trust Wallet", tag: "Mobile", desc: "Scan QR with Trust Wallet" },
  { id: "bitget", name: "Bitget Wallet", tag: "DeFi", desc: "Connect via Bitget Wallet" },
];

export type Balance = { asset: string; amount: number };

export type WalletState = {
  connected: boolean;
  walletId?: WalletId;
  address?: string;
  balances: Balance[];
};

const DEFAULT_BALANCES: Balance[] = [
  { asset: "USDT", amount: 25000 },
  { asset: "USDC", amount: 5000 },
  { asset: "BTC", amount: 0.42 },
  { asset: "ETH", amount: 6.18 },
  { asset: "SOL", amount: 120 },
];

let state: WalletState = { connected: false, balances: DEFAULT_BALANCES };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

function randomAddress() {
  const chars = "0123456789abcdef";
  let s = "0x";
  for (let i = 0; i < 40; i++) s += chars[Math.floor(Math.random() * 16)];
  return s;
}

export const wallet = {
  connect(id: WalletId) {
    state = { ...state, connected: true, walletId: id, address: randomAddress() };
    emit();
  },
  disconnect() {
    state = { ...state, connected: false, walletId: undefined, address: undefined };
    emit();
  },
  deposit(asset: string, amount: number) {
    state = {
      ...state,
      balances: state.balances.map(b => b.asset === asset ? { ...b, amount: b.amount + amount } : b),
    };
    emit();
  },
  withdraw(asset: string, amount: number) {
    state = {
      ...state,
      balances: state.balances.map(b => b.asset === asset ? { ...b, amount: Math.max(0, b.amount - amount) } : b),
    };
    emit();
  },
  get(): WalletState { return state; },
};

export function useWallet(): WalletState {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => state,
    () => state,
  );
}

export function shortAddress(addr?: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
