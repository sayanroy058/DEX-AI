import { useState, useCallback, useRef, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { MarketList } from "@/components/trade/MarketList";
import { TradingChart } from "@/components/trade/TradingChart";
import { TradePanel } from "@/components/trade/TradePanel";
import { PositionsPanel } from "@/components/trade/PositionsPanel";
import { MarketHeader } from "@/components/trade/MarketHeader";
import { useMarket, useMarkets } from "@/lib/useMarkets";
import { cn } from "@/lib/utils";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { Calculator, GripVertical, ChevronUp, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateOrderBook, generateTrade, formatPrice, Trade } from "@/lib/mockData";

// ─── Default sizes ────────────────────────────────────────────────────────────
const DEFAULT_COL_SIZES = [18, 52, 30];
const DEFAULT_CENTER_SIZES = [65, 35];
const COLLAPSED_LEFT_SIZE = 5;

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
  draggingId: PanelId | null;
  onDragStart: (id: PanelId) => void;
  onDragEnd: () => void;
  onDrop: (id: PanelId) => void;
}

function DraggableCard({ id, title, children, draggingId, onDragStart, onDragEnd, onDrop }: DraggableCardProps) {
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
        className="h-5 glass-strong border-b border-border/40 flex items-center px-2 cursor-grab active:cursor-grabbing shrink-0 select-none"
        title="Drag to swap panels"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground mr-1" />
        <span className="text-[9px] text-muted-foreground uppercase tracking-wide">{title}</span>
      </div>
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-0 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Right Column ─────────────────────────────────────────────────────────────
// Fully self-contained Trade + OrderBook column with smooth collapse animation.

interface RightColumnProps {
  symbol: string;
  price: number;
}

function RightColumn({ symbol, price }: RightColumnProps) {
  const [obOpen, setObOpen] = useState(true);
  const [tab, setTab] = useState<"book" | "trades">("book");

  // Order book data
  const [book, setBook] = useState(() => generateOrderBook(price));
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    const id = setInterval(() => setBook(generateOrderBook(price)), 1200);
    return () => clearInterval(id);
  }, [price]);

  useEffect(() => {
    const id = setInterval(() => setTrades(prev => [generateTrade(price), ...prev].slice(0, 30)), 800);
    return () => clearInterval(id);
  }, [price]);

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
          <TradePanel symbol={symbol} price={price} />
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
          {tab === "book" ? (
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
  const [symbol, setSymbol] = useState("BTC-PERP");
  const [collapsed, setCollapsed] = useState(false);
  const market = useMarket(symbol);
  const markets = useMarkets();
  const price = market?.price ?? 0;

  const [slots, setSlots] = useState<[PanelId, PanelId, PanelId]>(["marketList", "chart", "positions"]);
  const leftPanelSizeRef = useRef(DEFAULT_COL_SIZES[0]);

  const leftPanelRef  = useRef<any>(null);
  const centerPanelRef = useRef<any>(null);
  const rightPanelRef  = useRef<any>(null);
  const chartPanelRef  = useRef<any>(null);
  const posPanelRef    = useRef<any>(null);

  const [draggingId, setDraggingId] = useState<PanelId | null>(null);

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
  const [calcEntry, setCalcEntry] = useState("");
  const [calcLev, setCalcLev] = useState(10);
  const [calcSize, setCalcSize] = useState(1000);
  const [calcSide, setCalcSide] = useState<"long" | "short">("long");
  const calcLiq = calcEntry
    ? calcSide === "long"
      ? parseFloat(calcEntry) * (1 - 0.95 / calcLev)
      : parseFloat(calcEntry) * (1 + 0.95 / calcLev)
    : 0;
  const calcMargin = calcSize / calcLev;
  const calcRisk = calcMargin * 0.95;

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

  function renderContent(id: PanelId) {
    switch (id) {
      case "marketList":
        return <MarketList activeSymbol={symbol} onSelect={setSymbol} collapsed={collapsed} onToggleCollapse={() => setCollapsed(c => !c)} />;
      case "chart":
        return <TradingChart symbol={symbol} price={price} />;
      case "positions":
        return <PositionsPanel markets={markets} />;
    }
  }

  return (
    <AppShell>
      <div className="h-[calc(100vh-3.5rem)] flex flex-col gap-2 p-2 overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex-1 min-w-0">
            <MarketHeader symbol={symbol} collapsed={collapsed} onToggleCollapse={() => setCollapsed(c => !c)} />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCalcOpen(o => !o)}
            className="glass border-primary/30 text-primary hover:bg-primary/10 hover:text-primary h-8 px-2.5 shrink-0"
            title="Trade Calculator & Risk Management"
          >
            <Calculator className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-xs">Calculator</span>
          </Button>
        </div>

        {/* Trade Calculator panel */}
        {calcOpen && (
          <div className="glass-strong rounded-xl border border-primary/20 px-4 py-3 shrink-0 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" /> Trade Calculator & Risk Management</span>
              <button onClick={() => setCalcOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-muted-foreground uppercase tracking-wide text-[10px]">Side</label>
                <div className="flex gap-1">
                  <button onClick={() => setCalcSide("long")} className={`flex-1 py-1 rounded text-[10px] font-bold transition-colors ${calcSide === "long" ? "bg-buy/20 text-buy border border-buy/40" : "glass text-muted-foreground"}`}>Long</button>
                  <button onClick={() => setCalcSide("short")} className={`flex-1 py-1 rounded text-[10px] font-bold transition-colors ${calcSide === "short" ? "bg-sell/20 text-sell border border-sell/40" : "glass text-muted-foreground"}`}>Short</button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground uppercase tracking-wide text-[10px]">Entry Price</label>
                <input
                  type="number"
                  value={calcEntry}
                  onChange={e => setCalcEntry(e.target.value)}
                  placeholder={price.toFixed(2)}
                  className="w-full bg-muted/30 rounded px-2 py-1.5 text-xs border border-border/50 focus:border-primary/50 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground uppercase tracking-wide text-[10px]">Position Size ($)</label>
                <input
                  type="number"
                  value={calcSize}
                  onChange={e => setCalcSize(Number(e.target.value))}
                  className="w-full bg-muted/30 rounded px-2 py-1.5 text-xs border border-border/50 focus:border-primary/50 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground uppercase tracking-wide text-[10px]">Leverage</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={calcLev}
                    onChange={e => setCalcLev(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="font-bold text-primary w-12 text-right">{calcLev}x</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground uppercase tracking-wide text-[10px]">Required Margin</label>
                <div className="glass rounded px-2 py-1.5 font-mono font-bold text-primary">${calcMargin.toFixed(2)}</div>
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground uppercase tracking-wide text-[10px]">Liq. Price</label>
                <div className={`glass rounded px-2 py-1.5 font-mono font-bold ${calcSide === "long" ? "text-sell" : "text-buy"}`}>
                  {calcEntry ? `$${calcLiq.toFixed(2)}` : "—"}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground uppercase tracking-wide text-[10px]">Max Risk</label>
                <div className="glass rounded px-2 py-1.5 font-mono font-bold text-sell">${calcRisk.toFixed(2)}</div>
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground uppercase tracking-wide text-[10px]">Notional Value</label>
                <div className="glass rounded px-2 py-1.5 font-mono font-bold">${calcSize.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {/* Main panel grid */}
        <PanelGroup direction="horizontal" className="flex-1 min-h-0">

          {/* Left — Market List */}
          <Panel ref={leftPanelRef} defaultSize={DEFAULT_COL_SIZES[0]} minSize={5} maxSize={35}>
            <DraggableCard id={slots[0]} title={PANEL_TITLES[slots[0]]} {...cardProps}>
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
              <Panel ref={posPanelRef} defaultSize={DEFAULT_CENTER_SIZES[1]} minSize={15} className="hidden lg:block">
                <DraggableCard id={slots[2]} title={PANEL_TITLES[slots[2]]} {...cardProps}>
                  {renderContent(slots[2])}
                </DraggableCard>
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-1.5 flex items-center justify-center group cursor-col-resize">
            <div className="w-0.5 h-8 bg-border/50 rounded group-hover:bg-primary/50 group-active:bg-primary transition-colors" />
          </PanelResizeHandle>

          {/* Right — Trade + OrderBook (fully custom, self-contained) */}
          <Panel ref={rightPanelRef} defaultSize={DEFAULT_COL_SIZES[2]} minSize={18} maxSize={45}>
            <RightColumn symbol={symbol} price={price} />
          </Panel>

        </PanelGroup>
      </div>
    </AppShell>
  );
};

export default Index;
