import { FormEvent, useEffect, useState } from "react";
import { Loader2, Plus, Waves, TrendingUp, TrendingDown, Play, Square, Settings2, List, PlayCircle, StopCircle, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  listMarketMakers, createMarketMaker, deleteMarketMaker, depositMarketMaker, withdrawMarketMaker,
  setMarketMakerEnabled, updateMarketMakerConfig, getMarketMakerHistory, getMarketMakerOrders,
  startAllMarketMakers, stopAllMarketMakers,
  type MarketMaker, type MMFundingEntry, type MMOpenOrder,
} from "@/lib/marketMakerApi";
import type { BotMarket } from "@/lib/botsApi";

function fmt(v: string, dp = 2): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

// Config keys the admin can retune post-create (symbol is fixed at creation).
const EDITABLE_CONFIG: { key: string; label: string; def: string }[] = [
  { key: "spreadBps", label: "Half-Spread (bps)", def: "10" },
  { key: "levels", label: "Levels Per Side", def: "5" },
  { key: "levelStepBps", label: "Level Step (bps)", def: "5" },
  { key: "maxInventory", label: "Max Inventory (base)", def: "0" },
  { key: "requoteBps", label: "Re-quote Threshold (bps)", def: "3" },
];

export default function AdminMarketMakers() {
  const [desks, setDesks] = useState<MarketMaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAll, setBusyAll] = useState(false);
  const [error, setError] = useState("");

  const load = () =>
    listMarketMakers()
      .then((r) => setDesks(r.marketMakers ?? []))
      .catch((e) => setError(e.message || "Could not load market makers."))
      .finally(() => setLoading(false));

  useEffect(() => {
    document.title = "Market Makers | DEX.ai";
    load();
    // Live refresh: unrealized P/L moves with the index.
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  const patch = (mm: MarketMaker) =>
    setDesks((prev) => prev.map((d) => (d.id === mm.id ? mm : d)));

  const remove = (id: string) =>
    setDesks((prev) => prev.filter((d) => d.id !== id));

  const runAll = async (fn: () => Promise<{ marketMakers: MarketMaker[] }>) => {
    setBusyAll(true);
    setError("");
    try {
      setDesks((await fn()).marketMakers ?? []);
    } catch (e: any) {
      setError(e.message || "Bulk action failed.");
    } finally {
      setBusyAll(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Waves className="h-7 w-7 text-primary" /> Market Makers
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Fund treasury-backed desks and manage two-sided liquidity per market
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={busyAll || !desks.length} onClick={() => runAll(startAllMarketMakers)}>
              <PlayCircle className="h-4 w-4 mr-1" /> Start All
            </Button>
            <Button variant="outline" size="sm" disabled={busyAll || !desks.length} onClick={() => runAll(stopAllMarketMakers)}>
              <StopCircle className="h-4 w-4 mr-1" /> Stop All
            </Button>
            <CreateDeskDialog onCreated={load} />
          </div>
        </div>

        {error && (
          <div className="glass rounded-lg p-3 text-sm text-sell border border-sell/30">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading desks…
          </div>
        ) : desks.length === 0 ? (
          <div className="glass rounded-xl p-10 text-center text-muted-foreground">
            No market-maker desks yet. Create one to start providing liquidity.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {desks.map((d) => (
              <DeskCard key={d.id} desk={d} onChange={patch} onDeleted={remove} onError={setError} />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function DeskCard({
  desk, onChange, onDeleted, onError,
}: {
  desk: MarketMaker;
  onChange: (mm: MarketMaker) => void;
  onDeleted: (id: string) => void;
  onError: (msg: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const net = Number(desk.stats?.netPnl ?? "0");
  const netUp = net >= 0;

  const run = async (fn: () => Promise<MarketMaker>) => {
    setBusy(true);
    onError("");
    try {
      onChange(await fn());
    } catch (e: any) {
      onError(e.message || "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!window.confirm(`Delete the ${desk.symbol} ${desk.market} desk? Its ledger balance is returned and the desk is removed.`)) return;
    setBusy(true);
    onError("");
    try {
      await deleteMarketMaker(desk.id);
      onDeleted(desk.id);
    } catch (e: any) {
      onError(e.message || "Delete failed.");
      setBusy(false);
    }
  };

  return (
    <div className="glass rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{desk.symbol}</span>
            <Badge variant="outline" className="text-[10px]">{desk.market}</Badge>
            {desk.enabled ? (
              <Badge className="bg-buy/15 text-buy border-buy/30 text-[10px]">RUNNING</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">STOPPED</Badge>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">{desk.walletAddress}</div>
        </div>
        <Button
          size="sm"
          variant={desk.enabled ? "outline" : "default"}
          disabled={busy}
          onClick={() => run(() => setMarketMakerEnabled(desk.id, !desk.enabled))}
        >
          {desk.enabled ? <Square className="h-3.5 w-3.5 mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
          {desk.enabled ? "Stop" : "Start"}
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3 text-sm">
        <Stat label={`${desk.quoteAsset ?? "USDT"} (Buy)`} value={`$${fmt(desk.quoteBalance ?? desk.allocatedUsdc)}`} />
        <Stat label={`${desk.base} (Sell)`} value={desk.baseBalance ? `${fmt(desk.baseBalance)} ${desk.base}` : "—"} />
        <Stat
          label="Index"
          value={desk.indexPrice ? `$${fmt(desk.indexPrice)}` : "—"}
          sub={desk.indexFresh ? "fresh" : "stale"}
          subClass={desk.indexFresh ? "text-buy" : "text-sell"}
        />
        <Stat
          label="Net P/L"
          value={`${netUp ? "+" : ""}${fmt(desk.stats?.netPnl ?? "0")}`}
          valueClass={netUp ? "text-buy" : "text-sell"}
          icon={netUp ? TrendingUp : TrendingDown}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground">
        <div>Realized: <span className="text-foreground">{fmt(desk.stats?.realizedPnl ?? "0")}</span></div>
        <div>Unrealized: <span className="text-foreground">{fmt(desk.stats?.unrealizedPnl ?? "0")}</span></div>
        <div>ROI: <span className="text-foreground">{fmt(desk.stats?.roi ?? "0")}%</span></div>
      </div>

      <div className="flex gap-2">
        <FundDialog
          desk={desk}
          mode="deposit"
          disabled={busy}
          onDone={onChange}
          onError={onError}
        />
        <FundDialog
          desk={desk}
          mode="withdraw"
          disabled={busy}
          onDone={onChange}
          onError={onError}
        />
        <EditConfigDialog desk={desk} disabled={busy} onDone={onChange} onError={onError} />
        <DetailSheet desk={desk} onError={onError} />
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={del}
          title="Delete desk"
          className="text-sell hover:text-sell"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function Stat({
  label, value, sub, subClass, valueClass, icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  subClass?: string;
  valueClass?: string;
  icon?: any;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`font-semibold flex items-center gap-1 ${valueClass ?? ""}`}>
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {value}
      </div>
      {sub && <div className={`text-[10px] ${subClass ?? "text-muted-foreground"}`}>{sub}</div>}
    </div>
  );
}

function FundDialog({
  desk, mode, disabled, onDone, onError,
}: {
  desk: MarketMaker;
  mode: "deposit" | "withdraw";
  disabled: boolean;
  onDone: (mm: MarketMaker) => void;
  onError: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const isDeposit = mode === "deposit";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    onError("");
    try {
      const call = isDeposit ? depositMarketMaker : withdrawMarketMaker;
      onDone(await call(desk.id, amount, note));
      setOpen(false);
      setAmount("");
      setNote("");
    } catch (err: any) {
      onError(err.message || "Funding failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="flex-1" disabled={disabled}>
          {isDeposit ? "Deposit" : "Withdraw"}
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-strong border-glass-border">
        <DialogHeader>
          <DialogTitle>
            {isDeposit ? "Deposit to" : "Withdraw from"} {desk.symbol} {desk.market}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {isDeposit
              ? "Record USDC already moved into the treasury wallet. This credits the desk's on-engine balance."
              : "Record USDC removed from the treasury wallet. Blocked if the amount is locked behind live quotes."}
          </p>
          <div>
            <Label htmlFor="amount">Amount (USDC)</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder="10000"
            />
          </div>
          <div>
            <Label htmlFor="note">Note (optional)</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="tx hash / reason" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {isDeposit ? "Deposit" : "Withdraw"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditConfigDialog({
  desk, disabled, onDone, onError,
}: {
  desk: MarketMaker;
  disabled: boolean;
  onDone: (mm: MarketMaker) => void;
  onError: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Prefill from the desk's live config; blank fields left as-is are omitted
  // from the PATCH, so the server keeps existing values.
  const openWith = (o: boolean) => {
    if (o) {
      const seed: Record<string, string> = {};
      for (const f of EDITABLE_CONFIG) seed[f.key] = desk.config?.[f.key] || f.def;
      setForm(seed);
    }
    setOpen(o);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    onError("");
    try {
      const patch: Record<string, string> = {};
      for (const [k, v] of Object.entries(form)) if (v.trim() !== "") patch[k] = v.trim();
      onDone(await updateMarketMakerConfig(desk.id, patch));
      setOpen(false);
    } catch (err: any) {
      onError(err.message || "Config update failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={openWith}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" disabled={disabled} title="Edit config">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-strong border-glass-border">
        <DialogHeader>
          <DialogTitle>Edit {desk.symbol} config</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Retuning restarts the desk if it is running, so new params take effect immediately.
          </p>
          {EDITABLE_CONFIG.map((f) => (
            <div key={f.key}>
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input
                id={f.key}
                type="number"
                step="any"
                value={form[f.key] ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DetailSheet({ desk, onError }: { desk: MarketMaker; onError: (msg: string) => void }) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<MMFundingEntry[]>([]);
  const [orders, setOrders] = useState<MMOpenOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const openWith = async (o: boolean) => {
    setOpen(o);
    if (!o) return;
    setLoading(true);
    onError("");
    try {
      const [h, ord] = await Promise.all([
        getMarketMakerHistory(desk.id),
        getMarketMakerOrders(desk.id),
      ]);
      setHistory(h.history);
      setOrders(ord.orders ?? []);
    } catch (e: any) {
      onError(e.message || "Could not load desk detail.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={openWith}>
      <SheetTrigger asChild>
        <Button size="sm" variant="ghost" title="Detail">
          <List className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="glass-strong border-glass-border w-full sm:max-w-lg overflow-auto">
        <SheetHeader>
          <SheetTitle>{desk.symbol} {desk.market}</SheetTitle>
        </SheetHeader>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : (
          <Tabs defaultValue="orders" className="mt-4">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="orders">Open Orders ({orders.length})</TabsTrigger>
              <TabsTrigger value="history">Funding ({history.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="orders" className="mt-3">
              {orders.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">No resting orders.</div>
              ) : (
                <div className="space-y-1">
                  {orders.map((o) => (
                    <div key={o.id} className="flex items-center justify-between text-xs glass rounded p-2">
                      <span className={o.side === "BUY" ? "text-buy" : "text-sell"}>{o.side}</span>
                      <span className="font-mono">{fmt(o.price)}</span>
                      <span className="font-mono text-muted-foreground">{fmt(o.qty, 4)}</span>
                      <span className="text-muted-foreground">{o.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="history" className="mt-3">
              {history.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">No funding events.</div>
              ) : (
                <div className="space-y-1">
                  {history.map((h) => (
                    <div key={h.id} className="text-xs glass rounded p-2 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className={h.direction === "deposit" ? "text-buy" : "text-sell"}>
                          {h.direction === "deposit" ? "+" : "−"}{fmt(h.amount)}
                        </span>
                        <span className="text-muted-foreground">bal {fmt(h.balanceAfter)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{new Date(h.createdAt).toLocaleString()}</span>
                        <span>by {h.adminId || "—"}</span>
                      </div>
                      {h.note && <div className="text-[10px] text-muted-foreground">{h.note}</div>}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CreateDeskDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [base, setBase] = useState("");
  const [symbol, setSymbol] = useState("");
  const [market, setMarket] = useState<BotMarket>("SPOT");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await createMarketMaker({ base: base.trim().toUpperCase(), market, symbol: symbol.trim().toUpperCase() });
      setOpen(false);
      setBase("");
      setSymbol("");
      onCreated();
    } catch (err: any) {
      setError(err.message || "Could not create desk.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1" /> New Desk</Button>
      </DialogTrigger>
      <DialogContent className="glass-strong border-glass-border">
        <DialogHeader>
          <DialogTitle>Create Market-Maker Desk</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {error && <div className="text-sm text-sell">{error}</div>}
          <div>
            <Label htmlFor="base">Base Asset</Label>
            <Input id="base" value={base} onChange={(e) => setBase(e.target.value)} required placeholder="BTC" />
          </div>
          <div>
            <Label htmlFor="symbol">Trading Pair</Label>
            <Input id="symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} required placeholder="BTC-USDC" />
          </div>
          <div>
            <Label>Market</Label>
            <Select value={market} onValueChange={(v) => setMarket(v as BotMarket)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SPOT">Spot</SelectItem>
                <SelectItem value="FUTURES">Futures</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
