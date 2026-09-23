import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PredictionMarketCard } from "@/components/prediction/PredictionMarketCard";
import { Button } from "@/components/ui/button";
import { getPredictionWindows, type PredictionWindow } from "@/lib/predictionApi";
import { predictionMarketId, type PredictionMarket } from "@/lib/predictionMarkets";

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

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight"><TrendingUp className="h-7 w-7 text-primary" />Prediction Markets</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Predict whether BTC, ETH, or SOL will be above a randomly set target price in 5 or 15 minutes. Buy YES or NO shares — each winning share pays $1 and each losing share pays $0.</p>
          </div>
          <Button variant="outline" className="shrink-0 gap-2" onClick={() => navigate("/prediction/orders")}><ClipboardList className="h-4 w-4" />My Orders</Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((market) => <PredictionMarketCard key={market.id} market={market} />)}
        </div>

        {markets.length === 0 && <div className="glass rounded-xl p-10 text-center text-sm text-muted-foreground">Loading markets…</div>}

        <p className="max-w-2xl text-xs text-muted-foreground">Orders are matched against real users' opposite-side orders — there is no market maker. Maker fee 0.015%, taker fee 0.045%.</p>
      </main>
    </AppShell>
  );
}
