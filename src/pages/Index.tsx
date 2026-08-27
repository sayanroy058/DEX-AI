import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { MarketList } from "@/components/trade/MarketList";
import { TradingChart } from "@/components/trade/TradingChart";
import { TradePanel, type MarketMode } from "@/components/trade/TradePanel";
import { PositionsPanel } from "@/components/trade/PositionsPanel";
import { MarketHeader } from "@/components/trade/MarketHeader";
import { useMarket, useMarkets } from "@/lib/useMarkets";
import { useLivePrice } from "@/lib/useLivePrice";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { PanelGroup, Panel, PanelResizeHandle, type ImperativePanelHandle } from "react-resizable-panels";
import { Calculator, GripVertical, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, BarChart2, BookOpen, ArrowLeftRight, List, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateOptionChain, formatCompact, formatPrice, OptionContract } from "@/lib/mockData";
import { backendMarketFor } from "@/lib/backendMarkets";
import { useOrderBook, useRecentTrades } from "@/lib/useOrderBook";
import { useOrders } from "@/lib/useOrders";
import { useAccount } from "@/lib/account";

// ─── Default sizes ────────────────────────────────────────────────────────────
const DEFAULT_COL_SIZES = [14, 66, 20];
const DEFAULT_CENTER_SIZES = [65, 35];
const COLLAPSED_LEFT_SIZE = 3;
const MINIMIZED_POSITIONS_SIZE = 3;

type PanelId = "marketList" | "chart" | "positions";

const PANEL_TITLES: Record<PanelId, string> = {
  marketList: "Markets",
  chart: "Chart",
  positions: "Positions",
};

// ─── DraggableCard ────────────────────────────────────────────────────────────
interface DraggableCardProps {
  id: PanelId;
  title: string;
  children: React.ReactNode;
  compact?: boolean;
  minimized?: boolean;
  onToggleMinimize?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  draggingId: PanelId | null;
  onDragStart: (id: PanelId) => void;
  onDragEnd: () => void;
  onDrop: (id: PanelId) => void;
}

function DraggableCard({
  id,
  title,
  children,
  compact = false,
  minimized = false,
  onToggleMinimize,
  collapsed = false,
  onToggleCollapse,
  draggingId,
  onDragStart,
  onDragEnd,
  onDrop,
}: DraggableCardProps) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={cn(
        "h-full flex flex-col rounded-xl overflow-hidden transition-all duration-150",
        over && draggingId !== id ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : "",
        draggingId === id ? "opacity-60" : "",
      )}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); onDrop(id); }}
    >
      <div
        draggable
        onDragStart={() => onDragStart(id)}
        onDragEnd={onDragEnd}
        className={cn(
          "h-5 glass-strong border-b border-border/40 flex items-center cursor-grab active:cursor-grabbing shrink-0 select-none",
          compact ? "justify-center px-0" : "px-2",
        )}
        title="Drag to swap panels"
      >
        <GripVertical className={cn("h-3 w-3 text-muted-foreground", !compact && "mr-1")} />
        {!compact && <span className="text-[9px] text-muted-foreground uppercase tracking-wide">{title}</span>}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleCollapse();
            }}
            className={cn(
              "p-0.5 rounded text-muted-foreground hover:bg-muted/30 hover:text-primary transition-colors",
              compact ? "ml-0" : "ml-auto",
            )}
            title={collapsed ? "Expand panel" : "Minimize panel"}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        )}
        {onToggleMinimize && !compact && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleMinimize();
            }}
            className="ml-auto p-0.5 rounded text-muted-foreground hover:bg-muted/30 hover:text-primary transition-colors"
            title={minimized ? "Restore panel" : "Minimize panel"}
          >
            {minimized ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      <div className={cn("relative flex-1 min-h-0", minimized && "hidden")}>
        <div className="absolute inset-0 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Right Column ─────────────────────────────────────────────────────────────
// Fully self-contained Trade + OrderBook column with smooth collapse animation.

interface OptionWorkspaceProps {
  symbol: string;
  price: number;
  contracts: OptionContract[];
  selectedOption: OptionContract | null;
  onSelectOption: (contract: OptionContract) => void;
}

function OptionWorkspace({ symbol, price, contracts, selectedOption, onSelectOption }: OptionWorkspaceProps) {
  return (
    <PanelGroup direction="horizontal" className="h-full min-h-0 overflow-hidden">
      <Panel defaultSize={50} minSize={35}>
        <div className="h-full min-h-0 pr-1">
          <TradingChart symbol={symbol} price={price} />
        </div>
      </Panel>
      <PanelResizeHandle className="w-2 flex items-center justify-center group cursor-col-resize">
        <div className="h-10 w-0.5 rounded bg-border/70 transition-colors group-hover:bg-primary group-active:bg-primary" />
      </PanelResizeHandle>
      <Panel defaultSize={50} minSize={30}>
        <div className="h-full min-h-0 pl-1">
          <OptionChainTable
            contracts={contracts}
            underlyingPrice={price}
            selectedOption={selectedOption}
            onSelectOption={onSelectOption}
          />
        </div>
      </Panel>
    </PanelGroup>
  );
}

function OptionChainTable({
  contracts,
  underlyingPrice,
  selectedOption,
  onSelectOption,
}: {
  contracts: OptionContract[];
  underlyingPrice: number;
  selectedOption: OptionContract | null;
  onSelectOption: (contract: OptionContract) => void;
}) {
  const lastUpdated = contracts[0]?.updatedAt
    ? new Date(contracts[0].updatedAt).toLocaleTimeString("en-US", { hour12: false })
    : "--:--:--";
  const expiries = Array.from(new Set(contracts.map(contract => contract.expiry)));
  const rows = expiries.flatMap(expiry => {
    const byStrike = new Map<number, { call?: OptionContract; put?: OptionContract }>();

    contracts
      .filter(contract => contract.expiry === expiry)
      .forEach(contract => {
        const pair = byStrike.get(contract.strike) ?? {};
        pair[contract.type] = contract;
        byStrike.set(contract.strike, pair);
      });

    return Array.from(byStrike.entries())
      .sort(([a], [b]) => a - b)
      .map(([strike, pair]) => ({ expiry, strike, ...pair }));
  });
  const priceLineIndex = rows.findIndex((row, index) => {
    const next = rows[index + 1];
    if (!next) return underlyingPrice <= row.strike;
    return underlyingPrice >= row.strike && underlyingPrice < next.strike;
  });

  const contractButtonClass = (contract?: OptionContract) => cn(
    "grid grid-cols-[0.85fr_0.8fr_0.85fr_0.95fr_0.85fr] gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
    contract ? "hover:bg-muted/40" : "pointer-events-none opacity-30",
    contract && selectedOption?.id === contract.id && "bg-primary/15 ring-1 ring-primary/40"
  );
  const changeClass = (contract?: OptionContract) => cn(
    "text-right font-mono text-[10px]",
    !contract ? "text-muted-foreground" : contract.change24h >= 0 ? "text-buy" : "text-sell"
  );

  return (
    <div className="glass rounded-b-xl rounded-t-none lg:rounded-xl flex h-full min-h-0 flex-col overflow-hidden border border-border/40 bg-card/70 dark:bg-card/30">
      <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide">Option Chain</div>
          <div className="text-[10px] text-muted-foreground">Live contracts</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground">Updated</div>
          <div className="font-mono text-[11px] text-primary">{lastUpdated}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden text-[10px]">
        <div>
          <div className="grid grid-cols-[minmax(0,1fr)_82px_minmax(0,1fr)] items-center border-b border-border/50 bg-muted/20 px-3 py-2 text-xs font-bold uppercase">
            <span className="text-buy">Calls</span>
            <span className="text-center text-muted-foreground">Strike</span>
            <span className="text-right text-sell">Puts</span>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_82px_minmax(0,1fr)] gap-2 border-b border-border/50 px-3 py-1.5 text-[9px] uppercase text-muted-foreground">
            <div className="grid grid-cols-[0.85fr_0.8fr_0.85fr_0.95fr_0.85fr] gap-2">
              <span className="text-right">Open</span>
              <span className="text-right">Delta</span>
              <span className="text-right">Bid</span>
              <span className="text-right">Mark</span>
              <span className="text-right">Ask</span>
            </div>
            <span className="text-center">Exp</span>
            <div className="grid grid-cols-[0.85fr_0.95fr_0.85fr_0.8fr_0.85fr] gap-2">
              <span className="text-right">Ask</span>
              <span className="text-right">Mark</span>
              <span className="text-right">Bid</span>
              <span className="text-right">Delta</span>
              <span className="text-right">Open</span>
            </div>
          </div>

          {rows.map((row, index) => {
            const call = row.call;
            const put = row.put;
            return (
              <div key={`${row.expiry}-${row.strike}`}>
                <div
                  className="grid grid-cols-[minmax(0,1fr)_82px_minmax(0,1fr)] items-stretch gap-2 border-b border-border/30 px-3 py-1.5 hover:bg-muted/20"
                >
                  <button
                    type="button"
                    disabled={!call}
                    onClick={() => call && onSelectOption(call)}
                    className={contractButtonClass(call)}
                  >
                    <span className="text-right font-mono text-muted-foreground">{call ? formatCompact(call.openInterest) : "--"}</span>
                    <span className="text-right font-mono text-muted-foreground">{call ? call.delta.toFixed(2) : "--"}</span>
                    <span className="text-right font-mono text-buy">{call ? call.bid.toFixed(2) : "--"}</span>
                    <span className="text-right font-mono text-primary">{call ? call.mark.toFixed(2) : "--"}</span>
                    <span className="text-right font-mono text-sell">{call ? call.ask.toFixed(2) : "--"}</span>
                    <span className="col-span-2 text-[9px] text-muted-foreground">IV {call ? call.iv.toFixed(1) : "--"}%</span>
                    <span className={cn("col-span-3", changeClass(call))}>{call ? `${call.change24h >= 0 ? "+" : ""}${call.change24h.toFixed(2)}%` : "--"}</span>
                  </button>

                  <div className="flex flex-col items-center justify-center rounded-md bg-muted/35 px-2 text-center">
                    <span className="font-mono text-sm font-bold">{formatPrice(row.strike)}</span>
                    <span className="text-[10px] text-muted-foreground">{row.expiry}</span>
                  </div>

                  <button
                    type="button"
                    disabled={!put}
                    onClick={() => put && onSelectOption(put)}
                    className={contractButtonClass(put)}
                  >
                    <span className="text-right font-mono text-sell">{put ? put.ask.toFixed(2) : "--"}</span>
                    <span className="text-right font-mono text-primary">{put ? put.mark.toFixed(2) : "--"}</span>
                    <span className="text-right font-mono text-buy">{put ? put.bid.toFixed(2) : "--"}</span>
                    <span className="text-right font-mono text-muted-foreground">{put ? put.delta.toFixed(2) : "--"}</span>
                    <span className="text-right font-mono text-muted-foreground">{put ? formatCompact(put.openInterest) : "--"}</span>
                    <span className="col-span-2 text-[9px] text-muted-foreground">IV {put ? put.iv.toFixed(1) : "--"}%</span>
                    <span className={cn("col-span-3", changeClass(put))}>{put ? `${put.change24h >= 0 ? "+" : ""}${put.change24h.toFixed(2)}%` : "--"}</span>
                  </button>
                </div>
                {index === priceLineIndex && (
                  <div className="relative h-0">
                    <div className="absolute inset-x-0 top-0 z-10 border-t border-primary/70" />
                    <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2 rounded border border-primary/60 bg-background px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground shadow-sm">
                      {formatPrice(underlyingPrice)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type CalculatorTab = "pnl" | "target" | "entry";
type CalculatorRow = { id: number; entry: string; qty: string };

function TradeCalculatorModal({
  symbol,
  baseAsset,
  quoteAsset,
  price,
  onClose,
}: {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<CalculatorTab>("pnl");
  const [side, setSide] = useState<"long" | "short">("long");
  const [leverage, setLeverage] = useState("10");
  const [entryPrice, setEntryPrice] = useState(price ? price.toFixed(2) : "");
  const [closePrice, setClosePrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [targetRoi, setTargetRoi] = useState("25");
  const [rows, setRows] = useState<CalculatorRow[]>([
    { id: 1, entry: price ? (price * 0.985).toFixed(2) : "", qty: "1" },
    { id: 2, entry: price ? (price * 1.005).toFixed(2) : "", qty: "0.5" },
  ]);

  const leverageNum = Math.max(parseFloat(leverage) || 1, 1);
  const entryNum = parseFloat(entryPrice) || 0;
  const closeNum = parseFloat(closePrice) || 0;
  const qtyNum = parseFloat(quantity) || 0;
  const sideSign = side === "long" ? 1 : -1;
  const notional = entryNum * qtyNum;
  const margin = notional / leverageNum;
  const pnl = entryNum && closeNum && qtyNum ? (closeNum - entryNum) * qtyNum * sideSign : 0;
  const pnlPct = entryNum && closeNum ? ((closeNum - entryNum) / entryNum) * 100 * sideSign : 0;
  const roi = margin ? (pnl / margin) * 100 : 0;
  const targetRoiNum = parseFloat(targetRoi) || 0;
  const targetMove = entryNum * (targetRoiNum / 100) / leverageNum;
  const targetPrice = entryNum ? entryNum + targetMove * sideSign : 0;
  const targetPnl = targetMove * qtyNum;
  const targetPnlPct = entryNum ? (targetMove / entryNum) * 100 : 0;
  const averageQty = rows.reduce((sum, row) => sum + (parseFloat(row.qty) || 0), 0);
  const averageNotional = rows.reduce((sum, row) => sum + ((parseFloat(row.entry) || 0) * (parseFloat(row.qty) || 0)), 0);
  const averageEntry = averageQty ? averageNotional / averageQty : 0;
  const maxPosition = 10_000_000 * leverageNum;

  const inputClass = "h-10 w-full rounded-md border border-border/50 bg-muted/35 px-3 font-mono text-sm font-bold text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary";
  const labelClass = "mb-1.5 flex items-center justify-between text-xs font-semibold text-muted-foreground";
  const resultValueClass = (value: number) => cn("font-mono text-sm font-bold", value >= 0 ? "text-buy" : "text-sell");

  const updateRow = (id: number, updates: Partial<CalculatorRow>) => {
    setRows(current => current.map(row => row.id === id ? { ...row, ...updates } : row));
  };
  const addRow = () => {
    setRows(current => [...current, { id: Math.max(...current.map(row => row.id), 0) + 1, entry: "", qty: "" }]);
  };
  const removeRow = (id: number) => {
    setRows(current => current.length === 1 ? current : current.filter(row => row.id !== id));
  };

  const renderResults = () => {
    if (tab === "target") {
      return (
        <>
          <ResultRow label="Target Price" value={`${targetPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${quoteAsset}`} valueClass="text-primary" />
          <ResultRow label="Profit/Loss" value={`${targetPnl.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${quoteAsset}`} valueClass={resultValueClass(targetPnl)} />
          <ResultRow label="Profit/Loss%" value={`${targetPnlPct.toFixed(2)}%`} valueClass={resultValueClass(targetPnl)} />
        </>
      );
    }

    return (
      <>
        <ResultRow label="Initial Margin" value={`${margin.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${quoteAsset}`} valueClass="text-primary" />
        <ResultRow label="Profit/Loss" value={`${pnl.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${quoteAsset}`} valueClass={resultValueClass(pnl)} />
        <ResultRow label="Profit/Loss%" value={`${pnlPct.toFixed(2)}%`} valueClass={resultValueClass(pnl)} />
        <ResultRow label="ROI" value={`${roi.toFixed(2)}%`} valueClass={resultValueClass(roi)} />
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm">
      <div className="glass-strong flex max-h-[84vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-primary/20 shadow-[0_0_44px_hsl(var(--primary)/0.12)] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border/35 px-4 py-3 md:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
              <Calculator className="h-3.5 w-3.5" />
            </div>
            <button type="button" className="flex min-w-0 items-center gap-2 text-left">
              <span className="truncate text-base font-black tracking-tight">{symbol.replace("-", "")}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            aria-label="Close calculator"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 md:px-5 md:py-5">
          <div className="mb-4 flex gap-6 border-b border-border/50">
            {[
              { id: "pnl", label: "Profit/Loss" },
              { id: "target", label: "Target Price" },
              { id: "entry", label: "Entry Price" },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id as CalculatorTab)}
                className={cn(
                  "relative pb-3 text-sm font-bold transition-colors md:text-base",
                  tab === item.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
                {tab === item.id && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.7)]" />}
              </button>
            ))}
          </div>

          {tab === "entry" ? (
            <div className="space-y-5">
              <SideSwitch side={side} onChange={setSide} />
              <div className="overflow-x-auto">
                <div className="min-w-[640px] space-y-2.5">
                  <div className="grid grid-cols-[64px_1fr_1fr_104px] items-center gap-3 px-2 text-xs font-bold text-muted-foreground">
                    <span className="text-center">Open</span>
                    <span className="text-center">Entry Price({quoteAsset})</span>
                    <span className="text-center">Filled Qty({baseAsset})</span>
                    <span className="text-center">Action</span>
                  </div>
                  {rows.map((row, index) => (
                    <div key={row.id} className="grid grid-cols-[64px_1fr_1fr_104px] items-center gap-3">
                      <div className="text-center text-sm font-bold text-muted-foreground">{index + 1}</div>
                      <input
                        value={row.entry}
                        onChange={event => updateRow(row.id, { entry: event.target.value })}
                        inputMode="decimal"
                        className={cn(inputClass, "text-center")}
                      />
                      <input
                        value={row.qty}
                        onChange={event => updateRow(row.id, { qty: event.target.value })}
                        inputMode="decimal"
                        className={cn(inputClass, "text-center")}
                      />
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateRow(row.id, { entry: price.toFixed(2) })}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
                          aria-label={`Use current price for row ${index + 1}`}
                        >
                          <Calculator className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sell/15 hover:text-sell"
                          aria-label={`Remove row ${index + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button type="button" onClick={addRow} className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:text-primary/80">
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
              <div className="rounded-md border border-border/40 bg-muted/30 px-3 py-3 text-center text-sm font-bold">
                Average Entry Price: <span className="font-mono text-primary">{averageEntry.toLocaleString(undefined, { maximumFractionDigits: 2 })} {quoteAsset}</span>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-3.5">
                <SideSwitch side={side} onChange={setSide} />

                <div>
                  <div className={labelClass}>Leverage</div>
                  <div className="relative">
                    <input value={leverage} onChange={event => setLeverage(event.target.value)} inputMode="decimal" className={cn(inputClass, "pr-12")} />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base font-bold">x</span>
                  </div>
                  <div className="mt-1.5 text-xs font-semibold text-primary">Max Position at Current Leverage {maxPosition.toLocaleString()} {quoteAsset}</div>
                </div>

                <div>
                  <div className={labelClass}>
                    <span>Entry Price</span>
                    <span>Price: <span className="font-mono text-foreground">{price ? price.toFixed(2) : "--"}</span></span>
                  </div>
                  <div className="relative">
                    <input value={entryPrice} onChange={event => setEntryPrice(event.target.value)} placeholder="Enter Price" inputMode="decimal" className={cn(inputClass, "pr-24")} />
                    <button type="button" onClick={() => setEntryPrice(price.toFixed(2))} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-primary hover:text-primary/80">Last</button>
                  </div>
                </div>

                {tab === "pnl" ? (
                  <div>
                    <div className={labelClass}>Close Price</div>
                    <input value={closePrice} onChange={event => setClosePrice(event.target.value)} placeholder="Enter Price" inputMode="decimal" className={inputClass} />
                  </div>
                ) : (
                  <div>
                    <div className={labelClass}>ROI</div>
                    <div className="relative">
                      <input value={targetRoi} onChange={event => setTargetRoi(event.target.value)} placeholder="Enter ROI" inputMode="decimal" className={cn(inputClass, "pr-12")} />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base font-bold">%</span>
                    </div>
                  </div>
                )}

                <div>
                  <div className={labelClass}>
                    <span>Qty</span>
                    <span>Position: --</span>
                  </div>
                  <div className="relative">
                    <input value={quantity} onChange={event => setQuantity(event.target.value)} placeholder="Enter Quantity" inputMode="decimal" className={cn(inputClass, "pr-20")} />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold">{baseAsset}</span>
                  </div>
                  <div className="mt-1.5 text-xs font-semibold text-primary">Max Qty. at Current Leverage {(maxPosition / Math.max(entryNum || price || 1, 1)).toLocaleString(undefined, { maximumFractionDigits: 4 })} {baseAsset}</div>
                </div>
              </div>

              <div className="rounded-lg border border-border/40 bg-muted/35 p-4">
                <div className="mb-5 flex items-center gap-2 text-base font-black">Results <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[10px] text-primary">i</span></div>
                <div className="space-y-4">{renderResults()}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SideSwitch({ side, onChange }: { side: "long" | "short"; onChange: (side: "long" | "short") => void }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-lg bg-muted/35 p-1">
      <button
        type="button"
        onClick={() => onChange("long")}
        className={cn("h-9 rounded-md text-sm font-bold transition-colors", side === "long" ? "bg-buy text-buy-foreground shadow-glow-buy" : "text-muted-foreground hover:text-foreground")}
      >
        Long
      </button>
      <button
        type="button"
        onClick={() => onChange("short")}
        className={cn("h-9 rounded-md text-sm font-bold transition-colors", side === "short" ? "bg-sell text-sell-foreground shadow-glow-sell" : "text-muted-foreground hover:text-foreground")}
      >
        Short
      </button>
    </div>
  );
}

function ResultRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-bold text-muted-foreground">{label}</span>
      <span className={cn("text-right font-mono text-sm font-bold", valueClass)}>{value}</span>
    </div>
  );
}

interface RightColumnProps {
  symbol: string;
  price: number;
  selectedOption?: OptionContract | null;
  onTradeModeChange?: (mode: MarketMode) => void;
  orders: ReturnType<typeof useOrders>;
}

function RightColumn({ symbol, price, selectedOption, onTradeModeChange, orders }: RightColumnProps) {
  const [obOpen, setObOpen] = useState(true);
  const [tab, setTab] = useState<"book" | "trades">("book");
  const backendMarket = backendMarketFor(symbol);

  // Order book / trades: real depth for backend-registered pairs only. This
  // used to fall back to a fabricated order book (generateOrderBook) and
  // trade tape (generateTrade) for every other symbol, labeled "Simulated"
  // — technically honest about the label, but still showed fake price
  // levels and fake fills a user could act on. Now there's simply nothing
  // to show for those symbols; see the "not available" panel below instead
  // of rendering fake rows.
  const liveBook = useOrderBook(backendMarket?.symbol ?? "", backendMarket?.market ?? "", 14);
  const liveTrades = useRecentTrades(backendMarket?.symbol ?? "", backendMarket?.market ?? "", 30);

  const book = backendMarket ? liveBook : { bids: [], asks: [] };
  const trades = backendMarket ? liveTrades : [];

  const maxBidTotal = Math.max(...book.bids.map(b => b.total), 1);
  const maxAskTotal = Math.max(...book.asks.map(a => a.total), 1);
  const spread = (book.asks[0]?.price ?? 0) - (book.bids[0]?.price ?? 0);
  const spreadPct = price > 0 ? (spread / price) * 100 : 0;

  return (
    <div className="h-full flex flex-col gap-2 min-h-0">

      {/* ── Trade Panel ── always present, expands when OB collapses ── */}
      <div className={cn(
        "glass rounded-xl flex flex-col transition-all duration-300 ease-in-out min-h-0",
        obOpen ? "flex-[3]" : "flex-1",
      )}>
        <div className="flex-1 overflow-y-auto min-h-0">
          <TradePanel
            symbol={symbol}
            price={price}
            selectedOption={selectedOption}
            onModeChange={onTradeModeChange}
            orders={orders}
          />
        </div>
      </div>

      {/* ── Order Book + Trades ── slides down / up ── */}
      <div className={cn(
        "glass rounded-xl flex flex-col overflow-hidden shrink-0 transition-all duration-300 ease-in-out",
        obOpen ? "flex-[2] min-h-0" : "",
      )}>
        {/* Sticky header — always visible */}
        <div className="flex items-center border-b border-border/50 shrink-0 bg-background/20">
          <button
            onClick={() => setTab("book")}
            className={cn(
              "flex-1 px-3 py-2.5 text-xs font-semibold transition-colors",
              tab === "book"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Order Book
          </button>
          <button
            onClick={() => setTab("trades")}
            className={cn(
              "flex-1 px-3 py-2.5 text-xs font-semibold transition-colors",
              tab === "trades"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Trades
          </button>
          {/* Live badge only — there's no longer a "Simulated" state to
              label; a market with no backend order book shows the "not
              available" panel below instead of fake data with a badge. */}
          {backendMarket && (
            <span
              className="mx-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide shrink-0 bg-emerald-500/15 text-emerald-400"
              title="Live order book and trades from the exchange"
            >
              Live
            </span>
          )}
          {/* Collapse / expand toggle */}
          <button
            onClick={() => setObOpen(o => !o)}
            className="px-2.5 py-2.5 text-muted-foreground hover:text-primary transition-colors"
            title={obOpen ? "Collapse" : "Expand"}
          >
            {obOpen
              ? <ChevronDown className="h-3.5 w-3.5" />
              : <ChevronUp className="h-3.5 w-3.5" />
            }
          </button>
        </div>

        {/* Collapsible content — slides in/out via max-height */}
        <div
          className="flex-1 flex flex-col min-h-0 overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out"
          style={{
            maxHeight: obOpen ? "2000px" : "0px",
            opacity: obOpen ? 1 : 0,
          }}
        >
          {!backendMarket ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-1 py-10 text-center text-xs text-muted-foreground">
              <span className="text-sm font-semibold text-foreground">Trading not available</span>
              <span>This market isn't live on the exchange yet.</span>
            </div>
          ) : tab === "book" ? (
            <div className="flex-1 flex flex-col text-[10px] font-mono overflow-hidden min-h-0">
              {/* Column headers */}
              <div className="grid grid-cols-3 gap-1 px-2 py-1 text-[9px] text-muted-foreground uppercase border-b border-border/50 shrink-0">
                <span>Price</span>
                <span className="text-right">Size</span>
                <span className="text-right">Total</span>
              </div>

              {/* Asks — rendered bottom-up */}
              <div className="flex-1 flex flex-col-reverse overflow-hidden min-h-0">
                {book.asks.slice(0, 10).map((a, i) => {
                  const depthPct = (a.total / maxAskTotal) * 100;
                  return (
                    <div key={i} className="relative grid grid-cols-3 gap-1 px-2 flex-1 items-center hover:bg-muted/20 cursor-pointer">
                      <div className="absolute inset-y-0 right-0 pointer-events-none"
                        style={{ width: `${depthPct}%`, background: "linear-gradient(to left, hsl(var(--sell)/0.45), hsl(var(--sell)/0.05))" }} />
                      <span className="relative text-sell">{formatPrice(a.price)}</span>
                      <span className="relative text-right">{a.size.toFixed(3)}</span>
                      <span className="relative text-right text-muted-foreground">{a.total.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Spread row */}
              <div className="px-2 py-1 border-y border-border/50 flex items-center justify-between bg-muted/20 shrink-0">
                <span className="text-primary font-bold text-sm font-mono neon-text">{formatPrice(price)}</span>
                <span className="text-muted-foreground text-[9px]">Spread {spreadPct.toFixed(3)}%</span>
              </div>

              {/* Bids */}
              <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                {book.bids.slice(0, 10).map((b, i) => {
                  const depthPct = (b.total / maxBidTotal) * 100;
                  return (
                    <div key={i} className="relative grid grid-cols-3 gap-1 px-2 flex-1 items-center hover:bg-muted/20 cursor-pointer">
                      <div className="absolute inset-y-0 right-0 pointer-events-none"
                        style={{ width: `${depthPct}%`, background: "linear-gradient(to left, hsl(var(--buy)/0.45), hsl(var(--buy)/0.05))" }} />
                      <span className="relative text-buy">{formatPrice(b.price)}</span>
                      <span className="relative text-right">{b.size.toFixed(3)}</span>
                      <span className="relative text-right text-muted-foreground">{b.total.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col text-[11px] font-mono overflow-hidden min-h-0">
              <div className="grid grid-cols-3 gap-1 px-2 py-1 text-[9px] text-muted-foreground uppercase border-b border-border/50 shrink-0">
                <span>Price</span>
                <span className="text-right">Size</span>
                <span className="text-right">Time</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {trades.map(t => (
                  <div key={t.id} className="grid grid-cols-3 gap-1 px-2 py-0.5 hover:bg-muted/20">
                    <span className={t.side === "buy" ? "text-buy" : "text-sell"}>{formatPrice(t.price)}</span>
                    <span className="text-right">{t.size.toFixed(3)}</span>
                    <span className="text-right text-muted-foreground">
                      {new Date(t.time).toLocaleTimeString("en-US", { hour12: false })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const Index = () => {
  const [symbol, setSymbol] = useState("BTC-USDT");
  const [collapsed, setCollapsed] = useState(false);
  const account = useAccount();
  const orders = useOrders(account);
  const market = useMarket(symbol);
  const markets = useMarkets();
  // Real index price (crypto, live) when available, mock simulator
  // otherwise — same priority MarketHeader uses, via the shared hook, so
  // the order panel's default price/liquidation preview/chart can't show a
  // different number than the header does. Previously this read
  // market.price directly, so the header showed a real price like $79,602
  // while the order entry panel below it defaulted to a stale mock value.
  const price = useLivePrice(symbol);
  const isMobile = useIsMobile();
  // Options execution is hidden from this delivery (plan.md 5.1): the
  // option workspace previously rendered here called generateOptionChain()
  // (fabricated contracts) while the real order-entry panel called the
  // backend's actual option chain — two disagreeing sources for "the"
  // option chain. optionLayoutActive is now hardcoded false so neither the
  // mock chain nor the OptionWorkspace UI can activate; the underlying
  // market-category/tradeMode plumbing is left in place, unused, so this is
  // a one-line, easily-revertible gate rather than a structural rewrite,
  // per plan.md 5.1 item 3 ("preserve the existing code without extending
  // it; revisit with a dedicated options specification").
  const isOptionsMarket = market?.category === "options";
  const [tradeMode, setTradeMode] = useState<MarketMode>("spot");
  const optionLayoutActive = false;
  const optionContracts = useMemo(
    () => optionLayoutActive ? generateOptionChain(symbol, price) : [],
    [optionLayoutActive, symbol, price]
  );
  const [selectedOption, setSelectedOption] = useState<OptionContract | null>(null);

  const [slots, setSlots] = useState<[PanelId, PanelId, PanelId]>(["marketList", "chart", "positions"]);
  const leftPanelSizeRef = useRef(DEFAULT_COL_SIZES[0]);
  const positionsPanelSizeRef = useRef(DEFAULT_CENTER_SIZES[1]);

  const leftPanelRef  = useRef<ImperativePanelHandle>(null);
  const centerPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef  = useRef<ImperativePanelHandle>(null);
  const chartPanelRef  = useRef<ImperativePanelHandle>(null);
  const posPanelRef    = useRef<ImperativePanelHandle>(null);

  const [draggingId, setDraggingId] = useState<PanelId | null>(null);
  const [positionsMinimized, setPositionsMinimized] = useState(false);

  useEffect(() => {
    if (isOptionsMarket) setTradeMode("options");
  }, [isOptionsMarket, symbol]);

  useEffect(() => {
    if (optionLayoutActive) setCollapsed(true);
  }, [optionLayoutActive, symbol]);

  useEffect(() => {
    if (!optionLayoutActive) {
      setSelectedOption(null);
      return;
    }

    setSelectedOption(current => {
      const next = current
        ? optionContracts.find(contract => contract.id === current.id)
        : optionContracts.find(contract => contract.type === "call" && Math.abs(contract.strike - price) === Math.min(...optionContracts.filter(c => c.type === "call").map(c => Math.abs(c.strike - price))));
      return next ?? optionContracts[0] ?? null;
    });
  }, [optionLayoutActive, optionContracts, price]);

  const handleDrop = useCallback((targetId: PanelId) => {
    if (!draggingId || draggingId === targetId) return;
    setSlots(prev => {
      const next = [...prev] as typeof prev;
      const fi = next.indexOf(draggingId);
      const ti = next.indexOf(targetId);
      if (fi !== -1 && ti !== -1) [next[fi], next[ti]] = [next[ti], next[fi]];
      return next;
    });
  }, [draggingId]);

  const [calcOpen, setCalcOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"chart" | "trade" | "markets" | "positions">("chart");

  useEffect(() => {
    const panel = leftPanelRef.current;
    if (!panel) return;

    if (collapsed) {
      const currentSize = panel.getSize?.();
      if (typeof currentSize === "number" && Number.isFinite(currentSize)) {
        leftPanelSizeRef.current = currentSize;
      }
      panel.resize(COLLAPSED_LEFT_SIZE);
      return;
    }

    panel.resize(leftPanelSizeRef.current || DEFAULT_COL_SIZES[0]);
  }, [collapsed]);

  const cardProps = {
    draggingId,
    onDragStart: (id: PanelId) => setDraggingId(id),
    onDragEnd: () => setDraggingId(null),
    onDrop: handleDrop,
  };

  const togglePositionsMinimized = useCallback(() => {
    const posPanel = posPanelRef.current;
    if (!posPanel) return;

    setPositionsMinimized(prev => {
      if (prev) {
        posPanel.resize(positionsPanelSizeRef.current || DEFAULT_CENTER_SIZES[1]);
        return false;
      }

      const currentSize = posPanel.getSize?.();
      if (typeof currentSize === "number" && Number.isFinite(currentSize) && currentSize > MINIMIZED_POSITIONS_SIZE) {
        positionsPanelSizeRef.current = currentSize;
      }
      posPanel.resize(MINIMIZED_POSITIONS_SIZE);
      return true;
    });
  }, []);

  const resetLayout = useCallback(() => {
    setSlots(["marketList", "chart", "positions"]);
    setCollapsed(false);
    setPositionsMinimized(false);
    leftPanelSizeRef.current = DEFAULT_COL_SIZES[0];
    positionsPanelSizeRef.current = DEFAULT_CENTER_SIZES[1];
    leftPanelRef.current?.resize?.(DEFAULT_COL_SIZES[0]);
    centerPanelRef.current?.resize?.(DEFAULT_COL_SIZES[1]);
    rightPanelRef.current?.resize?.(DEFAULT_COL_SIZES[2]);
    chartPanelRef.current?.resize?.(DEFAULT_CENTER_SIZES[0]);
    posPanelRef.current?.resize?.(DEFAULT_CENTER_SIZES[1]);
  }, []);

  function renderContent(id: PanelId) {
    switch (id) {
      case "marketList":
        return <MarketList activeSymbol={symbol} onSelect={setSymbol} collapsed={collapsed} onToggleCollapse={() => setCollapsed(c => !c)} />;
      case "chart":
        return optionLayoutActive ? (
          <OptionWorkspace
            symbol={symbol}
            price={price}
            contracts={optionContracts}
            selectedOption={selectedOption}
            onSelectOption={setSelectedOption}
          />
        ) : (
          <TradingChart symbol={symbol} price={price} />
        );
      case "positions":
        return <PositionsPanel markets={markets} account={account} orders={orders} />;
    }
  }

  return (
    <AppShell>
      <div className="h-[calc(100vh-3.5rem)] flex flex-col gap-2 p-2 overflow-hidden">

        {/* Top bar */}
        <MarketHeader
          symbol={symbol}
          calculatorOpen={calcOpen}
          onToggleCalculator={() => setCalcOpen(o => !o)}
          onResetLayout={resetLayout}
        />

        {/* Trade Calculator panel */}
        {calcOpen && (
          <TradeCalculatorModal
            symbol={symbol}
            baseAsset={market?.base ?? symbol.split("-")[0] ?? "BTC"}
            quoteAsset={market?.quote ?? "USDT"}
            price={price}
            onClose={() => setCalcOpen(false)}
          />
        )}

        {/* Main panel grid — Desktop */}
        {!isMobile && (
        <PanelGroup direction="horizontal" className="flex-1 min-h-0">

          {/* Left — Market List */}
          <Panel ref={leftPanelRef} defaultSize={DEFAULT_COL_SIZES[0]} minSize={3} maxSize={35}>
            <DraggableCard
              id={slots[0]}
              title={PANEL_TITLES[slots[0]]}
              compact={collapsed && slots[0] === "marketList"}
              collapsed={collapsed}
              onToggleCollapse={slots[0] === "marketList" ? () => setCollapsed(c => !c) : undefined}
              {...cardProps}
            >
              {renderContent(slots[0])}
            </DraggableCard>
          </Panel>

          <PanelResizeHandle className="w-1.5 flex items-center justify-center group cursor-col-resize">
            <div className="w-0.5 h-8 bg-border/50 rounded group-hover:bg-primary/50 group-active:bg-primary transition-colors" />
          </PanelResizeHandle>

          {/* Center — Chart + Positions */}
          <Panel ref={centerPanelRef} defaultSize={DEFAULT_COL_SIZES[1]} minSize={25}>
            <PanelGroup direction="vertical" className="h-full">
              <Panel ref={chartPanelRef} defaultSize={DEFAULT_CENTER_SIZES[0]} minSize={25}>
                <DraggableCard id={slots[1]} title={PANEL_TITLES[slots[1]]} {...cardProps}>
                  {renderContent(slots[1])}
                </DraggableCard>
              </Panel>
              <PanelResizeHandle className="h-1.5 flex items-center justify-center group cursor-row-resize hidden lg:flex">
                <div className="h-0.5 w-8 bg-border/50 rounded group-hover:bg-primary/50 group-active:bg-primary transition-colors" />
              </PanelResizeHandle>
              <Panel ref={posPanelRef} defaultSize={DEFAULT_CENTER_SIZES[1]} minSize={MINIMIZED_POSITIONS_SIZE} className="hidden lg:block">
                <DraggableCard
                  id={slots[2]}
                  title={PANEL_TITLES[slots[2]]}
                  minimized={positionsMinimized}
                  onToggleMinimize={slots[2] === "positions" ? togglePositionsMinimized : undefined}
                  {...cardProps}
                >
                  {renderContent(slots[2])}
                </DraggableCard>
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-1.5 flex items-center justify-center group cursor-col-resize">
            <div className="w-0.5 h-8 bg-border/50 rounded group-hover:bg-primary/50 group-active:bg-primary transition-colors" />
          </PanelResizeHandle>

          {/* Right — Trade + OrderBook (fully custom, self-contained) */}
          <Panel ref={rightPanelRef} defaultSize={DEFAULT_COL_SIZES[2]} minSize={14} maxSize={32}>
            <RightColumn
              symbol={symbol}
              price={price}
              selectedOption={selectedOption}
              onTradeModeChange={setTradeMode}
              orders={orders}
            />
          </Panel>

        </PanelGroup>
        )}

        {/* Mobile layout — tabs */}
        {isMobile && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Tab content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {mobileTab === "markets" && (
                <div className="h-full glass rounded-xl overflow-hidden">
                  <MarketList activeSymbol={symbol} onSelect={(s) => { setSymbol(s); setMobileTab("chart"); }} collapsed={false} onToggleCollapse={() => {}} />
                </div>
              )}
              {mobileTab === "chart" && (
                <div className="h-full glass rounded-xl overflow-hidden">
                  {optionLayoutActive ? (
                    <OptionWorkspace
                      symbol={symbol}
                      price={price}
                      contracts={optionContracts}
                      selectedOption={selectedOption}
                      onSelectOption={setSelectedOption}
                    />
                  ) : (
                    <TradingChart symbol={symbol} price={price} />
                  )}
                </div>
              )}
              {mobileTab === "trade" && (
                <div className="h-full glass rounded-xl overflow-y-auto">
                  <RightColumn
                    symbol={symbol}
                    price={price}
                    selectedOption={selectedOption}
                    onTradeModeChange={setTradeMode}
                    orders={orders}
                  />
                </div>
              )}
              {mobileTab === "positions" && (
                <div className="h-full glass rounded-xl overflow-hidden">
                  <PositionsPanel markets={markets} account={account} orders={orders} />
                </div>
              )}
            </div>

            {/* Bottom tab bar */}
            <div className="shrink-0 grid grid-cols-4 gap-1 pt-1.5">
              {([
                { id: "markets", label: "Markets", icon: List },
                { id: "chart", label: "Chart", icon: BarChart2 },
                { id: "trade", label: "Trade", icon: ArrowLeftRight },
                { id: "positions", label: "Positions", icon: BookOpen },
              ] as const).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setMobileTab(id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg text-[10px] font-semibold transition-colors",
                    mobileTab === id
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "text-muted-foreground hover:text-foreground glass"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default Index;
