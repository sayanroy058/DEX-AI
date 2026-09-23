import { useEffect, useRef, useState } from "react";
import { getPredictionHistory, getPredictionWindows, type PredictionTick, type PredictionWindow } from "@/lib/predictionApi";
import { predictionWsClient } from "@/lib/predictionWsClient";
import { predictionMarketId, type PredictionMarket, type PredictionPricePoint } from "@/lib/predictionMarkets";

const ICON: Record<string, string> = { BTC: "BTC", ETH: "ETH", SOL: "SOL" };
const MAX_HISTORY_POINTS = 1200;

// REST gives us window identity/timing (id, start/end, status) — the things
// a 5s poll can safely own. Live price/outcome data comes exclusively from
// WebSocket ticks; REST must never touch those fields once ticks are
// flowing, or every poll would stomp the live chart/prices back to a bare
// 50/50 placeholder (this was the "chart disappears every few seconds" bug).
function windowToMarket(win: PredictionWindow, priceHistory: PredictionPricePoint[] = []): PredictionMarket {
  const status = win.status === "settled" ? "RESOLVED" : win.status === "locked" ? "CLOSED" : "OPEN";
  const last = priceHistory.at(-1);
  return {
    id: predictionMarketId(win.market, win.duration === "5m" ? 5 : 15),
    windowId: win.id,
    slug: predictionMarketId(win.market, win.duration === "5m" ? 5 : 15),
    title: `${win.market} Above Target — Next ${win.duration === "5m" ? "5 Minutes" : "15 Minutes"}`,
    shortTitle: `${win.market} Above Target`,
    icon: ICON[win.market] ?? win.market,
    symbol: win.market,
    interval: win.duration === "5m" ? "5 Minutes" : "15 Minutes",
    intervalMinutes: win.duration === "5m" ? 5 : 15,
    status,
    startTime: win.startTime,
    endTime: win.endTime,
    referencePrice: win.targetPrice ? Number(win.targetPrice) : undefined,
    currentPrice: last ? last.price : win.openingPrice ? Number(win.openingPrice) : undefined,
    priceHistory,
    outcomes: [
      { id: "yes", label: "YES", price: 0.5, tone: "positive" },
      { id: "no", label: "NO", price: 0.5, tone: "negative" },
    ],
    orderBooks: [],
    relatedMarketIds: [],
  };
}

/**
 * Loads the current round for a symbol/duration from the REST API — seeding
 * the chart with the round's full price history since it opened (fetched
 * once from Redis-backed /prediction/history, not rebuilt from page-open) —
 * then keeps it live via the WebSocket tick stream. REST only ever supplies
 * window identity, timing/status, and the one-time history seed; once a
 * tick for the current window has arrived, REST polls are merged in a way
 * that never overwrites price/outcome data, so a routine 5s poll can't undo
 * what the live socket already rendered.
 *
 * When the tracked round rolls over to a new window, this does NOT silently
 * follow it — `roundClosed` flips true and the market/state stay frozen on
 * the round that just ended, so the UI can show a "this round has closed"
 * screen. Call `switchToLive()` to explicitly move to the new round.
 */
export function useLivePredictionMarket(symbol: "BTC" | "ETH" | "SOL", intervalMinutes: 5 | 15) {
  const duration = intervalMinutes === 5 ? "5m" : "15m";
  const [market, setMarket] = useState<PredictionMarket | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now);
  const [roundClosed, setRoundClosed] = useState(false);
  const [nextWindowId, setNextWindowId] = useState<number | null>(null);
  // Bumped by switchToLive() to force the load effect below to re-run and
  // start tracking a fresh window, since trackedWindowIdRef being a ref
  // can't itself trigger a re-render/re-subscribe.
  const [generation, setGeneration] = useState(0);
  const historyRef = useRef<PredictionPricePoint[]>([]);
  const tickWindowIdRef = useRef<number | null>(null);
  // The window this hook is "locked onto" for display — set once on load,
  // changed only by switchToLive(), never silently overwritten by a
  // rollover detected via REST poll or a tick for a different window.
  const trackedWindowIdRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    historyRef.current = [];
    tickWindowIdRef.current = null;
    trackedWindowIdRef.current = null;
    setLoading(true);
    setRoundClosed(false);
    setNextWindowId(null);

    // A window that just rolled over sits in "committed" for about a
    // second (occasionally longer, if the price feed is briefly stale —
    // see the backend's revealGracePeriod) before it's revealed and starts
    // broadcasting ticks. Previously the very first load treated
    // "committed" the same as "open" and showed a static 50/50 placeholder
    // with no live data — indistinguishable from actually being stuck.
    // Polling fast (not the normal 5s cadence) specifically during this
    // narrow gap means the page flips to live data within ~1s of the
    // reveal instead of waiting for the next slow poll.
    let fastPollTimer: ReturnType<typeof setInterval> | null = null;
    const FAST_POLL_MS = 1000;

    const loadOnce = async () => {
      try {
        const windows = await getPredictionWindows();
        if (cancelled) return;
        const win = windows.find((w) => w.market === symbol && w.duration === duration);
        if (!win) return;

        // First load for this symbol/duration.
        if (trackedWindowIdRef.current === null) {
          if (win.status === "committed") {
            // Not revealed yet — keep showing the loading state and poll
            // fast until it opens, rather than rendering a placeholder
            // that looks identical to a genuinely live 50/50 market.
            if (!fastPollTimer) fastPollTimer = setInterval(loadOnce, FAST_POLL_MS);
            return;
          }
          if (fastPollTimer) {
            clearInterval(fastPollTimer);
            fastPollTimer = null;
          }
          trackedWindowIdRef.current = win.id;
          let seeded: PredictionPricePoint[] = [];
          try {
            const points = await getPredictionHistory(win.id);
            seeded = points.map((p) => ({ timestamp: new Date(p.timestampMs).toISOString(), price: Number(p.currentPrice) }));
          } catch {
            /* history fetch failed; chart just starts empty and builds from here */
          }
          if (cancelled) return;
          historyRef.current = seeded.slice(-MAX_HISTORY_POINTS);
          setMarket(windowToMarket(win, historyRef.current));
          setLoading(false);
          return;
        }

        // A later poll: if the backend has already rolled to a new window
        // for this symbol/duration, don't follow it automatically — freeze
        // on the tracked round and surface that a new one is ready.
        if (win.id !== trackedWindowIdRef.current) {
          setRoundClosed(true);
          setNextWindowId(win.id);
          return;
        }

        // Same tracked window: only refresh the timing/status fields REST
        // is authoritative for if a tick hasn't already populated live data.
        setMarket((prev) => {
          if (prev && tickWindowIdRef.current === win.id) {
            return { ...prev, status: win.status === "settled" ? "RESOLVED" : win.status === "locked" ? "CLOSED" : "OPEN", startTime: win.startTime, endTime: win.endTime };
          }
          return windowToMarket(win, historyRef.current);
        });
      } catch {
        /* transient network error; next poll or tick will recover */
      }
    };
    loadOnce();
    const pollTimer = window.setInterval(loadOnce, 5000);

    const unsubscribeTick = predictionWsClient.subscribe((tick: PredictionTick) => {
      if (tick.market !== symbol || tick.duration !== duration) return;
      // A round rolled over before the next REST poll caught it — same
      // freeze-and-surface behavior as the poll path above.
      if (trackedWindowIdRef.current !== null && tick.windowId !== trackedWindowIdRef.current) {
        setRoundClosed(true);
        setNextWindowId(tick.windowId);
        return;
      }
      if (trackedWindowIdRef.current === null) {
        trackedWindowIdRef.current = tick.windowId;
      }
      tickWindowIdRef.current = tick.windowId;
      const currentPrice = Number(tick.currentPrice);
      const timestamp = new Date().toISOString();
      historyRef.current = [...historyRef.current, { timestamp, price: currentPrice }].slice(-MAX_HISTORY_POINTS);
      const yesPrice = Number(tick.yesPrice);
      setLoading(false);
      setMarket((prev) => {
        // endTime must be fixed once per window, never recomputed from
        // tick.timeRemaining + Date.now() on every tick — WebSocket message
        // delivery isn't perfectly on-cadence, so "now" at the moment a tick
        // is processed drifts against when the server actually measured
        // timeRemaining. Recomputing endTime every tick fed that jitter
        // straight into the countdown, making it visibly skip forward and
        // backward instead of decreasing smoothly. Only the very first tick
        // for a window (before REST has supplied the real endTime) may
        // derive it from timeRemaining; every tick after reuses that same
        // fixed value.
        const base: PredictionMarket = prev && prev.windowId === tick.windowId
          ? prev
          : {
              id: predictionMarketId(symbol, intervalMinutes),
              windowId: tick.windowId,
              slug: predictionMarketId(symbol, intervalMinutes),
              title: `${symbol} Above Target — Next ${intervalMinutes === 5 ? "5 Minutes" : "15 Minutes"}`,
              shortTitle: `${symbol} Above Target`,
              icon: ICON[symbol] ?? symbol,
              symbol,
              interval: intervalMinutes === 5 ? "5 Minutes" : "15 Minutes",
              intervalMinutes,
              status: "OPEN",
              startTime: new Date().toISOString(),
              endTime: new Date(Date.now() + tick.timeRemaining).toISOString(),
              priceHistory: [],
              outcomes: [],
              orderBooks: [],
              relatedMarketIds: [],
            };
        return {
          ...base,
          windowId: tick.windowId,
          status: tick.status === "settled" ? "RESOLVED" : tick.status === "locked" ? "CLOSED" : "OPEN",
          referencePrice: Number(tick.targetPrice),
          currentPrice,
          priceHistory: historyRef.current,
          outcomes: [
            { id: "yes", label: "YES", price: Number(yesPrice.toFixed(2)), tone: "positive" },
            { id: "no", label: "NO", price: Number((1 - yesPrice).toFixed(2)), tone: "negative" },
          ],
          orderBooks: base.orderBooks.length
            ? base.orderBooks
            : [
                { outcomeId: "yes", bids: [], asks: [], lastPrice: yesPrice },
                { outcomeId: "no", bids: [], asks: [], lastPrice: 1 - yesPrice },
              ],
        };
      });
    });

    const clockTimer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
      window.clearInterval(clockTimer);
      if (fastPollTimer) clearInterval(fastPollTimer);
      unsubscribeTick();
    };
  }, [symbol, duration, intervalMinutes, generation]);

  // Explicitly moves the tracked window forward to the new round once the
  // user chooses to — re-running the whole load sequence (fresh history
  // seed, fresh tick tracking) for the new window id.
  const switchToLive = () => {
    setGeneration((g) => g + 1);
  };

  const closed = market ? market.status !== "OPEN" || now >= new Date(market.endTime).getTime() : false;

  return { market, now, closed, loading, roundClosed, nextWindowId, switchToLive, windowId: tickWindowIdRef.current };
}
