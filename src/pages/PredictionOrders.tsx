import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CalendarDays, ClipboardList } from "lucide-react";
import {
  predictionOrders,
  predictionSidePillClass,
  predictionStatusClass,
  type PredictionOrderStatus,
  type PredictionOrderSide,
} from "@/lib/predictionOrders";

export default function PredictionOrders() {
  const [tab, setTab] = useState<"open" | "all">("open");
  const [sideFilter, setSideFilter] = useState<"all" | Lowercase<PredictionOrderSide>>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | PredictionOrderStatus>("all");

  const visibleOrders = predictionOrders.filter((order) => {
    if (tab === "open" && order.status !== "Open") return false;
    if (sideFilter !== "all" && order.side.toLowerCase() !== sideFilter) return false;
    if (statusFilter !== "all" && order.status !== statusFilter) return false;
    return true;
  });

  return (
    <AppShell>
      <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div>
            <Link to="/prediction" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
              Back to Predictions
            </Link>
            <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
              <ClipboardList className="h-6 w-6 text-primary" />
              Prediction Orders
            </h1>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_18px_60px_hsl(var(--primary)/0.10)] backdrop-blur-xl dark:border-primary/20 dark:bg-card/35 dark:shadow-[0_24px_90px_hsl(var(--primary)/0.12)]">
            <div className="border-b border-border/50 p-6">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-background/70 px-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-inner">
                <div className="flex gap-8">
                  {[
                    { id: "open", label: "Open" },
                    { id: "all", label: "All" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTab(item.id as "open" | "all")}
                      className={`relative py-4 text-sm font-bold transition-colors ${
                        tab === item.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {item.label}
                      {tab === item.id && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 border-b border-border/50 bg-background/35 p-6 md:grid-cols-3 dark:border-white/10 dark:bg-transparent">
              <div>
                <label className="mb-2 block text-sm text-muted-foreground">Side</label>
                <Select value={sideFilter} onValueChange={(value) => setSideFilter(value as "all" | Lowercase<PredictionOrderSide>)}>
                  <SelectTrigger className="border-border/60 bg-background/80 backdrop-blur-md dark:border-white/10 dark:bg-background/35">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Up / Down</SelectItem>
                    <SelectItem value="up">Up</SelectItem>
                    <SelectItem value="down">Down</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm text-muted-foreground">Status</label>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | PredictionOrderStatus)}>
                  <SelectTrigger className="border-border/60 bg-background/80 backdrop-blur-md dark:border-white/10 dark:bg-background/35">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Won">Won</SelectItem>
                    <SelectItem value="Lost">Lost</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm text-muted-foreground">Date</label>
                <button
                  type="button"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-border/60 bg-background/80 px-3 text-sm text-muted-foreground backdrop-blur-md dark:border-white/10 dark:bg-background/35"
                >
                  <span>Start Date to End Date</span>
                  <CalendarDays className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20 text-muted-foreground dark:border-white/10 dark:bg-transparent">
                    <th className="px-6 py-4 text-left font-medium">Side/Date</th>
                    <th className="px-6 py-4 text-left font-medium">Order No.</th>
                    <th className="px-6 py-4 text-left font-medium">Market</th>
                    <th className="px-6 py-4 text-left font-medium">Price / Shares</th>
                    <th className="px-6 py-4 text-left font-medium">Cost / Potential Return</th>
                    <th className="px-6 py-4 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="h-72 text-center">
                        <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                          <ClipboardList className="h-12 w-12 text-primary/50" />
                          No Records Found
                        </div>
                      </td>
                    </tr>
                  ) : (
                    visibleOrders.map((order) => (
                      <tr key={order.id} className="border-b border-border/40 hover:bg-muted/30 dark:border-white/10 dark:hover:bg-white/[0.04]">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={predictionSidePillClass(order.side)}>{order.side}</span>
                            <span className="text-xs text-muted-foreground">{order.date}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">{order.id}</td>
                        <td className="px-6 py-4">
                          <div className="font-semibold">{order.market}</div>
                          <div className="text-xs text-muted-foreground">{order.category} | closes {order.closeTime}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-mono">{order.price}c</div>
                          <div className="font-mono text-xs text-muted-foreground">{order.shares.toFixed(2)} shares</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-mono">${order.cost.toFixed(2)}</div>
                          <div className="font-mono text-xs text-muted-foreground">max ${order.potentialReturn.toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${predictionStatusClass(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
