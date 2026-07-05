import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Activity,
  BarChart3,
  Bot,
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
} from "lucide-react";

type BotCategory = "All" | "Spot" | "Futures";
type MarketplaceTab = "Spot Grid" | "Futures Grid" | "Futures DCA" | "Arbitrage";

type BotType = {
  title: string;
  desc: string;
  category: Exclude<BotCategory, "All">;
  icon: typeof Grid3X3;
};

type Strategy = {
  pair: string;
  type: MarketplaceTab;
  users: number;
  pnl: number;
  roi: number;
  runtime: string;
  investment: string;
  trades: string;
  mdd: number;
  spark: number[];
};

const BOT_TYPES: BotType[] = [
  { title: "Spot Grid", desc: "Buy low and sell high with 24/7 range trading.", category: "Spot", icon: LineChart },
  { title: "Futures Grid", desc: "Automate long and short futures grids.", category: "Futures", icon: Grid3X3 },
  { title: "Position Snowball", desc: "Compound floating profits into larger positions.", category: "Futures", icon: Snowflake },
  { title: "Futures DCA", desc: "Auto-scale entries and reduce timing risk.", category: "Futures", icon: CircleDollarSign },
  { title: "Arbitrage Bot", desc: "Capture price and funding spread opportunities.", category: "Futures", icon: Crosshair },
  { title: "Rebalancing Bot", desc: "Keep a multi-coin portfolio aligned automatically.", category: "Spot", icon: Activity },
  { title: "Spot DCA", desc: "Lower average entry cost with recurring buys.", category: "Spot", icon: RefreshCcw },
  { title: "Spot Algo Orders", desc: "Split large spot orders into smaller blocks.", category: "Spot", icon: Settings2 },
  { title: "Futures TWAP", desc: "Reduce execution impact with time-sliced orders.", category: "Futures", icon: BarChart3 },
  { title: "Futures VP", desc: "Match order size to market urgency levels.", category: "Futures", icon: SlidersHorizontal },
];

const STRATEGIES: Strategy[] = [
  { pair: "ASTER/USDN", type: "Spot Grid", users: 9, pnl: 2040.51, roi: 4.31, runtime: "5d 9h 54m", investment: "376.820 USDN", trades: "46/61", mdd: 3.89, spark: [18, 20, 17, 16, 21, 23, 30, 42, 39, 45] },
  { pair: "TON/USDN", type: "Spot Grid", users: 16, pnl: 1255.73, roi: 8.8, runtime: "2d 34m", investment: "280.423 USDN", trades: "30/47", mdd: 2.71, spark: [10, 11, 9, 12, 16, 24, 28, 35, 41, 47] },
  { pair: "ADA/USDN", type: "Spot Grid", users: 99, pnl: 904.85, roi: 2.54, runtime: "3d 9h 39m", investment: "293.8302 USDN", trades: "3/19", mdd: 1.8, spark: [24, 28, 26, 34, 31, 33, 37, 35, 39, 36] },
  { pair: "TON/USDC", type: "Futures Grid", users: 73, pnl: 783.88, roi: 13.56, runtime: "6d 22h 2m", investment: "64.368 USDC", trades: "9/65", mdd: 6.96, spark: [11, 24, 29, 25, 24, 27, 26, 30, 34, 35] },
  { pair: "FET/BTC", type: "Futures DCA", users: 20, pnl: 771.07, roi: 10.47, runtime: "5d 28m", investment: "0.00373685 BTC", trades: "11/60", mdd: 6.81, spark: [8, 13, 15, 12, 18, 17, 21, 25, 32, 36] },
  { pair: "GENIUS/USDN", type: "Arbitrage", users: 2, pnl: 488.33, roi: 1.05, runtime: "1d 16h 13m", investment: "1,140.0608 USDN", trades: "500/769", mdd: 4.77, spark: [29, 25, 27, 23, 28, 26, 35, 48, 31, 38] },
];

const MARKETPLACE_TABS: MarketplaceTab[] = ["Spot Grid", "Futures Grid", "Futures DCA", "Arbitrage"];

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

export default function TradingBots() {
  const [category, setCategory] = useState<BotCategory>("All");
  const [marketplaceTab, setMarketplaceTab] = useState<MarketplaceTab>("Spot Grid");
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);

  const visibleBotTypes = category === "All" ? BOT_TYPES : BOT_TYPES.filter((bot) => bot.category === category);
  const visibleStrategies = STRATEGIES.filter((strategy) => strategy.type === marketplaceTab);
  const listedStrategies = visibleStrategies.length > 0 ? visibleStrategies : STRATEGIES.slice(0, 3);

  return (
    <AppShell>
      <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background px-4 py-8">
        <div className="mx-auto max-w-7xl space-y-10">
          <section className="py-6">
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Trading Bots</h1>
          </section>

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
              <div className="flex items-center gap-2">
                <CreateBotButton />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {visibleBotTypes.map((bot) => (
                <button
                  key={bot.title}
                  className="rounded-2xl border border-border/60 bg-card/60 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5"
                >
                  <bot.icon className="mb-4 h-5 w-5 text-primary" />
                  <div className="font-bold">{bot.title}</div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{bot.desc}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold">Marketplace</h2>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Copy live bot strategies or use them as templates for your own automation.</p>
              </div>
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
              {listedStrategies.map((strategy) => (
                <StrategyCard key={`${strategy.type}-${strategy.pair}`} strategy={strategy} onCopy={() => setSelectedStrategy(strategy)} />
              ))}
            </div>
          </section>
        </div>
      </div>

      <StrategyDialog strategy={selectedStrategy} onClose={() => setSelectedStrategy(null)} />
    </AppShell>
  );
}

function StrategyCard({ strategy, onCopy }: { strategy: Strategy; onCopy: () => void }) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className="group rounded-2xl border border-border/60 bg-card/65 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-black">{strategy.pair}</div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <UsersTiny /> {strategy.users}
          </div>
        </div>
        <Button
          onClick={(event) => {
            event.stopPropagation();
            onCopy();
          }}
          className="bg-warning text-black hover:bg-warning/90"
        >
          Copy
        </Button>
      </div>

      <div className="mb-5 grid grid-cols-[1fr_auto] items-center gap-4">
        <div>
          <div className="text-xs text-muted-foreground">PNL (USD)</div>
          <div className="mt-2 font-mono text-3xl font-black text-buy">+{strategy.pnl.toLocaleString()}</div>
        </div>
        <MiniSpark data={strategy.spark} />
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <Metric label="ROI" value={`+${strategy.roi.toFixed(2)}%`} />
        <Metric label="Runtime" value={strategy.runtime} />
        <Metric label="Min. Investment" value={strategy.investment} />
        <Metric label="24H/Total Matched Trades" value={strategy.trades} />
        <Metric label="7D MDD" value={`${strategy.mdd.toFixed(2)}%`} />
      </div>
    </button>
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
        <Bot className="h-4 w-4" />
      </span>
      <span>Create Bot</span>
      <span className="pointer-events-none absolute right-0 top-full mt-2 w-max max-w-[220px] translate-y-1 rounded-lg border border-border bg-popover px-3 py-2 text-xs font-semibold text-popover-foreground opacity-0 shadow-xl transition-all group-hover:translate-y-0 group-hover:opacity-100">
        Create your own bot by yourself
      </span>
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="font-mono text-xs font-bold">{value}</div>
    </div>
  );
}

function UsersTiny() {
  return (
    <span className="inline-flex items-center gap-[1px]">
      <span className="h-2 w-2 rounded-full border border-muted-foreground/60" />
      <span className="h-2 w-2 rounded-full border border-muted-foreground/60" />
    </span>
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
        {["12.0%", "8.0%", "4.0%", "0.0%"].map((label, index) => (
          <text key={label} x="14" y={42 + index * 22} fill="hsl(var(--muted-foreground))" fontSize="8">
            {label}
          </text>
        ))}
        <polyline points={points} fill="none" stroke="hsl(var(--buy))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={`M${points} L198 106 L46 106 Z`} fill="hsl(var(--buy) / 0.08)" />
        {["05-29", "05-30", "05-31"].map((label, index) => (
          <text key={label} x={54 + index * 62} y="118" fill="hsl(var(--muted-foreground))" fontSize="8">
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function StrategyDialog({ strategy, onClose }: { strategy: Strategy | null; onClose: () => void }) {
  const [investment, setInvestment] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <Dialog open={Boolean(strategy)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl overflow-hidden border border-border bg-card p-0 text-foreground shadow-2xl dark:bg-card/95">
        {strategy && (
          <div className="grid min-h-[520px] lg:grid-cols-[0.95fr_1fr]">
            <div className="border-b border-border/60 p-6 lg:border-b-0 lg:border-r">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-black">{strategy.pair}</h3>
                    <span className="font-mono text-sm text-muted-foreground">{(strategy.pnl / 1000).toFixed(3)}</span>
                    <span className="font-mono text-sm font-bold text-buy">+{strategy.roi.toFixed(2)}%</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{strategy.type} | {strategy.users} users copied</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="font-bold">Historical Profits</h4>
                  <span className="rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary">ROI</span>
                </div>
                <DialogProfitChart data={strategy.spark} />
              </div>

              <div className="mt-6 rounded-2xl border border-border/60 bg-background/40 p-4">
                <h4 className="mb-4 font-bold">Basic Info</h4>
                <div className="space-y-3">
                  <InfoRow label="Runtime" value={strategy.runtime} />
                  <InfoRow label="24H/Total Matched Trades" value={strategy.trades} />
                  <InfoRow label="7D MDD" value={`${strategy.mdd.toFixed(2)}%`} />
                  <InfoRow label="Profit/grid" value="0.48%" />
                  <button className="text-sm font-bold text-primary">Customize Parameters</button>
                </div>
              </div>
            </div>

            <div className="flex flex-col p-6">
              <p className="mb-5 text-sm text-muted-foreground">
                You are using a shared parameter. Market conditions differ, so historical results cannot guarantee future performance.
              </p>
              <label className="text-sm font-bold">Investment</label>
              <div className="mt-2 flex h-12 items-center rounded-xl border border-border bg-background px-3">
                <input
                  value={investment}
                  onChange={(event) => setInvestment(event.target.value)}
                  placeholder={strategy.investment.replace(/[^\d.,]/g, "")}
                  className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground"
                />
                <span className="font-bold">USDN</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Available</span>
                <span className="font-mono">0.00 USDN</span>
              </div>
              <button
                type="button"
                onClick={() => setAdvancedOpen((open) => !open)}
                className="mt-8 flex items-center justify-between rounded-xl py-3 text-left font-bold text-muted-foreground hover:text-foreground"
              >
                Advanced (Optional)
                <ChevronDown className={cn("h-4 w-4 transition-transform", advancedOpen && "rotate-180")} />
              </button>
              {advancedOpen && (
                <div className="mt-2 space-y-4 rounded-2xl border border-border/60 bg-background/45 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <AdvancedToggle label="Trailing Up" />
                    <AdvancedToggle label="Grid Trigger" />
                    <AdvancedToggle label="TP/SL" />
                    <AdvancedToggle label="Sell all TON on stop" defaultChecked />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <AdvancedField label="Lower Price" value="1.719 USDN" />
                    <AdvancedField label="Upper Price" value="2.390 USDN" />
                    <AdvancedField label="Grids" value="48" />
                    <AdvancedField label="Mode" value="Geometric" />
                  </div>
                </div>
              )}
              <div className="flex-1" />
              <Button className="ml-auto w-full bg-warning text-black hover:bg-warning/90 sm:w-44">
                Log in
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
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

function AdvancedToggle({ label, defaultChecked = false }: { label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-muted-foreground">
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-border bg-background accent-primary"
      />
      <span>{label}</span>
    </label>
  );
}

function AdvancedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-xs font-bold">{value}</div>
    </div>
  );
}
