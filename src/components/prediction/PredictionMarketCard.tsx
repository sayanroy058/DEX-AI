import { Link } from "react-router-dom";
import { ArrowUpRight, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatContractPrice, formatPredictionCurrency, type PredictionMarket } from "@/lib/predictionMarkets";
import { CountdownTimer } from "./CountdownTimer";

export function PredictionMarketCard({ market }: { market: PredictionMarket }) {
  return (
    <Link
      to={`/prediction/${market.id}`}
      aria-label={`Open prediction market: ${market.title}`}
      className="group glass rounded-xl p-5 flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 px-1.5 font-mono text-[10px] font-bold text-primary">{market.icon}</span>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
      </div>

      <h2 className="min-h-[2.5rem] text-sm font-semibold leading-snug">{market.title}</h2>

      {market.referencePrice !== undefined && (
        <div className="text-xs text-muted-foreground">Target: <span className="font-mono text-foreground">{formatPredictionCurrency(market.referencePrice, market.referencePrice < 10 ? 4 : 2)}</span></div>
      )}

      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><Timer className="h-3 w-3" /><CountdownTimer endTime={market.endTime} compact /></span>
        <span>{market.interval}</span>
      </div>

      {market.outcomes.length === 2 ? (
        <>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-gradient-to-r from-buy to-buy/70 transition-all duration-700" style={{ width: `${market.outcomes[0].price * 100}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {market.outcomes.map((outcome) => (
              <span key={outcome.id} className={cn("flex h-9 items-center justify-between rounded-md border px-3 text-xs font-bold", outcome.tone === "positive" ? "border-buy/30 bg-buy/10 text-buy" : "border-sell/30 bg-sell/10 text-sell")}>
                {outcome.label}<span className="font-mono">{formatContractPrice(outcome.price)}</span>
              </span>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-md border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">Loading live prices…</div>
      )}
    </Link>
  );
}
