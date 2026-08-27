import { useEffect, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatPrice, OptionContract } from "@/lib/mockData";
import { TrendingUp, TrendingDown, Info, Zap, Shield, Calculator, ChevronDown, Plus, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { backendMarketFor, backendOptionsMarketFor, optionInstrumentSymbol } from "@/lib/backendMarkets";
import { useOrders } from "@/lib/useOrders";
import { getOptionChain, OptionChainEntry, submitAttachedOrder } from "@/lib/apiClient";
import { useWallet } from "@/lib/useWallet";
import { useMarketMetadata } from "@/lib/useMarketMetadata";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Side = "buy" | "sell";
type OrderType = "market" | "limit" | "tpsl";
export type MarketMode = "spot" | "futures" | "options";
type MarginMode = "isolated" | "cross";
type OptionType = "call" | "put";
type TpslOrderMode = "market" | "limit";
type TpslTarget = {
  id: number;
  tpEnabled: boolean;
  slEnabled: boolean;
  tp: string;
  sl: string;
  mode: TpslOrderMode;
};

export function TradePanel({
  symbol,
  price,
  selectedOption,
  onModeChange,
  orders,
}: {
  symbol: string;
  price: number;
  selectedOption?: OptionContract | null;
  onModeChange?: (mode: MarketMode) => void;
  orders: ReturnType<typeof useOrders>;
}) {
  const baseAsset = symbol.split("-")[0] || "BTC";
  const quoteAsset = symbol.split("-")[1] || "USDC";
  const backendMarket = backendMarketFor(symbol);
  const marketMetadata = useMarketMetadata(symbol);
  const walletState = useWallet();
  const [mode, setMode] = useState<MarketMode>("spot");
  const [side, setSide] = useState<Side>("buy");
  const isSpotSell = mode === "spot" && side === "sell";
  const quoteBalance = walletState.balances.find((b) => b.asset === quoteAsset)?.available ?? 0;
  const baseBalance = walletState.balances.find((b) => b.asset === baseAsset)?.available ?? 0;
  // Buys spend quote currency; spot sells spend the purchased base asset.
  const BALANCE = isSpotSell ? baseBalance : quoteBalance;
  const leverageInputRef = useRef<HTMLInputElement>(null);
  const sizeInputRef = useRef<HTMLInputElement>(null);
  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [marginMode, setMarginMode] = useState<MarginMode>("isolated");
  const [leverage, setLeverage] = useState(10);
  const [reduceOnly, setReduceOnly] = useState(false);
  const [slippageBps, setSlippageBps] = useState("50");
  const [marketConfirmOpen, setMarketConfirmOpen] = useState(false);
  const [leverageInput, setLeverageInput] = useState("10");
  const [isCustomLeverageOpen, setIsCustomLeverageOpen] = useState(false);
  const [sizePct, setSizePct] = useState(25);
  const [sizeInput, setSizeInput] = useState((BALANCE * 0.25).toFixed(2));
  useEffect(() => {
    setSizeInput((BALANCE * (sizePct / 100)).toFixed(isSpotSell ? 8 : 2));
  }, [BALANCE, isSpotSell, sizePct]);
  const [limitPrice, setLimitPrice] = useState(price.toFixed(2));
  // useState(price...) above only reads `price` on first render. `price` is
  // 0 (or a mock value) until the real live-price hook resolves — usually
  // a few hundred ms after mount — so without this effect, limitPrice stays
  // frozen at whatever `price` happened to be at that first render (a stale
  // mock number like $67,432.50 sitting next to a header correctly showing
  // $79,602). Re-sync to the live price automatically UNTIL the user
  // actually edits the field themselves — editedPriceRef flips true the
  // moment they type, so a live price update never clobbers what they
  // typed mid-edit.
  const editedPriceRef = useRef(false);
  useEffect(() => {
    if (editedPriceRef.current) return;
    if (price > 0) setLimitPrice(price.toFixed(2));
  }, [price]);
  // Switching symbols means the old edited price is for a different
  // instrument entirely — resume auto-following the new symbol's live
  // price instead of carrying over a stale manual edit.
  useEffect(() => {
    editedPriceRef.current = false;
  }, [symbol]);
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
  const [chain, setChain] = useState<OptionChainEntry[]>([]);
  const editedStrikeRef = useRef(false);

  // Options trading is hidden from this delivery (plan.md 5.1) — the
  // Options tab above is disabled, so this effect is intentionally a no-op
  // rather than force-switching into a mode the UI no longer allows
  // selecting. Index.tsx also no longer activates the options layout or
  // passes a selectedOption, so selectedOption is expected to always be
  // undefined here; this guard just keeps the two in agreement even if that
  // assumption is ever violated by a future caller.
  useEffect(() => {
    if (!selectedOption) return;
  }, [selectedOption]);

  // Same staleness bug as limitPrice: the initial useState only reads
  // `price` once, before the real live price has resolved. Keep the
  // suggested strike following the live price until the user picks a real
  // contract from the chain (selectedOption, above) or edits it directly.
  useEffect(() => {
    if (editedStrikeRef.current) return;
    if (price > 0) setStrike((Math.round(price / 100) * 100).toString());
  }, [price]);
  useEffect(() => {
    editedStrikeRef.current = false;
  }, [symbol]);

  useEffect(() => {
    if (!isCustomLeverageOpen) return;
    leverageInputRef.current?.focus();
    leverageInputRef.current?.select();
  }, [isCustomLeverageOpen]);

  useEffect(() => {
    if (mode !== "options") return;
    const backendOptions = backendOptionsMarketFor(baseAsset);
    if (!backendOptions) return;
    let cancelled = false;
    getOptionChain(backendOptions.symbol)
      .then((res) => { if (!cancelled) setChain(res.chain); })
      .catch(() => { if (!cancelled) setChain([]); });
    return () => { cancelled = true; };
  }, [mode, baseAsset]);

  const isSpot = mode === "spot";
  const isFutures = mode === "futures";
  const isOptions = mode === "options";
  const isIsolatedMargin = marginMode === "isolated";
  const effLeverage = isSpot ? 1 : leverage;

  const sizeUsd = isSpotSell
    ? BALANCE * (sizePct / 100) * price
    : BALANCE * (sizePct / 100);
  const orderValue = sizeUsd * effLeverage;
  const lotSize = Number(marketMetadata?.lotSize ?? 0);
  const tickSize = Number(marketMetadata?.tickSize ?? 0);
  const lotDecimals = lotSize > 0 ? Math.max(0, Math.ceil(-Math.log10(lotSize))) : 8;
  const quantityDecimals = isSpotSell ? Math.max(8, lotDecimals) : lotDecimals;
  const rawPositionSize = isSpotSell ? BALANCE * (sizePct / 100) : orderValue / price;
  // Spot sells must be able to liquidate dust balances below the normal
  // market lot size. Buys, futures, and MM orders retain lot rounding.
  const positionSize = isSpotSell
    ? Number(rawPositionSize.toFixed(8))
    : lotSize > 0 ? Math.floor((rawPositionSize + Number.EPSILON) / lotSize) * lotSize : 0;
  const margin = sizeUsd;
  // Liquidation price matches the backend's MarginRatio < MMR trigger:
  //   (margin + PnL) / notional < MMR
  // Solving for the mark price at which margin + unrealized PnL = MMR * notional:
  //   long:  liq = entry * (1 - 1/lev) / (1 - MMR)
  //   short: liq = entry * (1 + 1/lev) / (1 - MMR)
  // These values are from /markets (the engine symbol configuration), never
  // hardcoded browser fallbacks for executable markets.
  const mmr = Number(marketMetadata?.maintenanceMarginRatePct ?? 0) / 100;
  const liqPrice = side === "buy"
    ? (price * (1 - 1 / effLeverage)) / (1 - mmr)
    : (price * (1 + 1 / effLeverage)) / (1 + mmr);
  const feeRate = isOptions ? 0.001 : Number(marketMetadata?.takerFeePct ?? 0) / 100;
  const fee = orderValue * feeRate;
  const orderValueLabel = orderValue > 0 && orderValue < 1
    ? `$${orderValue.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 })}`
    : `$${orderValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const primaryTarget = tpslTargets[0];
  const tpPct = ((parseFloat(primaryTarget.tp) - price) / price) * 100 * (side === "buy" ? 1 : -1);
  const slPct = ((parseFloat(primaryTarget.sl) - price) / price) * 100 * (side === "buy" ? -1 : 1);
  const rr = Number.isFinite(tpPct / slPct) && slPct !== 0 ? Math.abs(tpPct / slPct).toFixed(2) : "—";

  const strikeNum = parseFloat(strike) || price;
  const days = parseInt(expiry) || 7;
  const intrinsic = optType === "call" ? Math.max(0, price - strikeNum) : Math.max(0, strikeNum - price);
  const timeValue = price * 0.02 * Math.sqrt(days / 30);
  const modeledPremium = intrinsic + timeValue;
  const chainMatch = chain.find(
    (c) => c.optionType === optType.toUpperCase() && Math.abs(parseFloat(c.strike) - strikeNum) < 0.000001
  );
  const selectedOptionMatches =
    selectedOption &&
    selectedOption.type === optType &&
    selectedOption.expiry === expiry &&
    Math.abs(selectedOption.strike - strikeNum) < 0.000001;
  const activeOption = selectedOptionMatches ? selectedOption : null;
  const optionPrice = chainMatch
    ? side === "buy" ? parseFloat(chainMatch.ask) : parseFloat(chainMatch.bid)
    : activeOption
      ? side === "buy" ? activeOption.ask : activeOption.bid
      : modeledPremium;
  const optionPriceType = chainMatch || activeOption ? (side === "buy" ? "Ask" : "Bid") : "Est.";
  const contracts = sizePct / 10;
  const optionTotal = optionPrice * contracts;

  const handleSubmit = async (confirmedMarketOrder = false) => {
    if (isOptions) {
      const backendOptions = backendOptionsMarketFor(baseAsset);
      if (!backendOptions || !chainMatch) {
        toast.error("Option not available", {
          description: "No live contract for this strike/expiry yet.",
        });
        return;
      }
      try {
        const instrumentSymbol = optionInstrumentSymbol(
          baseAsset,
          strikeNum,
          chainMatch.expiry,
          optType.toUpperCase() as "CALL" | "PUT"
        );
        const res = await orders.place({
          symbol: instrumentSymbol,
          market: "OPTIONS",
          side: side === "buy" ? "BUY" : "SELL",
          type: orderType === "market" ? "MARKET" : "LIMIT",
          price: orderType === "market" ? undefined : optionPrice.toFixed(2),
          qty: contracts.toFixed(2),
          optionType: optType.toUpperCase() as "CALL" | "PUT",
          strike: strikeNum.toString(),
          expiry: chainMatch.expiry,
        });
        toast.success(`${side.toUpperCase()} ${optType.toUpperCase()} placed`, {
          description: `Order ${res.orderId.slice(0, 8)} · status ${res.status} · filled ${res.filled}`,
        });
      } catch (err) {
        toast.error("Order failed", { description: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    if (!backendMarket) {
      // Previously showed a fake success toast here — the order was never
      // submitted anywhere, but the UI told the user it had been placed.
      // Match the options-mode pattern above: an honest "not available"
      // error, not a fabricated fill.
      toast.error(`${symbol} isn't available to trade yet`, {
        description: "This market isn't live on the exchange yet — try BTC-USDT, ETH-USDT, SOL-USDT, BTC-PERP, or ETH-PERP.",
      });
      return;
    }

    if (!marketMetadata) {
      toast.error("Market configuration unavailable", {
        description: "Order validation is waiting for the exchange market configuration. Please try again shortly.",
      });
      return;
    }

    const engineOrderType = orderType === "tpsl" ? "MARKET" : orderType.toUpperCase();
    const rawRequestedPrice = orderType === "market" || orderType === "tpsl" ? price : Number(limitPrice);
    // JavaScript number arithmetic can produce values such as 78536.7702
    // from a tick-aligned input/calculation. Normalize the submitted limit
    // price to the exchange tick before validation and serialization.
    const tickDecimals = tickSize > 0
      ? Math.max(0, Math.ceil(-Math.log10(tickSize) - 1e-12))
      : 8;
    const requestedPrice = orderType === "limit" && tickSize > 0
      ? Number((Math.round((rawRequestedPrice + Number.EPSILON) / tickSize) * tickSize).toFixed(tickDecimals))
      : rawRequestedPrice;
    const minNotional = Number(marketMetadata.minNotional);
    const isMultiple = (value: number, increment: number) =>
      increment > 0 && Math.abs(value / increment - Math.round(value / increment)) < 1e-7;
    if (!marketMetadata.enabledOrderTypes.includes(engineOrderType)) {
      toast.error("Order type unavailable", { description: `${engineOrderType} is not enabled for ${symbol}.` });
      return;
    }
    if (!Number.isFinite(requestedPrice) || requestedPrice <= 0 || requestedPrice > Number(marketMetadata.maxPrice)) {
      toast.error("Invalid price", { description: `Enter a price up to ${marketMetadata.maxPrice}.` });
      return;
    }
    if (orderType === "limit" && !isMultiple(requestedPrice, tickSize)) {
      toast.error("Invalid price increment", { description: `Price must be a multiple of ${marketMetadata.tickSize}.` });
      return;
    }
    const allowsDustSpotSell = isSpot && side === "sell";
    if (!Number.isFinite(positionSize) || positionSize <= 0 || positionSize > Number(marketMetadata.maxQuantity) || (!allowsDustSpotSell && !isMultiple(positionSize, lotSize))) {
      toast.error("Invalid size", { description: `Size must be a multiple of ${marketMetadata.lotSize}.` });
      return;
    }
    if (!allowsDustSpotSell && requestedPrice * positionSize < minNotional) {
      toast.error("Order below minimum", { description: `Minimum notional is ${marketMetadata.minNotional}.` });
      return;
    }
    if (isFutures && marketMetadata.maxLeverage && leverage > marketMetadata.maxLeverage) {
      toast.error("Leverage exceeds market maximum", { description: `Maximum leverage is ${marketMetadata.maxLeverage}x.` });
      return;
    }

    const isMarketExecution = orderType === "market" || orderType === "tpsl";
    if (isFutures && isMarketExecution && leverage > 1 && !confirmedMarketOrder) {
      setMarketConfirmOpen(true);
      return;
    }

    // TP/SL is not a distinct order type on the engine — it's an entry order
    // (placed here as a market order, since a resting-limit entry combined
    // with contingent exits adds a "what if the entry never fills" state
    // this panel doesn't track) plus one real STOP order per enabled target,
    // submitted on the *opposite* side and reduce-only so it can only close
    // the position it's protecting, never open a new one. Previously this
    // branch submitted a plain market/limit order and silently discarded
    // tpslTargets entirely — the position had zero actual protection despite
    // the UI implying otherwise.
    const isTpsl = orderType === "tpsl";
    const exitSide = side === "buy" ? "SELL" : "BUY";
      const futuresParams = isFutures
      ? { leverage, marginMode: marginMode.toUpperCase() as "ISOLATED" | "CROSS", ...(reduceOnly ? { reduceOnly: true } : {}) }
      : {};

    try {
      const parentOrder = {
          symbol: backendMarket.symbol,
        market: backendMarket.market,
        side: side === "buy" ? "BUY" : "SELL",
        type: orderType === "market" || isTpsl ? "MARKET" : "LIMIT",
          price: orderType === "market" || isTpsl ? undefined : requestedPrice.toFixed(tickDecimals),
          qty: positionSize.toFixed(quantityDecimals), account: "",
          ...(isMarketExecution && Number(slippageBps) >= 0 ? { slippageBps: Math.round(Number(slippageBps)) } : {}),
          ...futuresParams,
      };
      const res = isTpsl
        ? await submitAttachedOrder(parentOrder,
            tpslTargets[0]?.tpEnabled ? { ...parentOrder, side: exitSide, type: "STOP", stopPrice: tpslTargets[0].tp, qty: "0" } : undefined,
            tpslTargets[0]?.slEnabled ? { ...parentOrder, side: exitSide, type: "STOP", stopPrice: tpslTargets[0].sl, qty: "0" } : undefined)
        : await orders.place(parentOrder);
      toast.success(`${side.toUpperCase()} ${orderType.toUpperCase()} placed`, {
        description: `Order ${res.orderId.slice(0, 8)} · status ${res.status} · filled ${res.filled}`,
      });

    } catch (err) {
      toast.error("Order failed", { description: err instanceof Error ? err.message : String(err) });
    }
  };

  const longLabel = isSpot || isOptions ? "Buy" : "Long";
  const shortLabel = isSpot || isOptions ? "Sell" : "Short";
  const moreOrders = ["OCO", "Trailing Stop", "TWAP", "Iceberg"];
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const setLeverageValue = (value: number) => {
    if (!isIsolatedMargin) return;
    const next = Math.round(clamp(value, 1, marketMetadata?.maxLeverage || 1));
    setLeverage(next);
    setLeverageInput(String(next));
  };
  const handleModeChange = (value: string) => {
    const nextMode = value as MarketMode;
    setMode(nextMode);
    onModeChange?.(nextMode);
  };
  const setSizePercentValue = (value: number) => {
    const next = clamp(value, 0.004, 100);
    setSizePct(next);
    setSizeInput((BALANCE * (next / 100)).toFixed(isSpotSell ? 8 : 2));
  };
  const handleLeverageInputChange = (value: string) => {
    if (!isIsolatedMargin) return;
    const cleaned = value.replace(/x/gi, "");
    if (cleaned === "") {
      setLeverageInput(cleaned);
      return;
    }
    const numericValue = parseFloat(cleaned);
    if (!Number.isFinite(numericValue)) {
      setLeverageInput(cleaned);
      return;
    }
    const clamped = Math.round(clamp(numericValue, 1, marketMetadata?.maxLeverage || 1));
    setLeverageInput(clamped === numericValue ? cleaned : String(clamped));
    setLeverage(clamped);
  };
  const handleLeverageBlur = () => {
    const numericValue = parseFloat(leverageInput);
    setLeverageValue(Number.isFinite(numericValue) ? numericValue : leverage);
    setIsCustomLeverageOpen(false);
  };
  const handleSizeInputChange = (value: string) => {
    if (value === "") {
      setSizeInput(value);
      return;
    }
    const numericValue = parseFloat(value);
    if (!Number.isFinite(numericValue)) {
      setSizeInput(value);
      return;
    }
    const usdnValue = clamp(numericValue, 0, BALANCE);
    setSizeInput(usdnValue === numericValue ? value : usdnValue.toFixed(isSpotSell ? 8 : 2));
    setSizePct((usdnValue / BALANCE) * 100);
  };
  const handleSizeBlur = () => {
    const numericValue = parseFloat(sizeInput);
    const usdnValue = Number.isFinite(numericValue)
      ? clamp(numericValue, 0, BALANCE)
      : sizeUsd;
    setSizePct((usdnValue / BALANCE) * 100);
    setSizeInput(usdnValue.toFixed(isSpotSell ? 8 : 2));
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
        <Tabs value={mode} onValueChange={handleModeChange}>
          <TabsList className="grid grid-cols-3 h-8 bg-muted/30 w-full rounded-lg p-0.5">
            <TabsTrigger value="spot" className="h-7 text-xs font-semibold rounded-md">Spot</TabsTrigger>
            <TabsTrigger value="futures" className="h-7 text-xs font-semibold rounded-md">Futures</TabsTrigger>
            {/* Options execution is hidden from this delivery (plan.md 5.1):
                the visible option workspace generated fake contracts via
                generateOptionChain() while order entry used a separate real
                backend chain — two disagreeing sources of "the" option
                chain. Disabled here (not removed) so the mode/order-entry
                code underneath doesn't need to change; Index.tsx also never
                activates the options layout or passes a selectedOption, so
                this tab is unreachable in practice as well as disabled. */}
            <TabsTrigger value="options" disabled className="h-7 text-xs font-semibold rounded-md opacity-50 cursor-not-allowed" title="Options trading is coming soon">
              Options <span className="ml-1 text-[9px] text-muted-foreground">soon</span>
            </TabsTrigger>
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
                      disabled
                      onSelect={() => toast.info(`${order} orders aren't available yet`, {
                        description: "This order type isn't wired up on the exchange yet — use Limit, Market, or TP/SL instead.",
                      })}
                      className="text-xs opacity-60"
                    >
                      {order} <span className="ml-auto text-[10px] text-muted-foreground">soon</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </TabsList>
          </Tabs>
        </div>
      )}

      <div className="px-3 pt-2 pb-2 flex flex-col gap-2 flex-1 min-h-0">
        <Row label="Available" value={isSpotSell ? `${BALANCE.toFixed(8)} ${baseAsset}` : `$${BALANCE.toLocaleString()}`} />

        {orderType === "limit" && !isOptions && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Price ({quoteAsset})</span>
              <button
                onClick={() => { editedPriceRef.current = true; setLimitPrice(price.toFixed(2)); }}
                className="text-primary hover:underline font-medium"
              >
                Mid
              </button>
            </div>
            <Input
              value={limitPrice}
              onChange={e => { editedPriceRef.current = true; setLimitPrice(e.target.value); }}
              className="h-9 rounded-lg font-mono text-sm bg-muted/30 border-border px-3"
            />
          </div>
        )}

        {isOptions && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Strike</div>
              <Input
                value={strike}
                onChange={e => { editedStrikeRef.current = true; setStrike(e.target.value); }}
                className="h-10 rounded-xl font-mono text-sm bg-muted/30 border-border px-3"
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Option Price</div>
              <div
                className="flex h-10 items-center justify-between rounded-xl border border-border bg-muted/30 px-3"
                aria-label={`${optionPriceType} option price $${optionPrice.toFixed(2)}`}
              >
                <span className="font-mono text-sm font-semibold text-primary">
                  ${optionPrice.toFixed(2)}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {optionPriceType}
                </span>
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
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMarginMode("isolated")}
                  className={cn(
                    "h-8 rounded-md border px-3 text-xs font-semibold transition-colors",
                    isIsolatedMargin
                      ? "border-primary bg-primary/20 text-primary shadow-[0_0_14px_hsl(var(--primary)/0.35)]"
                      : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
                  )}
                  aria-pressed={isIsolatedMargin}
                >
                  Isolate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMarginMode("cross");
                    setIsCustomLeverageOpen(false);
                  }}
                  className={cn(
                    "h-8 rounded-md border px-3 text-xs font-semibold transition-colors",
                    !isIsolatedMargin
                      ? "border-warning/50 bg-warning/10 text-warning"
                      : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
                  )}
                  aria-pressed={!isIsolatedMargin}
                >
                  Cross
                </button>
              </div>
            </div>
            <Slider
              value={[leverage]}
              min={1}
              max={marketMetadata?.maxLeverage || 1}
              step={1}
              onValueChange={v => setLeverageValue(v[0])}
              disabled={!isIsolatedMargin}
              className={cn("my-1 h-3", !isIsolatedMargin && "opacity-50")}
            />
            <div className="mt-2 flex flex-wrap gap-1">
              {[1, 5, 10, 50, marketMetadata?.maxLeverage || 1].filter((l, i, values) => l <= (marketMetadata?.maxLeverage || 1) && values.indexOf(l) === i).map(l => (
                <button key={l} onClick={() => setLeverageValue(l)} disabled={!isIsolatedMargin}
                  className={cn("h-8 min-w-[4rem] flex-1 text-[11px] rounded-md border transition-colors",
                    !isIsolatedMargin
                      ? "cursor-not-allowed border-border bg-muted/20 text-muted-foreground opacity-50"
                      : leverage === l
                        ? "border-primary bg-primary/20 text-primary shadow-[0_0_14px_hsl(var(--primary)/0.35)]"
                        : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
                  )}>{l}x</button>
              ))}
              {isCustomLeverageOpen ? (
                <div className="relative min-w-[5.5rem] flex-1">
                  <Input
                    ref={leverageInputRef}
                    value={leverageInput}
                    onChange={e => handleLeverageInputChange(e.target.value)}
                    onBlur={handleLeverageBlur}
                    onKeyDown={e => {
                      if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
                    }}
                    inputMode="decimal"
                    className="h-8 w-full rounded-md bg-muted/20 border-border pr-7 font-mono text-[11px]"
                    aria-label="Custom leverage"
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">x</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCustomLeverageOpen(true)}
                  disabled={!isIsolatedMargin}
                  className="h-8 min-w-[5.5rem] flex-1 rounded-md border border-border bg-muted/20 px-3 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Custom
                </button>
              )}
            </div>
          </div>
        )}

        {isFutures && (
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={reduceOnly} onChange={e => setReduceOnly(e.target.checked)} className="accent-primary" />
              Reduce only
            </label>
            {(orderType === "market" || orderType === "tpsl") && (
              <label className="flex items-center gap-1 rounded-md border border-border bg-muted/20 px-2 text-xs text-muted-foreground">
                Max slippage
                <Input value={slippageBps} onChange={e => setSlippageBps(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className="h-7 border-0 bg-transparent px-1 text-right font-mono text-xs" aria-label="Maximum market-order slippage in basis points" />
                bps
              </label>
            )}
          </div>
        )}

        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Size</span>
            <span className="font-mono">{positionSize.toFixed(quantityDecimals)} {baseAsset}</span>
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
            <div
              className="flex h-8 items-center rounded-md border border-border bg-muted/30 px-3 text-xs font-semibold text-foreground"
              aria-label={`Size unit ${isSpotSell ? baseAsset : quoteAsset}`}
            >
              {isSpotSell ? baseAsset : quoteAsset}
            </div>
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
          <div className="mt-1 text-[11px] text-muted-foreground">Min. notional {marketMetadata?.minNotional ?? "—"}</div>
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
            <Row label={`${optionPriceType} price`} value={`$${optionPrice.toFixed(2)}`} valueClass="text-primary" />
            {activeOption && (
              <>
                <Row label="Bid / Ask" value={`$${activeOption.bid.toFixed(2)} / $${activeOption.ask.toFixed(2)}`} />
                <Row label="IV" value={`${activeOption.iv.toFixed(1)}%`} />
              </>
            )}
            <Row label="Contracts" value={contracts.toFixed(2)} />
            <div className="border-t border-border/50 pt-0.5">
              <Row
                label={side === "buy" ? "Total cost" : "Total credit"}
                value={`$${optionTotal.toFixed(2)}`}
                valueClass="font-bold"
              />
            </div>
          </div>
        ) : (
          <div className="glass-strong rounded-lg border border-border/50 px-3 py-1.5 space-y-0.5">
            <Row label="Order value" value={orderValueLabel} />
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

        <Button onClick={() => void handleSubmit()}
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
      <AlertDialog open={marketConfirmOpen} onOpenChange={setMarketConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm leveraged market order</AlertDialogTitle>
            <AlertDialogDescription>
              This {leverage}x market order may execute up to {slippageBps || "0"} bps from the best available price.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleSubmit(true)}>Place order</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
