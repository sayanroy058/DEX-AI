import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPredictionOrders, getPredictionWindow, type PredictionOrder, type PredictionWindow } from "@/lib/predictionApi";
import { orderStatusBadgeClass, sidePillClass, type PredictionOrderStatus, type PredictionOrderView, type PredictionSide } from "@/lib/predictionMarkets";

function deriveStatus(order: PredictionOrder, win: PredictionWindow | undefined): PredictionOrderStatus {
  const filled = Number(order.FilledSize);
  if (order.Status === "cancelled") {
    return filled > 0 ? "Cancelled" : "Unfilled";
  }
  if (!win || win.status !== "settled" || !win.targetPrice || !win.resolutionPrice) return "Open";
  // The round locked with no counterparty for this order (or its
  // remainder) — it was refunded, not settled, so it never won or lost.
  if (filled <= 0) return "Unfilled";
  const won = Number(win.resolutionPrice) >= Number(win.targetPrice) ? "yes" : "no";
  return order.Side === won ? "Won" : "Lost";
}

async function buildOrderViews(orders: PredictionOrder[]): Promise<PredictionOrderView[]> {
  const windowIds = [...new Set(orders.map((o) => o.WindowID))];
  const windows = new Map<number, PredictionWindow>();
  await Promise.all(
    windowIds.map(async (id) => {
      try {
        windows.set(id, await getPredictionWindow(id));
      } catch {
        /* window may be old enough to have been pruned; label falls back below */
      }
    }),
  );
  return orders.map((order) => {
    const win = windows.get(order.WindowID);
    const side: PredictionSide = order.Side === "yes" ? "YES" : "NO";
    const filledShares = Number(order.FilledSize);
    return {
      id: String(order.ID),
      marketId: win ? `${win.market}-${win.duration}` : String(order.WindowID),
      question: win ? `${win.market} Above Target — ${win.duration === "5m" ? "5 Minutes" : "15 Minutes"}` : `Window #${order.WindowID}`,
      side,
      status: deriveStatus(order, win),
      placedAt: new Date(order.CreatedAt).toLocaleString(),
      priceCents: Math.round(Number(order.Price) * 100),
      // Show the filled portion, not the full requested size — an
      // unfilled remainder was refunded and never became a real position,
      // so counting it here would overstate what was actually at stake.
      shares: filledShares,
      filledShares,
      cost: Number(order.Price) * filledShares,
    };
  });
}

export default function PredictionOrders() {
  const [orders, setOrders] = useState<PredictionOrderView[] | null>(null);

  useEffect(() => {
    document.title = "Prediction Orders | BitDx";
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = (await getPredictionOrders()) ?? [];
        const views = await buildOrderViews(raw);
        if (!cancelled) setOrders(views.sort((a, b) => b.id.localeCompare(a.id)));
      } catch {
        if (!cancelled) setOrders([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-7 w-7 text-primary" /> Prediction Orders
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Your prediction market orders and history.</p>
        </div>

        {orders === null ? (
          <div className="glass rounded-xl p-10 text-center text-muted-foreground">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="glass rounded-xl p-10 text-center text-muted-foreground">No orders yet.</div>
        ) : (
          <div className="glass rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2 text-[10px] uppercase tracking-wide text-muted-foreground border-b border-glass-border">
              <div>Market</div>
              <div>Side</div>
              <div>Shares / Cost</div>
              <div>Status</div>
            </div>
            {orders.map((order) => (
              <div
                key={order.id}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-3 items-center border-b border-glass-border last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{order.question}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">#{order.id} · {order.placedAt}</div>
                </div>
                <div>
                  <span className={sidePillClass(order.side)}>{order.side}</span>
                </div>
                <div className="text-right text-xs font-mono">
                  <div>{order.shares.toFixed(2)} @ {order.priceCents}¢</div>
                  <div className="text-muted-foreground">${order.cost.toFixed(2)}</div>
                </div>
                <div>
                  <Badge variant="outline" className={cn("text-[10px]", orderStatusBadgeClass(order.status))}>
                    {order.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
