import { useEffect, useState } from "react";
import { Loader2, DollarSign, TrendingUp, Zap, Repeat, Users, Layers } from "lucide-react";
import type { ComponentType } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { getAdminFeeRevenue, FEE_REVENUE_RANGES, type AdminFeeRevenue, type FeeRevenueRange } from "@/lib/adminApi";
import { formatBI2XUSDRaw } from "@/lib/referralApi";

type Row = {
  key: keyof AdminFeeRevenue;
  label: string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
};

// Every category this page can show. A row backed by a real charge shows its
// live total; "Prop Firm" (and anything else not yet built) is a plain
// explainer row instead of a fabricated number — see the conversation this
// page came from for why.
const ROWS: Row[] = [
  { key: "spotRaw", label: "Spot Trading", hint: "Maker + taker fees", icon: TrendingUp },
  { key: "futuresRaw", label: "Futures Trading", hint: "Maker + taker fees", icon: TrendingUp },
  { key: "liquidationRaw", label: "Auto-Liquidation", hint: "Forced position-close penalties", icon: Zap },
  { key: "swapRaw", label: "Swap", hint: "BI2XUSD ↔ USDT/USDC conversion fee", icon: Repeat },
  { key: "p2pRaw", label: "P2P", hint: "Buyer + seller fees", icon: Users },
];

const RANGE_LABELS: Record<FeeRevenueRange, string> = {
  "1h": "1 Hour",
  "1d": "1 Day",
  "1w": "1 Week",
  "1m": "1 Month",
  all: "All Time",
};

export default function AdminFeeRevenue() {
  const [range, setRange] = useState<FeeRevenueRange>("all");
  const [data, setData] = useState<AdminFeeRevenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Fee Revenue | BitDx Admin";
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    getAdminFeeRevenue(range)
      .then(setData)
      .catch((e) => setError(e.message || "Could not load fee revenue."))
      .finally(() => setLoading(false));
  }, [range]);

  const rangeHint = range === "all" ? "all-time" : `in the last ${RANGE_LABELS[range].toLowerCase()}`;

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-7 w-7 text-primary" /> Fee Revenue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gross fees collected per trading surface, in BI2XUSD. Spot, futures and liquidation totals
            include any share already paid out to a referrer or affiliate owner — this is what was
            collected from users, not just what the treasury kept.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FEE_REVENUE_RANGES.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={r === range ? "default" : "outline"}
              className={r === range ? "bg-gradient-primary text-primary-foreground" : "glass"}
              onClick={() => setRange(r)}
            >
              {RANGE_LABELS[r]}
            </Button>
          ))}
        </div>

        {error && (
          <div className="glass rounded-lg p-3 text-sm text-sell border border-sell/30">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : data ? (
          <>
            <div className="glass-strong rounded-xl p-6 border border-primary/20 flex items-center gap-4">
              <div className="h-11 w-11 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
                <DollarSign className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-3xl font-bold gradient-text">{formatBI2XUSDRaw(data.totalRaw)} BI2XUSD</div>
                <div className="text-xs text-muted-foreground">Total fee revenue, all categories, {rangeHint}</div>
              </div>
            </div>

            <div className="glass rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_auto] gap-3 px-4 py-2 text-[10px] uppercase tracking-wide text-muted-foreground border-b border-glass-border">
                <div>Category</div>
                <div>Total Collected</div>
              </div>
              {ROWS.map((row) => (
                <div
                  key={row.key}
                  className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3 items-center border-b border-glass-border last:border-b-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <row.icon className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{row.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{row.hint}</div>
                    </div>
                  </div>
                  <div className="font-mono text-sm font-bold">{formatBI2XUSDRaw(data[row.key])} BI2XUSD</div>
                </div>
              ))}
              <div className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3 items-center opacity-60">
                <div className="flex items-center gap-3 min-w-0">
                  <Layers className="h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold truncate">Prop Firm Subscriptions</div>
                    <div className="text-xs text-muted-foreground truncate">Not yet implemented — no fee is charged today</div>
                  </div>
                </div>
                <div className="font-mono text-sm font-bold">0 BI2XUSD</div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground max-w-2xl">
              Referral and affiliate payouts are tracked on the Affiliate Links page — they're a split of
              the spot/futures totals above, not a separate fee category.
            </p>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
}
