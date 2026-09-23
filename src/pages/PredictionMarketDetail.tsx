import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { MarketHeader } from "@/components/prediction/MarketHeader";
import { MarketInformation } from "@/components/prediction/MarketInformation";
import { MarketPriceChart } from "@/components/prediction/MarketPriceChart";
import { MarketStats } from "@/components/prediction/MarketStats";
import { PredictionOrderBook } from "@/components/prediction/PredictionOrderBook";
import { RelatedMarkets } from "@/components/prediction/RelatedMarkets";
import { TradeTicket } from "@/components/prediction/TradeTicket";
import { useLivePredictionMarket } from "@/hooks/useLivePredictionMarket";
import { getPredictionOutcome } from "@/lib/predictionMarkets";

const SYMBOLS = ["BTC", "ETH", "SOL"] as const;

function parseMarketId(marketId: string | undefined): { symbol: (typeof SYMBOLS)[number]; minutes: 5 | 15 } | null {
  if (!marketId) return null;
  const match = /^(BTC|ETH|SOL)-(5|15)m$/.exec(marketId);
  if (!match) return null;
  return { symbol: match[1] as (typeof SYMBOLS)[number], minutes: Number(match[2]) as 5 | 15 };
}

export default function PredictionMarketDetail() {
  const { marketId } = useParams<{ marketId: string }>();
  const parsed = parseMarketId(marketId);

  if (!parsed) {
    return (
      <AppShell>
        <main className="mx-auto flex min-h-[70vh] max-w-lg items-center p-6 text-center">
          <div className="glass w-full rounded-xl p-8">
            <AlertTriangle className="mx-auto h-9 w-9 text-warning" />
            <h1 className="mt-3 text-xl font-bold">Prediction market not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">This market may have been removed or the link is incorrect.</p>
            <Button asChild className="mt-5"><Link to="/prediction"><ArrowLeft className="h-4 w-4" />Back to markets</Link></Button>
          </div>
        </main>
      </AppShell>
    );
  }

  return <PredictionMarketDetailContent symbol={parsed.symbol} minutes={parsed.minutes} />;
}

function PredictionMarketDetailContent({ symbol, minutes }: { symbol: (typeof SYMBOLS)[number]; minutes: 5 | 15 }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedOutcome = searchParams.get("outcome") ?? undefined;
  const { market, closed, loading, roundClosed, switchToLive } = useLivePredictionMarket(symbol, minutes);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState(requestedOutcome ?? "yes");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    document.title = `${symbol} Above Target | BitDx Prediction Markets`;
  }, [symbol]);

  if (loading || !market) {
    return (
      <AppShell>
        <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          Loading market…
        </main>
      </AppShell>
    );
  }

  // The round this page was tracking has ended and a new one has already
  // opened for this market/duration. Stay on this frozen view (final
  // chart, final prices) rather than silently jumping to the new round —
  // the user explicitly chooses when to move on.
  if (roundClosed) {
    return (
      <AppShell>
        <main className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">
          <MarketHeader market={market} closed />
          <div className="glass-strong flex flex-col items-center gap-3 rounded-xl p-10 text-center">
            <CheckCircle2 className="h-9 w-9 text-primary" />
            <h2 className="text-lg font-semibold">This round has closed</h2>
            <p className="max-w-sm text-sm text-muted-foreground">A new {minutes}-minute {symbol} round is now live. Your positions and orders from this round are unaffected.</p>
            <Button className="mt-2" onClick={switchToLive}>Go to live market</Button>
          </div>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
            <div className="min-w-0 space-y-5">
              <MarketStats market={market} />
              <MarketPriceChart market={market} live={false} />
            </div>
          </div>
        </main>
      </AppShell>
    );
  }

  const defaultOutcome = getPredictionOutcome(market, requestedOutcome);
  const outcomeId = market.outcomes.some((o) => o.id === selectedOutcomeId) ? selectedOutcomeId : defaultOutcome.id;
  const tradeDisabledReason = closed ? "Market closed" : undefined;

  const selectOutcome = (id: string) => {
    setSelectedOutcomeId(id);
    const next = new URLSearchParams(searchParams);
    next.set("outcome", id);
    setSearchParams(next, { replace: true });
  };

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">
        <MarketHeader market={market} closed={closed} />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <div className="min-w-0 space-y-5">
            <MarketStats market={market} />
            <MarketPriceChart market={market} live={!closed} />
          </div>
          <div className="xl:sticky xl:top-20"><TradeTicket market={market} selectedOutcomeId={outcomeId} onSelectOutcome={selectOutcome} disabledReason={tradeDisabledReason} onOrderPlaced={() => setRefreshKey((k) => k + 1)} /></div>
        </div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <div className="space-y-5"><PredictionOrderBook key={`${market.windowId}-${refreshKey}`} market={market} initialOutcomeId={outcomeId} /><MarketInformation market={market} /></div>
          <RelatedMarkets market={market} />
        </div>
      </main>
    </AppShell>
  );
}
