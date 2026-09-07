import { describe, expect, it } from "vitest";
import { effectiveP2PMaxOrderFiat, formatBIUSDAmount, formatBIUSDSellCapacity, grossBIUSDAmountForNet, netBIUSDAmountAfterBuyerFee, parseBIUSDAmount, biusdAmountFromFiat } from "./p2pApi";

describe("BIUSD P2P amount formatting", () => {
  it.each([
    ["5000000", "5"],
    ["5500000", "5.5"],
    ["10250000", "10.25"],
    ["100000001", "100.000001"],
  ])("formats %s raw as %s BIUSD", (raw, formatted) => {
    expect(formatBIUSDAmount(raw)).toBe(formatted);
  });

  it("parses a BIUSD amount with up to six decimal places", () => {
    expect(parseBIUSDAmount("10.25")).toBe("10250000");
    expect(parseBIUSDAmount("10.123456")).toBe("10123456");
  });

  it("shows only the amount that can be listed after the seller fee", () => {
    expect(formatBIUSDSellCapacity("10100000")).toBe("10");
    expect(formatBIUSDSellCapacity("10000000")).toBe("9.900991");
  });

  it("reduces the effective upper limit when an ad has less value remaining", () => {
    expect(effectiveP2PMaxOrderFiat({ maxOrderFiat: "300.00", remainingRaw: "2000000", price: "100.00" })).toBe(200);
    expect(effectiveP2PMaxOrderFiat({ maxOrderFiat: "300.00", remainingRaw: "5000000", price: "100.00" })).toBe(300);
  });

  it("converts an INR investment into a six-decimal BIUSD quantity without overspending", () => {
    expect(biusdAmountFromFiat("250.00", "100.00")).toBe("2.5");
    expect(biusdAmountFromFiat("100.00", "99.00")).toBe("1.010101");
  });

  it("calculates the gross quantity needed for a desired net BIUSD receipt", () => {
    expect(grossBIUSDAmountForNet("1.00")).toBe("1.010101");
    expect(grossBIUSDAmountForNet("4.95")).toBe("4.999999");
    expect(netBIUSDAmountAfterBuyerFee("3.50")).toBe("3.465");
  });
});
