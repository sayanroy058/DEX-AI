import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, TrendingUp, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PredictionMarketCard } from "@/components/prediction/PredictionMarketCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPredictionWindows, type PredictionWindow, type PredictionMarketSymbol } from "@/lib/predictionApi";
import { predictionMarketId, type PredictionMarket } from "@/lib/predictionMarkets";

const DURATION_FILTERS = [
  { value: "all", label: "All" },
  { value: "5", label: "5 Minutes" },
  { value: "15", label: "15 Minutes" },
] as const;
type DurationFilter = (typeof DURATION_FILTERS)[number]["value"];

const ASSET_FILTERS = [
  { value: "all", label: "All Assets" },
  { value: "BTC", label: "Bitcoin" },
  { value: "ETH", label: "Ethereum" },
  { value: "SOL", label: "Solana" },
] as const;
type AssetFilter = "all" | PredictionMarketSymbol;

function windowToCardMarket(win: PredictionWindow): PredictionMarket {
  const yes = win.status === "committed" ? 0.5 : undefined;
  return {
    id: predictionMarketId(win.market, win.duration === "5m" ? 5 : 15),
    windowId: win.id,
    slug: predictionMarketId(win.market, win.duration === "5m" ? 5 : 15),
    title: `${win.market} Above Target — Next ${win.duration === "5m" ? "5 Minutes" : "15 Minutes"}`,
    shortTitle: `${win.market} Above Target`,
    icon: win.market,
    symbol: win.market,
    interval: win.duration === "5m" ? "5 Minutes" : "15 Minutes",
    intervalMinutes: win.duration === "5m" ? 5 : 15,
    status: win.status === "settled" ? "RESOLVED" : win.status === "locked" ? "CLOSED" : "OPEN",
    startTime: win.startTime,
    endTime: win.endTime,
    referencePrice: win.targetPrice ? Number(win.targetPrice) : undefined,
    currentPrice: win.openingPrice ? Number(win.openingPrice) : undefined,
    priceHistory: [],
    outcomes: yes === undefined
      ? [{ id: "yes", label: "YES", price: 0.5, tone: "positive" }, { id: "no", label: "NO", price: 0.5, tone: "negative" }]
      : [{ id: "yes", label: "YES", price: yes, tone: "positive" }, { id: "no", label: "NO", price: 1 - yes, tone: "negative" }],
    orderBooks: [],
    relatedMarketIds: [],
  };
}

export default function Prediction() {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("all");
  const [assetFilter, setAssetFilter] = useState<AssetFilter>("all");

  useEffect(() => {
    document.title = "Prediction Markets | BitDx";
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const windows = await getPredictionWindows();
        if (!cancelled) setMarkets(windows.map(windowToCardMarket));
      } catch {
        /* transient network error; next poll will retry */
      }
    };
    load();
    const timer = window.setInterval(load, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const filteredMarkets = useMemo(() => {
    return markets.filter((m) => {
      if (durationFilter !== "all" && m.intervalMinutes !== Number(durationFilter)) return false;
      if (assetFilter !== "all" && m.symbol !== assetFilter) return false;
      return true;
    });
  }, [markets, durationFilter, assetFilter]);

  return (
    <AppShell>
      {/* True page-level left rail, pinned to the viewport's left edge below
          the header (h-14) and spanning full remaining viewport height —
          fixed/outside the centered max-w-7xl content column, not a
          sidebar squeezed in next to the grid. Hidden below lg (stacks as
          a horizontal filter bar at the top of the content column instead,
          since a fixed full-height rail would eat too much of a narrow
          viewport). */}
      <aside className="hidden lg:block fixed left-0 top-14 bottom-0 w-60 overflow-y-auto border-r border-glass-border glass-strong z-20">
        <PredictionFilters
          durationFilter={durationFilter}
          onDurationChange={setDurationFilter}
          assetFilter={assetFilter}
          onAssetChange={setAssetFilter}
        />
      </aside>

      <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:pl-[15rem]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight"><TrendingUp className="h-7 w-7 text-primary" />Prediction Markets</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Predict whether BTC, ETH, or SOL will be above a randomly set target price in 5 or 15 minutes. Buy YES or NO shares — each winning share pays $1 and each losing share pays $0.</p>
          </div>
          <Button variant="outline" className="shrink-0 gap-2" onClick={() => navigate("/prediction/orders")}><ClipboardList className="h-4 w-4" />My Orders</Button>
        </div>

        {/* Mobile/tablet: same filters as a horizontal bar instead of the
            fixed rail (hidden above via lg:block on the aside). */}
        <div className="lg:hidden glass rounded-xl p-3">
          <PredictionFilters
            durationFilter={durationFilter}
            onDurationChange={setDurationFilter}
            assetFilter={assetFilter}
            onAssetChange={setAssetFilter}
            horizontal
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredMarkets.map((market) => <PredictionMarketCard key={market.id} market={market} />)}
        </div>

        {markets.length === 0 && <div className="glass rounded-xl p-10 text-center text-sm text-muted-foreground">Loading markets…</div>}

        {markets.length > 0 && filteredMarkets.length === 0 && (
          <div className="glass rounded-xl p-10 text-center text-sm text-muted-foreground">No markets match these filters.</div>
        )}

        <p className="max-w-2xl text-xs text-muted-foreground">Orders are matched against real users' opposite-side orders — there is no market maker. Maker fee 0.015%, taker fee 0.045%.</p>
      </main>
    </AppShell>
  );
}

// Duration (5 / 15 minutes / all) and Asset (BTC / ETH / SOL / all) filters,
// each single-select. Two layouts from the same component: a stacked list
// for the fixed left rail (desktop) and a wrapped horizontal row for the
// mobile/tablet bar above the grid (see the two call sites above) — same
// state and button styling either way, just the container direction/wrap.
function PredictionFilters({
  durationFilter, onDurationChange, assetFilter, onAssetChange, horizontal,
}: {
  durationFilter: DurationFilter;
  onDurationChange: (v: DurationFilter) => void;
  assetFilter: AssetFilter;
  onAssetChange: (v: AssetFilter) => void;
  horizontal?: boolean;
}) {
  const groupClass = horizontal ? "flex flex-wrap gap-1.5" : "flex flex-col gap-1";
  const btnClass = (active: boolean) =>
    cn(
      "text-sm rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap",
      horizontal ? "text-center" : "text-left",
      active
        ? "bg-primary/15 text-primary font-semibold border border-primary/30"
        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground border border-transparent"
    );

  return (
    <div className={cn(horizontal ? "space-y-3" : "p-4 space-y-5")}>
      {!horizontal && (
        <div className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="h-4 w-4 text-primary" /> Filters
        </div>
      )}

      <div className={horizontal ? "flex flex-wrap items-center gap-3" : undefined}>
        <div className={cn("text-[11px] font-semibold text-muted-foreground uppercase tracking-wider", horizontal ? "mr-1" : "mb-2")}>Duration</div>
        <div className={groupClass}>
          {DURATION_FILTERS.map((f) => (
            <button key={f.value} type="button" onClick={() => onDurationChange(f.value)} className={btnClass(durationFilter === f.value)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className={horizontal ? "flex flex-wrap items-center gap-3" : undefined}>
        <div className={cn("text-[11px] font-semibold text-muted-foreground uppercase tracking-wider", horizontal ? "mr-1" : "mb-2")}>Asset</div>
        <div className={groupClass}>
          {ASSET_FILTERS.map((f) => (
            <button key={f.value} type="button" onClick={() => onAssetChange(f.value)} className={btnClass(assetFilter === f.value)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {(durationFilter !== "all" || assetFilter !== "all") && (
        <button
          type="button"
          onClick={() => { onDurationChange("all"); onAssetChange("all"); }}
          className="text-xs text-primary hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
