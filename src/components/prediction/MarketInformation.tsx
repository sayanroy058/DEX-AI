import { ShieldCheck } from "lucide-react";
import { formatPredictionCurrency, type PredictionMarket } from "@/lib/predictionMarkets";

export function MarketInformation({ market }: { market: PredictionMarket }) {
  const target = market.referencePrice !== undefined ? formatPredictionCurrency(market.referencePrice, market.referencePrice < 10 ? 4 : 2) : "the target price";
  return (
    <section className="glass rounded-xl p-4 sm:p-5" aria-labelledby="market-information-title">
      <h2 id="market-information-title" className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-primary" />How this market resolves</h2>
      <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
        <li className="flex gap-3"><span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 font-mono text-[10px] text-primary">1</span><span>The target price is set at round start: the live {market.symbol} price plus a random offset, published as a cryptographic commitment so it can't be predicted or tampered with.</span></li>
        <li className="flex gap-3"><span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 font-mono text-[10px] text-primary">2</span><span>YES wins if the {market.symbol} price is at or above {target} at resolution. NO wins if it finishes below.</span></li>
        <li className="flex gap-3"><span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 font-mono text-[10px] text-primary">3</span><span>Orders are matched against other users' opposite-side orders — there is no market maker. An order may go partially or fully unfilled if there isn't enough opposing liquidity; any unfilled amount is refunded when the round locks.</span></li>
      </ol>
      <div className="mt-4 rounded-lg border border-warning/20 bg-warning/5 p-3"><h4 className="text-xs font-semibold text-warning">Edge case</h4><p className="mt-1 text-xs leading-relaxed text-muted-foreground">A resolution price exactly equal to the target counts as YES.</p></div>
    </section>
  );
}
