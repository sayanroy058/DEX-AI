import { describe, it, expect } from "vitest";
import { DEPOSIT_ALLOWLIST, DEPOSIT_ASSETS, chainsFor, isDepositAllowed, isDepositLive } from "./depositAssets";

describe("depositAssets allowlist", () => {
  it("restricts BI2XUSD and BI2X to Avalanche only", () => {
    expect(chainsFor("BI2XUSD")).toEqual(["AVAX"]);
    expect(chainsFor("BI2X")).toEqual(["AVAX"]);
  });

  it("allows USDT and USDC across all seven chains", () => {
    const expected = ["BEP20", "ERC20", "AVAX", "TON", "TRC20", "Polygon", "Arbitrum"];
    expect(chainsFor("USDT")).toEqual(expected);
    expect(chainsFor("USDC")).toEqual(expected);
  });

  it("returns no chains for an unknown asset", () => {
    expect(chainsFor("ETH")).toEqual([]);
  });

  it("isDepositAllowed matches the allowlist exactly", () => {
    expect(isDepositAllowed("BI2XUSD", "AVAX")).toBe(true);
    expect(isDepositAllowed("BI2XUSD", "ERC20")).toBe(false);
    expect(isDepositAllowed("BI2X", "TRC20")).toBe(false);
    expect(isDepositAllowed("USDT", "TON")).toBe(true);
    expect(isDepositAllowed("USDC", "Polygon")).toBe(true);
    expect(isDepositAllowed("ETH", "AVAX")).toBe(false);
  });

  it("only USDC on AVAX is live today — including BI2XUSD/BI2X/USDT on Avalanche itself", () => {
    expect(isDepositLive("USDC", "AVAX")).toBe(true);
    // Same chain, different asset — still not live: DexVault only has a
    // depositToken path for USDC, not for any other asset on any chain.
    expect(isDepositLive("BI2XUSD", "AVAX")).toBe(false);
    expect(isDepositLive("BI2X", "AVAX")).toBe(false);
    expect(isDepositLive("USDT", "AVAX")).toBe(false);
    // Same asset, different chain — also not live.
    expect(isDepositLive("USDC", "ERC20")).toBe(false);
    expect(isDepositLive("USDC", "Polygon")).toBe(false);
  });

  it("exposes exactly the four allowed deposit assets", () => {
    expect(DEPOSIT_ASSETS.sort()).toEqual(["BI2X", "BI2XUSD", "USDC", "USDT"].sort());
    expect(Object.keys(DEPOSIT_ALLOWLIST).sort()).toEqual(DEPOSIT_ASSETS.sort());
  });
});
