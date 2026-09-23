import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePollingResource } from "./usePollingResource";

describe("usePollingResource", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });

  it("polls at baseIntervalMs while enabled", async () => {
    const fetcher = vi.fn().mockResolvedValue(undefined);
    renderHook(() =>
      usePollingResource({ baseIntervalMs: 1000, maxIntervalMs: 8000, coalesceMs: 100, fetcher, enabled: true })
    );
    expect(fetcher).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not schedule anything while disabled", async () => {
    const fetcher = vi.fn().mockResolvedValue(undefined);
    renderHook(() =>
      usePollingResource({ baseIntervalMs: 1000, maxIntervalMs: 8000, coalesceMs: 100, fetcher, enabled: false })
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("backs off exponentially up to maxIntervalMs while idle, and markActive resets it", async () => {
    const fetcher = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      usePollingResource({ baseIntervalMs: 1000, maxIntervalMs: 4000, coalesceMs: 100, fetcher, enabled: true })
    );

    // 1st poll at 1000ms, 2nd at +2000ms (backed off), 3rd at +4000ms (capped).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000); // would fire again at 1000 if not backed off
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000); // now at 2000ms since last poll: fires
    });
    expect(fetcher).toHaveBeenCalledTimes(2);

    // Reset via markActive: the NEXT scheduled poll should be back at
    // baseIntervalMs (1000ms) rather than continuing to grow/stay backed off.
    act(() => {
      result.current.markActive();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("coalesces rapid triggerRefetch calls into a single trailing call", async () => {
    const fetcher = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      usePollingResource({ baseIntervalMs: 10000, maxIntervalMs: 40000, coalesceMs: 750, fetcher, enabled: true })
    );

    act(() => {
      result.current.triggerRefetch();
      result.current.triggerRefetch();
      result.current.triggerRefetch();
    });
    // First call fires immediately (leading edge); the other two coalesce.
    expect(fetcher).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(750);
    });
    // Exactly one trailing call for the coalesced burst, not two more.
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("refetchNow fetches immediately and resets backoff", async () => {
    const fetcher = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      usePollingResource({ baseIntervalMs: 1000, maxIntervalMs: 8000, coalesceMs: 100, fetcher, enabled: true })
    );
    act(() => {
      result.current.refetchNow();
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("pauses scheduled polling while the tab is hidden and resumes with an immediate refetch on visibility return", async () => {
    const fetcher = vi.fn().mockResolvedValue(undefined);
    renderHook(() =>
      usePollingResource({ baseIntervalMs: 1000, maxIntervalMs: 8000, coalesceMs: 100, fetcher, enabled: true })
    );

    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(fetcher).not.toHaveBeenCalled();

    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
