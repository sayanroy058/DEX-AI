import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, DollarSign, TrendingUp, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPartnerProfit, PARTNER_PROFIT_RANGES, type PartnerProfit, type PartnerProfitRange } from "@/lib/partnerApi";
import { clearPartnerSession, getPartnerSession } from "@/lib/partnerAuth";
import { formatBI2XUSDRaw } from "@/lib/referralApi";

const RANGE_LABELS: Record<PartnerProfitRange, string> = {
  "1h": "1 Hour",
  "1d": "1 Day",
  "1w": "1 Week",
  "1m": "1 Month",
  all: "All Time",
};

export default function PartnerProfit() {
  const navigate = useNavigate();
  const session = getPartnerSession();
  const [range, setRange] = useState<PartnerProfitRange>("all");
  const [data, setData] = useState<PartnerProfit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "My Profit Share | BitDx Partner";
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    getPartnerProfit(range)
      .then(setData)
      .catch((e) => setError(e.message || "Could not load your profit history."))
      .finally(() => setLoading(false));
  }, [range]);

  const logout = () => {
    clearPartnerSession();
    navigate("/partner/login", { replace: true });
  };

  const rangeHint = range === "all" ? "all-time" : `recorded in the last ${RANGE_LABELS[range].toLowerCase()}`;

  return (
    <div className="min-h-screen w-full">
      <header className="h-14 px-4 sm:px-6 flex items-center justify-between glass-strong border-b border-glass-border sticky top-0 z-20">
        <div>
          <div className="text-sm font-semibold">{session?.user.name ?? "Partner"}</div>
          <div className="text-[11px] text-muted-foreground">{session?.user.loginId}</div>
        </div>
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign out
        </Button>
      </header>

      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-primary" /> My Profit Share
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your equal share of the platform's daily profit, recorded once per day. This is a
            view-only record — it is not a spendable balance and cannot be withdrawn.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PARTNER_PROFIT_RANGES.map((r) => (
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
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                  Cumulative Share (All Time)
                </div>
                <div className="text-3xl font-bold gradient-text">{formatBI2XUSDRaw(data.cumulativeRaw)} BI2XUSD</div>
              </div>
            </div>

            <div className="glass rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_auto] gap-3 px-4 py-2 text-[10px] uppercase tracking-wide text-muted-foreground border-b border-glass-border">
                <div>Day</div>
                <div>Your Share</div>
              </div>
              {data.entries.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                  No profit-share entries {rangeHint}.
                </div>
              ) : (
                data.entries.map((entry) => (
                  <div
                    key={entry.profitDate}
                    className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3 items-center border-b border-glass-border last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{entry.profitDate}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        Split {entry.partnerCount} ways · platform total {formatBI2XUSDRaw(entry.sourceTotalRaw)} BI2XUSD
                      </div>
                    </div>
                    <div className="font-mono text-sm font-bold">{formatBI2XUSDRaw(entry.shareRaw)} BI2XUSD</div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
