// The platform's deposit allowlist: which (asset, chain) combinations are
// permitted at all. This is a product/compliance restriction, independent of
// which chains actually have a working on-chain listener today (only
// Avalanche has one — see Dex-Backend's internal/chain.Listener) — the
// allowlist says what's ALLOWED to be offered; TransferDialog additionally
// checks isChainLive() before letting a deposit actually submit.
//
// - BI2XUSD and BI2X: Avalanche only. Both are the platform's own assets with
//   no independent existence on any other chain (BI2XUSD is pegged 1:1 to
//   USDT internally; BI2X only trades on this exchange) — allowing them on
//   BEP20/ERC20/etc. would create a token that doesn't actually exist there.
// - USDT and USDC: real, widely-bridged stablecoins, allowed across the
//   chains they actually circulate on.
export type Chain = "BEP20" | "ERC20" | "AVAX" | "TON" | "TRC20" | "Polygon" | "Arbitrum";
export type DepositAsset = "USDT" | "USDC" | "BI2XUSD" | "BI2X";

export const ALL_CHAINS: Chain[] = ["BEP20", "ERC20", "AVAX", "TON", "TRC20", "Polygon", "Arbitrum"];

export const DEPOSIT_ALLOWLIST: Record<DepositAsset, Chain[]> = {
  BI2XUSD: ["AVAX"],
  BI2X: ["AVAX"],
  USDT: ["BEP20", "ERC20", "AVAX", "TON", "TRC20", "Polygon", "Arbitrum"],
  USDC: ["BEP20", "ERC20", "AVAX", "TON", "TRC20", "Polygon", "Arbitrum"],
};

export const DEPOSIT_ASSETS = Object.keys(DEPOSIT_ALLOWLIST) as DepositAsset[];

export function chainsFor(asset: string): Chain[] {
  return DEPOSIT_ALLOWLIST[asset as DepositAsset] ?? [];
}

export function isDepositAllowed(asset: string, chain: string): boolean {
  return chainsFor(asset).includes(chain as Chain);
}

// isDepositLive: of the allowed (asset, chain) combinations above, which one
// this build can actually submit a real on-chain deposit for right now.
//
// Only ONE combination is real: USDC on Avalanche, via the deployed
// DexVault contract + Dex-Backend's chain.Listener (see internal/chain).
// Every other allowed combination — including BI2XUSD/BI2X/USDT on Avalanche
// itself — has no deployed contract or listener behind it yet: DexVault
// only exposes depositToken for USDC, and nothing watches for any other
// asset's Deposit event on any chain. So "the chain is Avalanche" alone
// does NOT make a combination live; only this exact pair does.
//
// Keeping this as a single pair-level check (not a per-chain flag) means
// turning on the next real combination later — say BI2XUSD on Avalanche,
// once a BI2XUSD-specific vault path exists — is adding one line here, not
// restructuring this function's shape.
export function isDepositLive(asset: string, chain: string): boolean {
  return asset === "USDC" && chain === "AVAX";
}
