import { useMarket } from "@/lib/useMarkets";
import { formatCompact, formatPrice } from "@/lib/mockData";
import { TrendingUp, TrendingDown, Bot, Sparkles, Calculator, RotateCcw, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
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
  const [aiActive, setAiActive] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  if (!market) return null;
  const positive = market.change24h >= 0;

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
          </div>
          <div className="text-[10px] text-muted-foreground">{market.base} / {market.quote}</div>
        </div>
      </div>

      <div className="min-w-fit">
        <div className={cn("text-xl font-bold font-mono", positive ? "text-buy" : "text-sell")}>
          ${formatPrice(market.price)}
        </div>
        <div className={cn("text-[11px] font-mono flex items-center gap-1", positive ? "text-buy" : "text-sell")}>
          {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {positive ? "+" : ""}{market.change24h.toFixed(2)}%
        </div>
      </div>

      <Stat label="24h Volume" value={`$${formatCompact(market.volume24h)}`} />
      {market.openInterest && <Stat label="Open Interest" value={`$${formatCompact(market.openInterest)}`} />}
      {market.funding !== undefined && (
        <Stat
          label="Funding"
          value={`${market.funding >= 0 ? "+" : ""}${(market.funding * 100).toFixed(4)}%`}
          tone={market.funding >= 0 ? "buy" : "sell"}
        />
      )}
      <Stat label="Mark Price" value={`$${formatPrice(market.price * 1.0001)}`} />
      <Stat label="Index" value={`$${formatPrice(market.price * 0.9999)}`} />

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
          onClick={() => { setAiActive(!aiActive); toast.success(`AI Agent ${!aiActive ? "activated" : "stopped"}`); }}
          className={cn(
            "h-8 text-xs glass",
            aiActive ? "border-primary/60 text-primary shadow-glow-primary" : "border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
          )}
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          AI Agent
          {aiActive && <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/trading-bots")}
          className="h-8 text-xs glass border-secondary/30 text-secondary hover:bg-secondary/10 hover:text-secondary"
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
