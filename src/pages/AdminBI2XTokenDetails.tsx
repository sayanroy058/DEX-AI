import { FormEvent, useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coins, Loader2, Plus } from "lucide-react";
import {
  addBI2XAllocationHistory,
  getBI2XAllocationHistory,
  getBI2XAllocationTotals,
  type BI2XAllocationBalance,
  type BI2XAllocationHistoryEntry,
} from "@/lib/adminApi";

const TOTAL_SUPPLY = 500_000_000; // 500M BI2X — fixed total supply, not derived from the categories below

const CATEGORY_COLORS: Record<string, string> = {
  "Initial Burn": "#fb7185",
  "Team Reserve": "#6366f1",
  "Community": "#00e5ff",
  "Airdrop": "#f472b6",
  "Marketing": "#f59e0b",
  "Treasury Reserve": "#ef4444",
  "Initial Liquidity": "#10b981",
  "Staking Reward": "#a855f7",
};

// Display order — the backend returns categories alphabetically, which
// doesn't match how the original allocation was presented to the user.
const CATEGORY_ORDER = [
  "Initial Burn",
  "Team Reserve",
  "Community",
  "Airdrop",
  "Marketing",
  "Treasury Reserve",
  "Initial Liquidity",
  "Staking Reward",
];

function formatTokens(qty: string | number): string {
  const n = typeof qty === "string" ? Number(qty) : qty;
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function sortByCategoryOrder<T extends { category: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
}

export default function AdminBI2XTokenDetails() {
  const [totals, setTotals] = useState<BI2XAllocationBalance[]>([]);
  const [history, setHistory] = useState<BI2XAllocationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formCategory, setFormCategory] = useState(CATEGORY_ORDER[0]);
  const [formAmount, setFormAmount] = useState("");
  const [formNote, setFormNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState("");

  const load = () => {
    setError("");
    return Promise.all([getBI2XAllocationTotals(), getBI2XAllocationHistory(100)])
      .then(([totalsRes, historyRes]) => {
        setTotals(totalsRes.totals);
        setHistory(historyRes.history);
      })
      .catch(() => setError("Could not load BI2X allocation data."));
  };

  useEffect(() => {
    document.title = "BI2X Token Details | Admin | BitDx";
    load().finally(() => setLoading(false));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    setFormMessage("");
    const amount = formAmount.trim();
    if (!/^\d+$/.test(amount) || amount === "0") {
      setFormError("Amount must be a positive whole number of BI2X.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await addBI2XAllocationHistory(formCategory, amount, formNote.trim() || undefined);
      setTotals(result.totals);
      setHistory((h) => [result.entry, ...h]);
      setFormAmount("");
      setFormNote("");
      setFormMessage(`Recorded ${formatTokens(amount)} BI2X against ${formCategory}. Current remaining total updated.`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not record this entry.");
    } finally {
      setSubmitting(false);
    }
  };

  const orderedTotals = sortByCategoryOrder(totals);
  const totalRemaining = totals.reduce((sum, t) => sum + Number(t.remainingQty), 0);

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">BI2X Token Details</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Current remaining allocation per category, and a permanent record of every burn/distribution
          </p>
        </div>

        {error && <div className="rounded-lg border border-sell/30 bg-sell/10 px-3 py-2 text-sm text-sell">{error}</div>}

        <div className="glass rounded-xl p-5 sm:p-6 space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Supply</div>
              <div className="text-2xl font-bold font-mono">{formatTokens(TOTAL_SUPPLY)} BI2X</div>
            </div>
          </div>
        </div>

        {/* Section 1: Current BI2X Details — quantities only, no percentages.
            These are LIVE running totals: each category starts at its
            original allocation and decreases every time a distribution/burn
            is recorded against it below (e.g. Staking Reward starts at
            370,000,000; recording a 2,000,000 distribution brings this down
            to 338,000,000... i.e. the current remaining total, not the
            original allocation). */}
        <div className="glass rounded-xl p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold">Current BI2X Details</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Remaining quantity per category, after all recorded distributions/burns
            </p>
          </div>

          {loading ? (
            <div className="h-32 grid place-items-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {orderedTotals.map((t) => (
                <div key={t.category} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/10 px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[t.category] ?? "#888" }} />
                    <span className="text-sm text-foreground truncate">{t.category}</span>
                  </div>
                  <span className="text-sm font-mono font-semibold shrink-0 ml-3">{formatTokens(t.remainingQty)} BI2X</span>
                </div>
              ))}
            </div>
          )}

          {!loading && (
            <div className="border-t border-border/40 pt-3 flex items-center justify-between text-sm">
              <span className="font-semibold">Total Remaining</span>
              <span className="font-mono font-semibold">{formatTokens(totalRemaining)} BI2X</span>
            </div>
          )}
        </div>

        {/* Section 2: History — every recorded burn/distribution, plus the
            form to record a new one. Recording an entry here is what moves
            the numbers in the section above. */}
        <div className="glass rounded-xl p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-semibold">History</h2>

          <form onSubmit={submit} className="grid sm:grid-cols-[1fr_1fr_1.4fr_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {CATEGORY_ORDER.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Amount (BI2X)</Label>
              <Input
                inputMode="numeric"
                placeholder="e.g. 2000000"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Note (optional)</Label>
              <Input placeholder="e.g. Q3 staking distribution" value={formNote} onChange={(e) => setFormNote(e.target.value)} />
            </div>
            <Button type="submit" disabled={submitting} className="h-9 whitespace-nowrap bg-gradient-primary text-primary-foreground hover:opacity-90">
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Record
            </Button>
          </form>

          {formMessage && <div className="rounded-lg border border-buy/30 bg-buy/10 px-3 py-2 text-sm text-buy">{formMessage}</div>}
          {formError && <div className="rounded-lg border border-sell/30 bg-sell/10 px-3 py-2 text-sm text-sell">{formError}</div>}

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="text-[11px] text-muted-foreground uppercase tracking-wide border-b border-border/50">
                  <th className="text-left font-medium py-2 pr-4">Date</th>
                  <th className="text-left font-medium py-2 pr-4">Category</th>
                  <th className="text-right font-medium py-2 pr-4">Amount (BI2X)</th>
                  <th className="text-left font-medium py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {loading ? null : history.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground text-sm">
                      No distributions or burns recorded yet.
                    </td>
                  </tr>
                ) : (
                  history.map((h) => (
                    <tr key={h.id} className="border-b border-border/30 last:border-0">
                      <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">{new Date(h.eventDate).toLocaleString()}</td>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[h.category] ?? "#888" }} />
                          <span>{h.category}</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono whitespace-nowrap">{formatTokens(h.amountQty)}</td>
                      <td className="py-2.5 text-muted-foreground">{h.note || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
