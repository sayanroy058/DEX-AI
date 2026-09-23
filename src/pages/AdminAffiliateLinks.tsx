import { useEffect, useState } from "react";
import { Loader2, Users, Save, Plus } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  getAdminReferralConfig,
  setAdminReferralConfig,
  getAdminAffiliateLinks,
  createAdminAffiliateLink,
  setAdminAffiliateLinkActive,
  type AdminAffiliateLink,
} from "@/lib/adminApi";
import { formatBI2XUSDRaw } from "@/lib/referralApi";

export default function AdminAffiliateLinks() {
  const [links, setLinks] = useState<AdminAffiliateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Global referral %
  const [referralPct, setReferralPct] = useState("");
  const [referralPctSaving, setReferralPctSaving] = useState(false);
  const [referralPctDirty, setReferralPctDirty] = useState(false);

  // New affiliate link form
  const [newOwnerId, setNewOwnerId] = useState("");
  const [newSharePct, setNewSharePct] = useState("");
  const [creating, setCreating] = useState(false);

  const load = () =>
    Promise.all([getAdminReferralConfig(), getAdminAffiliateLinks()])
      .then(([config, linksRes]) => {
        setReferralPct((prev) => (referralPctDirty ? prev : config.sharePct));
        setLinks(linksRes.links ?? []);
      })
      .catch((e) => setError(e.message || "Could not load referral data."))
      .finally(() => setLoading(false));

  useEffect(() => {
    document.title = "Affiliate Links | BitDx Admin";
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveReferralPct = async () => {
    const pct = Number(referralPct);
    if (!referralPct.trim() || !Number.isFinite(pct) || pct < 0 || pct > 100) {
      setError("Referral % must be between 0 and 100.");
      return;
    }
    setError("");
    setReferralPctSaving(true);
    try {
      const res = await setAdminReferralConfig(referralPct);
      setReferralPct(res.sharePct);
      setReferralPctDirty(false);
    } catch (e: any) {
      setError(e.message || "Could not update referral %.");
    } finally {
      setReferralPctSaving(false);
    }
  };

  const createLink = async () => {
    const ownerId = newOwnerId.trim();
    const pct = Number(newSharePct);
    if (!ownerId) {
      setError("Owner user ID is required.");
      return;
    }
    if (!newSharePct.trim() || !Number.isFinite(pct) || pct < 0 || pct > 100) {
      setError("Share % must be between 0 and 100.");
      return;
    }
    setError("");
    setCreating(true);
    try {
      const link = await createAdminAffiliateLink(ownerId, newSharePct);
      setLinks((prev) => [link, ...prev]);
      setNewOwnerId("");
      setNewSharePct("");
    } catch (e: any) {
      setError(e.message || "Could not create affiliate link.");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (link: AdminAffiliateLink) => {
    const nextActive = !link.Active;
    setLinks((prev) => prev.map((l) => (l.ID === link.ID ? { ...l, Active: nextActive } : l)));
    try {
      await setAdminAffiliateLinkActive(link.ID, nextActive);
    } catch (e: any) {
      setError(e.message || "Could not update affiliate link.");
      setLinks((prev) => prev.map((l) => (l.ID === link.ID ? { ...l, Active: link.Active } : l)));
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" /> Referral & Affiliate Links
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Referral commission is one global rate applied to every ordinary user's own referral link.
            Affiliate links are created here individually, each with its own fixed commission rate.
            Both are a share of trading-fee revenue only — lifetime once set, and never retroactive to
            users already linked.
          </p>
        </div>

        {error && (
          <div className="glass rounded-lg p-3 text-sm text-sell border border-sell/30">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : (
          <>
            <div className="glass rounded-xl p-5 space-y-3">
              <h3 className="font-bold text-sm">Global Referral Commission</h3>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={referralPct}
                  onChange={(e) => {
                    setReferralPct(e.target.value);
                    setReferralPctDirty(true);
                  }}
                  className="h-8 w-28 font-mono"
                />
                <span className="text-sm text-muted-foreground">%</span>
                <Button size="sm" disabled={referralPctSaving || !referralPctDirty} onClick={saveReferralPct}>
                  {referralPctSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Applies to new referral signups from now on; existing referrers keep the % they were
                linked at.
              </p>
            </div>

            <div className="glass rounded-xl p-5 space-y-3">
              <h3 className="font-bold text-sm">Create Affiliate Link</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="Owner user ID"
                  value={newOwnerId}
                  onChange={(e) => setNewOwnerId(e.target.value)}
                  className="h-9 font-mono flex-1"
                />
                <Input
                  type="number"
                  placeholder="Share %"
                  min={0}
                  max={100}
                  step="0.01"
                  value={newSharePct}
                  onChange={(e) => setNewSharePct(e.target.value)}
                  className="h-9 w-32 font-mono"
                />
                <Button size="sm" disabled={creating} onClick={createLink} className="shrink-0">
                  {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
                  Create
                </Button>
              </div>
            </div>

            <div className="glass rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-3 px-4 py-2 text-[10px] uppercase tracking-wide text-muted-foreground border-b border-glass-border">
                <div>Code</div>
                <div>Owner</div>
                <div>Rate</div>
                <div>Joined</div>
                <div>Earnings</div>
                <div>Status</div>
              </div>
              {links.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No affiliate links created yet.
                </div>
              ) : (
                links.map((link) => (
                  <div
                    key={link.ID}
                    className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-3 px-4 py-3 items-center border-b border-glass-border last:border-b-0"
                  >
                    <div className="font-mono text-sm truncate">{link.Code}</div>
                    <div className="font-mono text-xs text-muted-foreground truncate">{link.OwnerUserID}</div>
                    <div className="font-mono text-sm font-bold text-primary">{link.SharePct}%</div>
                    <div className="font-mono text-sm">{link.JoinedCount}</div>
                    <div className="font-mono text-sm">{formatBI2XUSDRaw(link.EarningsRaw)}</div>
                    <div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => toggleActive(link)}
                      >
                        <Badge
                          className={
                            link.Active
                              ? "bg-buy/15 text-buy border-buy/30"
                              : "bg-muted/50 text-muted-foreground border-muted-foreground/25"
                          }
                        >
                          {link.Active ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
