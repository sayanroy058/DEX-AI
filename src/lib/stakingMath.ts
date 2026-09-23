// Live-display-only simple-interest math for BI2X staking, mirroring
// Dex-Backend's internal/repo/staking.go AccruedInterest exactly (same
// formula, same 365-day-year convention) — but this is ONLY for showing an
// up-to-date estimate on screen. The backend always recalculates
// authoritatively at redeem time and never trusts a client-supplied figure;
// this function existing twice (once in Go, once here) is intentional
// duplication for a live display, not a source of truth.

const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
const ASSET_DECIMALS = 6; // matches Dex-Backend's balanceRawScale

/** Converts a raw integer-string balance (e.g. "5000000000") to a human
 * decimal number (e.g. 5000), at the platform's standard 6-decimal scale. */
export function rawToHuman(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return n / 10 ** ASSET_DECIMALS;
}

/** Live estimate of simple interest accrued on a human-decimal `principal`
 * BI2X amount at `aprBps` basis points, from `startedAt` through `asOf`
 * (defaults to now). Matches the backend's floor-to-whole-raw-unit behavior
 * approximately (this returns a float for smooth display; the backend's
 * real payout floors to a whole raw unit, so the actual credited amount can
 * be a hair below what this shows — expected and harmless for a live
 * estimate). */
export function estimateAccruedInterest(principal: number, aprBps: number, startedAt: Date | string, asOf: Date = new Date()): number {
  const started = typeof startedAt === "string" ? new Date(startedAt) : startedAt;
  const elapsedSeconds = (asOf.getTime() - started.getTime()) / 1000;
  if (elapsedSeconds <= 0 || principal <= 0 || aprBps <= 0) return 0;
  return (principal * aprBps * elapsedSeconds) / (10000 * SECONDS_PER_YEAR);
}

/** Live estimate of a stake's current total value (principal + accrued
 * interest so far), for display only. */
export function estimateCurrentValue(principal: number, aprBps: number, startedAt: Date | string, asOf: Date = new Date()): number {
  return principal + estimateAccruedInterest(principal, aprBps, startedAt, asOf);
}
