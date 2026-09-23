import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getMyAffiliateLinks, formatBI2XUSDRaw, type AffiliateLinkSummary } from "@/lib/referralApi";

export default function Affiliate() {
  const [links, setLinks] = useState<AffiliateLinkSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Affiliate Dashboard | BitDx";
    getMyAffiliateLinks()
      .then((r) => setLinks(r.links ?? []))
      .catch((e) => setError(e.message || "Connect your wallet to see your affiliate links."))
      .finally(() => setLoading(false));
  }, []);

  const copy = (val: string) => {
    navigator.clipboard.writeText(val);
    toast.success("Link copied!");
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      </AppShell>
    );
  }

  const totalJoined = links.reduce((sum, l) => sum + l.JoinedCount, 0);
  const totalEarnings = links.reduce((sum, l) => sum + BigInt(l.EarningsRaw || "0"), 0n);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Affiliate Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Affiliate links are created by the BitDx team with a custom commission rate. If you've been
            given one, it's shown below.
          </p>
        </div>

        {error && (
          <div className="glass rounded-lg p-3 text-sm text-sell border border-sell/30">{error}</div>
        )}

        {!error && links.length === 0 ? (
          <div className="glass rounded-xl p-10 text-center text-muted-foreground">
            You don't have an affiliate link yet. Contact the BitDx team if you'd like to become an affiliate.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass rounded-xl p-5 border border-border/40">
                <div className="text-2xl font-bold gradient-text">{links.length}</div>
                <div className="text-xs text-muted-foreground">Active Links</div>
              </div>
              <div className="glass rounded-xl p-5 border border-border/40">
                <Users className="h-5 w-5 text-primary mb-2" />
                <div className="text-2xl font-bold gradient-text">{totalJoined}</div>
                <div className="text-xs text-muted-foreground">Total Joined</div>
              </div>
              <div className="glass rounded-xl p-5 border border-border/40">
                <DollarSign className="h-5 w-5 text-primary mb-2" />
                <div className="text-2xl font-bold gradient-text">{formatBI2XUSDRaw(totalEarnings.toString())} BI2XUSD</div>
                <div className="text-xs text-muted-foreground">Total Earnings</div>
              </div>
            </div>

            <div className="glass rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-2 text-[10px] uppercase tracking-wide text-muted-foreground border-b border-glass-border">
                <div>Link</div>
                <div>Rate</div>
                <div>Joined</div>
                <div>Earnings</div>
                <div>Status</div>
              </div>
              {links.map((link) => {
                const url = `${window.location.origin}/?ref=${link.Code}`;
                return (
                  <div
                    key={link.ID}
                    className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-3 items-center border-b border-glass-border last:border-b-0"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="font-mono text-sm truncate">{link.Code}</span>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0" onClick={() => copy(url)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="font-mono text-sm font-bold text-primary">{link.SharePct}%</div>
                    <div className="font-mono text-sm">{link.JoinedCount}</div>
                    <div className="font-mono text-sm">{formatBI2XUSDRaw(link.EarningsRaw)}</div>
                    <div>
                      <Badge className={link.Active ? "bg-buy/15 text-buy border-buy/30" : "bg-muted/50 text-muted-foreground border-muted-foreground/25"}>
                        {link.Active ? "ACTIVE" : "INACTIVE"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground max-w-2xl">
          Each affiliate link's commission rate is fixed for its lifetime — every trade a user who joined
          through it ever makes generates this share of the platform's trading-fee revenue, for as long as
          they trade.
        </p>
      </div>
    </AppShell>
  );
}
