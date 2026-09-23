import { describe, it, expect } from "vitest";
import { rawToHuman, estimateAccruedInterest, estimateCurrentValue } from "./stakingMath";

describe("rawToHuman", () => {
  it("converts a raw 6-decimal-scaled balance string to a human number", () => {
    expect(rawToHuman("5000000000")).toBe(5000);
    expect(rawToHuman("1000000")).toBe(1);
    expect(rawToHuman("0")).toBe(0);
  });

  it("returns 0 for a non-numeric input rather than NaN", () => {
    expect(rawToHuman("not-a-number")).toBe(0);
  });
});

describe("estimateAccruedInterest", () => {
  it("matches the backend's formula for a full year at 5% APR (500 bps)", () => {
    const started = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const asOf = new Date();
    // 1,000,000 principal * 5% over exactly one year = 50,000.
    expect(estimateAccruedInterest(1_000_000, 500, started, asOf)).toBeCloseTo(50_000, 0);
  });

  it("matches the backend's exact one-hour test case", () => {
    // Same numbers as Dex-Backend's TestAccruedInterest_OneHour: chosen so
    // the answer divides evenly.
    const started = new Date();
    const asOf = new Date(started.getTime() + 60 * 60 * 1000);
    expect(estimateAccruedInterest(876_000_000, 500, started, asOf)).toBeCloseTo(5000, 0);
  });

  it("returns 0 for zero or negative elapsed time", () => {
    const now = new Date();
    expect(estimateAccruedInterest(1000, 500, now, now)).toBe(0);
    expect(estimateAccruedInterest(1000, 500, now, new Date(now.getTime() - 1000))).toBe(0);
  });

  it("returns 0 for zero principal or zero APR", () => {
    const started = new Date(Date.now() - 60 * 60 * 1000);
    expect(estimateAccruedInterest(0, 500, started)).toBe(0);
    expect(estimateAccruedInterest(1000, 0, started)).toBe(0);
  });

  it("accepts an ISO string for startedAt, same as what the API returns", () => {
    const started = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    expect(estimateAccruedInterest(876_000_000, 500, started)).toBeGreaterThan(0);
  });
});

describe("estimateCurrentValue", () => {
  it("is principal plus accrued interest", () => {
    const started = new Date(Date.now() - 60 * 60 * 1000);
    const principal = 876_000_000;
    const value = estimateCurrentValue(principal, 500, started);
    const interest = estimateAccruedInterest(principal, 500, started);
    expect(value).toBeCloseTo(principal + interest, 6);
  });

  it("equals principal alone when no time has elapsed", () => {
    const now = new Date();
    expect(estimateCurrentValue(1000, 500, now, now)).toBe(1000);
  });
});
