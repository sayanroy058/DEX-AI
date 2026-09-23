import { useEffect, useMemo, useState } from "react";
import { Loader2, Radio, Save, Waves } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  listMarketMakers, updateMarketMakerConfig, type MarketMaker,
} from "@/lib/marketMakerApi";

function fmt(v: string | undefined, dp = 2): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

// Live bid/ask off the desk's own index+config, mirroring what the bot
// actually quotes at rest (before any drift-recovery widening kicks in):
// bid = index * (1 - spreadBps/10000), ask = index * (1 + spreadBps/10000).
function impliedQuotes(desk: MarketMaker, spreadBps: number): { bid: number; ask: number; spreadPct: number } | null {
  const index = Number(desk.indexPrice);
  if (!Number.isFinite(index) || index <= 0 || !Number.isFinite(spreadBps)) return null;
  const half = spreadBps / 10000;
  const bid = index * (1 - half);
  const ask = index * (1 + half);
  return { bid, ask, spreadPct: (half * 2) * 100 };
}

type Row = {
  desk: MarketMaker;
  draft: string;
  saving: boolean;
  dirty: boolean;
};

export default function AdminSpreadControl() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [market, setMarket] = useState<"ALL" | "SPOT" | "FUTURES" | "OPTIONS">("ALL");

  const load = () =>
    listMarketMakers()
      .then((r) => {
        setRows((prev) => {
          const prevByID = new Map(prev.map((row) => [row.desk.id, row]));
          return (r.marketMakers ?? []).map((d) => {
            const existing = prevByID.get(d.id);
            // Preserve an in-flight edit instead of clobbering it on the poll tick.
            if (existing?.dirty) return { ...existing, desk: d };
            return { desk: d, draft: d.config?.spreadBps ?? "", saving: false, dirty: false };
          });
        });
      })
      .catch((e) => setError(e.message || "Could not load market makers."))
      .finally(() => setLoading(false));

  useEffect(() => {
    document.title = "Spread Control | BitDx";
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(
    () => rows.filter((row) => market === "ALL" || row.desk.market?.toUpperCase() === market),
    [rows, market]
  );

  const setDraft = (id: string, value: string) =>
    setRows((prev) => prev.map((row) => (row.desk.id === id ? { ...row, draft: value, dirty: true } : row)));

  const save = async (id: string) => {
    const row = rows.find((r) => r.desk.id === id);
    if (!row) return;
    const value = row.draft.trim();
    const n = Number(value);
    if (!value || !Number.isFinite(n) || n <= 0) {
      setError("Half-spread must be a positive number of basis points.");
      return;
    }
    setError("");
    setRows((prev) => prev.map((r) => (r.desk.id === id ? { ...r, saving: true } : r)));
    try {
      const updated = await updateMarketMakerConfig(id, { spreadBps: value });
      setRows((prev) =>
        prev.map((r) =>
          r.desk.id === id ? { desk: updated, draft: updated.config?.spreadBps ?? value, saving: false, dirty: false } : r
        )
      );
    } catch (e: any) {
      setError(e.message || "Could not update spread.");
      setRows((prev) => prev.map((r) => (r.desk.id === id ? { ...r, saving: false } : r)));
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Radio className="h-7 w-7 text-primary" /> Spread Control
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tune each desk's half-spread directly. Saving restarts the desk immediately with the new value —
            no need to open the full market-maker editor for this one knob.
          </p>
        </div>

        {error && (
          <div className="glass rounded-lg p-3 text-sm text-sell border border-sell/30">{error}</div>
        )}

        <Tabs value={market} onValueChange={(v) => setMarket(v as typeof market)}>
          <TabsList>
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="SPOT">Spot</TabsTrigger>
            <TabsTrigger value="FUTURES">Futures</TabsTrigger>
            <TabsTrigger value="OPTIONS">Options</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading desks…
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-xl p-10 text-center text-muted-foreground">
            No desks{market === "ALL" ? "" : ` on ${market}`} yet.
          </div>
        ) : (
          <div className="glass rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_repeat(4,minmax(0,1fr))_auto] gap-3 px-4 py-2 text-[10px] uppercase tracking-wide text-muted-foreground border-b border-glass-border">
              <div>Desk</div>
              <div>Index</div>
              <div>Implied Bid / Ask</div>
              <div>Total Spread</div>
              <div>Half-Spread (bps)</div>
              <div />
            </div>
            {filtered.map((row) => {
              const spreadBps = Number(row.draft);
              const quotes = impliedQuotes(row.desk, spreadBps);
              return (
                <div
                  key={row.desk.id}
                  className="grid grid-cols-[1fr_repeat(4,minmax(0,1fr))_auto] gap-3 px-4 py-3 items-center border-b border-glass-border last:border-b-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Waves className="h-3.5 w-3.5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{row.desk.symbol}</div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[9px] px-1 py-0">{row.desk.market}</Badge>
                        {row.desk.enabled ? (
                          <Badge className="bg-buy/15 text-buy border-buy/30 text-[9px] px-1 py-0">RUNNING</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground">STOPPED</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="font-mono text-sm">
                    {row.desk.indexPrice ? `$${fmt(row.desk.indexPrice)}` : "—"}
                    {!row.desk.indexFresh && (
                      <div className="text-[10px] text-sell">stale</div>
                    )}
                  </div>
                  <div className="font-mono text-sm">
                    {quotes ? (
                      <>
                        <span className="text-buy">{fmt(String(quotes.bid))}</span>
                        {" / "}
                        <span className="text-sell">{fmt(String(quotes.ask))}</span>
                      </>
                    ) : "—"}
                  </div>
                  <div className="font-mono text-sm">
                    {quotes ? `${quotes.spreadPct.toFixed(2)}%` : "—"}
                  </div>
                  <div>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={row.draft}
                      onChange={(e) => setDraft(row.desk.id, e.target.value)}
                      className="h-8 font-mono"
                    />
                  </div>
                  <Button
                    size="sm"
                    disabled={row.saving || !row.dirty}
                    onClick={() => save(row.desk.id)}
                  >
                    {row.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
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
