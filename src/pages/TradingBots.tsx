import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CreateBotModal } from "@/components/bots/CreateBotModal";
import { cn } from "@/lib/utils";
import {
  Activity,
  BarChart3,
  Bot as BotIcon,
  ChevronDown,
  CircleDollarSign,
  Crosshair,
  Grid3X3,
  Info,
  LineChart,
  RefreshCcw,
  Settings2,
  SlidersHorizontal,
  Snowflake,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  copyBot,
  deleteBot,
  getMarketplace,
  getMyBots,
  getTemplates,
  MARKETPLACE_TABS,
  MARKETPLACE_TAB_TO_STRATEGY,
  startBot,
  stopBot,
  type Bot,
  type BotTemplate,
} from "@/lib/botsApi";

type BotCategory = "All" | "Spot" | "Futures";

// Fallback template metadata (title/desc/icon) used if the templates API is
// unreachable, so the page still renders. The API is the source of truth for
// params + availability when available.
const FALLBACK_TEMPLATES: { key: string; title: string; desc: string; category: "Spot" | "Futures"; available: boolean }[] = [
  { key: "spot_grid", title: "Spot Grid", desc: "Buy low and sell high with 24/7 range trading.", category: "Spot", available: true },
  { key: "futures_grid", title: "Futures Grid", desc: "Automate long and short futures grids.", category: "Futures", available: true },
  { key: "position_snowball", title: "Position Snowball", desc: "Compound floating profits into larger positions.", category: "Futures", available: false },
  { key: "futures_dca", title: "Futures DCA", desc: "Auto-scale entries and reduce timing risk.", category: "Futures", available: true },
  { key: "arbitrage", title: "Arbitrage Bot", desc: "Capture price and funding spread opportunities.", category: "Futures", available: false },
  { key: "rebalancing", title: "Rebalancing Bot", desc: "Keep a multi-coin portfolio aligned automatically.", category: "Spot", available: false },
  { key: "spot_dca", title: "Spot DCA", desc: "Lower average entry cost with recurring buys.", category: "Spot", available: true },
  { key: "spot_algo", title: "Spot Algo Orders", desc: "Split large spot orders into smaller blocks.", category: "Spot", available: false },
  { key: "futures_twap", title: "Futures TWAP", desc: "Reduce execution impact with time-sliced orders.", category: "Futures", available: true },
  { key: "futures_vp", title: "Futures VP", desc: "Match order size to market urgency levels.", category: "Futures", available: false },
];

const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  spot_grid: LineChart,
  futures_grid: Grid3X3,
  position_snowball: Snowflake,
  futures_dca: CircleDollarSign,
  arbitrage: Crosshair,
  rebalancing: Activity,
  spot_dca: RefreshCcw,
  spot_algo: Settings2,
  futures_twap: BarChart3,
  futures_vp: SlidersHorizontal,
};

export default function TradingBots() {
  const [category, setCategory] = useState<BotCategory>("All");
  const [marketplaceTab, setMarketplaceTab] = useState<string>(MARKETPLACE_TABS[0]);

  const [templates, setTemplates] = useState<BotTemplate[]>([]);
  const [createTemplate, setCreateTemplate] = useState<BotTemplate | null>(null);

  const [myBots, setMyBots] = useState<Bot[]>([]);
  const [authed, setAuthed] = useState(true);
  const [marketplaceBots, setMarketplaceBots] = useState<Bot[]>([]);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Templates (public; works logged out).
  useEffect(() => {
    getTemplates()
      .then((r) => setTemplates(r.templates))
      .catch(() => setTemplates([]));
  }, []);

  const visibleTemplates = useMemo(() => {
    const list = templates.length > 0
      ? templates
      : FALLBACK_TEMPLATES.map((t) => ({ ...t, params: [] } as BotTemplate));
    return category === "All" ? list : list.filter((t) => t.category === category);
  }, [templates, category]);

  // My bots (authed). Poll for live stats while the section is visible.
  const refreshMyBots = useCallback(async () => {
    try {
      const r = await getMyBots();
      setMyBots(r.bots ?? []);
      setAuthed(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (/401|unauthorized|not authenticated/i.test(msg)) setAuthed(false);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    refreshMyBots();
    const id = setInterval(refreshMyBots, 5000);
    return () => clearInterval(id);
  }, [authed, refreshMyBots]);

  // Marketplace (public). Refetch when the tab changes.
  useEffect(() => {
    const strategy = MARKETPLACE_TAB_TO_STRATEGY[marketplaceTab];
    getMarketplace(strategy)
      .then((r) => setMarketplaceBots(r.bots ?? []))
      .catch(() => setMarketplaceBots([]));
  }, [marketplaceTab]);

  const handleStart = async (id: string) => {
    setBusy(id);
    try {
      await startBot(id);
      await refreshMyBots();
    } finally {
      setBusy(null);
    }
  };
  const handleStop = async (id: string) => {
    setBusy(id);
    try {
      await stopBot(id);
      await refreshMyBots();
    } finally {
      setBusy(null);
    }
  };
  const handleDelete = async (id: string) => {
    setBusy(id);
    try {
      await deleteBot(id);
      await refreshMyBots();
    } finally {
      setBusy(null);
    }
  };
  const handleCopy = async (id: string) => {
    setBusy(id);
    try {
      await copyBot(id);
      setSelectedBot(null);
      setAuthed(true);
      await refreshMyBots();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (/401|unauthorized|not authenticated/i.test(msg)) setAuthed(false);
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppShell>
      <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background px-4 py-8">
        <div className="mx-auto max-w-7xl space-y-10">
          <section className="py-6">
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Trading Bots</h1>
          </section>

          {/* Create-bot templates */}
          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-6">
                {(["All", "Spot", "Futures"] as const).map((item) => (
                  <button
                    key={item}
                    onClick={() => setCategory(item)}
                    className={cn(
                      "relative pb-2 text-lg font-bold transition-colors",
                      category === item ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item}
                    {category === item && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />}
                  </button>
                ))}
              </div>
              <CreateBotButton />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {visibleTemplates.map((t) => {
                const Icon = TEMPLATE_ICONS[t.key] ?? BotIcon;
                return (
                  <button
                    key={t.key}
                    disabled={!t.available}
                    onClick={() => t.available && setCreateTemplate(t)}
                    className={cn(
                      "rounded-2xl border border-border/60 bg-card/60 p-5 text-left transition-all",
                      t.available
                        ? "hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5"
                        : "cursor-not-allowed opacity-60",
                    )}
                  >
                    <Icon className="mb-4 h-5 w-5 text-primary" />
                    <div className="font-bold">{t.title}</div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{t.desc}</p>
                    {!t.available && (
                      <span className="mt-3 inline-block rounded-full bg-muted/40 px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                        Coming soon
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* My bots (authed only) */}
          {authed && (
            <section className="space-y-5">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">My Bots</h2>
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>
              {myBots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You have no bots yet. Pick a template above to create one.
                </p>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {myBots.map((bot) => (
                    <MyBotCard
                      key={bot.id}
                      bot={bot}
                      busy={busy === bot.id}
                      onStart={() => handleStart(bot.id)}
                      onStop={() => handleStop(bot.id)}
                      onDelete={() => handleDelete(bot.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Marketplace */}
          <section className="space-y-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">Marketplace</h2>
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Copy live bot strategies or use them as templates for your own automation.
              </p>
            </div>

            <div className="flex gap-6 overflow-x-auto scrollbar-none">
              {MARKETPLACE_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setMarketplaceTab(tab)}
                  className={cn(
                    "relative shrink-0 pb-2 text-base font-bold transition-colors",
                    marketplaceTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab}
                  {marketplaceTab === tab && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />}
                </button>
              ))}
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {marketplaceBots.length === 0 ? (
                <p className="text-sm text-muted-foreground">No public bots in this category yet.</p>
              ) : (
                marketplaceBots.map((bot) => (
                  <MarketplaceCard key={bot.id} bot={bot} onCopy={() => setSelectedBot(bot)} />
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      <CreateBotModal
        template={createTemplate}
        onClose={() => setCreateTemplate(null)}
        onCreated={() => {
          setAuthed(true);
          refreshMyBots();
        }}
      />
      <BotDetailDialog bot={selectedBot} busy={busy === selectedBot?.id} onCopy={() => selectedBot && handleCopy(selectedBot.id)} onClose={() => setSelectedBot(null)} />
    </AppShell>
  );
}

/* ---------- My bots ---------- */

function MyBotCard({
  bot,
  busy,
  onStart,
  onStop,
  onDelete,
}: {
  bot: Bot;
  busy: boolean;
  onStart: () => void;
  onStop: () => void;
  onDelete: () => void;
}) {
  const net = parseFloat(bot.stats.netPnl || "0");
  const roi = parseFloat(bot.stats.roi || "0");
  const positive = net >= 0;
  return (
    <div className="rounded-2xl border border-border/60 bg-card/65 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-black">{bot.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {bot.symbol} · {strategyLabel(bot.strategy)} · {bot.market}
          </div>
        </div>
        <StatusBadge status={bot.status} running={bot.isRunning} />
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
        <Metric label="Net PNL" value={fmtSigned(net)} positive={positive} />
        <Metric label="ROI" value={`${positive ? "+" : ""}${roi.toFixed(2)}%`} positive={positive} />
        <Metric label="Runtime" value={formatRuntime(bot.stats.runtimeSec)} />
        <Metric label="Matched Trades" value={String(bot.stats.matchedTrades)} />
        <Metric label="24H Trades" value={String(bot.stats.trades24h)} />
        <Metric label="7D MDD" value={`${parseFloat(bot.stats.maxDrawdownPct || "0").toFixed(2)}%`} />
      </div>

      {bot.error && (
        <div className="mb-3 rounded-md border border-sell/40 bg-sell/10 px-3 py-1.5 text-xs text-sell">{bot.error}</div>
      )}

      <div className="flex gap-2">
        {bot.isRunning ? (
          <Button variant="outline" size="sm" onClick={onStop} disabled={busy} className="flex-1">
            {busy ? "Stopping…" : "Stop"}
          </Button>
        ) : (
          <Button size="sm" onClick={onStart} disabled={busy} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
            {busy ? "Starting…" : "Start"}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onDelete} disabled={busy} aria-label="Delete bot">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function StatusBadge({ status, running }: { status: string; running: boolean }) {
  const label = running ? "Running" : status;
  const tone = running
    ? "bg-buy/15 text-buy"
    : status === "error"
      ? "bg-sell/15 text-sell"
      : "bg-muted/40 text-muted-foreground";
  return <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize", tone)}>{label}</span>;
}

/* ---------- Marketplace ---------- */

function MarketplaceCard({ bot, onCopy }: { bot: Bot; onCopy: () => void }) {
  const net = parseFloat(bot.stats.netPnl || "0");
  const roi = parseFloat(bot.stats.roi || "0");
  const positive = net >= 0;
  const spark = sparkFromBot(bot);
  return (
    <button
      type="button"
      onClick={onCopy}
      className="group rounded-2xl border border-border/60 bg-card/65 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-black">{bot.symbol}</div>
          <div className="mt-1 text-xs text-muted-foreground">{strategyLabel(bot.strategy)} · {bot.name}</div>
        </div>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onCopy();
          }}
          className="bg-warning text-black hover:bg-warning/90"
        >
          Copy
        </Button>
      </div>

      <div className="mb-5 grid grid-cols-[1fr_auto] items-center gap-4">
        <div>
          <div className="text-xs text-muted-foreground">PNL</div>
          <div className={cn("mt-2 font-mono text-3xl font-black", positive ? "text-buy" : "text-sell")}>
            {fmtSigned(net)}
          </div>
        </div>
        <MiniSpark data={spark} />
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <Metric label="ROI" value={`${positive ? "+" : ""}${roi.toFixed(2)}%`} positive={positive} />
        <Metric label="Runtime" value={formatRuntime(bot.stats.runtimeSec)} />
        <Metric label="Min. Investment" value={bot.investment} />
        <Metric label="24H/Total Matched Trades" value={`${bot.stats.trades24h}/${bot.stats.matchedTrades}`} />
        <Metric label="7D MDD" value={`${parseFloat(bot.stats.maxDrawdownPct || "0").toFixed(2)}%`} />
      </div>
    </button>
  );
}

function BotDetailDialog({
  bot,
  busy,
  onCopy,
  onClose,
}: {
  bot: Bot | null;
  busy: boolean;
  onCopy: () => void;
  onClose: () => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const net = parseFloat(bot?.stats.netPnl || "0");
  const roi = parseFloat(bot?.stats.roi || "0");
  const positive = net >= 0;
  return (
    <Dialog open={Boolean(bot)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl overflow-hidden border border-border bg-card p-0 text-foreground shadow-2xl dark:bg-card/95">
        {bot && (
          <div className="grid min-h-[520px] lg:grid-cols-[0.95fr_1fr]">
            <div className="border-b border-border/60 p-6 lg:border-b-0 lg:border-r">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-black">{bot.symbol}</h3>
                    <span className={cn("font-mono text-sm font-bold", positive ? "text-buy" : "text-sell")}>
                      {positive ? "+" : ""}
                      {roi.toFixed(2)}%
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{strategyLabel(bot.strategy)} · {bot.name}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="font-bold">Profit History</h4>
                  <span className="rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary">ROI</span>
                </div>
                <DialogProfitChart data={sparkFromBot(bot)} />
              </div>

              <div className="mt-6 rounded-2xl border border-border/60 bg-background/40 p-4">
                <h4 className="mb-4 font-bold">Basic Info</h4>
                <div className="space-y-3">
                  <InfoRow label="Runtime" value={formatRuntime(bot.stats.runtimeSec)} />
                  <InfoRow label="24H/Total Matched Trades" value={`${bot.stats.trades24h}/${bot.stats.matchedTrades}`} />
                  <InfoRow label="7D MDD" value={`${parseFloat(bot.stats.maxDrawdownPct || "0").toFixed(2)}%`} />
                  <InfoRow label="Net PNL" value={fmtSigned(net)} />
                  <InfoRow label="Min. Investment" value={bot.investment} />
                </div>
              </div>
            </div>

            <div className="flex flex-col p-6">
              <p className="mb-5 text-sm text-muted-foreground">
                Copy this bot to clone its configuration into a new bot under your account. Market conditions differ, so
                historical results cannot guarantee future performance.
              </p>
              <button
                type="button"
                onClick={() => setAdvancedOpen((o) => !o)}
                className="flex items-center justify-between rounded-xl py-3 text-left font-bold text-muted-foreground hover:text-foreground"
              >
                Configuration
                <ChevronDown className={cn("h-4 w-4 transition-transform", advancedOpen && "rotate-180")} />
              </button>
              {advancedOpen && (
                <div className="mt-2 space-y-2 rounded-2xl border border-border/60 bg-background/45 p-4">
                  {Object.entries(bot.config).map(([k, v]) => (
                    <InfoRow key={k} label={k} value={String(v)} />
                  ))}
                  {Object.keys(bot.config).length === 0 && (
                    <p className="text-sm text-muted-foreground">No custom parameters.</p>
                  )}
                </div>
              )}
              <div className="flex-1" />
              <Button
                onClick={onCopy}
                disabled={busy}
                className="ml-auto w-full bg-warning text-black hover:bg-warning/90 sm:w-44"
              >
                {busy ? "Copying…" : "Copy Bot"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------- shared helpers ---------- */

function MiniSpark({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 48 - ((value - min) / (max - min || 1)) * 40;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 52" className="h-14 w-28 overflow-visible">
      <path d="M0 48 H100" stroke="hsl(var(--border))" strokeDasharray="2 3" strokeWidth="1" />
      <polyline points={points} fill="none" stroke="hsl(var(--buy))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DialogProfitChart({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data
    .map((value, index) => {
      const x = 46 + (index / (data.length - 1)) * 152;
      const y = 98 - ((value - min) / (max - min || 1)) * 58;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <div className="relative h-36 overflow-hidden rounded-xl bg-muted/20">
      <svg viewBox="0 0 220 122" className="h-full w-full">
        {[40, 62, 84, 106].map((y) => (
          <line key={y} x1="42" x2="200" y1={y} y2={y} stroke="hsl(var(--border))" strokeDasharray="3 3" />
        ))}
        <polyline points={points} fill="none" stroke="hsl(var(--buy))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={`M${points} L198 106 L46 106 Z`} fill="hsl(var(--buy) / 0.08)" />
      </svg>
    </div>
  );
}

function Metric({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={cn("font-mono text-xs font-bold", positive === undefined ? "" : positive ? "text-buy" : "text-sell")}>
        {value}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-bold">{value}</span>
    </div>
  );
}

function CreateBotButton() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate("/ai-agent")}
      className="group relative isolate inline-flex h-11 items-center gap-2 overflow-hidden rounded-full border border-primary/35 bg-primary/10 px-4 text-sm font-bold text-primary transition-all hover:-translate-y-0.5 hover:border-primary/70 hover:bg-primary hover:text-primary-foreground hover:shadow-[0_18px_45px_hsl(var(--primary)/0.25)]"
      aria-label="Create your own bot by yourself"
    >
      <span className="absolute inset-y-0 -left-10 -z-10 w-8 rotate-12 bg-white/35 opacity-0 blur-sm transition-all duration-500 group-hover:left-[120%] group-hover:opacity-100" />
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:rotate-12 group-hover:scale-110 group-hover:bg-primary-foreground group-hover:text-primary">
        <BotIcon className="h-4 w-4" />
      </span>
      <span>Create Bot</span>
      <span className="pointer-events-none absolute right-0 top-full mt-2 w-max max-w-[220px] translate-y-1 rounded-lg border border-border bg-popover px-3 py-2 text-xs font-semibold text-popover-foreground opacity-0 shadow-xl transition-all group-hover:translate-y-0 group-hover:opacity-100">
        Create your own bot by yourself
      </span>
    </button>
  );
}

function strategyLabel(key: string): string {
  const titles: Record<string, string> = {
    spot_grid: "Spot Grid",
    futures_grid: "Futures Grid",
    position_snowball: "Position Snowball",
    futures_dca: "Futures DCA",
    arbitrage: "Arbitrage",
    rebalancing: "Rebalancing",
    spot_dca: "Spot DCA",
    spot_algo: "Spot Algo",
    futures_twap: "Futures TWAP",
    futures_vp: "Futures VP",
  };
  return titles[key] ?? key;
}

function formatRuntime(sec: number): string {
  if (!sec || sec < 0) return "0m";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtSigned(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

// sparkFromBot builds a sparkline from the bot's persisted equity samples
// (state.equity = [{ms,val}]); falls back to a flat line derived from net PnL.
function sparkFromBot(bot: Bot): number[] {
  const state = bot.state as { equity?: { ms: number; val: string }[] } | undefined;
  const eq = state?.equity;
  if (eq && eq.length >= 2) {
    return eq.map((p) => parseFloat(p.val) || 0);
  }
  const net = parseFloat(bot.stats.netPnl || "0");
  const base = 10;
  return [base, base + net * 0.2, base + net * 0.5, base + net * 0.7, base + net];
}
