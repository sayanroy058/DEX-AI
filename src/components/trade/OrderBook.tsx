import { useEffect, useState } from "react";
import { generateOrderBook, generateTrade, formatPrice, Trade } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

interface OrderBookProps {
  price: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function OrderBook({ price, collapsed = false, onToggleCollapse }: OrderBookProps) {
  const [book, setBook] = useState(() => generateOrderBook(price));
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tab, setTab] = useState<"book" | "trades">("book");

  useEffect(() => {
    const id = setInterval(() => {
      setBook(generateOrderBook(price));
    }, 1200);
    return () => clearInterval(id);
  }, [price]);

  useEffect(() => {
    const id = setInterval(() => {
      setTrades(prev => [generateTrade(price), ...prev].slice(0, 30));
    }, 800);
    return () => clearInterval(id);
  }, [price]);

  const maxBidTotal = Math.max(...book.bids.map(b => b.total), 1);
  const maxAskTotal = Math.max(...book.asks.map(a => a.total), 1);
  const spread = book.asks[0]?.price - book.bids[0]?.price;
  const spreadPct = (spread / price) * 100;

  return (
    <div className="glass rounded-xl flex flex-col h-full overflow-hidden">
      <div className="flex border-b border-border/50 shrink-0">
        <button
          onClick={() => setTab("book")}
          className={cn(
            "flex-1 px-3 py-2 text-xs font-semibold transition-colors",
            tab === "book" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
          )}
        >
          Order Book
        </button>
        <button
          onClick={() => setTab("trades")}
          className={cn(
            "flex-1 px-3 py-2 text-xs font-semibold transition-colors",
            tab === "trades" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
          )}
        >
          Trades
        </button>
        <button
          onClick={onToggleCollapse}
          className="px-2 py-2 text-muted-foreground hover:text-foreground transition-colors"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {!collapsed && (
        <>
          {tab === "book" ? (
            <div className="flex-1 flex flex-col text-[10px] font-mono overflow-hidden">
              <div className="grid grid-cols-3 gap-1 px-2 py-1 text-[9px] text-muted-foreground uppercase border-b border-border/50">
                <div>Price</div>
                <div className="text-right">Size</div>
                <div className="text-right">Total</div>
              </div>

              {/* Asks (reversed) */}
              <div className="flex-1 overflow-hidden flex flex-col-reverse min-h-0">
                {book.asks.slice(0, 10).map((a, i) => {
                  const depthPct = (a.total / maxAskTotal) * 100;
                  return (
                    <div key={i} className="relative grid grid-cols-3 gap-1 px-2 flex-1 items-center hover:bg-muted/20">
                      <div
                        className="absolute inset-y-0 right-0"
                        style={{ width: `${depthPct}%`, background: "linear-gradient(to left, hsl(var(--sell) / 0.45), hsl(var(--sell) / 0.05))" }}
                      />
                      <div className="relative text-sell">{formatPrice(a.price)}</div>
                      <div className="relative text-right">{a.size.toFixed(3)}</div>
                      <div className="relative text-right text-muted-foreground">{a.total.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>

              {/* Spread */}
              <div className="px-2 py-1 border-y border-border/50 flex items-center justify-between text-[10px] bg-muted/20">
                <span className="text-primary font-bold text-sm font-mono neon-text">{formatPrice(price)}</span>
                <span className="text-muted-foreground">Spread {spreadPct.toFixed(3)}%</span>
              </div>

              {/* Bids */}
              <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
                {book.bids.slice(0, 10).map((b, i) => {
                  const depthPct = (b.total / maxBidTotal) * 100;
                  return (
                    <div key={i} className="relative grid grid-cols-3 gap-1 px-2 flex-1 items-center hover:bg-muted/20">
                      <div
                        className="absolute inset-y-0 right-0"
                        style={{ width: `${depthPct}%`, background: "linear-gradient(to left, hsl(var(--buy) / 0.45), hsl(var(--buy) / 0.05))" }}
                      />
                      <div className="relative text-buy">{formatPrice(b.price)}</div>
                      <div className="relative text-right">{b.size.toFixed(3)}</div>
                      <div className="relative text-right text-muted-foreground">{b.total.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col text-[11px] font-mono">
              <div className="grid grid-cols-3 gap-1 px-2 py-1 text-[9px] text-muted-foreground uppercase border-b border-border/50">
                <div>Price</div>
                <div className="text-right">Size</div>
                <div className="text-right">Time</div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {trades.map(t => (
                  <div key={t.id} className="grid grid-cols-3 gap-1 px-2 py-0.5 hover:bg-muted/20 animate-fade-in">
                    <div className={t.side === "buy" ? "text-buy" : "text-sell"}>{formatPrice(t.price)}</div>
                    <div className="text-right">{t.size.toFixed(3)}</div>
                    <div className="text-right text-muted-foreground">
                      {new Date(t.time).toLocaleTimeString("en-US", { hour12: false })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
