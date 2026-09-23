import { useEffect, useState } from "react";
import { Loader2, Percent, Save } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FEE_CONFIG_KEYS, getAdminFeeRates, setAdminFeeRate, type FeeConfigKey } from "@/lib/adminApi";

// Bound must match feeconfig.RateBounds on the backend — mirrored here so a
// mistaken edit is caught before the request round trip, not just after.
function boundsFor(key: FeeConfigKey): { min: number; max: number } {
  return key === "liquidation" ? { min: 0, max: 0.10 } : { min: 0, max: 0.05 };
}

// A human label + short description per key, purely presentational.
const LABELS: Record<FeeConfigKey, { label: string; hint: string }> = {
  "spot.maker": { label: "Spot — Maker", hint: "Limit order, resting side" },
  "spot.taker": { label: "Spot — Taker", hint: "Market order, aggressor side" },
  "futures.maker": { label: "Futures — Maker", hint: "Limit order, resting side" },
  "futures.taker": { label: "Futures — Taker", hint: "Market order, aggressor side" },
  "p2p.buyer": { label: "P2P — Buyer", hint: "Charged to the buyer side" },
  "p2p.seller": { label: "P2P — Seller", hint: "Charged to the seller side" },
  "swap.in": { label: "Swap — USDT/USDC → BI2XUSD", hint: "Into the platform stable" },
  "swap.out": { label: "Swap — BI2XUSD → USDT/USDC", hint: "Out of the platform stable" },
  liquidation: { label: "Auto-Liquidation", hint: "Charged on forced position closes" },
};

type Row = {
  key: FeeConfigKey;
  draft: string; // as a percent string for display, e.g. "0.25" for 0.25%
  saving: boolean;
  dirty: boolean;
};

function rateToPercentString(rate: string): string {
  const n = Number(rate);
  if (!Number.isFinite(n)) return "";
  return (n * 100).toString();
}

function percentStringToRate(pct: string): string {
  const n = Number(pct);
  if (!Number.isFinite(n)) return "";
  return (n / 100).toString();
}

export default function AdminFeeControl() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () =>
    getAdminFeeRates()
      .then((r) => {
        setRows((prev) => {
          const prevByKey = new Map(prev.map((row) => [row.key, row]));
          return FEE_CONFIG_KEYS.map((key) => {
            const existing = prevByKey.get(key);
            if (existing?.dirty) return existing; // preserve an in-flight edit
            const rate = r.rates[key] ?? "0";
            return { key, draft: rateToPercentString(rate), saving: false, dirty: false };
          });
        });
      })
      .catch((e) => setError(e.message || "Could not load fee rates."))
      .finally(() => setLoading(false));

  useEffect(() => {
    document.title = "Fee Control | BitDx";
    load();
  }, []);

  const setDraft = (key: FeeConfigKey, value: string) =>
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, draft: value, dirty: true } : row)));

  const save = async (key: FeeConfigKey) => {
    const row = rows.find((r) => r.key === key);
    if (!row) return;
    const pct = Number(row.draft);
    const { min, max } = boundsFor(key);
    if (!row.draft.trim() || !Number.isFinite(pct) || pct < min * 100 || pct > max * 100) {
      setError(`${LABELS[key].label} must be between ${min * 100}% and ${max * 100}%.`);
      return;
    }
    setError("");
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, saving: true } : r)));
    try {
      const rate = percentStringToRate(row.draft);
      const updated = await setAdminFeeRate(key, rate);
      setRows((prev) =>
        prev.map((r) =>
          r.key === key ? { key, draft: rateToPercentString(updated.rate), saving: false, dirty: false } : r
        )
      );
    } catch (e: any) {
      setError(e.message || "Could not update fee rate.");
      setRows((prev) => prev.map((r) => (r.key === key ? { ...r, saving: false } : r)));
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Percent className="h-7 w-7 text-primary" /> Fee Control
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Edit the platform's base fee rates directly. A user's own fee-tier discount (see the Fee
            Tiers subscription page) is applied on top of whatever rate is set here — it is not
            editable from this page.
          </p>
        </div>

        {error && (
          <div className="glass rounded-lg p-3 text-sm text-sell border border-sell/30">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading fee rates…
          </div>
        ) : (
          <div className="glass rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2 text-[10px] uppercase tracking-wide text-muted-foreground border-b border-glass-border">
              <div>Fee</div>
              <div>Rate (%)</div>
              <div />
            </div>
            {rows.map((row) => (
              <div
                key={row.key}
                className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-3 items-center border-b border-glass-border last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="font-semibold truncate">{LABELS[row.key].label}</div>
                  <div className="text-xs text-muted-foreground truncate">{LABELS[row.key].hint}</div>
                </div>
                <div>
                  <Input
                    type="number"
                    min={boundsFor(row.key).min * 100}
                    max={boundsFor(row.key).max * 100}
                    step="0.001"
                    value={row.draft}
                    onChange={(e) => setDraft(row.key, e.target.value)}
                    className="h-8 w-28 font-mono"
                  />
                </div>
                <Button size="sm" disabled={row.saving || !row.dirty} onClick={() => save(row.key)}>
                  {row.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
