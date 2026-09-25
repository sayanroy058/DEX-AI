import { useEffect, useMemo, useState } from "react";
import { CircleDollarSign, Info, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getPredictionPositions, placePredictionOrder, sellPredictionPosition, type PredictionSide as ApiSide } from "@/lib/predictionApi";
import { wallet } from "@/lib/useWallet";
import { calculateBuyEstimate, calculateSellEstimate, formatContractPrice, formatPredictionCurrency, getPredictionOutcome, type PredictionMarket } from "@/lib/predictionMarkets";

export function TradeTicket({ market, selectedOutcomeId, onSelectOutcome, disabledReason, onOrderPlaced }: {
  market: PredictionMarket;
  selectedOutcomeId: string;
  onSelectOutcome: (id: string) => void;
  disabledReason?: string;
  onOrderPlaced?: () => void;
}) {
  const [mode, setMode] = useState<"BUY" | "SELL">("BUY");
  const [input, setInput] = useState("25");
  const [submitting, setSubmitting] = useState(false);
  const [owned, setOwned] = useState<Record<string, number>>({});
  const outcome = getPredictionOutcome(market, selectedOutcomeId);
  const ownedShares = owned[outcome.id] ?? 0;

  useEffect(() => {
    if (!market.windowId) return;
    let cancelled = false;
    getPredictionPositions()
      .then((positions) => {
        if (cancelled) return;
        const forWindow = (positions ?? []).filter((p) => p.WindowID === market.windowId);
        setOwned({
          yes: Number(forWindow.find((p) => p.Side === "yes")?.Shares ?? 0),
          no: Number(forWindow.find((p) => p.Side === "no")?.Shares ?? 0),
        });
      })
      .catch(() => {
        /* transient network error; user can still buy, sell just won't show a balance */
      });
    return () => {
      cancelled = true;
    };
  }, [market.windowId]);

  const estimate = useMemo(
    () => mode === "BUY" ? calculateBuyEstimate(input, outcome.price) : calculateSellEstimate(input, outcome.price, ownedShares),
    [input, mode, outcome.price, ownedShares],
  );
  const valid = estimate.shares > 0 && !disabledReason && market.windowId !== null;

  const changeMode = (nextMode: "BUY" | "SELL") => {
    setMode(nextMode);
    setInput(nextMode === "BUY" ? "25" : ownedShares > 0 ? ownedShares.toFixed(2) : "");
  };

  const submit = async () => {
    if (!valid || !market.windowId) return;
    setSubmitting(true);
    try {
      // ApiSide (predictionApi.ts's PredictionSide) is lowercase "yes"/"no" —
      // a same-named but differently-cased type also exists in
      // predictionMarkets.ts ("YES"/"NO"), which this used to be assigned
      // from before being immediately .toLowerCase()'d and cast at every
      // call site below. Assign the correct casing directly instead.
      const side: ApiSide = outcome.id === "yes" ? "yes" : "no";
      if (mode === "BUY") {
        const result = await placePredictionOrder(market.windowId, side, outcome.price.toFixed(2), estimate.shares.toFixed(6));
        if (result.status === "filled") {
          toast.success("Order filled", { description: `Bought ${Number(result.filledSize).toFixed(2)} ${outcome.label} shares.` });
        } else if (Number(result.filledSize) > 0) {
          toast.success("Order partially filled", { description: `Filled ${Number(result.filledSize).toFixed(2)} of ${estimate.shares.toFixed(2)} ${outcome.label} shares; the rest is resting on the book.` });
        } else {
          toast.success("Order placed", { description: `${outcome.label} order resting on the book — no matching liquidity yet.` });
        }
      } else {
        // Accept execution up to 5% worse than the currently quoted price —
        // protects against selling into a stale/moved book.
        const minPrice = Math.max(0.01, outcome.price * 0.95).toFixed(2);
        const result = await sellPredictionPosition(market.windowId, side, estimate.shares.toFixed(6), minPrice);
        const filled = Number(result.filledSize);
        if (filled >= estimate.shares - 1e-9) {
          toast.success("Position closed", { description: `Sold ${filled.toFixed(2)} ${outcome.label} shares.` });
        } else if (filled > 0) {
          toast.success("Position partially closed", { description: `Sold ${filled.toFixed(2)} of ${estimate.shares.toFixed(2)} ${outcome.label} shares; the rest is resting on the book waiting for a buyer.` });
        } else {
          toast.success("Sell order placed", { description: "No matching buyer yet — your sell is resting on the book." });
        }
        setOwned((prev) => ({ ...prev, [outcome.id]: Math.max(0, (prev[outcome.id] ?? 0) - filled) }));
      }
      // A prediction order locks/frees BI2XUSD the same as any spot/futures
      // order, but this call site never refreshed the wallet balance store —
      // the polling loop in useWallet.ts is a safety net for exactly this
      // kind of gap, but a user's OWN action should still update immediately
      // rather than waiting out even the short poll interval.
      wallet.refreshBalances().catch(() => {});
      onOrderPlaced?.();
    } catch (err) {
      toast.error(mode === "BUY" ? "Order failed" : "Sell failed", { description: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="glass-strong overflow-hidden rounded-xl" aria-labelledby="trade-ticket-title">
      <div className="border-b border-border/50 p-4"><div className="flex items-center justify-between gap-2"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Prediction contract</p><h2 id="trade-ticket-title" className="mt-1 font-semibold">{market.shortTitle}</h2></div></div></div>
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 rounded-lg border border-border/70 bg-muted/60 p-1" role="tablist" aria-label="Trade mode">
          {(["BUY", "SELL"] as const).map((item) => {
            const selected = mode === item;
            return <button key={item} type="button" role="tab" aria-selected={selected} onClick={() => changeMode(item)} className={cn(
              "h-9 rounded-md border border-transparent text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              selected
                ? item === "BUY" ? "border-buy bg-buy text-buy-foreground shadow-sm" : "border-sell bg-sell text-sell-foreground shadow-sm"
                : item === "BUY" ? "text-muted-foreground hover:bg-buy/10 hover:text-buy" : "text-muted-foreground hover:bg-sell/10 hover:text-sell",
            )}>{item}</button>;
          })}
        </div>

        <div><div className="mb-2 flex items-center justify-between text-xs"><span className="font-medium">Choose outcome</span><Tooltip><TooltipTrigger asChild><button type="button" aria-label="What contract prices mean" className="text-muted-foreground hover:text-primary"><Info className="h-3.5 w-3.5" /></button></TooltipTrigger><TooltipContent className="max-w-xs text-xs">A winning share resolves to $1. A losing share resolves to $0.</TooltipContent></Tooltip></div><div className="grid grid-cols-2 gap-2">
          {market.outcomes.map((item) => <button key={item.id} type="button" aria-pressed={outcome.id === item.id} onClick={() => { onSelectOutcome(item.id); if (mode === "SELL") setInput((owned[item.id] ?? 0).toFixed(2)); }} className={cn("flex h-12 items-center justify-between rounded-lg border px-3 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", outcome.id === item.id ? item.tone === "positive" ? "border-buy/50 bg-buy/15 text-buy shadow-[0_0_16px_hsl(var(--buy)/0.12)]" : "border-sell/50 bg-sell/15 text-sell shadow-[0_0_16px_hsl(var(--sell)/0.12)]" : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40")}><span>{item.label}</span><span className="font-mono">{formatContractPrice(item.price)}</span></button>)}
        </div></div>

        <div><div className="mb-1.5 flex items-center justify-between"><label htmlFor="prediction-trade-value" className="text-xs font-medium">{mode === "BUY" ? "Amount (BI2XUSD)" : "Shares to sell"}</label>{mode === "SELL" && <span className="text-[10px] text-muted-foreground">Owned: <b className="font-mono text-foreground">{ownedShares.toFixed(2)}</b></span>}</div><div className="relative"><Input id="prediction-trade-value" value={input} onChange={(event) => setInput(event.target.value)} inputMode="decimal" placeholder="0.00" className="h-11 bg-muted/30 pr-20 font-mono" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{mode === "BUY" ? "BI2XUSD" : "SHARES"}</span></div></div>

        {mode === "BUY" ? <div className="grid grid-cols-3 gap-2">{[5, 25, 100].map((amount) => <button key={amount} type="button" onClick={() => setInput(String(amount))} className="h-10 rounded-lg border border-border/60 bg-muted/20 font-mono text-xs font-bold transition-colors hover:border-primary/40 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">${amount}</button>)}</div> : ownedShares > 0 ? <div className="grid grid-cols-3 gap-2">{[["25%", 0.25], ["50%", 0.5], ["MAX", 1]].map(([label, ratio]) => <button key={String(label)} type="button" onClick={() => setInput((ownedShares * Number(ratio)).toFixed(2))} className="h-9 rounded-lg border border-border/60 text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground">{label}</button>)}</div> : <div className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">No {outcome.label} position available to sell.</div>}

        <div className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-3 text-xs">
          <EstimateRow label="Contract price" value={formatContractPrice(outcome.price)} />
          <EstimateRow label={mode === "BUY" ? "Estimated shares" : "Shares sold"} value={estimate.shares.toFixed(2)} />
          <EstimateRow label={mode === "BUY" ? "Maximum payout" : "Estimated proceeds"} value={formatPredictionCurrency(estimate.payout)} />
          {mode === "BUY" && <EstimateRow label="Potential profit" value={formatPredictionCurrency(estimate.profit)} highlight />}
          <EstimateRow label={mode === "BUY" ? "Taker fee (0.045%)" : "Taker fee (0.045%, if unfilled portion rests)"} value={formatPredictionCurrency(estimate.amount * 0.00045)} />
        </div>

        <Button type="button" onClick={submit} disabled={!valid || submitting} className={cn("h-11 w-full font-bold", outcome.tone === "positive" ? "bg-gradient-buy text-buy-foreground hover:shadow-glow-buy" : "bg-gradient-sell text-sell-foreground hover:shadow-glow-sell")}>
          {disabledReason ?? (submitting ? (mode === "BUY" ? "Placing order…" : "Selling…") : mode === "SELL" && ownedShares <= 0 ? "No position to sell" : <><CircleDollarSign className="h-4 w-4" />{mode === "BUY" ? `Buy ${outcome.label}` : `Sell ${outcome.label} shares`}</>)}
        </Button>
        <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-foreground"><WalletCards className="mt-0.5 h-3 w-3 shrink-0" />Orders are matched against real users — there is no market maker. An order may fill partially or rest unfilled if there isn't enough opposing liquidity.</p>
      </div>
    </section>
  );
}

function EstimateRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return <div className="flex items-center justify-between"><span className="text-muted-foreground">{label}</span><span className={cn("font-mono font-medium", highlight && "text-buy")}>{value}</span></div>;
}
