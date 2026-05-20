import { useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/mockData";
import { TrendingUp, TrendingDown, Info, Zap, Shield, Calculator, ChevronDown, Plus, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

type Side = "buy" | "sell";
type OrderType = "market" | "limit" | "tpsl";
type MarketMode = "spot" | "futures" | "options";
type OptionType = "call" | "put";
type SizeUnit = "USD" | "USDT" | string;
type TpslOrderMode = "market" | "limit";
type TpslTarget = {
  id: number;
  tpEnabled: boolean;
  slEnabled: boolean;
  tp: string;
  sl: string;
  mode: TpslOrderMode;
};

const BALANCE = 25000;

export function TradePanel({ symbol, price }: { symbol: string; price: number }) {
  const baseAsset = symbol.split("-")[0] || "BTC";
  const sizeUnits: SizeUnit[] = Array.from(new Set(["USD", "USDT", baseAsset]));
  const leverageInputRef = useRef<HTMLInputElement>(null);
  const sizeInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<MarketMode>("futures");
  const [side, setSide] = useState<Side>("buy");
  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [leverage, setLeverage] = useState(10);
  const [leverageInput, setLeverageInput] = useState("10");
  const [sizePct, setSizePct] = useState(25);
  const [sizeUnit, setSizeUnit] = useState<SizeUnit>("USD");
  const [sizeInput, setSizeInput] = useState((BALANCE * 0.25).toFixed(2));
  const [limitPrice, setLimitPrice] = useState(price.toFixed(2));
  const [tpslTargets, setTpslTargets] = useState<TpslTarget[]>([
    {
      id: 1,
      tpEnabled: false,
      slEnabled: false,
      tp: (price * 1.05).toFixed(2),
      sl: (price * 0.97).toFixed(2),
      mode: "market",
    },
  ]);
  const [optType, setOptType] = useState<OptionType>("call");
  const [expiry, setExpiry] = useState("7D");
  const [strike, setStrike] = useState((Math.round(price / 100) * 100).toString());

  const isSpot = mode === "spot";
  const isFutures = mode === "futures";
  const isOptions = mode === "options";
  const effLeverage = isSpot ? 1 : leverage;

  const sizeUsd = BALANCE * (sizePct / 100);
  const orderValue = sizeUsd * effLeverage;
  const positionSize = orderValue / price;
  const margin = sizeUsd;
  const liqPrice = side === "buy"
    ? price * (1 - 0.95 / effLeverage)
    : price * (1 + 0.95 / effLeverage);
  const fee = orderValue * (isOptions ? 0.001 : 0.0005);
  const primaryTarget = tpslTargets[0];
  const tpPct = ((parseFloat(primaryTarget.tp) - price) / price) * 100 * (side === "buy" ? 1 : -1);
  const slPct = ((parseFloat(primaryTarget.sl) - price) / price) * 100 * (side === "buy" ? -1 : 1);
  const rr = Number.isFinite(tpPct / slPct) && slPct !== 0 ? Math.abs(tpPct / slPct).toFixed(2) : "—";

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
  const moreOrders = ["OCO", "Trailing Stop", "TWAP", "Iceberg"];
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const formatSizeForUnit = (usdValue: number, unit: SizeUnit) => {
    if (unit === "USD" || unit === "USDT") return usdValue.toFixed(2);
    return (usdValue / price).toFixed(6);
  };
  const sizeInputToUsd = (value: number, unit: SizeUnit) => {
    if (unit === "USD" || unit === "USDT") return value;
    return value * price;
  };
  const setLeverageValue = (value: number) => {
    const next = Math.round(clamp(value, 1, 100));
    setLeverage(next);
    setLeverageInput(String(next));
  };
  const setSizePercentValue = (value: number) => {
    const next = clamp(value, 0.004, 100);
    setSizePct(next);
    setSizeInput(formatSizeForUnit(BALANCE * (next / 100), sizeUnit));
  };
  const handleLeverageInputChange = (value: string) => {
    const cleaned = value.replace(/x/gi, "");
    setLeverageInput(cleaned);
    const numericValue = parseFloat(cleaned);
    if (Number.isFinite(numericValue)) {
      setLeverage(Math.round(clamp(numericValue, 1, 100)));
    }
  };
  const handleLeverageBlur = () => {
    const numericValue = parseFloat(leverageInput);
    setLeverageValue(Number.isFinite(numericValue) ? numericValue : leverage);
  };
  const handleSizeInputChange = (value: string) => {
    setSizeInput(value);
    const numericValue = parseFloat(value);
    if (Number.isFinite(numericValue)) {
      const usdValue = clamp(sizeInputToUsd(numericValue, sizeUnit), 1, BALANCE);
      setSizePct((usdValue / BALANCE) * 100);
    }
  };
  const handleSizeBlur = () => {
    const numericValue = parseFloat(sizeInput);
    const usdValue = Number.isFinite(numericValue)
      ? clamp(sizeInputToUsd(numericValue, sizeUnit), 1, BALANCE)
      : sizeUsd;
    setSizePct((usdValue / BALANCE) * 100);
    setSizeInput(formatSizeForUnit(usdValue, sizeUnit));
  };
  const handleSizeUnitChange = (unit: SizeUnit) => {
    setSizeUnit(unit);
    setSizeInput(formatSizeForUnit(sizeUsd, unit));
  };
  const addTpslTarget = () => {
    setTpslTargets(current => {
      const nextId = Math.max(...current.map(target => target.id)) + 1;
      return [
        ...current,
        {
          id: nextId,
          tpEnabled: false,
          slEnabled: false,
          tp: (price * (1 + 0.05 + current.length * 0.02)).toFixed(2),
          sl: (price * 0.97).toFixed(2),
          mode: "market",
        },
      ];
    });
  };
  const updateTpslTarget = (id: number, updates: Partial<Omit<TpslTarget, "id">>) => {
    setTpslTargets(current => current.map(target => target.id === id ? { ...target, ...updates } : target));
  };
  const removeTpslTarget = (id: number) => {
    setTpslTargets(current => current.length === 1 ? current : current.filter(target => target.id !== id));
  };
  const getTpPct = (value: string) => ((parseFloat(value) - price) / price) * 100 * (side === "buy" ? 1 : -1);
  const getSlPct = (value: string) => ((parseFloat(value) - price) / price) * 100 * (side === "buy" ? -1 : 1);

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
              <TabsTrigger value="tpsl" className="h-7 text-xs rounded-md">TP/SL</TabsTrigger>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-7 items-center justify-center gap-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    More
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {moreOrders.map(order => (
                    <DropdownMenuItem
                      key={order}
                      onSelect={() => toast.info(`${order} order selected`, {
                        description: "Advanced order setup is ready to configure.",
                      })}
                      className="text-xs"
                    >
                      {order}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </TabsList>
          </Tabs>
        </div>
      )}

      <div className="px-3 pt-2 pb-2 flex flex-col gap-2 flex-1 min-h-0">
        <Row label="Available" value={`$${BALANCE.toLocaleString()}`} />

        {orderType === "limit" && !isOptions && (
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
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                Leverage
                <Tooltip>
                  <TooltipTrigger><Info className="h-3 w-3" /></TooltipTrigger>
                  <TooltipContent>Higher leverage = higher liquidation risk</TooltipContent>
                </Tooltip>
              </span>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Input
                    ref={leverageInputRef}
                    value={leverageInput}
                    onChange={e => handleLeverageInputChange(e.target.value)}
                    onBlur={handleLeverageBlur}
                    inputMode="decimal"
                    className="h-8 w-24 rounded-md bg-muted/30 border-border pr-8 font-mono text-sm"
                    aria-label="Custom leverage"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">x</span>
                </div>
                <button
                  type="button"
                  onClick={() => leverageInputRef.current?.focus()}
                  className="h-8 rounded-md border border-border bg-muted/30 px-3 text-xs font-semibold text-primary transition-colors hover:bg-muted/50"
                >
                  Custom
                </button>
              </div>
            </div>
            <Slider value={[leverage]} min={1} max={100} step={1} onValueChange={v => setLeverageValue(v[0])}
              className="my-1 h-3" />
            <div className="mt-2 flex flex-wrap gap-1">
              {[1, 10, 50, 75, 100].map(l => (
                <button key={l} onClick={() => setLeverageValue(l)}
                  className={cn("h-8 min-w-[4rem] flex-1 text-[11px] rounded-md border transition-colors",
                    leverage === l ? "border-primary bg-primary/20 text-primary shadow-[0_0_14px_hsl(var(--primary)/0.35)]" : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
                  )}>{l}x</button>
              ))}
              <button
                type="button"
                onClick={() => leverageInputRef.current?.focus()}
                className="h-8 min-w-[5.5rem] rounded-md border border-border bg-muted/20 px-3 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                Custom
              </button>
            </div>
          </div>
        )}

        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Size</span>
            <span className="font-mono">{positionSize.toFixed(4)} {baseAsset}</span>
          </div>
          <div className="flex gap-1 mb-1">
            <Input
              ref={sizeInputRef}
              value={sizeInput}
              onChange={e => handleSizeInputChange(e.target.value)}
              onBlur={handleSizeBlur}
              inputMode="decimal"
              className="h-8 flex-1 rounded-md bg-muted/30 border-border font-mono text-xs"
              aria-label="Custom order size"
            />
            <select
              value={sizeUnit}
              onChange={e => handleSizeUnitChange(e.target.value)}
              className="h-8 rounded-md border border-border bg-muted/30 px-2 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring"
              aria-label="Size unit"
            >
              {sizeUnits.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
          <Slider value={[sizePct]} min={1} max={100} step={1} onValueChange={v => setSizePercentValue(v[0])}
            className="my-1 h-3" />
          <div className="grid grid-cols-5 gap-1 mt-1">
            {[25, 50, 75, 100].map(p => (
              <button key={p} onClick={() => setSizePercentValue(p)}
                className={cn("h-7 text-xs rounded-md transition-colors font-semibold",
                  sizePct === p ? "bg-primary/20 text-primary" : "bg-muted/30 text-muted-foreground hover:text-foreground"
                )}>{p}%</button>
            ))}
            <button
              type="button"
              onClick={() => sizeInputRef.current?.focus()}
              className="h-7 rounded-md bg-muted/30 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Custom
            </button>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Min. trade size $1</div>
        </div>

        {!isOptions && orderType === "tpsl" && (
          <div className="space-y-1.5 pt-1.5 border-t border-border/50">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold">TP/SL targets</span>
              <button
                type="button"
                onClick={addTpslTarget}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary transition-colors hover:bg-primary/25"
                aria-label="Add TP/SL target"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            {tpslTargets.map((target, index) => {
              const targetTpPct = getTpPct(target.tp);
              const targetSlPct = getSlPct(target.sl);

              return (
                <div key={target.id} className="rounded-lg border border-border/50 bg-muted/20 p-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-muted-foreground">Target {index + 1}</span>
                    <div className="flex items-center gap-1">
                      {(["market", "limit"] as const).map(modeOption => (
                        <button
                          key={modeOption}
                          type="button"
                          onClick={() => updateTpslTarget(target.id, { mode: modeOption })}
                          className={cn(
                            "h-6 rounded px-2 text-[11px] font-semibold capitalize transition-colors",
                            target.mode === modeOption
                              ? "bg-primary/20 text-primary"
                              : "bg-background/50 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {modeOption}
                        </button>
                      ))}
                      {tpslTargets.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTpslTarget(target.id)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                          aria-label={`Remove target ${index + 1}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-[auto_1fr_minmax(88px,0.8fr)_48px] items-center gap-2">
                    <input
                      type="checkbox"
                      checked={target.tpEnabled}
                      onChange={e => updateTpslTarget(target.id, { tpEnabled: e.target.checked })}
                      className="h-3.5 w-3.5 shrink-0 accent-primary"
                      aria-label={`Enable take profit for target ${index + 1}`}
                    />
                    <span className="text-xs">Take Profit</span>
                    <Input disabled={!target.tpEnabled} value={target.tp} onChange={e => updateTpslTarget(target.id, { tp: e.target.value })}
                      className="h-7 rounded-md font-mono text-xs text-buy px-2" />
                    <span className="text-xs text-right text-buy font-mono">+{targetTpPct.toFixed(1)}%</span>
                  </div>
                  <div className="grid grid-cols-[auto_1fr_minmax(88px,0.8fr)_48px] items-center gap-2">
                    <input
                      type="checkbox"
                      checked={target.slEnabled}
                      onChange={e => updateTpslTarget(target.id, { slEnabled: e.target.checked })}
                      className="h-3.5 w-3.5 shrink-0 accent-primary"
                      aria-label={`Enable stop loss for target ${index + 1}`}
                    />
                    <span className="text-xs">Stop Loss</span>
                    <Input disabled={!target.slEnabled} value={target.sl} onChange={e => updateTpslTarget(target.id, { sl: e.target.value })}
                      className="h-7 rounded-md font-mono text-xs text-sell px-2" />
                    <span className="text-xs text-right text-sell font-mono">-{Math.abs(targetSlPct).toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
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
