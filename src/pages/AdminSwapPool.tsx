import { useEffect, useState } from "react";
import { ArrowLeftRight, Loader2, Plus } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminTopUpSwapPool, getAdminSwapPool, type SwapPoolRow } from "@/lib/adminApi";

// Below this fraction of (swappable + reserve), a pool's swappable balance
// is flagged low — this pool doesn't auto-replenish (admin top-up is the
// only way swappable grows outside the 60% split), so nothing else catches
// a slow drain toward zero besides a human noticing this indicator.
const LOW_BALANCE_THRESHOLD_PCT = 0.10;

type Row = {
  asset: string;
  swappable: string;
  reserve: string;
  topUpDraft: string;
  topUpSaving: boolean;
};

function isLow(row: Row): boolean {
  const swappable = Number(row.swappable);
  const reserve = Number(row.reserve);
  const total = swappable + reserve;
  if (!Number.isFinite(swappable) || total <= 0) return false;
  return swappable / total < LOW_BALANCE_THRESHOLD_PCT;
}

function formatAmount(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export default function AdminSwapPool() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () =>
    getAdminSwapPool()
      .then((r) => {
        setRows((prev) => {
          const prevByAsset = new Map(prev.map((row) => [row.asset, row]));
          return r.pools.map((pool: SwapPoolRow) => {
            const existing = prevByAsset.get(pool.asset);
            return {
              asset: pool.asset,
              swappable: pool.swappable,
              reserve: pool.reserve,
              topUpDraft: existing?.topUpDraft ?? "",
              topUpSaving: false,
            };
          });
        });
      })
      .catch((e) => setError(e.message || "Could not load swap pool balances."))
      .finally(() => setLoading(false));

  useEffect(() => {
    document.title = "Swap Pool | BitDx";
    load();
  }, []);

  const setDraft = (asset: string, value: string) =>
    setRows((prev) => prev.map((row) => (row.asset === asset ? { ...row, topUpDraft: value } : row)));

  const topUp = async (asset: string) => {
    const row = rows.find((r) => r.asset === asset);
    if (!row) return;
    const amount = Number(row.topUpDraft);
    if (!row.topUpDraft.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError(`Enter a positive amount to top up ${asset}'s swappable pool.`);
      return;
    }
    setError("");
    setRows((prev) => prev.map((r) => (r.asset === asset ? { ...r, topUpSaving: true } : r)));
    try {
      const updated = await adminTopUpSwapPool(asset, row.topUpDraft);
      setRows((prev) =>
        prev.map((r) =>
          r.asset === asset
            ? { asset, swappable: updated.swappable, reserve: updated.reserve, topUpDraft: "", topUpSaving: false }
            : r,
        ),
      );
    } catch (e: any) {
      setError(e.message || "Could not top up swap pool.");
      setRows((prev) => prev.map((r) => (r.asset === asset ? { ...r, topUpSaving: false } : r)));
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="h-7 w-7 text-primary" /> Swap Pool
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every USDT/USDC → BI2XUSD swap splits 60% into the swappable pool (what a BI2XUSD →
            USDT/USDC swap can pay out) and 40% into reserve. Both figures are bookkeeping only —
            the underlying funds stay in the same platform wallet. Reserve only ever grows from
            this split; it cannot be moved into swappable from here or anywhere else. Use "Top Up"
            below to add fresh funds directly to a pool's swappable balance.
          </p>
        </div>

        {error && (
          <div className="glass rounded-lg p-3 text-sm text-sell border border-sell/30">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading swap pool balances…
          </div>
        ) : (
          <div className="glass rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-3 px-4 py-2 text-[10px] uppercase tracking-wide text-muted-foreground border-b border-glass-border">
              <div>Asset</div>
              <div>Swappable / Reserve</div>
              <div>Top Up Amount</div>
              <div />
            </div>
            {rows.map((row) => {
              const low = isLow(row);
              return (
                <div
                  key={row.asset}
                  className="grid grid-cols-[1fr_1fr_auto_auto] gap-3 px-4 py-3 items-center border-b border-glass-border last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{row.asset}</div>
                    {low && (
                      <div className="text-xs text-warning font-medium">Swappable balance low</div>
                    )}
                  </div>
                  <div className="min-w-0 font-mono text-sm">
                    <span className={low ? "text-warning font-semibold" : ""}>
                      {formatAmount(row.swappable)}
                    </span>
                    <span className="text-muted-foreground"> / {formatAmount(row.reserve)}</span>
                  </div>
                  <div>
                    <Input
                      type="number"
                      min={0}
                      step="0.000001"
                      placeholder="0.00"
                      value={row.topUpDraft}
                      onChange={(e) => setDraft(row.asset, e.target.value)}
                      className="h-8 w-32 font-mono"
                    />
                  </div>
                  <Button
                    size="sm"
                    disabled={row.topUpSaving || !row.topUpDraft.trim()}
                    onClick={() => topUp(row.asset)}
                  >
                    {row.topUpSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
