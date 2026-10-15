import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeDollarSign, History, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getAdminP2PPriceHistory, getAdminP2PPrices, setAdminP2PPrice, type AdminP2PPrice } from "@/lib/adminApi";
import { formatFiat, formatFiatPrice } from "@/lib/p2pApi";
import { useP2PCatalog } from "@/lib/p2pCatalog";

// A change bigger than this asks for confirmation first — a misplaced decimal
// point here reprices every new ad in that currency.
const CONFIRM_CHANGE_PCT = 20;

const errorText = (cause: unknown, fallback: string) => {
  const raw = cause instanceof Error ? cause.message : "";
  try { const parsed = JSON.parse(raw) as { error?: string }; if (parsed.error) return parsed.error; } catch { /* plain text */ }
  return raw || fallback;
};

export default function AdminP2PPrices() {
  const { countries } = useP2PCatalog();
  const [prices, setPrices] = useState<AdminP2PPrice[]>([]);
  const [assets, setAssets] = useState<string[]>([]);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState("");
  const [history, setHistory] = useState<{ currency: string; rows: AdminP2PPrice[] } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await getAdminP2PPrices();
      setPrices(r.prices); setAssets(r.assets); setCurrencies(r.currencies); setError("");
    } catch (cause) { setError(errorText(cause, "Could not load P2P prices")); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { document.title = "P2P Prices | BitDx"; void load(); }, [load]);

  const byPair = useMemo(() => new Map(prices.map(p => [`${p.asset}:${p.fiatCurrency}`, p])), [prices]);
  const nameOf = (currency: string) => countries.find(c => c.currency === currency)?.name ?? currency;
  const reference = (currency: string) => byPair.get(`${assets[0]}:${currency}`);

  async function save(currency: string) {
    const draft = (drafts[currency] ?? "").trim();
    const current = Number(reference(currency)?.price);
    const next = Number(draft);
    if (!/^\d+(\.\d{1,8})?$/.test(draft) || !(next > 0)) { setError(`Enter a positive price for ${currency} (up to 8 decimals).`); return; }
    if (current > 0) {
      const change = Math.abs((next - current) / current) * 100;
      if (change > CONFIRM_CHANGE_PCT && !window.confirm(`This changes the ${currency} price by ${change.toFixed(1)}% (${formatFiatPrice(current, currency)} → ${formatFiatPrice(next, currency)}). Continue?`)) return;
    }
    try {
      setSaving(currency); setError(""); setNotice("");
      await setAdminP2PPrice(currency, draft);
      setDrafts(d => ({ ...d, [currency]: "" }));
      setNotice(`${currency} price set to ${formatFiat(draft, currency)} for ${assets.join(", ")}. New ads use it from now on.`);
      await load();
    } catch (cause) { setError(errorText(cause, "Could not save price")); }
    finally { setSaving(""); }
  }

  async function openHistory(currency: string) {
    try { setHistory({ currency, rows: (await getAdminP2PPriceHistory(assets[0] ?? "BI2XUSD", currency)).history }); }
    catch (cause) { setError(errorText(cause, "Could not load price history")); }
  }

  return <AdminLayout><main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
    <div>
      <h1 className="flex items-center gap-2 text-3xl font-bold"><BadgeDollarSign className="h-7 w-7 text-primary" />P2P Prices</h1>
      <p className="mt-1 text-sm text-muted-foreground">The price of one BI2XUSD / USDT / USDC in each local currency, used for every new P2P ad. A price stays in force until you set a new one — it does not expire at midnight. Ads already posted keep the price they were created at.</p>
    </div>
    {error && <Card className="border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</Card>}
    {notice && <Card className="border-buy/30 bg-buy/10 p-3 text-sm text-buy">{notice}</Card>}
    {loading ? <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading prices…</div> : <Card className="overflow-hidden">
      <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm">
        <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground"><tr>
          <th className="p-3">Country</th><th className="p-3">Currency</th>
          {assets.map(a => <th key={a} className="p-3">{a}</th>)}
          <th className="p-3">In force since</th><th className="p-3">New price (all assets)</th><th className="p-3" />
        </tr></thead>
        <tbody>{currencies.map(currency => {
          const ref = reference(currency);
          const mixed = assets.some(a => byPair.get(`${a}:${currency}`)?.price !== ref?.price);
          return <tr key={currency} className="border-b last:border-0">
            <td className="p-3 font-medium">{nameOf(currency)}</td>
            <td className="p-3 font-mono">{currency}</td>
            {assets.map(a => { const p = byPair.get(`${a}:${currency}`); return <td key={a} className="p-3 font-mono">{p ? formatFiatPrice(p.price, currency) : <span className="text-muted-foreground">not set</span>}</td>; })}
            <td className="p-3 text-muted-foreground">{ref?.priceDate ?? "—"}{mixed && <span className="ml-2 text-xs text-warning">assets differ</span>}</td>
            <td className="p-3"><Input aria-label={`New ${currency} price`} className="h-9 w-36" inputMode="decimal" placeholder={ref ? String(Number(ref.price)) : "0.00"} value={drafts[currency] ?? ""} onChange={event => setDrafts(d => ({ ...d, [currency]: event.target.value }))} onKeyDown={event => { if (event.key === "Enter") void save(currency); }} /></td>
            <td className="p-3"><div className="flex justify-end gap-2"><Button size="sm" disabled={saving === currency || !(drafts[currency] ?? "").trim()} onClick={() => void save(currency)}>{saving === currency ? "Saving…" : "Set price"}</Button><Button size="sm" variant="outline" aria-label={`${currency} price history`} onClick={() => void openHistory(currency)}><History className="h-4 w-4" /></Button></div></td>
          </tr>;
        })}</tbody>
      </table></div>
    </Card>}
    <Dialog open={!!history} onOpenChange={open => !open && setHistory(null)}>
      <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{history?.currency} price history</DialogTitle><DialogDescription>Latest changes for {assets[0] ?? "BI2XUSD"}, newest first.</DialogDescription></DialogHeader>
        <div className="max-h-80 space-y-1 overflow-y-auto text-sm">{history?.rows.length === 0 ? <p className="text-muted-foreground">No history.</p> : history?.rows.map(row => <div key={`${row.priceDate}-${row.createdAt}`} className="flex justify-between border-b py-1.5 last:border-0"><span className="text-muted-foreground">{row.priceDate}</span><span className="font-mono">{formatFiatPrice(row.price, row.fiatCurrency)}</span></div>)}</div>
      </DialogContent>
    </Dialog>
  </main></AdminLayout>;
}
