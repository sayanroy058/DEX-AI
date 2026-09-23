import { Activity } from "lucide-react";
import { CountdownTimer } from "./CountdownTimer";
import { formatPredictionCurrency, type PredictionMarket } from "@/lib/predictionMarkets";

export function MarketStats({ market }: { market: PredictionMarket }) {
  const hasUnderlyingPrice = market.referencePrice !== undefined && market.currentPrice !== undefined;
  const delta = hasUnderlyingPrice ? market.currentPrice! - market.referencePrice! : 0;
  const leader = [...market.outcomes].sort((a, b) => b.price - a.price)[0];

  return (
    <section className="glass rounded-xl p-4 sm:p-5" aria-label="Market summary">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {hasUnderlyingPrice ? (
          <>
            <Stat label="Target Price" value={formatPredictionCurrency(market.referencePrice!, market.referencePrice! < 10 ? 4 : 2)} helper="Price to beat at resolution" />
            <Stat label="Current Price" value={formatPredictionCurrency(market.currentPrice!, market.currentPrice! < 10 ? 4 : 2)} helper={`${delta >= 0 ? "+" : ""}${formatPredictionCurrency(delta)} vs target`} valueClass={delta >= 0 ? "text-buy" : "text-sell"} />
          </>
        ) : (
          <Stat label="Leading Outcome" value={leader?.label ?? "—"} helper={leader ? "Implied probability" : "Awaiting round data"} valueClass={leader?.tone === "positive" ? "text-buy" : "text-sell"} />
        )}
        <div className="space-y-1"><div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Countdown</div><CountdownTimer endTime={market.endTime} /></div>
        <div className="grid grid-cols-1 gap-2 text-xs">
          <span className="flex items-center justify-between gap-2 text-muted-foreground"><Activity className="h-3.5 w-3.5 text-primary" />Feed <b className="font-medium text-foreground">Live price</b></span>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, helper, valueClass = "" }: { label: string; value: string; helper: string; valueClass?: string }) {
  return <div><div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div><div className={`mt-1 font-mono text-xl font-bold sm:text-2xl ${valueClass}`}>{value}</div><div className="mt-1 text-[10px] text-muted-foreground">{helper}</div></div>;
}
