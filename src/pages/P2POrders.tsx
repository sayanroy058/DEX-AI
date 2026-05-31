import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CalendarDays, ClipboardList } from "lucide-react";
import { p2pOrders, p2pSidePillClass, p2pStatusClass } from "@/lib/p2pOrders";

export default function P2POrders() {
  const [tab, setTab] = useState<"progress" | "all">("progress");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const visibleOrders = p2pOrders.filter(order => {
    if (tab === "progress" && order.status !== "In Progress") return false;
    if (typeFilter !== "all" && order.side.toLowerCase() !== typeFilter) return false;
    if (statusFilter !== "all" && order.status !== statusFilter) return false;
    return true;
  });

  return (
    <AppShell>
      <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div>
            <Link to="/p2p" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
              Back to P2P
            </Link>
            <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
              <ClipboardList className="h-6 w-6 text-primary" />
              P2P Orders
            </h1>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_18px_60px_hsl(var(--primary)/0.10)] backdrop-blur-xl dark:border-primary/20 dark:bg-card/35 dark:shadow-[0_24px_90px_hsl(var(--primary)/0.12)]">
            <div className="border-b border-border/50 p-6">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-background/70 px-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-inner">
                <div className="flex gap-8">
                  {[
                    { id: "progress", label: "In Progress" },
                    { id: "all", label: "All" },
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTab(item.id as "progress" | "all")}
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
                <label className="mb-2 block text-sm text-muted-foreground">Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="border-border/60 bg-background/80 backdrop-blur-md dark:border-white/10 dark:bg-background/35">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Buy / Sell</SelectItem>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm text-muted-foreground">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="border-border/60 bg-background/80 backdrop-blur-md dark:border-white/10 dark:bg-background/35">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
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
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20 text-muted-foreground dark:border-white/10 dark:bg-transparent">
                    <th className="px-6 py-4 text-left font-medium">Type/Date</th>
                    <th className="px-6 py-4 text-left font-medium">Order No.</th>
                    <th className="px-6 py-4 text-left font-medium">Price</th>
                    <th className="px-6 py-4 text-left font-medium">Fiat / Crypto Amount</th>
                    <th className="px-6 py-4 text-left font-medium">Counterparty</th>
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
                    visibleOrders.map(order => (
                      <tr key={order.id} className="border-b border-border/40 hover:bg-muted/30 dark:border-white/10 dark:hover:bg-white/[0.04]">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={p2pSidePillClass(order.side)}>{order.side}</span>
                            <span className="text-xs text-muted-foreground">{order.date}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">{order.id}</td>
                        <td className="px-6 py-4 font-mono">INR {order.price.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <div className="font-mono">INR {order.fiatAmount.toLocaleString()}</div>
                          <div className="font-mono text-xs text-muted-foreground">{order.cryptoAmount.toFixed(4)} DEXUSD</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold">{order.counterparty}</div>
                          <div className="text-xs text-muted-foreground">{order.payment}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${p2pStatusClass(order.status)}`}>
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
