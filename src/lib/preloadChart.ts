// Warm the browser's HTTP cache with the TradingView library's core files
// while the user is on another page, so opening the trade page doesn't wait
// on them. Runs once per page load, only when the browser is idle, and is
// skipped on data-saver / slow connections. With the immutable Cache-Control
// header on /charting_library/ (vercel.json) the files are downloaded once
// per device and then served from disk on every later visit.
//
// NOTE: the bundle file name is version-pinned to the library in
// public/charting_library — update it when the library is upgraded (a stale
// name is harmless: the fetch just 404s and the chart loads as before).
const FILES = [
  "/charting_library/charting_library.standalone.js",
  "/charting_library/bundles/library.fa1ab3d742bd1422fd0b.js",
];

let started = false;

export function preloadChartLibrary(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData || conn?.effectiveType === "slow-2g" || conn?.effectiveType === "2g" || conn?.effectiveType === "3g") return;

  const run = () => {
    for (const url of FILES) {
      fetch(url, { priority: "low" } as RequestInit).catch(() => {});
    }
  };
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  if (idle) idle(run, { timeout: 5000 });
  else setTimeout(run, 3000);
}
