import { FormEvent, useEffect, useState } from "react";
import { Loader2, Wallet, Search, PlusCircle, MinusCircle } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  searchAdminUsers, adjustUserBalance,
  type AdminUser, type AdjustBalanceDirection, type AdjustBalanceResult,
} from "@/lib/adminApi";

const ASSETS = ["BTC", "ETH", "SOL", "BNB", "BIUSD", "USDC", "USDT", "BI"];

// user_balances stores every asset as a raw integer scaled by 1e6 (see
// balanceRawScale in AdminServer.toRawUnits, and the same convention in
// p2pApi.ts's formatUSDC/parseUSDC). The API returns these raw values as-is,
// so this page must convert them for display.
function fromRaw(raw: string): string {
  const value = BigInt(raw || "0");
  const whole = value / 1_000_000n;
  const fraction = (value % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function fmt(rawOrPlain: string): string {
  const n = Number(fromRaw(rawOrPlain));
  if (!Number.isFinite(n)) return rawOrPlain;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

export default function AdminTestBalances() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [balances, setBalances] = useState<Record<string, string> | null>(null);

  const search = (q: string) => {
    setLoading(true);
    setError("");
    searchAdminUsers(q)
      .then((r) => setUsers(r.users ?? []))
      .catch((e) => setError(e.message || "Could not search users."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    document.title = "Test Balances | BitDx";
    search("");
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const onAdjusted = (r: AdjustBalanceResult) => setBalances(r.balances);

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-7 w-7 text-primary" /> Test Balances
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dev/testing only — manually credit or debit any user's wallet balance for one asset.
            This bypasses real deposits and trades entirely; there is no actual asset behind it.
          </p>
        </div>

        {error && (
          <div className="glass rounded-lg p-3 text-sm text-sell border border-sell/30">{error}</div>
        )}

        <div className="glass rounded-xl p-4 space-y-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by user id or wallet address…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Searching…
            </div>
          ) : users.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">No users found.</div>
          ) : (
            <div className="space-y-1 max-h-80 overflow-auto">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => { setSelected(u); setBalances(null); }}
                  className={`w-full text-left text-sm rounded p-2.5 transition-colors ${
                    selected?.id === u.id ? "bg-primary/15 border border-primary/40" : "glass hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono">{u.id}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">{u.walletType}</span>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono truncate">{u.walletAddress}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <AdjustPanel
            user={selected}
            balances={balances}
            onAdjusted={onAdjusted}
            onError={setError}
          />
        )}
      </div>
    </AdminLayout>
  );
}

function AdjustPanel({
  user, balances, onAdjusted, onError,
}: {
  user: AdminUser;
  balances: Record<string, string> | null;
  onAdjusted: (r: AdjustBalanceResult) => void;
  onError: (msg: string) => void;
}) {
  const [asset, setAsset] = useState("BTC");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<AdjustBalanceDirection>("credit");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    onError("");
    try {
      const result = await adjustUserBalance(user.id, asset, amount, direction);
      onAdjusted(result);
      setAmount("");
    } catch (err: any) {
      onError(err.message || "Balance adjustment failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass rounded-xl p-4 space-y-4">
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">Selected user</div>
        <div className="font-mono text-sm">{user.id}</div>
        <div className="font-mono text-xs text-muted-foreground truncate">{user.walletAddress}</div>
      </div>

      {balances && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs">
          {ASSETS.map((a) => (
            <div key={a} className="glass rounded p-2 text-center">
              <div className="text-muted-foreground">{a}</div>
              <div className="font-semibold">{fmt(balances[a] ?? "0")}</div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="grid sm:grid-cols-4 gap-3 items-end">
        <div>
          <Label htmlFor="asset">Asset</Label>
          <Select value={asset} onValueChange={setAsset}>
            <SelectTrigger id="asset"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ASSETS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="direction">Direction</Label>
          <Select value={direction} onValueChange={(v) => setDirection(v as AdjustBalanceDirection)}>
            <SelectTrigger id="direction"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="credit">Credit (add)</SelectItem>
              <SelectItem value="debit">Debit (remove)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            min="0"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="10"
          />
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : direction === "credit" ? <PlusCircle className="h-4 w-4 mr-1" /> : <MinusCircle className="h-4 w-4 mr-1" />}
          {direction === "credit" ? "Credit" : "Debit"}
        </Button>
      </form>
    </div>
  );
}
