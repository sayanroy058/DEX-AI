import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/mockData";
import { TrendingUp, TrendingDown, Info, Zap, Shield, Calculator } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

type Side = "buy" | "sell";
type OrderType = "market" | "limit" | "stop" | "tpsl";
type MarketMode = "spot" | "futures" | "options";
type OptionType = "call" | "put";

const BALANCE = 25000;

export function TradePanel({ symbol, price }: { symbol: string; price: number }) {
  const [mode, setMode] = useState<MarketMode>("futures");
  const [side, setSide] = useState<Side>("buy");
  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [leverage, setLeverage] = useState(10);
  const [sizePct, setSizePct] = useState(25);
  const [limitPrice, setLimitPrice] = useState(price.toFixed(2));
  const [tpEnabled, setTpEnabled] = useState(false);
  const [slEnabled, setSlEnabled] = useState(false);
  const [tp, setTp] = useState((price * 1.05).toFixed(2));
  const [sl, setSl] = useState((price * 0.97).toFixed(2));
  const [optType, setOptType] = useState<OptionType>("call");
  const [expiry, setExpiry] = useState("7D");
  const [strike, setStrike] = useState((Math.round(price / 100) * 100).toString());

  const isSpot = mode === "spot";
  const isFutures = mode === "futures";
  const isOptions = mode === "options";
  const effLeverage = isSpot ? 1 : leverage;

  const orderValue = (BALANCE * (sizePct / 100)) * effLeverage;
  const positionSize = orderValue / price;
  const margin = orderValue / effLeverage;
  const liqPrice = side === "buy"
    ? price * (1 - 0.95 / effLeverage)
    : price * (1 + 0.95 / effLeverage);
  const fee = orderValue * (isOptions ? 0.001 : 0.0005);
  const tpPct = ((parseFloat(tp) - price) / price) * 100 * (side === "buy" ? 1 : -1);
  const slPct = ((parseFloat(sl) - price) / price) * 100 * (side === "buy" ? -1 : 1);
  const rr = slEnabled && tpEnabled ? Math.abs(tpPct / slPct).toFixed(2) : "—";

  const strikeNum = parseFloat(strike) || price;
  const days = parseInt(expiry) || 7;
  const intrinsic = optType === "call" ? Math.max(0, price - strikeNum) : Math.max(0, strikeNum - price);
  const timeValue = price * 0.02 * Math.sqrt(days / 30);
  const premium = intrinsic + timeValue;
  const contracts = sizePct / 10;
  const optionCost = premium * contracts;

  const handleSubmit = () => {
    if (isOptions) {
      toast.success(`${side.toUpperCase()} ${optType.toUpperCase()} ${strike} ${expiry}`, {
        description: `${contracts.toFixed(2)} contracts · $${optionCost.toFixed(2)}`,
      });
      return;
    }
    toast.success(`${mode.toUpperCase()} ${side.toUpperCase()} ${orderType.toUpperCase()} placed`, {
      description: `${positionSize.toFixed(4)} ${symbol.split("-")[0]} @ ${orderType === "market" ? "market" : limitPrice}`,
    });
  };

  const longLabel = isSpot || isOptions ? "Buy" : "Long";
  const shortLabel = isSpot || isOptions ? "Sell" : "Short";

  const Row = ({ label, value, valueClass = "" }: { label: React.ReactNode; value: React.ReactNode; valueClass?: string }) => (
    <div className="flex justify-between items-center gap-3">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={cn("font-mono text-xs font-medium text-right", valueClass)}>{value}</span>
    </div>
  );

  return (
    <div className="glass rounded-xl flex flex-col h-full overflow-y-auto overflow-x-hidden">
      <div className="px-3 pt-2.5">
        <Tabs value={mode} onValueChange={v => setMode(v as MarketMode)}>
          <TabsList className="grid grid-cols-3 h-8 bg-muted/30 w-full rounded-lg p-0.5">
            <TabsTrigger value="spot" className="h-7 text-xs font-semibold rounded-md">Spot</TabsTrigger>
            <TabsTrigger value="futures" className="h-7 text-xs font-semibold rounded-md">Futures</TabsTrigger>
            <TabsTrigger value="options" className="h-7 text-xs font-semibold rounded-md">Options</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-2 gap-2 px-3 pt-2">
        <button onClick={() => setSide("buy")} className={cn(
          "h-9 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5",
          side === "buy" ? "bg-gradient-buy text-buy-foreground shadow-glow-buy" : "glass-strong text-muted-foreground hover:text-buy"
        )}>
          <TrendingUp className="h-3.5 w-3.5" /> {longLabel}
        </button>
        <button onClick={() => setSide("sell")} className={cn(
          "h-9 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5",
          side === "sell" ? "bg-gradient-sell text-sell-foreground shadow-glow-sell" : "glass-strong text-muted-foreground hover:text-sell"
        )}>
          <TrendingDown className="h-3.5 w-3.5" /> {shortLabel}
        </button>
      </div>

      {isOptions && (
        <div className="grid grid-cols-2 gap-2 px-3 pt-2">
          <button onClick={() => setOptType("call")} className={cn(
            "h-8 rounded-lg text-xs font-semibold border transition-all",
            optType === "call" ? "bg-buy/15 text-buy border-buy/40" : "border-border/50 text-muted-foreground hover:text-buy"
          )}>Call</button>
          <button onClick={() => setOptType("put")} className={cn(
            "h-8 rounded-lg text-xs font-semibold border transition-all",
            optType === "put" ? "bg-sell/15 text-sell border-sell/40" : "border-border/50 text-muted-foreground hover:text-sell"
          )}>Put</button>
        </div>
      )}

      {!isOptions && (
        <div className="px-3 pt-2">
          <Tabs value={orderType} onValueChange={v => setOrderType(v as OrderType)}>
            <TabsList className="grid grid-cols-4 h-8 bg-muted/30 w-full rounded-lg p-0.5">
              <TabsTrigger value="market" className="h-7 text-xs rounded-md">Market</TabsTrigger>
              <TabsTrigger value="limit" className="h-7 text-xs rounded-md">Limit</TabsTrigger>
              <TabsTrigger value="stop" className="h-7 text-xs rounded-md">Stop</TabsTrigger>
              <TabsTrigger value="tpsl" className="h-7 text-xs rounded-md">TP/SL</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      <div className="px-3 pt-2 pb-2 flex flex-col gap-2 flex-1 min-h-0">
        <Row label="Available" value={`$${BALANCE.toLocaleString()}`} />

        {orderType !== "market" && !isOptions && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Price (USD)</span>
              <button onClick={() => setLimitPrice(price.toFixed(2))} className="text-primary hover:underline font-medium">Mid</button>
            </div>
            <Input value={limitPrice} onChange={e => setLimitPrice(e.target.value)}
              className="h-9 rounded-lg font-mono text-sm bg-muted/30 border-border px-3" />
          </div>
        )}

        {isOptions && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Strike</div>
              <Input value={strike} onChange={e => setStrike(e.target.value)}
                className="h-10 rounded-xl font-mono text-sm bg-muted/30 border-border px-3" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Expiry</div>
              <div className="flex gap-1">
                {["7D", "30D", "90D"].map(e => (
                  <button key={e} onClick={() => setExpiry(e)}
                    className={cn("flex-1 h-10 text-xs rounded-xl transition-colors font-semibold",
                      expiry === e ? "bg-primary/20 text-primary" : "bg-muted/30 text-muted-foreground hover:text-foreground"
                    )}>{e}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {isFutures && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span className="flex items-center gap-1">
                Leverage
                <Tooltip>
                  <TooltipTrigger><Info className="h-3 w-3" /></TooltipTrigger>
                  <TooltipContent>Higher leverage = higher liquidation risk</TooltipContent>
                </Tooltip>
              </span>
              <span className="font-mono font-bold text-primary">{leverage}x</span>
            </div>
            <Slider value={[leverage]} min={1} max={100} step={1} onValueChange={v => setLeverage(v[0])}
              className="my-1 h-3" />
            <div className="grid grid-cols-7 gap-1 mt-1">
              {[1, 5, 10, 25, 50, 75, 100].map(l => (
                <button key={l} onClick={() => setLeverage(l)}
                  className={cn("h-7 text-xs rounded-md transition-colors",
                    leverage === l ? "bg-primary/20 text-primary" : "bg-muted/30 text-muted-foreground hover:text-foreground"
                  )}>{l}x</button>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Size</span>
            <span className="font-mono">{positionSize.toFixed(4)} {symbol.split("-")[0]}</span>
          </div>
          <Slider value={[sizePct]} min={1} max={100} step={1} onValueChange={v => setSizePct(v[0])}
            className="my-1 h-3" />
          <div className="grid grid-cols-4 gap-1 mt-1">
            {[25, 50, 75, 100].map(p => (
              <button key={p} onClick={() => setSizePct(p)}
                className={cn("h-7 text-xs rounded-md transition-colors font-semibold",
                  sizePct === p ? "bg-primary/20 text-primary" : "bg-muted/30 text-muted-foreground hover:text-foreground"
                )}>{p}%</button>
            ))}
          </div>
        </div>

        {!isOptions && (
          <div className="space-y-1 pt-1.5 border-t border-border/50">
            <div className="grid grid-cols-[auto_1fr_minmax(100px,0.9fr)_52px] items-center gap-2">
              <input type="checkbox" checked={tpEnabled} onChange={e => setTpEnabled(e.target.checked)}
                className="accent-primary h-3.5 w-3.5 shrink-0" />
              <span className="text-xs">Take Profit</span>
              <Input disabled={!tpEnabled} value={tp} onChange={e => setTp(e.target.value)}
                className="h-7 rounded-md font-mono text-xs text-buy px-2" />
              <span className="text-xs text-right text-buy font-mono">+{tpPct.toFixed(1)}%</span>
            </div>
            <div className="grid grid-cols-[auto_1fr_minmax(100px,0.9fr)_52px] items-center gap-2">
              <input type="checkbox" checked={slEnabled} onChange={e => setSlEnabled(e.target.checked)}
                className="accent-primary h-3.5 w-3.5 shrink-0" />
              <span className="text-xs">Stop Loss</span>
              <Input disabled={!slEnabled} value={sl} onChange={e => setSl(e.target.value)}
                className="h-7 rounded-md font-mono text-xs text-sell px-2" />
              <span className="text-xs text-right text-sell font-mono">-{Math.abs(slPct).toFixed(1)}%</span>
            </div>
          </div>
        )}

        {isOptions ? (
          <div className="glass-strong rounded-lg border border-border/50 px-3 py-1.5 space-y-0.5">
            <Row label="Type" value={`${optType.toUpperCase()} · ${expiry}`} />
            <Row label="Strike" value={`$${formatPrice(strikeNum)}`} />
            <Row label="Premium" value={`$${premium.toFixed(2)}`} valueClass="text-primary" />
            <Row label="Contracts" value={contracts.toFixed(2)} />
            <div className="border-t border-border/50 pt-0.5">
              <Row label="Total cost" value={`$${optionCost.toFixed(2)}`} valueClass="font-bold" />
            </div>
          </div>
        ) : (
          <div className="glass-strong rounded-lg border border-border/50 px-3 py-1.5 space-y-0.5">
            <Row label="Order value" value={`$${orderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
            {isFutures && <Row label="Margin" value={`$${margin.toFixed(2)}`} />}
            {isFutures && (
              <Row
                label={<span className="flex items-center gap-1"><Shield className="h-3 w-3" />Liq. price</span>}
                value={`$${formatPrice(liqPrice)}`}
                valueClass="text-warning"
              />
            )}
            <Row label="Fee" value={`$${fee.toFixed(2)}`} />
            <div className="border-t border-border/50 pt-0.5">
              <Row
                label={<span className="flex items-center gap-1"><Calculator className="h-3 w-3" />R:R Ratio</span>}
                value={`1 : ${rr}`}
                valueClass="font-bold text-primary"
              />
            </div>
          </div>
        )}

        <Button onClick={handleSubmit}
          className={cn(
            "w-full h-8 rounded-lg font-bold text-sm mt-auto",
            side === "buy"
              ? "bg-gradient-buy text-buy-foreground hover:shadow-glow-buy"
              : "bg-gradient-sell text-sell-foreground hover:shadow-glow-sell"
          )}
        >
          <Zap className="h-3.5 w-3.5 mr-1.5" />
          {isOptions
            ? `${side === "buy" ? "Buy" : "Sell"} ${optType.toUpperCase()}`
            : isSpot
              ? `${side === "buy" ? "Buy" : "Sell"} ${symbol.split("-")[0]}`
              : `${side === "buy" ? "Open Long" : "Open Short"} ${leverage}x`}
        </Button>
      </div>
    </div>
  );
}
