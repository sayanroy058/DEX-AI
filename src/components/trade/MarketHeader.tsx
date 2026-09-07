import { useState } from "react";
import { useMarket } from "@/lib/useMarkets";
import { formatCompact, formatPrice } from "@/lib/mockData";
import { useIndexPrice } from "@/lib/useIndexPrice";
import { useLivePrice } from "@/lib/useLivePrice";
import { useTicker } from "@/lib/useTicker";
import { backendMarketFor } from "@/lib/backendMarkets";
import { TrendingUp, TrendingDown, Bot, Sparkles, Calculator, RotateCcw, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SwapDialog } from "./SwapDialog";

export function MarketHeader({ symbol, calculatorOpen, onToggleCalculator, onResetLayout }: {
  symbol: string;
  calculatorOpen?: boolean;
  onToggleCalculator?: () => void;
  onResetLayout?: () => void;
}) {
  const navigate = useNavigate();
  const market = useMarket(symbol);
  // Not gated to crypto — price-fetcher's real feed also covers every
  // forex/commodity/stock base still in INITIAL_MARKETS (see mockData.ts).
  const index = useIndexPrice(market?.base);
  const livePrice = useLivePrice(symbol);
  const backendMarket = backendMarketFor(symbol);
  const ticker = useTicker(backendMarket?.symbol, backendMarket?.market);
  const [swapOpen, setSwapOpen] = useState(false);
  if (!market) return null;

  const executable = !!backendMarket;
  // For executable crypto markets the Price-Fetcher index is authoritative,
  // including the headline price/stats. This keeps the large displayed price,
  // Mark and Index identical instead of mixing an empty engine midpoint with
  // a valid external reference.
  const externalIndex = index?.fresh && index.lastPrice > 0 ? index.lastPrice : 0;
  const displayedPrice = externalIndex || livePrice;
  const liveChange = externalIndex ? (index?.changePercent ?? market.change24h) : market.change24h;
  const positive = liveChange >= 0;

  // Mark/index/funding: real when the symbol is backend-registered and the
  // engine has quoted data (ticker.markPrice > 0 — an empty order book still
  // returns a 200 with markPrice "0", which isn't a usable value). Falls
  // back to the previous fabricated ±0.01% spread and the static mock
  // funding rate only when there's genuinely nothing real to show, same
  // "Simulated"-style degrade the rest of the trade page already uses for
  // unregistered symbols.
  const hasRealTicker = !!ticker && ticker.markPrice > 0;
  const fundingPct = hasRealTicker && ticker.fundingRatePct !== null
    ? ticker.fundingRatePct / 100
    : executable ? undefined : market.funding;

  return (
    <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-6 overflow-x-auto">
      <div className="flex items-center gap-2 min-w-fit">
        <div className="h-9 w-9 rounded-full bg-gradient-primary flex items-center justify-center font-bold text-xs text-primary-foreground shadow-glow-primary">
          {market.base.slice(0, 3)}
        </div>
        <div>
          <div className="font-bold text-sm flex items-center gap-1.5">
            {market.symbol}
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/20 text-secondary uppercase">{market.category}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground uppercase">{market.asset}</span>
            {executable && market.dataStatus !== "live" && !externalIndex && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-warning/20 text-warning uppercase">
                {market.dataStatus === "stale" ? "Stale" : "Unavailable"}
              </span>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground">{market.base} / {market.quote}</div>
        </div>
      </div>

      <div className="min-w-fit">
        <div className={cn("text-xl font-bold font-mono", positive ? "text-buy" : "text-sell")}>
          ${formatPrice(displayedPrice)}
        </div>
        <div className={cn("text-[11px] font-mono flex items-center gap-1", positive ? "text-buy" : "text-sell")}>
          {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {positive ? "+" : ""}{liveChange.toFixed(2)}%
        </div>
      </div>

      {market.openInterest && <Stat label="Open Interest" value={`$${formatCompact(market.openInterest)}`} />}
      {fundingPct !== undefined && (
        <Stat
          label="Funding"
          value={`${fundingPct >= 0 ? "+" : ""}${(fundingPct * 100).toFixed(4)}%`}
          tone={fundingPct >= 0 ? "buy" : "sell"}
        />
      )}
      {index && <Stat label="24h High" value={`$${formatPrice(index.high)}`} />}
      {index && <Stat label="24h Low" value={`$${formatPrice(index.low)}`} />}

      <div className="ml-auto flex items-center gap-2 min-w-fit">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSwapOpen(true)}
          className={"h-8 text-xs glass border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"}
          title="Swap tokens"
        >
          <Repeat className="h-3.5 w-3.5 mr-1.5" />
          Swap
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/ai-agent")}
          className="h-8 text-xs glass border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
          title="Open AI Agent"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          AI Agent
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/trading-bots")}
          className="h-8 text-xs glass border-accent/30 text-accent hover:bg-accent/10 hover:text-accent"
          title="Open trading bots"
        >
          <Bot className="h-3.5 w-3.5 mr-1.5" />
          Bot
        </Button>
        {onToggleCalculator && (
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleCalculator}
            className={cn(
              "h-8 text-xs glass",
              calculatorOpen
                ? "border-primary/60 text-primary shadow-glow-primary"
                : "border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
            )}
            title="Trade Calculator & Risk Management"
          >
            <Calculator className="h-3.5 w-3.5 mr-1.5" />
            Calculator
          </Button>
        )}
        {onResetLayout && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              onResetLayout();
              toast.success("Layout reset to default");
            }}
            className="h-8 w-8 glass border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
            title="Reset trade layout"
            aria-label="Reset trade layout"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <SwapDialog open={swapOpen} onOpenChange={setSwapOpen} />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "buy" | "sell" }) {
  return (
    <div className="min-w-fit">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={cn("text-xs font-mono font-semibold", tone === "buy" && "text-buy", tone === "sell" && "text-sell")}>{value}</div>
    </div>
  );
}
