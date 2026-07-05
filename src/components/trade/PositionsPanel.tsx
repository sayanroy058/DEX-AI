import { useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useMarkets } from "@/lib/useMarkets";
import { formatPrice } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Bot, Sparkles, X } from "lucide-react";

const MOCK_POSITIONS = [
  { symbol: "BTC-PERP", side: "long" as const, size: 0.142, entry: 66120, leverage: 10, margin: 940 },
  { symbol: "ETH-PERP", side: "short" as const, size: 2.4, entry: 3580, leverage: 5, margin: 1718 },
  { symbol: "SOL-PERP", side: "long" as const, size: 18.5, entry: 162.4, leverage: 20, margin: 150 },
];

const MOCK_ORDERS = [
  { id: "ord_001", symbol: "BTC-PERP", side: "buy", type: "Limit", size: 0.05, price: 66800, time: "12:42:18" },
  { id: "ord_002", symbol: "HYPE-PERP", side: "sell", type: "Stop", size: 50, price: 30.2, time: "12:18:04" },
];

const MOCK_HISTORY = [
  { time: "11:42", symbol: "ETH-PERP", side: "buy", size: 1.2, price: 3512.3, status: "Filled", pnl: "+$84.20" },
  { time: "10:18", symbol: "SOL-PERP", side: "sell", size: 25, price: 170.4, status: "Filled", pnl: "-$32.50" },
  { time: "09:55", symbol: "BTC-PERP", side: "buy", size: 0.08, price: 66900, status: "Cancelled", pnl: "—" },
];

const MOCK_AUTOMATED_ORDERS = [
  { id: "auto_001", source: "Bot", name: "BTC Grid", strategy: "Futures Grid", symbol: "BTC-PERP", side: "buy", type: "Limit", size: 0.025, price: 66540, status: "Working" },
  { id: "auto_002", source: "AI Agent", name: "Momentum Flow", strategy: "Trend Follow", symbol: "ETH-PERP", side: "sell", type: "Stop", size: 0.8, price: 3495, status: "Watching" },
  { id: "auto_003", source: "Bot", name: "SOL DCA", strategy: "Futures DCA", symbol: "SOL-PERP", side: "buy", type: "Limit", size: 12, price: 158.6, status: "Working" },
  { id: "auto_004", source: "AI Agent", name: "Risk Rebalance", strategy: "Rebalancing", symbol: "HYPE-PERP", side: "sell", type: "Market", size: 20, price: 29.84, status: "Queued" },
] as const;

export function PositionsPanel({ markets }: { markets: ReturnType<typeof useMarkets> }) {
  const positions = useMemo(() => {
    return MOCK_POSITIONS.map(p => {
      const m = markets.find(mk => mk.symbol === p.symbol);
      const mark = m?.price ?? p.entry;
      const direction = p.side === "long" ? 1 : -1;
      const pnl = (mark - p.entry) * p.size * direction;
      const pnlPct = ((mark - p.entry) / p.entry) * 100 * direction * p.leverage;
      const liq = p.side === "long" ? p.entry * (1 - 0.95 / p.leverage) : p.entry * (1 + 0.95 / p.leverage);
      return { ...p, mark, pnl, pnlPct, liq };
    });
  }, [markets]);

  const totalPnl = positions.reduce((s, p) => s + p.pnl, 0);

  return (
    <div className="glass rounded-b-xl rounded-t-none h-full flex flex-col overflow-hidden">
      <Tabs defaultValue="positions" className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border/50 px-3">
          <div className="min-w-0 flex-1 overflow-x-auto scrollbar-none">
            <TabsList className="h-9 w-max bg-transparent p-0 gap-1">
              <TabsTrigger value="positions" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-xs h-7">
                Position <span className="ml-1.5 px-1.5 py-0.5 rounded bg-primary/20 text-[10px]">{positions.length}</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-xs h-7">
                Open Orders <span className="ml-1.5 px-1.5 py-0.5 rounded bg-muted text-[10px]">{MOCK_ORDERS.length}</span>
              </TabsTrigger>
              <TabsTrigger value="automated" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-xs h-7">
                Bot / AI Agent <span className="ml-1.5 px-1.5 py-0.5 rounded bg-secondary/15 text-secondary text-[10px]">{MOCK_AUTOMATED_ORDERS.length}</span>
              </TabsTrigger>
              <TabsTrigger value="trades" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-xs h-7">Trade History</TabsTrigger>
              <TabsTrigger value="funding" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-xs h-7">Funding History</TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-xs h-7">Order History</TabsTrigger>
            </TabsList>
          </div>
          <div className="shrink-0 text-[11px] text-muted-foreground">
            Total PnL: <span className={cn("font-mono font-bold", totalPnl >= 0 ? "text-buy" : "text-sell")}>
              {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
            </span>
          </div>
        </div>

        <TabsContent value="positions" className="flex-1 overflow-auto m-0">
          <table className="w-full text-[11px] font-mono">
            <thead className="text-[10px] text-muted-foreground uppercase">
              <tr className="border-b border-border/50">
                <th className="text-left px-3 py-1.5">Symbol</th>
                <th className="text-left">Side</th>
                <th className="text-right">Size</th>
                <th className="text-right">Entry</th>
                <th className="text-right">Mark</th>
                <th className="text-right">Liq.</th>
                <th className="text-right">Margin</th>
                <th className="text-right">PnL</th>
                <th className="text-right pr-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {positions.map(p => (
                <tr key={p.symbol} className="border-b border-border/30 hover:bg-muted/20">
                  <td className="px-3 py-2 font-sans font-semibold">{p.symbol} <span className="text-[9px] text-muted-foreground">{p.leverage}x</span></td>
                  <td className={p.side === "long" ? "text-buy" : "text-sell"}>{p.side.toUpperCase()}</td>
                  <td className="text-right">{p.size}</td>
                  <td className="text-right">{formatPrice(p.entry)}</td>
                  <td className="text-right">{formatPrice(p.mark)}</td>
                  <td className="text-right text-warning">{formatPrice(p.liq)}</td>
                  <td className="text-right">${p.margin.toFixed(2)}</td>
                  <td className={cn("text-right font-bold", p.pnl >= 0 ? "text-buy" : "text-sell")}>
                    {p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(2)}
                    <div className="text-[9px] opacity-70">{p.pnl >= 0 ? "+" : ""}{p.pnlPct.toFixed(2)}%</div>
                  </td>
                  <td className="text-right pr-3">
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] text-sell hover:bg-sell/10">Close</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabsContent>

        <TabsContent value="orders" className="flex-1 overflow-auto m-0">
          <table className="w-full text-[11px] font-mono">
            <thead className="text-[10px] text-muted-foreground uppercase">
              <tr className="border-b border-border/50">
                <th className="text-left px-3 py-1.5">Time</th>
                <th className="text-left">Symbol</th>
                <th className="text-left">Type</th>
                <th className="text-left">Side</th>
                <th className="text-right">Size</th>
                <th className="text-right">Price</th>
                <th className="text-right pr-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_ORDERS.map(o => (
                <tr key={o.id} className="border-b border-border/30 hover:bg-muted/20">
                  <td className="px-3 py-2">{o.time}</td>
                  <td className="font-sans font-semibold">{o.symbol}</td>
                  <td>{o.type}</td>
                  <td className={o.side === "buy" ? "text-buy" : "text-sell"}>{o.side.toUpperCase()}</td>
                  <td className="text-right">{o.size}</td>
                  <td className="text-right">{formatPrice(o.price)}</td>
                  <td className="text-right pr-3">
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-sell"><X className="h-3 w-3" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabsContent>

        <TabsContent value="automated" className="flex-1 overflow-auto m-0">
          <table className="w-full min-w-[880px] text-[11px] font-mono">
            <thead className="text-[10px] text-muted-foreground uppercase">
              <tr className="border-b border-border/50">
                <th className="text-left px-3 py-1.5">Source</th>
                <th className="text-left">Name</th>
                <th className="text-left">Strategy</th>
                <th className="text-left">Symbol</th>
                <th className="text-left">Side</th>
                <th className="text-left">Type</th>
                <th className="text-right">Size</th>
                <th className="text-right">Price</th>
                <th className="text-right pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_AUTOMATED_ORDERS.map(order => (
                <tr key={order.id} className="border-b border-border/30 hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-sans text-[10px] font-semibold",
                      order.source === "AI Agent"
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary/15 text-secondary"
                    )}>
                      {order.source === "AI Agent"
                        ? <Sparkles className="h-3 w-3" />
                        : <Bot className="h-3 w-3" />}
                      {order.source}
                    </span>
                  </td>
                  <td className="font-sans font-semibold">{order.name}</td>
                  <td className="text-muted-foreground">{order.strategy}</td>
                  <td className="font-sans font-semibold">{order.symbol}</td>
                  <td className={order.side === "buy" ? "text-buy" : "text-sell"}>{order.side.toUpperCase()}</td>
                  <td>{order.type}</td>
                  <td className="text-right">{order.size}</td>
                  <td className="text-right">{formatPrice(order.price)}</td>
                  <td className="text-right pr-3">
                    <span className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      order.status === "Working"
                        ? "bg-buy/10 text-buy"
                        : order.status === "Watching"
                          ? "bg-primary/10 text-primary"
                          : "bg-warning/10 text-warning"
                    )}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabsContent>

        <TabsContent value="history" className="flex-1 overflow-auto m-0">
          <table className="w-full text-[11px] font-mono">
            <thead className="text-[10px] text-muted-foreground uppercase">
              <tr className="border-b border-border/50">
                <th className="text-left px-3 py-1.5">Time</th>
                <th className="text-left">Symbol</th>
                <th className="text-left">Side</th>
                <th className="text-right">Size</th>
                <th className="text-right">Price</th>
                <th className="text-right">Status</th>
                <th className="text-right pr-3">PnL</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_HISTORY.map((h, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                  <td className="px-3 py-2">{h.time}</td>
                  <td className="font-sans font-semibold">{h.symbol}</td>
                  <td className={h.side === "buy" ? "text-buy" : "text-sell"}>{h.side.toUpperCase()}</td>
                  <td className="text-right">{h.size}</td>
                  <td className="text-right">{formatPrice(h.price)}</td>
                  <td className="text-right text-muted-foreground">{h.status}</td>
                  <td className={cn("text-right pr-3 font-bold", h.pnl.startsWith("+") ? "text-buy" : h.pnl.startsWith("-") ? "text-sell" : "")}>{h.pnl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabsContent>

        <TabsContent value="trades" className="flex-1 m-0 p-6 text-center text-sm text-muted-foreground">
          No trades yet today. Open a position to start.
        </TabsContent>
        <TabsContent value="funding" className="flex-1 m-0 p-6 text-center text-sm text-muted-foreground">
          Funding payments will appear here every 8 hours.
        </TabsContent>
      </Tabs>
    </div>
  );
}
