import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBI2XDatafeed } from "./bi2xDatafeed";

function mockFetchJSON(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
}

describe("createBI2XDatafeed", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("resolveSymbol resolves BI2X with a 5-decimal pricescale", async () => {
    const df = createBI2XDatafeed();
    const resolved = await new Promise((resolve, reject) => {
      df.resolveSymbol("BI2X", resolve, reject);
      vi.runAllTimers();
    });
    expect(resolved).toMatchObject({
      name: "BI2X",
      ticker: "BI2X",
      pricescale: 100000, // 5 decimal places, matching the feed's own /symbols response
      type: "crypto",
    });
  });

  it("resolveSymbol rejects an empty symbol name", async () => {
    const df = createBI2XDatafeed();
    const err = await new Promise((resolve) => {
      df.resolveSymbol("", () => {}, resolve);
      vi.runAllTimers();
    });
    expect(err).toBe("invalid symbol");
  });

  it("getBars requests the feed's own 'D' resolution code, not our 'D'", async () => {
    const fetchMock = mockFetchJSON({ s: "ok", t: [1000], o: [1], h: [1.1], l: [0.9], c: [1.05], v: [10] });
    vi.stubGlobal("fetch", fetchMock);

    const df = createBI2XDatafeed();
    await new Promise<void>((resolve, reject) => {
      df.getBars(
        {} as any,
        "D",
        { from: 0, to: 1000, countBack: 10, firstDataRequest: true },
        () => resolve(),
        (e) => reject(new Error(e))
      );
    });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("resolution=1D");
    expect(calledUrl).not.toContain("resolution=D&"); // must be translated, not passed through raw
  });

  it("getBars converts unix-second bar times to milliseconds", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchJSON({ s: "ok", t: [1789156800], o: [3.1], h: [3.2], l: [3.0], c: [3.15], v: [5] })
    );

    const df = createBI2XDatafeed();
    const bars = await new Promise<any[]>((resolve, reject) => {
      df.getBars(
        {} as any,
        "1",
        { from: 0, to: 1789156800, countBack: 10, firstDataRequest: true },
        (bars) => resolve(bars),
        (e) => reject(new Error(e))
      );
    });

    expect(bars).toHaveLength(1);
    expect(bars[0].time).toBe(1789156800 * 1000);
    expect(bars[0].open).toBe(3.1);
    expect(bars[0].close).toBe(3.15);
  });

  it("getBars reports noData:true on the feed's s:'no_data' envelope, not an error", async () => {
    vi.stubGlobal("fetch", mockFetchJSON({ s: "no_data", nextTime: 1788647843 }));

    const df = createBI2XDatafeed();
    let calledError = false;
    const result = await new Promise<{ noData: boolean }>((resolve) => {
      df.getBars(
        {} as any,
        "1",
        { from: 0, to: 1000, countBack: 10, firstDataRequest: true },
        (_bars, meta) => resolve(meta),
        () => {
          calledError = true;
        }
      );
    });
    expect(result.noData).toBe(true);
    expect(calledError).toBe(false);
  });

  it("getBars surfaces the feed's s:'error' envelope as a real error", async () => {
    vi.stubGlobal("fetch", mockFetchJSON({ s: "error", errmsg: "unsupported resolution: D" }));

    const df = createBI2XDatafeed();
    const err = await new Promise<string>((resolve) => {
      df.getBars(
        {} as any,
        "D",
        { from: 0, to: 1000, countBack: 10, firstDataRequest: true },
        () => {},
        (reason) => resolve(reason)
      );
    });
    expect(err).toBe("unsupported resolution: D");
  });

  it("getBars caps countback at the feed's 5000-bar limit", async () => {
    const fetchMock = mockFetchJSON({ s: "ok", t: [], o: [], h: [], l: [], c: [], v: [] });
    vi.stubGlobal("fetch", fetchMock);

    const df = createBI2XDatafeed();
    await new Promise<void>((resolve, reject) => {
      df.getBars(
        {} as any,
        "1",
        { from: 0, to: 1000, countBack: 999_999, firstDataRequest: true },
        () => resolve(),
        (e) => reject(new Error(e))
      );
    });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("countback=5000");
  });

  // Regression test for PERFORMANCE-CODE-REVIEW-FINDINGS.md frontend item
  // #7: subscribeBars' shared poll used to run every 3s unconditionally,
  // even while the chart's tab was backgrounded. It must now stop firing
  // while document.hidden is true and resume (with an immediate tick) the
  // moment visibility returns.
  it("pauses the shared 3s poll while the tab is hidden and resumes on visibility return", async () => {
    const fetchMock = mockFetchJSON({ s: "ok", t: [1000], o: [1], h: [1.1], l: [0.9], c: [1.05], v: [10] });
    vi.stubGlobal("fetch", fetchMock);

    const df = createBI2XDatafeed();
    const guid = "test-pause-resume";
    const onTick = vi.fn();
    df.subscribeBars({} as any, "1", onTick, guid);

    // Initial subscribeBars tick fires immediately (microtask), before any
    // fake-timer advance.
    await vi.runOnlyPendingTimersAsync();
    const callsAfterSubscribe = fetchMock.mock.calls.length;
    expect(callsAfterSubscribe).toBeGreaterThan(0);

    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    // Advance well past several would-be poll intervals; no new fetch calls
    // should happen while hidden.
    await vi.advanceTimersByTimeAsync(3000 * 5);
    expect(fetchMock.mock.calls.length).toBe(callsAfterSubscribe);

    // Returning to visible fires an immediate tick and resumes the interval.
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.runOnlyPendingTimersAsync();
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterSubscribe);

    df.unsubscribeBars(guid);
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });
});
