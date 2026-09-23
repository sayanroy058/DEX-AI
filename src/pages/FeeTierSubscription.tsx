import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { getFeeTiers, getMyFeeSubscription, subscribeFeeTier, type FeeTier, type MySubscription } from "@/lib/feesApi";
import { toast } from "sonner";

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export default function FeeTierSubscription() {
  const [tiers, setTiers] = useState<FeeTier[]>([]);
  const [mySub, setMySub] = useState<MySubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subscribingTier, setSubscribingTier] = useState<number | null>(null);

  const load = () => {
    setError("");
    Promise.all([
      getFeeTiers(),
      // A user's own subscription requires auth; a logged-out visitor can
      // still browse the tier ladder, so this failing quietly is fine.
      getMyFeeSubscription().catch(() => null),
    ])
      .then(([tiersRes, subRes]) => {
        setTiers(tiersRes.tiers);
        setMySub(subRes);
      })
      .catch((e) => setError(e.message || "Could not load fee tiers."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    document.title = "Fee Tier Discounts | BitDx";
    load();
  }, []);

  const subscribe = async (tier: number) => {
    setSubscribingTier(tier);
    setError("");
    try {
      const result = await subscribeFeeTier(tier);
      toast.success(
        `Subscribed to Tier ${result.tier} — ${result.discountPct}% off all fees until ${fmtDate(result.expiresAt)}.`
      );
      load();
    } catch (e: any) {
      setError(e.message || "Could not complete the purchase.");
    } finally {
      setSubscribingTier(null);
    }
  };

  const activeTier = mySub?.active ? mySub.tier : null;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" /> Fee Tier Discounts
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Spend BI2X (the DEX token) once to unlock a lower fee rate across spot, futures, and P2P
            trading for a full year. Each tier's cost is a fixed BI2XUSD value — the BI2X quantity shown
            below updates live with BI2X's current price and is recomputed at the moment you subscribe.
          </p>
        </div>

        {mySub?.active && (
          <div className="glass rounded-xl p-4 flex items-center gap-3 border border-primary/30">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
            <div className="text-sm">
              <span className="font-semibold">Tier {mySub.tier} active</span> — {mySub.discountPct}% off all
              fees until {fmtDate(mySub.expiresAt)}.
            </div>
          </div>
        )}

        {error && (
          <div className="glass rounded-lg p-3 text-sm text-sell border border-sell/30">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading tiers…
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tiers
              .filter((t) => t.active)
              .map((t) => {
                const isCurrent = activeTier === t.tier;
                const isUpgrade = activeTier != null && t.tier > activeTier;
                return (
                  <div
                    key={t.tier}
                    className={`glass rounded-xl p-5 flex flex-col gap-3 ${isCurrent ? "border border-primary/40" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold">Tier {t.tier}</div>
                      {isCurrent && <Badge className="bg-buy/15 text-buy border-buy/30">CURRENT</Badge>}
                    </div>
                    <div className="text-3xl font-bold text-primary">{t.discountPct}%</div>
                    <div className="text-xs text-muted-foreground">discount on all fees for 1 year</div>
                    <div className="border-t border-glass-border pt-3 space-y-1">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Cost: </span>
                        <span className="font-mono">{t.bi2xusdValue} BI2XUSD</span>
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">
                        {t.bi2xCost ? `≈ ${t.bi2xCost} BI2X at current price` : t.bi2xCostError ?? ""}
                      </div>
                    </div>
                    <Button
                      className="mt-2"
                      variant={isCurrent ? "outline" : "default"}
                      disabled={subscribingTier === t.tier || isCurrent}
                      onClick={() => subscribe(t.tier)}
                    >
                      {subscribingTier === t.tier ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isCurrent ? (
                        "Active"
                      ) : isUpgrade ? (
                        "Upgrade"
                      ) : activeTier != null ? (
                        "Switch to this tier"
                      ) : (
                        "Subscribe"
                      )}
                    </Button>
                  </div>
                );
              })}
          </div>
        )}

        <p className="text-xs text-muted-foreground max-w-2xl">
          Subscribing debits the computed BI2X amount immediately and replaces any existing active tier —
          the 1-year discount period restarts from the new purchase date. BI2X spent this way is not
          returned if you subscribe to a different tier before expiry.
        </p>
      </div>
    </AppShell>
  );
}
