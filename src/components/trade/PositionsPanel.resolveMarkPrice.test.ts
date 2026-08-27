import { describe, it, expect } from "vitest";
import { resolveMarkPrice } from "./PositionsPanel";

// Regression coverage for the "PnL computed against fake data" bug: the
// mark-price priority previously tried the mock market feed FIRST, so a
// real open position's PnL could be computed against a fabricated price
// even while the real backend value was available. This pins the corrected
// priority order: real ticker > position DTO snapshot > mock, last resort.

describe("resolveMarkPrice", () => {
  it("prefers the real ticker mark price when it's usable", () => {
    expect(resolveMarkPrice(77500, "77000", 999)).toBe(77500);
  });

  it("falls back to the position DTO's markPrice when the ticker is unavailable", () => {
    expect(resolveMarkPrice(undefined, "77000", 999)).toBe(77000);
  });

  it("falls back to the position DTO's markPrice when the ticker mark price is zero", () => {
    // markPrice "0" happens when the order book is empty but /ticker still
    // returns 200 — zero isn't a real quote, so it must not be trusted.
    expect(resolveMarkPrice(0, "77000", 999)).toBe(77000);
  });

  it("falls back to the mock market price only as a last resort", () => {
    expect(resolveMarkPrice(undefined, "0", 999)).toBe(999);
  });

  it("returns 0 when nothing at all is available", () => {
    expect(resolveMarkPrice(undefined, "0", undefined)).toBe(0);
  });

  it("never lets a real ticker price be overridden by mock data", () => {
    // The core regression case: a live position exists, the real backend
    // has a real mark price, but the mock market feed also happens to have
    // some price for the same display symbol — the mock must never win.
    const real = 77034.12;
    const mock = 101.5; // e.g. the demo-seed-polluted mock price from before the fix
    expect(resolveMarkPrice(real, "77030", mock)).toBe(real);
  });
});
