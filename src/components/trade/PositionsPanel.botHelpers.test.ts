import { describe, it, expect } from "vitest";
import { humanizeStrategy, botStatusDisplay } from "./PositionsPanel";
import type { Bot } from "@/lib/botsApi";

// Regression coverage for the Bot / AI Agent tab replacing 4 hardcoded fake
// rows (BTC Grid, Momentum Flow, SOL DCA, Risk Rebalance — shown for every
// wallet regardless of what bots that account actually had) with the
// account's real bots from GET /bots.

describe("humanizeStrategy", () => {
  it("maps known strategy keys to their display titles", () => {
    expect(humanizeStrategy("spot_grid")).toBe("Spot Grid");
    expect(humanizeStrategy("futures_dca")).toBe("Futures DCA");
    expect(humanizeStrategy("market_maker")).toBe("Market Maker");
    expect(humanizeStrategy("arbitrage")).toBe("Arbitrage");
  });

  it("falls back to a title-cased version of an unknown key", () => {
    expect(humanizeStrategy("some_new_strategy")).toBe("Some New Strategy");
  });
});

function makeBot(overrides: Partial<Bot>): Bot {
  return {
    id: "bot-1",
    userId: "user-1",
    walletAddress: "0xabc",
    name: "Test Bot",
    strategy: "futures_grid",
    market: "FUTURES",
    symbol: "BTC-USDC",
    investment: "100",
    config: {},
    isPublic: false,
    status: "running",
    isRunning: true,
    stats: {
      realizedPnl: "0",
      unrealizedPnl: "0",
      netPnl: "0",
      roi: "0",
      runtimeSec: 0,
      matchedTrades: 0,
      trades24h: 0,
      maxDrawdownPct: "0",
      baseHeld: "0",
      avgEntryPrice: "0",
    },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("botStatusDisplay", () => {
  it("shows Running when the manager confirms it's actually running, regardless of the stored status", () => {
    // isRunning comes from the live manager (bots/internal/api/api.go
    // handleList: bots[i].IsRunning = s.manager.IsRunning(...)), not just
    // the DB row — this is the source of truth for "is it live right now."
    const bot = makeBot({ status: "running", isRunning: true });
    expect(botStatusDisplay(bot)).toEqual({ label: "Running", tone: "buy" });
  });

  it("shows Error when the bot's status is error, even if somehow still marked running", () => {
    const bot = makeBot({ status: "error", isRunning: true, error: "insufficient balance" });
    expect(botStatusDisplay(bot)).toEqual({ label: "Error", tone: "sell" });
  });

  it("shows Paused for a paused, not-running bot", () => {
    const bot = makeBot({ status: "paused", isRunning: false });
    expect(botStatusDisplay(bot)).toEqual({ label: "Paused", tone: "warning" });
  });

  it("shows Draft for a bot that was created but never started", () => {
    const bot = makeBot({ status: "draft", isRunning: false });
    expect(botStatusDisplay(bot)).toEqual({ label: "Draft", tone: "muted" });
  });

  it("shows Stopped as the default for a stopped, not-running bot", () => {
    const bot = makeBot({ status: "stopped", isRunning: false });
    expect(botStatusDisplay(bot)).toEqual({ label: "Stopped", tone: "muted" });
  });
});
