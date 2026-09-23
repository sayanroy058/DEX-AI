import { useCallback, useEffect, useRef } from "react";

// Shared poll/coalesce/backoff/visibility logic factored out of the pattern
// that used to be hand-rolled independently in useOrders, PositionsPanel
// (positions, order history, bots) — see
// PERFORMANCE-CODE-REVIEW-FINDINGS.md frontend items #2/#3/#5/#7/#8. Every
// one of those call sites did the same three things slightly differently:
// a fixed-interval safety-net poll, a 750ms-coalesced "refetch now" trigger
// for WS/event-driven updates, and (item #8) no tab-visibility handling at
// all, so every poll kept firing at full rate even when the tab was
// backgrounded.
//
// This hook adds one behavior none of the original call sites had (item
// #3): idle backoff. An account with zero open orders / no position
// activity re-hits the same endpoint every 5s forever; usePollingResource
// instead doubles its interval (up to maxIntervalMs) each time a poll
// produces no "this changed" signal, and resets to baseIntervalMs the
// moment onEvent() fires (a WS delta, a gap, or any caller-detected change)
// or a manual refetch() is requested. Callers that have no cheap way to
// detect "nothing changed" can pass markActive() unconditionally (e.g. from
// every fetch) to opt out of backoff while still getting coalescing +
// visibility pause.
export type PollingResourceOptions = {
  /** Poll interval while recently active (baseline / non-idle rate). */
  baseIntervalMs: number;
  /** Ceiling the exponential idle backoff will not exceed. */
  maxIntervalMs: number;
  /** Minimum spacing between two triggerRefetch() calls (coalescing window). */
  coalesceMs: number;
  /** The actual fetch to run. Errors are swallowed (caller decides how to
   *  surface them); this hook only owns scheduling, not error UX. */
  fetcher: () => Promise<void>;
  /** Skips scheduling entirely, e.g. while the account/symbol isn't known
   *  yet. Mirrors the `if (!account) return` guards at every original call
   *  site. */
  enabled: boolean;
};

export type PollingResource = {
  /** Fetch immediately, coalesced: if called again within coalesceMs it is
   *  merged into a single trailing call rather than firing twice. Use for
   *  WS-driven "something changed, refetch to get authoritative state"
   *  triggers — the exact role throttledRefetch played at each original
   *  call site. */
  triggerRefetch: () => void;
  /** Fetch immediately, uncoalesced, and reset the idle backoff — for a
   *  user-initiated action (mount, account switch) where waiting out a
   *  pending coalesce window would be visibly wrong. */
  refetchNow: () => void;
  /** Resets the idle backoff to baseIntervalMs without forcing an
   *  immediate fetch — call this when a caller-specific signal (e.g. a WS
   *  event belonging to this resource) proves the resource is still
   *  active, so the next scheduled poll doesn't wait out a long backoff
   *  it built up while genuinely idle. */
  markActive: () => void;
};

export function usePollingResource(opts: PollingResourceOptions): PollingResource {
  const { baseIntervalMs, maxIntervalMs, coalesceMs, fetcher, enabled } = opts;

  // Stored in refs (not state) so changing them never re-triggers effects —
  // this hook's whole point is to own its own scheduling loop independent
  // of React's render cycle.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const intervalMsRef = useRef(baseIntervalMs);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coalesceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coalescePendingRef = useRef(false);
  const hiddenRef = useRef(typeof document !== "undefined" && document.hidden);

  const clearScheduled = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleNext = useCallback(() => {
    clearScheduled();
    if (!enabled || hiddenRef.current) return;
    timerRef.current = setTimeout(() => {
      void fetcherRef.current().finally(() => {
        // Exponential idle backoff: each unprompted scheduled poll (as
        // opposed to a triggerRefetch/refetchNow call, which reset this via
        // markActive) doubles the wait, capped at maxIntervalMs. A resource
        // that's actually changing resets via markActive well before this
        // ever grows large, so this only affects genuinely idle
        // account/symbol combinations.
        intervalMsRef.current = Math.min(intervalMsRef.current * 2, maxIntervalMs);
        scheduleNext();
      });
    }, intervalMsRef.current);
  }, [clearScheduled, enabled, maxIntervalMs]);

  const markActive = useCallback(() => {
    intervalMsRef.current = baseIntervalMs;
    // Without this, resetting the ref alone only takes effect the NEXT time
    // the already-running setTimeout callback reschedules itself — so a
    // markActive() call arriving while a long backed-off wait is already in
    // flight would sit idle for however much of that stale delay remains
    // before the shorter base interval actually kicks in. Rescheduling here
    // makes the reset apply to the currently pending wait immediately.
    if (timerRef.current) scheduleNext();
  }, [baseIntervalMs, scheduleNext]);

  const refetchNow = useCallback(() => {
    markActive();
    void fetcherRef.current();
    // A manual/forced fetch replaces whatever the schedule was about to do;
    // restart the countdown from the (now-reset) base interval so the next
    // safety-net poll isn't unnecessarily close behind this one.
    scheduleNext();
  }, [markActive, scheduleNext]);

  const triggerRefetch = useCallback(() => {
    markActive();
    if (coalesceTimerRef.current) {
      coalescePendingRef.current = true;
      return;
    }
    void fetcherRef.current();
    coalesceTimerRef.current = setTimeout(() => {
      coalesceTimerRef.current = null;
      if (coalescePendingRef.current) {
        coalescePendingRef.current = false;
        triggerRefetch();
      }
    }, coalesceMs);
  }, [coalesceMs, markActive]);

  // Start/stop the scheduled loop when enabled changes (mirrors the
  // `if (!account) return` early-return every original call site had).
  useEffect(() => {
    if (!enabled) {
      clearScheduled();
      return;
    }
    intervalMsRef.current = baseIntervalMs;
    scheduleNext();
    return clearScheduled;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scheduleNext/clearScheduled are stable per enabled/baseIntervalMs/maxIntervalMs identity
  }, [enabled, baseIntervalMs]);

  // Visibility pause (item #7/#8): stop the scheduled loop entirely while
  // the tab is hidden, and immediately refetch + resume on return — a
  // background tab was previously still polling every interval even though
  // browsers already throttle it, and the outstanding requests still queue
  // and land the moment the tab is foregrounded again, worth avoiding
  // outright rather than relying on browser throttling alone.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisibilityChange = () => {
      hiddenRef.current = document.hidden;
      if (document.hidden) {
        clearScheduled();
      } else if (enabled) {
        refetchNow();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [enabled, clearScheduled, refetchNow]);

  useEffect(() => {
    return () => {
      if (coalesceTimerRef.current) clearTimeout(coalesceTimerRef.current);
    };
  }, []);

  return { triggerRefetch, refetchNow, markActive };
}
