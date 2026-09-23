import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { CreateBotModal } from "@/components/bots/CreateBotModal";
import { cn } from "@/lib/utils";
import {
  Activity,
  BarChart3,
  Bot as BotIcon,
  CircleDollarSign,
  Crosshair,
  Grid3X3,
  Info,
  LineChart,
  RefreshCcw,
  Scale,
  Settings2,
  SlidersHorizontal,
  Snowflake,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  deleteBot,
  getMyBots,
  getTemplates,
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
  options_market_maker: Scale,
};

export default function TradingBots() {
  const [category, setCategory] = useState<BotCategory>("All");

  const [templates, setTemplates] = useState<BotTemplate[]>([]);
  const [createTemplate, setCreateTemplate] = useState<BotTemplate | null>(null);

  const [myBots, setMyBots] = useState<Bot[]>([]);
  const [authed, setAuthed] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // Templates (public; works logged out).
  useEffect(() => {
    getTemplates()
      .then((r) => setTemplates(r.templates))
      .catch(() => setTemplates([]));
  }, []);

  const visibleTemplates = useMemo(() => {
    const list = (templates.length > 0
      ? templates
      : FALLBACK_TEMPLATES.map((t) => ({ ...t, params: [] } as BotTemplate))
    ).filter((t) => t.available);
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
                    onClick={() => setCreateTemplate(t)}
                    className="rounded-2xl border border-border/60 bg-card/60 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5"
                  >
                    <Icon className="mb-4 h-5 w-5 text-primary" />
                    <div className="font-bold">{t.title}</div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{t.desc}</p>
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

/* ---------- shared helpers ---------- */

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

// AI Agent bot creation is disabled — it never created a real bot (no
// botsApi call, pure simulated frontend state), so the button is disabled
// rather than wired to the commented-out /ai-agent route. Re-enable by
// restoring the onClick + route in App.tsx once a real AI-driven bot
// creation flow exists.
function CreateBotButton() {
  return (
    <button
      type="button"
      disabled
      className="group relative isolate inline-flex h-11 cursor-not-allowed items-center gap-2 overflow-hidden rounded-full border border-border/50 bg-muted/20 px-4 text-sm font-bold text-muted-foreground opacity-60"
      aria-label="Create AI Agent (coming soon)"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted/40 text-muted-foreground">
        <BotIcon className="h-4 w-4" />
      </span>
      <span>Create AI Agent</span>
      <span className="pointer-events-none absolute right-0 top-full mt-2 w-max max-w-[220px] translate-y-1 rounded-lg border border-border bg-popover px-3 py-2 text-xs font-semibold text-popover-foreground opacity-0 shadow-xl transition-all group-hover:translate-y-0 group-hover:opacity-100">
        Coming soon
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
