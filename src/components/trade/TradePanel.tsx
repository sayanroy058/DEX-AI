import { useEffect, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/mockData";
import { TrendingUp, TrendingDown, Info, Zap, Shield, Calculator, ChevronDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { backendMarketFor, backendOptionsMarketFor, optionInstrumentSymbol } from "@/lib/backendMarkets";
import { useOrders } from "@/lib/useOrders";
import { getOptionChain, OptionChainEntry, submitAttachedOrder, SubmitOrderParams } from "@/lib/apiClient";
import { useWallet } from "@/lib/useWallet";
import { useMarketMetadata } from "@/lib/useMarketMetadata";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Side = "buy" | "sell";
type OrderType = "market" | "limit";
export type MarketMode = "spot" | "futures" | "options";
type MarginMode = "isolated" | "cross";
type OptionType = "call" | "put";

export function TradePanel({
  symbol,
  price,
  selectedOption,
  mode: controlledMode,
  onModeChange,
  orders,
}: {
  symbol: string;
  price: number;
  selectedOption?: OptionChainEntry | null;
  // Optional controlled mode, so the trade page can keep this panel's Spot/
  // Futures/Options tab in sync with the market list's own Spot/Future
  // sub-tab (selecting either one switches both). Uncontrolled (mode
  // omitted) falls back to internal state, defaulting to "spot".
  mode?: MarketMode;
  onModeChange?: (mode: MarketMode) => void;
  orders: ReturnType<typeof useOrders>;
}) {
  const baseAsset = symbol.split("-")[0] || "BTC";
  const backendMarket = backendMarketFor(symbol);
  const marketMetadata = useMarketMetadata(symbol);
  // Splitting the display symbol (e.g. "BTC-PERP") gave "PERP" as the quote
  // asset for every futures market — marketMetadata.quoteCurrency is the
  // backend's actual answer (now BI2XUSD for both spot and futures) and is
  // always right, whatever the display symbol's suffix convention is.
  const quoteAsset = marketMetadata?.quoteCurrency || symbol.split("-")[1] || "BI2XUSD";
  const walletState = useWallet();
  const [uncontrolledMode, setUncontrolledMode] = useState<MarketMode>("spot");
  const mode = controlledMode ?? uncontrolledMode;
  const setMode = setUncontrolledMode;
  const [side, setSide] = useState<Side>("buy");
  const isSpotSell = mode === "spot" && side === "sell";
  const isSpotBuy = mode === "spot" && side === "buy";
  const isOptions = mode === "options";
  const quoteBalance = walletState.balances.find((b) => b.asset === quoteAsset)?.available ?? 0;
  const baseBalance = walletState.balances.find((b) => b.asset === baseAsset)?.available ?? 0;
  // Buys spend quote currency; spot sells spend the purchased base asset.
  const BALANCE = isSpotSell ? baseBalance : quoteBalance;
  // Real per-instrument options fee from the engine's /option-chain
  // response (symbol_configs, market=OPTIONS) — previously a hardcoded
  // 0.001 literal disconnected from actual fee configuration. Defaults to
  // that same 0.001 (0.1%) until the chain has loaded once, so there's no
  // flash of a $0 fee before the first fetch resolves.
  const [optionsTakerFeePct, setOptionsTakerFeePct] = useState(0.1);
  // A spot buy's fee-inclusive engine reservation (orderValue * (1 +
  // feeRate); see submit.go) means the max quote spendable at 100% is
  // BALANCE / (1 + feeRate), not BALANCE itself. Computed here, ahead of
  // sizeInput's own state, so the displayed size box and the actual order
  // math (sizeUsd below) never disagree.
  const feeRate = isOptions ? optionsTakerFeePct / 100 : Number(marketMetadata?.takerFeePct ?? 0) / 100;
  const maxSpendable = isSpotBuy ? BALANCE / (1 + feeRate) : BALANCE;
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
  const [sizeInput, setSizeInput] = useState((maxSpendable * 0.25).toFixed(2));
  useEffect(() => {
    setSizeInput((maxSpendable * (sizePct / 100)).toFixed(isSpotSell ? 8 : 2));
  }, [maxSpendable, isSpotSell, sizePct]);
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
  //
  // Fixed 2026-09-15: editedPriceRef used to flip true only inside onChange,
  // leaving a real window — between the user clicking/tabbing into the
  // field and their first keystroke actually committing — during which a
  // live price tick (the SSE index-price stream pushes roughly once a
  // second, see useIndexPrice) could still land and overwrite whatever was
  // there. Reported symptom: typing a price like 5.16 and having it snap
  // back to the live market price (e.g. 5.15) moments later. Flipping the
  // ref on focus too closes that window — the guard is active from the
  // moment the user interacts with the field, not only after their first
  // character registers.
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
  // TP/SL is an optional attachment on any order (Market or Limit), not a
  // separate order type — the user checks Take Profit and/or Stop Loss and
  // enters a price for whichever is enabled. R:R only means anything once
  // BOTH are enabled (a ratio needs two sides), so it's hidden otherwise.
  const [tpEnabled, setTpEnabled] = useState(false);
  const [slEnabled, setSlEnabled] = useState(false);
  // Spot sell entries reject an attached TP/SL server-side (backend only
  // supports TP/SL on spot BUY entries, and on futures); previously the
  // toggles stayed enabled here so a user filled out TP/SL for a spot sell
  // and only found out it was rejected after submitting. Force both off
  // whenever the form is in that state, matching the toggles being hidden.
  useEffect(() => {
    if (isSpotSell) {
      setTpEnabled(false);
      setSlEnabled(false);
    }
  }, [isSpotSell]);
  const [tp, setTp] = useState((price * 1.05).toFixed(2));
  const [sl, setSl] = useState((price * 0.97).toFixed(2));
  // TP/SL can be entered as either an absolute price OR a percentage, with
  // the other side auto-calculated — previously the percentage was a
  // read-only derived <span> with no way to type into it at all. tpPctInput/
  // slPctInput hold the text actually shown in the percent field; typing
  // into IT recomputes tp/sl (the price), while typing into the price field
  // recomputes the displayed percent — same "whichever the user touched
  // last wins, the live price never fights it" pattern as editedPriceRef
  // above, just per-leg and bidirectional instead of one-directional.
  const [tpPctInput, setTpPctInput] = useState("5.0");
  const [slPctInput, setSlPctInput] = useState("3.0");
  // percentToTpPrice/percentToSlPrice invert tpPct/slPct's sign convention
  // below (TP is always entered/shown as a positive %, SL always negative,
  // regardless of buy/sell side) so typing "5" into either box means the
  // same thing a user expects regardless of which side they're on.
  const percentToTpPrice = (pct: number) => (side === "buy" ? price * (1 + pct / 100) : price * (1 - pct / 100));
  const percentToSlPrice = (pct: number) => (side === "buy" ? price * (1 - pct / 100) : price * (1 + pct / 100));
  const [optType, setOptType] = useState<OptionType>("call");
  const [expiry, setExpiry] = useState("7D");
  const [strike, setStrike] = useState((Math.round(price / 100) * 100).toString());
  const [chain, setChain] = useState<OptionChainEntry[]>([]);
  const editedStrikeRef = useRef(false);

  // TRD-L1: the Options tab's TabsTrigger is disabled (options orders are
  // rejected server-side regardless), but this effect used to still fire
  // from a click in Index.tsx's option-chain table, force-switching into
  // that same disabled mode via setMode/onModeChange — a dead path a user
  // could still reach even though the tab itself was unclickable. Left as
  // prefilling optType/strike only (harmless bookkeeping if this feature is
  // ever re-enabled) without actually forcing the panel into Options mode.
  useEffect(() => {
    if (!selectedOption) return;
    setOptType(selectedOption.optionType === "CALL" ? "call" : "put");
    editedStrikeRef.current = true;
    setStrike(selectedOption.strike);
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
      .then((res) => {
        if (cancelled) return;
        setChain(res.chain);
        const pct = Number(res.takerFeePct);
        if (Number.isFinite(pct) && pct >= 0) setOptionsTakerFeePct(pct);
      })
      .catch(() => { if (!cancelled) setChain([]); });
    return () => { cancelled = true; };
  }, [mode, baseAsset]);

  const isSpot = mode === "spot";
  const isFutures = mode === "futures";
  const isIsolatedMargin = marginMode === "isolated";
  const effLeverage = isSpot ? 1 : leverage;

  // maxSpendable (declared above, near BALANCE) already accounts for the
  // spot-buy fee-inclusive reservation, so sizing off it here keeps this in
  // sync with the sizeInput box without repeating the (1 + feeRate) math.
  const sizeUsd = isSpotSell
    ? BALANCE * (sizePct / 100) * price
    : maxSpendable * (sizePct / 100);
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
  //   short: liq = entry * (1 + 1/lev) / (1 + MMR)
  // These values are from /markets (the engine symbol configuration), never
  // hardcoded browser fallbacks for executable markets. Verified 2026-09-15
  // against the engine's actual settlement.Position.MarginRatio/PnL and
  // liquidation.Engine.checkIsolated: this formula is the exact algebraic
  // solve of the real trigger condition, not an approximation.
  const mmr = Number(marketMetadata?.maintenanceMarginRatePct ?? 0) / 100;
  const liqPrice = side === "buy"
    ? (price * (1 - 1 / effLeverage)) / (1 - mmr)
    : (price * (1 + 1 / effLeverage)) / (1 + mmr);
  // At leverage 1 (full notional posted as margin, no borrowing), a long's
  // liq price formula above collapses to exactly entry*(1-1/1)/(1-MMR) = 0 —
  // verified against the backend's real trigger condition directly (not
  // just this simplified formula): margin already equals the full notional,
  // so (margin + PnL) / notional never drops below MMR for any mark price
  // above zero. That $0 is mathematically correct, but shown as a bare
  // number it reads as "you'll be liquidated once price hits zero" (real,
  // if extreme, risk) rather than its true meaning: this position has no
  // liquidation risk at all at 1x. hasLiquidationRisk gates the display so
  // the UI says so directly instead of showing a misleading "$0.00000000".
  const hasLiquidationRisk = effLeverage > 1;
  const fee = orderValue * feeRate;
  const orderValueLabel = orderValue > 0 && orderValue < 1
    ? `$${orderValue.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 })}`
    : `$${orderValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const tpPct = ((parseFloat(tp) - price) / price) * 100 * (side === "buy" ? 1 : -1);
  const slPct = ((parseFloat(sl) - price) / price) * 100 * (side === "buy" ? -1 : 1);
  // R:R only means anything with both legs present — showing it off a
  // half-configured order (only TP, or only SL) would be a meaningless number.
  const showRR = tpEnabled && slEnabled;
  const rr = showRR && Number.isFinite(tpPct / slPct) && slPct !== 0 ? Math.abs(tpPct / slPct).toFixed(2) : "—";
  // Keep the percent input showing what the current tp/sl price actually
  // implies, whenever the price field (or the live price, or side) is what
  // last changed — mirrors limitPrice's editedPriceRef guard: typing into
  // the percent box itself skips this via the ref below, exactly like
  // typing into the price box skips the live-price sync.
  const editedTpPctRef = useRef(false);
  const editedSlPctRef = useRef(false);
  useEffect(() => {
    if (editedTpPctRef.current) { editedTpPctRef.current = false; return; }
    if (Number.isFinite(tpPct)) setTpPctInput(Math.abs(tpPct).toFixed(1));
  }, [tp, price, side]);
  useEffect(() => {
    if (editedSlPctRef.current) { editedSlPctRef.current = false; return; }
    if (Number.isFinite(slPct)) setSlPctInput(Math.abs(slPct).toFixed(1));
  }, [sl, price, side]);

  const strikeNum = parseFloat(strike) || price;
  const days = parseInt(expiry) || 7;
  const intrinsic = optType === "call" ? Math.max(0, price - strikeNum) : Math.max(0, strikeNum - price);
  const timeValue = price * 0.02 * Math.sqrt(days / 30);
  const modeledPremium = intrinsic + timeValue;
  // chainMatch is the single source of truth for "the" contract at the
  // current strike/type — it comes from the same getOptionChain() fetch
  // that populates Index.tsx's chain table (via selectedOption above), so
  // there's no separate selectedOption-vs-chain reconciliation needed.
  const chainMatch = chain.find(
    (c) => c.optionType === optType.toUpperCase() && Math.abs(parseFloat(c.strike) - strikeNum) < 0.000001
  );
  const activeOption = chainMatch ?? null;
  const optionPrice = chainMatch
    ? side === "buy" ? parseFloat(chainMatch.ask) : parseFloat(chainMatch.bid)
    : modeledPremium;
  const optionPriceType = chainMatch ? (side === "buy" ? "Ask" : "Bid") : "Est.";
  // Contracts sized off the dollar amount the user actually dialed in via
  // the shared Size box/slider (sizeUsd, same one spot/futures use) divided
  // by the per-contract cost — previously `sizePct / 10`, a flat formula
  // giving 0.1-10 contracts regardless of account balance, option price, or
  // strike, completely disconnected from what the user could actually
  // afford or what the engine would actually require.
  //
  // Buyer's per-contract cost is the premium itself (optionPrice). Writer
  // (seller) collateral is approximated here as the full cash-secured
  // strike*1 — the same conservative worst case the engine used before the
  // margin-floor model (risk.shortOptionMargin) landed. The floor model can
  // only *reduce* the writer's real requirement from that number depending
  // on live spot/premium the frontend doesn't replicate exactly, so sizing
  // off the conservative floor here never lets the size box promise more
  // contracts than the account can actually afford — it can only be
  // pleasantly surprised that less margin was actually locked.
  const perContractCost = side === "buy" ? optionPrice : strikeNum;
  const contracts = perContractCost > 0 ? sizeUsd / perContractCost : 0;
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
        description: "This market isn't live on the exchange yet — try BI2X-BI2XUSD, BTC-PERP, or ETH-PERP.",
      });
      return;
    }

    if (!marketMetadata) {
      toast.error("Market configuration unavailable", {
        description: "Order validation is waiting for the exchange market configuration. Please try again shortly.",
      });
      return;
    }

    // Was orderType.toUpperCase(), typed as plain `string` — TypeScript
    // couldn't narrow it to SubmitOrderParams' "LIMIT" | "MARKET" | ... union,
    // which is what made parentOrder below fail to type-check at its two
    // call sites. The ternary form (matching the equivalent cast already
    // used elsewhere in this file) keeps the literal type.
    const engineOrderType: "LIMIT" | "MARKET" = orderType === "market" ? "MARKET" : "LIMIT";
    const rawRequestedPrice = orderType === "market" ? price : Number(limitPrice);
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

    const isMarketExecution = orderType === "market";
    if (isFutures && isMarketExecution && leverage > 1 && !confirmedMarketOrder) {
      setMarketConfirmOpen(true);
      return;
    }

    // TP/SL is an optional attachment on top of a regular Market or Limit
    // entry, not a distinct order type on the engine — the entry order goes
    // in as whatever orderType the user actually picked, plus one real STOP
    // order per enabled leg, submitted on the *opposite* side and
    // reduce-only so it can only close the position it's protecting, never
    // open a new one. Previously (when TP/SL was its own tab) this branch
    // silently forced the entry to MARKET and could discard the targets
    // entirely on a plain submit — the position had zero actual protection
    // despite the UI implying otherwise.
    const hasTpsl = tpEnabled || slEnabled;
    const exitSide = side === "buy" ? "SELL" : "BUY";
    const futuresParams = isFutures
      ? { leverage, marginMode: marginMode.toUpperCase() as "ISOLATED" | "CROSS", ...(reduceOnly ? { reduceOnly: true } : {}) }
      : {};

    try {
      const parentOrder: SubmitOrderParams = {
        symbol: backendMarket.symbol,
        market: backendMarket.market,
        side: side === "buy" ? "BUY" : "SELL",
        type: engineOrderType,
        price: orderType === "market" ? undefined : requestedPrice.toFixed(tickDecimals),
        qty: positionSize.toFixed(quantityDecimals), account: "",
        ...(isMarketExecution && Number(slippageBps) >= 0 ? { slippageBps: Math.round(Number(slippageBps)) } : {}),
        ...futuresParams,
      };
      const res = hasTpsl
        ? await submitAttachedOrder(parentOrder,
            // Take-profit is a LIMIT leg (it closes at a favorable price the
            // market rises/falls TO, so it can rest as a normal resting
            // order), not a STOP — sending it as { type: "STOP", stopPrice }
            // with no price left the engine's take-profit query param
            // (tpPrice) always empty, so the leg was silently never created:
            // the order succeeded, the toast confirmed it, but no TP ever
            // existed. Stop-loss stays STOP (it closes only once the market
            // moves AGAINST the position past a trigger).
            // qty here is intentionally the parent's requested size, not a
            // placeholder (TRD-M2): the engine always re-sizes a TP/SL leg
            // to the entry's actual filled quantity (see attached.Group's
            // ProtectedQty) regardless of what's sent, but sending the real
            // requested size instead of a "0" stand-in keeps the wire
            // payload self-describing rather than silently-always-ignored.
            tpEnabled ? { ...parentOrder, side: exitSide, type: "LIMIT", price: tp } : undefined,
            slEnabled ? { ...parentOrder, side: exitSide, type: "STOP", stopPrice: sl } : undefined)
        : await orders.place(parentOrder);
      toast.success(`${side.toUpperCase()} ${orderType.toUpperCase()} placed`, {
        description: `Order ${res.orderId.slice(0, 8)} · status ${res.status} · filled ${res.filled}`,
      });

      // TRD-M1: a TP/SL leg can fail to place (e.g. the shared reservation
      // fails) while the entry itself still succeeds — the engine's response
      // only sets takeProfitId/stopLossId for legs that actually activated,
      // so an enabled-but-missing id here means silent, unprotected
      // exposure the success toast above would otherwise hide entirely.
      if (hasTpsl) {
        const missing: string[] = [];
        if (tpEnabled && !res.takeProfitId) missing.push("Take Profit");
        if (slEnabled && !res.stopLossId) missing.push("Stop Loss");
        if (missing.length > 0) {
          toast.warning(`${missing.join(" and ")} not attached`, {
            description: "The entry order placed, but the requested protection could not be set up. Add it manually from your open positions.",
          });
        }
      }
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
    setSizeInput((maxSpendable * (next / 100)).toFixed(isSpotSell ? 8 : 2));
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
    const usdnValue = clamp(numericValue, 0, maxSpendable);
    setSizeInput(usdnValue === numericValue ? value : usdnValue.toFixed(isSpotSell ? 8 : 2));
    setSizePct((usdnValue / maxSpendable) * 100);
  };
  const handleSizeBlur = () => {
    const numericValue = parseFloat(sizeInput);
    const usdnValue = Number.isFinite(numericValue)
      ? clamp(numericValue, 0, maxSpendable)
      : sizeUsd;
    setSizePct((usdnValue / maxSpendable) * 100);
    setSizeInput(usdnValue.toFixed(isSpotSell ? 8 : 2));
  };

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
          {/* Options tab HIDDEN (2026-09-17: same product decision as hiding
              the Forex/Commodity/Stocks market tabs — don't advertise
              unavailable markets). Trading remains disabled engine-side
              (/order rejects OPTIONS orders outright). To restore: re-add
              <TabsTrigger value="options" disabled ...>Options</TabsTrigger>
              and change this grid back to grid-cols-3. */}
          <TabsList className="grid grid-cols-2 h-8 bg-muted/30 w-full rounded-lg p-0.5">
            <TabsTrigger value="spot" className="h-7 text-xs font-semibold rounded-md">Spot</TabsTrigger>
            <TabsTrigger value="futures" className="h-7 text-xs font-semibold rounded-md">Futures</TabsTrigger>
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
            <TabsList className="grid grid-cols-2 h-8 bg-muted/30 w-full rounded-lg p-0.5">
              <TabsTrigger value="market" className="h-7 text-xs rounded-md">Market</TabsTrigger>
              <TabsTrigger value="limit" className="h-7 text-xs rounded-md">Limit</TabsTrigger>
              {/* "More" order types (OCO, Trailing Stop, TWAP, Iceberg) hidden — not wired up yet
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
              */}
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
              onFocus={() => { editedPriceRef.current = true; }}
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
            {orderType === "market" && (
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
            <span className="font-mono">
              {isOptions ? `${contracts.toFixed(2)} contracts` : `${positionSize.toFixed(quantityDecimals)} ${baseAsset}`}
            </span>
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

        {!isOptions && !isSpotSell && (
          <div className="space-y-1.5 pt-1.5 border-t border-border/50">
            <span className="text-xs font-semibold">TP/SL (optional)</span>
            {/* Last column widened from a fixed 48px to minmax(64px,auto):
                the percent box itself is 48px (w-12), but the +/- sign and
                "%" label sitting either side of it need room too, so a
                48px track was clipping the % label off the edge of the
                panel. The price column shrank slightly (0.8fr -> 0.7fr,
                88px -> 72px floor) to make room without widening the panel. */}
            <div className="grid grid-cols-[auto_1fr_minmax(72px,0.7fr)_minmax(64px,auto)] items-center gap-2">
              <input
                type="checkbox"
                checked={tpEnabled}
                onChange={e => setTpEnabled(e.target.checked)}
                className="h-3.5 w-3.5 shrink-0 accent-primary"
                aria-label="Enable take profit"
              />
              <span className="text-xs">Take Profit</span>
              <Input disabled={!tpEnabled} value={tp} onChange={e => setTp(e.target.value)}
                className="h-7 rounded-md font-mono text-xs text-buy px-2" />
              <div className="flex items-center gap-0.5">
                <span className="text-xs text-buy font-mono">+</span>
                <Input
                  disabled={!tpEnabled}
                  value={tpPctInput}
                  onChange={e => {
                    setTpPctInput(e.target.value);
                    const pct = parseFloat(e.target.value);
                    if (Number.isFinite(pct) && price > 0) {
                      editedTpPctRef.current = true;
                      setTp(percentToTpPrice(pct).toFixed(2));
                    }
                  }}
                  className="h-7 w-12 rounded-md font-mono text-xs text-buy px-1 text-right"
                  aria-label="Take profit percent"
                />
                <span className="text-xs text-buy font-mono">%</span>
              </div>
            </div>
            <div className="grid grid-cols-[auto_1fr_minmax(72px,0.7fr)_minmax(64px,auto)] items-center gap-2">
              <input
                type="checkbox"
                checked={slEnabled}
                onChange={e => setSlEnabled(e.target.checked)}
                className="h-3.5 w-3.5 shrink-0 accent-primary"
                aria-label="Enable stop loss"
              />
              <span className="text-xs">Stop Loss</span>
              <Input disabled={!slEnabled} value={sl} onChange={e => setSl(e.target.value)}
                className="h-7 rounded-md font-mono text-xs text-sell px-2" />
              <div className="flex items-center gap-0.5">
                <span className="text-xs text-sell font-mono">-</span>
                <Input
                  disabled={!slEnabled}
                  value={slPctInput}
                  onChange={e => {
                    setSlPctInput(e.target.value);
                    const pct = parseFloat(e.target.value);
                    if (Number.isFinite(pct) && price > 0) {
                      editedSlPctRef.current = true;
                      setSl(percentToSlPrice(pct).toFixed(2));
                    }
                  }}
                  className="h-7 w-12 rounded-md font-mono text-xs text-sell px-1 text-right"
                  aria-label="Stop loss percent"
                />
                <span className="text-xs text-sell font-mono">%</span>
              </div>
            </div>
          </div>
        )}

        {isOptions ? (
          <div className="glass-strong rounded-lg border border-border/50 px-3 py-1.5 space-y-0.5">
            <Row label="Type" value={`${optType.toUpperCase()} · ${expiry}`} />
            <Row label="Strike" value={`$${formatPrice(strikeNum)}`} />
            <Row label={`${optionPriceType} price`} value={`$${optionPrice.toFixed(2)}`} valueClass="text-primary" />
            {activeOption && (
              <>
                <Row label="Bid / Ask" value={`$${parseFloat(activeOption.bid).toFixed(2)} / $${parseFloat(activeOption.ask).toFixed(2)}`} />
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
                value={hasLiquidationRisk ? `$${formatPrice(liqPrice)}` : "No risk at 1x"}
                valueClass="text-warning"
              />
            )}
            <Row label="Fee" value={`$${fee.toFixed(2)}`} />
            {showRR && (
              <div className="border-t border-border/50 pt-0.5">
                <Row
                  label={<span className="flex items-center gap-1"><Calculator className="h-3 w-3" />R:R Ratio</span>}
                  value={`1 : ${rr}`}
                  valueClass="font-bold text-primary"
                />
              </div>
            )}
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
