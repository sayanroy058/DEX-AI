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

  // row: label left, value right — ultra compact
  const Row = ({ label, value, valueClass = "" }: { label: React.ReactNode; value: React.ReactNode; valueClass?: string }) => (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground text-[10px]">{label}</span>
      <span className={cn("font-mono text-[10px]", valueClass)}>{value}</span>
    </div>
  );

  return (
    <div className="glass rounded-xl flex flex-col h-full overflow-y-auto overflow-x-hidden">
      {/* ── Mode tabs ── */}
      <div className="px-2 pt-1.5">
        <Tabs value={mode} onValueChange={v => setMode(v as MarketMode)}>
          <TabsList className="grid grid-cols-3 h-6 bg-muted/30 w-full">
            <TabsTrigger value="spot"    className="text-[9px] h-5">Spot</TabsTrigger>
            <TabsTrigger value="futures" className="text-[9px] h-5">Futures</TabsTrigger>
            <TabsTrigger value="options" className="text-[9px] h-5">Options</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ── Buy / Sell ── */}
      <div className="grid grid-cols-2 gap-1 px-2 pt-1">
        <button onClick={() => setSide("buy")} className={cn(
          "py-1 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1",
          side === "buy" ? "bg-gradient-buy text-buy-foreground shadow-glow-buy" : "glass-strong text-muted-foreground hover:text-buy"
        )}>
          <TrendingUp className="h-3 w-3" /> {longLabel}
        </button>
        <button onClick={() => setSide("sell")} className={cn(
          "py-1 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1",
          side === "sell" ? "bg-gradient-sell text-sell-foreground shadow-glow-sell" : "glass-strong text-muted-foreground hover:text-sell"
        )}>
          <TrendingDown className="h-3 w-3" /> {shortLabel}
        </button>
      </div>

      {/* ── Options: Call / Put ── */}
      {isOptions && (
        <div className="grid grid-cols-2 gap-1 px-2 pt-1">
          <button onClick={() => setOptType("call")} className={cn(
            "py-0.5 rounded text-[9px] font-semibold border transition-all",
            optType === "call" ? "bg-buy/15 text-buy border-buy/40" : "border-border/50 text-muted-foreground hover:text-buy"
          )}>Call</button>
          <button onClick={() => setOptType("put")} className={cn(
            "py-0.5 rounded text-[9px] font-semibold border transition-all",
            optType === "put" ? "bg-sell/15 text-sell border-sell/40" : "border-border/50 text-muted-foreground hover:text-sell"
          )}>Put</button>
        </div>
      )}

      {/* ── Order type ── */}
      {!isOptions && (
        <div className="px-2 pt-1">
          <Tabs value={orderType} onValueChange={v => setOrderType(v as OrderType)}>
            <TabsList className="grid grid-cols-4 h-6 bg-muted/30 w-full">
              <TabsTrigger value="market" className="text-[9px] h-5">Market</TabsTrigger>
              <TabsTrigger value="limit"  className="text-[9px] h-5">Limit</TabsTrigger>
              <TabsTrigger value="stop"   className="text-[9px] h-5">Stop</TabsTrigger>
              <TabsTrigger value="tpsl"   className="text-[9px] h-5">TP/SL</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* ── Body ── */}
      <div className="px-2 pt-1.5 pb-2 flex flex-col gap-1.5 flex-1 min-h-0">
        {/* Available */}
        <Row label="Available" value={`$${BALANCE.toLocaleString()}`} />

        {/* Limit price */}
        {orderType !== "market" && !isOptions && (
          <div>
            <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
              <span>Price (USD)</span>
              <button onClick={() => setLimitPrice(price.toFixed(2))} className="text-primary hover:underline">Mid</button>
            </div>
            <Input value={limitPrice} onChange={e => setLimitPrice(e.target.value)}
              className="h-6 font-mono text-[10px] bg-muted/30 border-border px-1.5" />
          </div>
        )}

        {/* Options: Strike + Expiry */}
        {isOptions && (
          <div className="grid grid-cols-2 gap-1">
            <div>
              <div className="text-[9px] text-muted-foreground mb-0.5">Strike</div>
              <Input value={strike} onChange={e => setStrike(e.target.value)}
                className="h-6 font-mono text-[10px] bg-muted/30 border-border px-1.5" />
            </div>
            <div>
              <div className="text-[9px] text-muted-foreground mb-0.5">Expiry</div>
              <div className="flex gap-0.5">
                {["7D", "30D", "90D"].map(e => (
                  <button key={e} onClick={() => setExpiry(e)}
                    className={cn("flex-1 h-6 text-[9px] rounded transition-colors",
                      expiry === e ? "bg-primary/20 text-primary" : "bg-muted/30 text-muted-foreground hover:text-foreground"
                    )}>{e}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Leverage */}
        {isFutures && (
          <div>
            <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
              <span className="flex items-center gap-0.5">
                Leverage
                <Tooltip>
                  <TooltipTrigger><Info className="h-2 w-2" /></TooltipTrigger>
                  <TooltipContent>Higher leverage = higher liquidation risk</TooltipContent>
                </Tooltip>
              </span>
              <span className="font-mono font-bold text-primary">{leverage}x</span>
            </div>
            <Slider value={[leverage]} min={1} max={100} step={1} onValueChange={v => setLeverage(v[0])}
              className="my-0.5 h-3" />
            <div className="flex gap-0.5 mt-0.5">
              {[1, 5, 10, 25, 50, 75, 100].map(l => (
                <button key={l} onClick={() => setLeverage(l)}
                  className={cn("flex-1 py-0.5 text-[9px] rounded transition-colors",
                    leverage === l ? "bg-primary/20 text-primary" : "bg-muted/30 text-muted-foreground hover:text-foreground"
                  )}>{l}x</button>
              ))}
            </div>
          </div>
        )}

        {/* Size */}
        <div>
          <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
            <span>Size</span>
            <span className="font-mono">{positionSize.toFixed(4)} {symbol.split("-")[0]}</span>
          </div>
          <Slider value={[sizePct]} min={1} max={100} step={1} onValueChange={v => setSizePct(v[0])}
            className="my-0.5 h-3" />
          <div className="grid grid-cols-4 gap-0.5 mt-0.5">
            {[25, 50, 75, 100].map(p => (
              <button key={p} onClick={() => setSizePct(p)}
                className={cn("py-0.5 text-[9px] rounded transition-colors font-medium",
                  sizePct === p ? "bg-primary/20 text-primary" : "bg-muted/30 text-muted-foreground hover:text-foreground"
                )}>{p}%</button>
            ))}
          </div>
        </div>

        {/* TP / SL */}
        {!isOptions && (
          <div className="space-y-0.5 pt-1 border-t border-border/50">
            <div className="flex items-center gap-1">
              <input type="checkbox" checked={tpEnabled} onChange={e => setTpEnabled(e.target.checked)}
                className="accent-primary h-2.5 w-2.5 shrink-0" />
              <span className="text-[9px] flex-1">Take Profit</span>
              <Input disabled={!tpEnabled} value={tp} onChange={e => setTp(e.target.value)}
                className="h-5 w-[72px] font-mono text-[9px] text-buy px-1" />
              <span className="text-[9px] w-8 text-right text-buy font-mono">+{tpPct.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-1">
              <input type="checkbox" checked={slEnabled} onChange={e => setSlEnabled(e.target.checked)}
                className="accent-primary h-2.5 w-2.5 shrink-0" />
              <span className="text-[9px] flex-1">Stop Loss</span>
              <Input disabled={!slEnabled} value={sl} onChange={e => setSl(e.target.value)}
                className="h-5 w-[72px] font-mono text-[9px] text-sell px-1" />
              <span className="text-[9px] w-8 text-right text-sell font-mono">-{Math.abs(slPct).toFixed(1)}%</span>
            </div>
          </div>
        )}

        {/* Risk metrics box */}
        {isOptions ? (
          <div className="glass-strong rounded-lg px-2 py-1.5 space-y-0.5">
            <Row label="Type" value={`${optType.toUpperCase()} · ${expiry}`} />
            <Row label="Strike" value={`$${formatPrice(strikeNum)}`} />
            <Row label="Premium" value={`$${premium.toFixed(2)}`} valueClass="text-primary" />
            <Row label="Contracts" value={contracts.toFixed(2)} />
            <div className="border-t border-border/50 pt-0.5">
              <Row label="Total cost" value={`$${optionCost.toFixed(2)}`} valueClass="font-bold" />
            </div>
          </div>
        ) : (
          <div className="glass-strong rounded-lg px-2 py-1.5 space-y-0.5">
            <Row label="Order value" value={`$${orderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
            {isFutures && <Row label="Margin" value={`$${margin.toFixed(2)}`} />}
            {isFutures && (
              <Row
                label={<span className="flex items-center gap-0.5"><Shield className="h-2 w-2" />Liq. price</span>}
                value={`$${formatPrice(liqPrice)}`}
                valueClass="text-warning"
              />
            )}
            <Row label="Fee" value={`$${fee.toFixed(2)}`} />
            <div className="border-t border-border/50 pt-0.5">
              <Row
                label={<span className="flex items-center gap-0.5"><Calculator className="h-2 w-2" />R:R Ratio</span>}
                value={`1 : ${rr}`}
                valueClass="font-bold text-primary"
              />
            </div>
          </div>
        )}

        {/* Submit */}
        <Button onClick={handleSubmit}
          className={cn(
            "w-full h-7 font-bold text-[11px] mt-auto",
            side === "buy"
              ? "bg-gradient-buy text-buy-foreground hover:shadow-glow-buy"
              : "bg-gradient-sell text-sell-foreground hover:shadow-glow-sell"
          )}
        >
          <Zap className="h-3 w-3 mr-1" />
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
