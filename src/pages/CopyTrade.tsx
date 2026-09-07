import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  Copy as CopyIcon,
  Crown,
  Gauge,
  Globe2,
  Info,
  Medal,
  Pause,
  Play,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  UserPlus,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type MarketCategory = "Crypto" | "Forex" | "Commodity" | "Stocks";
type MarketType = "Spot" | "Futures" | "Options" | "AI Bots";
type RiskLevel = "Low" | "Medium" | "High";
type PageView = "discover" | "copying" | "lead";

type Trader = {
  id: string;
  rank: number;
  name: string;
  initials: string;
  avatar: string;
  category: MarketCategory;
  market: MarketType;
  region: string;
  risk: RiskLevel;
  roi30: number;
  roi7: number;
  pnl: string;
  winRate: number;
  followers: number;
  aum: number;
  sharpe: number;
  drawdown: number;
  trades: number;
  commissionPercent: number;
  featured?: boolean;
  spark: number[];
};

type CopyRelationship = {
  traderId: string;
  allocation: number;
  multiplier: number;
  maxPerTrade: number;
  stopLoss: number;
  copySells: boolean;
  commissionPercent: number;
  status: "active" | "paused";
  startedAt: string;
};

type LeadTraderProfile = {
  displayName: string;
  strategySummary: string;
  category: MarketCategory;
  market: MarketType;
  primaryInstrument: string;
  riskLevel: RiskLevel;
  experience: string;
  commissionPercent: number;
  acceptingCopiers: boolean;
};

const MARKET_TABS: Record<MarketCategory, MarketType[]> = {
  Crypto: ["Spot", "Futures", "Options", "AI Bots"],
  Forex: ["Spot", "Futures", "AI Bots"],
  Commodity: ["Spot", "Futures", "Options"],
  Stocks: ["Spot", "Futures", "AI Bots"],
};

const LEAD_INSTRUMENTS: Record<MarketCategory, Partial<Record<MarketType, string[]>>> = {
  Crypto: {
    Spot: ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT"],
    Futures: ["BTC-PERP", "ETH-PERP", "SOL-PERP", "BNB-PERP"],
    Options: ["BTC Options", "ETH Options"],
    "AI Bots": ["Spot Grid", "Futures Grid", "DCA"],
  },
  Forex: {
    Spot: ["EUR/USD", "GBP/USD", "AUD/USD"],
    Futures: ["EURUSD Futures", "GBPUSD Futures", "AUDUSD Futures"],
    "AI Bots": ["Forex Grid", "Forex DCA", "Trend Following"],
  },
  Commodity: {
    Spot: ["Gold", "Silver", "Crude Oil"],
    Futures: ["Gold Futures", "Silver Futures", "Crude Oil Futures"],
    Options: ["Gold Options", "Crude Oil Options"],
  },
  Stocks: {
    Spot: ["AAPL", "TSLA", "NVDA"],
    Futures: ["AAPL Futures", "TSLA Futures", "NVDA Futures"],
    "AI Bots": ["Equity DCA", "Momentum", "Mean Reversion"],
  },
};

function defaultLeadProfile(category: MarketCategory = "Crypto", market: MarketType = "Spot"): LeadTraderProfile {
  const availableMarkets = MARKET_TABS[category];
  const selectedMarket = availableMarkets.includes(market) ? market : availableMarkets[0];
  return {
    displayName: "",
    strategySummary: "",
    category,
    market: selectedMarket,
    primaryInstrument: LEAD_INSTRUMENTS[category][selectedMarket]?.[0] ?? "",
    riskLevel: "Medium",
    experience: "1-3 years",
    commissionPercent: 10,
    acceptingCopiers: true,
  };
}

const TRADERS: Trader[] = [
  { id: "alpha-wolf", rank: 1, name: "AlphaWolf", initials: "AW", avatar: "from-orange-400 to-rose-500", category: "Crypto", market: "Spot", region: "Global", risk: "High", roi30: 124.52, roi7: 12.16, pnl: "+$184,240", winRate: 84.5, followers: 1240, aum: 2410000, sharpe: 3.2, drawdown: 18.4, trades: 328, commissionPercent: 20, featured: true, spark: [31, 42, 38, 55, 51, 70, 63, 82, 77, 96, 92, 113] },
  { id: "quant-queen", rank: 2, name: "QuantQueen", initials: "QQ", avatar: "from-violet-500 to-fuchsia-500", category: "Crypto", market: "Spot", region: "United States", risk: "Low", roi30: 42.1, roi7: 4.82, pnl: "+$96,810", winRate: 94.5, followers: 3821, aum: 8120000, sharpe: 5.1, drawdown: 4.8, trades: 612, commissionPercent: 10, featured: true, spark: [12, 18, 16, 25, 23, 31, 30, 37, 35, 42, 41, 47] },
  { id: "arb-avenger", rank: 3, name: "ArbAvenger", initials: "AA", avatar: "from-pink-500 to-purple-500", category: "Crypto", market: "Spot", region: "Asia", risk: "Medium", roi30: 68.4, roi7: 7.15, pnl: "+$72,680", winRate: 78.4, followers: 942, aum: 1210000, sharpe: 2.9, drawdown: 10.2, trades: 448, commissionPercent: 15, featured: true, spark: [20, 34, 28, 44, 39, 54, 49, 61, 58, 68, 64, 74] },
  { id: "moon-runner", rank: 4, name: "MoonRunner", initials: "MR", avatar: "from-cyan-400 to-blue-500", category: "Crypto", market: "Futures", region: "Europe", risk: "High", roi30: 89.21, roi7: -2.52, pnl: "+$142,520", winRate: 72.1, followers: 2105, aum: 4720000, sharpe: 2.8, drawdown: 22.7, trades: 759, commissionPercent: 25, featured: true, spark: [44, 35, 53, 47, 69, 61, 78, 73, 85, 81, 91, 89] },
  { id: "chain-baron", rank: 5, name: "ChainBaron", initials: "CB", avatar: "from-amber-400 to-orange-600", category: "Crypto", market: "Futures", region: "United Kingdom", risk: "Medium", roi30: 35.84, roi7: 3.26, pnl: "+$61,290", winRate: 69.2, followers: 1540, aum: 3120000, sharpe: 2.4, drawdown: 11.8, trades: 501, commissionPercent: 12, spark: [14, 17, 22, 20, 29, 27, 31, 30, 36, 34, 39, 42] },
  { id: "atlas-fx", rank: 1, name: "AtlasFX", initials: "AF", avatar: "from-blue-500 to-cyan-400", category: "Forex", market: "Spot", region: "Europe", risk: "Low", roi30: 18.72, roi7: 2.24, pnl: "+$44,860", winRate: 81.6, followers: 1870, aum: 6240000, sharpe: 3.7, drawdown: 5.4, trades: 904, commissionPercent: 8, featured: true, spark: [8, 12, 11, 14, 13, 17, 16, 19, 18, 22, 21, 24] },
  { id: "gold-pulse", rank: 1, name: "GoldPulse", initials: "GP", avatar: "from-yellow-300 to-amber-600", category: "Commodity", market: "Futures", region: "Global", risk: "Medium", roi30: 28.16, roi7: 1.92, pnl: "+$58,120", winRate: 74.8, followers: 1162, aum: 3580000, sharpe: 2.7, drawdown: 8.9, trades: 413, commissionPercent: 15, featured: true, spark: [11, 16, 14, 18, 17, 21, 19, 24, 23, 27, 26, 31] },
  { id: "nova-equity", rank: 1, name: "NovaEquity", initials: "NE", avatar: "from-emerald-400 to-cyan-500", category: "Stocks", market: "Spot", region: "United States", risk: "Low", roi30: 21.54, roi7: 1.48, pnl: "+$76,450", winRate: 79.2, followers: 2230, aum: 7940000, sharpe: 3.4, drawdown: 6.2, trades: 286, commissionPercent: 10, featured: true, spark: [9, 11, 10, 14, 13, 16, 15, 18, 17, 21, 20, 24] },
];

const money = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
};

const riskStyle: Record<RiskLevel, string> = {
  Low: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  Medium: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  High: "border-rose-400/20 bg-rose-400/10 text-rose-300",
};

function Sparkline({ data, negative = false, large = false }: { data: number[]; negative?: boolean; large?: boolean }) {
  const width = large ? 240 : 92;
  const height = large ? 56 : 32;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((value, index) => `${(index / (data.length - 1)) * width},${height - 4 - ((value - min) / range) * (height - 10)}`).join(" ");
  const id = `spark-${data.join("-")}-${large ? "large" : "small"}`;
  const stroke = negative ? "#fb7185" : "#22d3b6";

  return (
    <svg className="h-full w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={stroke} stopOpacity="0.28" /><stop offset="100%" stopColor={stroke} stopOpacity="0" /></linearGradient></defs>
      <path d={`M ${points} L ${width},${height} L 0,${height} Z`} fill={`url(#${id})`} />
      <polyline points={points} stroke={stroke} strokeWidth={large ? 2 : 1.7} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Avatar({ trader, size = "md" }: { trader: Trader; size?: "sm" | "md" | "lg" }) {
  return <div className={cn("grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-bold text-white shadow-lg ring-2 ring-white/10", trader.avatar, size === "sm" && "h-9 w-9 text-[11px]", size === "md" && "h-11 w-11 text-xs", size === "lg" && "h-14 w-14 text-sm")}>{trader.initials}</div>;
}

function TraderIdentity({ trader, compact = false }: { trader: Trader; compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar trader={trader} size={compact ? "sm" : "md"} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5"><span className="truncate text-sm font-semibold">{trader.name}</span><ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" /></div>
        <div className="mt-0.5 flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground"><Globe2 className="h-3 w-3" />{trader.region} · {trader.market}</div>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return <div><div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</div><div className={cn("mt-1 font-mono text-sm font-semibold", accent && "text-buy")}>{value}</div></div>;
}

function FeaturedCard({ trader, relationship, onCopy }: { trader: Trader; relationship?: CopyRelationship; onCopy: (trader: Trader) => void }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-card/60 p-4 shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-primary/30">
      <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-primary/10 blur-3xl transition group-hover:bg-primary/15" />
      <div className="relative flex items-start justify-between gap-3"><TraderIdentity trader={trader} /><span className={cn("rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-wider", riskStyle[trader.risk])}>{trader.risk} risk</span></div>
      <div className="relative mt-5 grid grid-cols-2 gap-4">
        <div><div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">ROI · 30 days</div><div className="mt-1 font-mono text-2xl font-bold text-buy">+{trader.roi30.toFixed(1)}%</div></div>
        <div className="text-right"><div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Assets copied</div><div className="mt-1 font-mono text-base font-semibold">{money(trader.aum)}</div></div>
      </div>
      <div className="relative mt-3 h-14"><Sparkline data={trader.spark} negative={trader.roi7 < 0} large /></div>
      <div className="relative mt-4 grid grid-cols-4 border-y border-white/5 py-3"><Metric label="Win rate" value={`${trader.winRate}%`} /><Metric label="Copiers" value={trader.followers.toLocaleString()} /><Metric label="Drawdown" value={`${trader.drawdown}%`} /><Metric label="Profit fee" value={`${trader.commissionPercent}%`} /></div>
      <Button onClick={() => onCopy(trader)} className={cn("relative mt-4 h-10 w-full font-semibold", relationship ? "border border-primary/25 bg-primary/10 text-primary hover:bg-primary/15" : "bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-[0_8px_30px_rgba(124,58,237,0.22)] hover:from-violet-500 hover:to-indigo-400")}>
        {relationship ? <Settings2 className="mr-2 h-4 w-4" /> : <CopyIcon className="mr-2 h-4 w-4" />}{relationship ? "Manage copying" : "Copy trader"}
      </Button>
    </article>
  );
}

function CopySetupDialog({ trader, relationship, open, onOpenChange, onSave }: { trader: Trader | null; relationship?: CopyRelationship; open: boolean; onOpenChange: (open: boolean) => void; onSave: (relationship: CopyRelationship) => void }) {
  const [allocation, setAllocation] = useState("1000");
  const [multiplier, setMultiplier] = useState(1);
  const [maxPerTrade, setMaxPerTrade] = useState("250");
  const [stopLoss, setStopLoss] = useState(20);
  const [copySells, setCopySells] = useState(true);

  useEffect(() => {
    if (!open) return;
    setAllocation(String(relationship?.allocation ?? 1000));
    setMultiplier(relationship?.multiplier ?? 1);
    setMaxPerTrade(String(relationship?.maxPerTrade ?? 250));
    setStopLoss(relationship?.stopLoss ?? 20);
    setCopySells(relationship?.copySells ?? true);
  }, [open, relationship]);

  if (!trader) return null;

  const save = () => {
    const allocationValue = Number(allocation);
    const maxTradeValue = Number(maxPerTrade);
    if (!Number.isFinite(allocationValue) || allocationValue < 100) { toast.error("Enter an allocation of at least 100 USDT"); return; }
    if (!Number.isFinite(maxTradeValue) || maxTradeValue <= 0 || maxTradeValue > allocationValue) { toast.error("Max per trade must be between 1 USDT and your allocation"); return; }
    onSave({ traderId: trader.id, allocation: allocationValue, multiplier, maxPerTrade: maxTradeValue, stopLoss, copySells, status: relationship?.status ?? "active", startedAt: relationship?.startedAt ?? new Date().toISOString() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="copy-trading-theme glass-strong max-h-[92vh] max-w-xl overflow-y-auto border-primary/20 p-0">
        <div className="border-b border-white/10 bg-gradient-to-r from-violet-500/10 via-transparent to-cyan-400/10 p-6">
          <DialogHeader><div className="mb-2 flex items-center gap-3"><Avatar trader={trader} size="lg" /><div><DialogTitle className="flex items-center gap-2 text-xl">Copy {trader.name}<ShieldCheck className="h-4 w-4 text-primary" /></DialogTitle><DialogDescription className="mt-1">Set your limits before starting. You remain in control of your allocation.</DialogDescription></div></div></DialogHeader>
        </div>
        <div className="space-y-5 p-6">
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.025] p-3 sm:grid-cols-4"><Metric label="30D ROI" value={`+${trader.roi30}%`} accent /><Metric label="Win rate" value={`${trader.winRate}%`} /><Metric label="Risk" value={trader.risk} /><Metric label="Profit fee" value={`${trader.commissionPercent}%`} /></div>
          <div className="flex gap-2 rounded-xl border border-primary/15 bg-primary/[0.055] p-3 text-xs leading-relaxed text-muted-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />This Lead Trader receives {trader.commissionPercent}% of positive realized profit generated for you. Your allocation and losing trades are not charged.</div>
          <div>
            <div className="mb-2 flex items-center justify-between"><label htmlFor="copy-allocation" className="text-sm font-medium">Allocation</label><span className="text-xs text-muted-foreground">Minimum 100 BIUSD</span></div>
            <div className="relative"><Input id="copy-allocation" type="number" min="100" value={allocation} onChange={(event) => setAllocation(event.target.value)} className="h-12 border-white/10 bg-white/[0.035] pr-16 font-mono text-base" /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">BIUSD</span></div>
            <div className="mt-2 grid grid-cols-4 gap-2">{[250, 500, 1000, 2500].map((amount) => <button key={amount} onClick={() => setAllocation(String(amount))} className={cn("rounded-lg border py-1.5 text-xs transition", Number(allocation) === amount ? "border-primary/40 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground")}>{amount.toLocaleString()}</button>)}</div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="mb-2 block text-sm font-medium">Copy multiplier</label><Select value={String(multiplier)} onValueChange={(value) => setMultiplier(Number(value))}><SelectTrigger className="h-11 border-white/10 bg-white/[0.035]"><SelectValue /></SelectTrigger><SelectContent className="copy-trading-theme glass-strong border-white/10"><SelectItem value="0.5">0.5× · Conservative</SelectItem><SelectItem value="1">1× · Proportional</SelectItem><SelectItem value="1.5">1.5× · Aggressive</SelectItem><SelectItem value="2">2× · Maximum</SelectItem></SelectContent></Select></div>
            <div><div className="mb-2 flex items-center justify-between"><label htmlFor="max-per-trade" className="text-sm font-medium">Max per trade</label><span className="text-xs text-muted-foreground">BIUSD</span></div><Input id="max-per-trade" type="number" min="1" value={maxPerTrade} onChange={(event) => setMaxPerTrade(event.target.value)} className="h-11 border-white/10 bg-white/[0.035] font-mono" /></div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
            <div className="flex items-center justify-between"><div><div className="text-sm font-medium">Portfolio stop loss</div><div className="mt-0.5 text-xs text-muted-foreground">Pause new copies at this allocation drawdown.</div></div><span className="font-mono text-sm font-semibold text-rose-300">-{stopLoss}%</span></div>
            <Slider value={[stopLoss]} onValueChange={([value]) => setStopLoss(value)} min={5} max={40} step={5} className="mt-4" /><div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>5%</span><span>40%</span></div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] p-4"><div className="pr-4"><div className="text-sm font-medium">Copy position reductions</div><div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Reduce copied positions when the Lead Trader reduces theirs.</div></div><Switch checked={copySells} onCheckedChange={setCopySells} /></div>
          <div className="flex gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[0.06] p-3 text-xs leading-relaxed text-amber-100/80"><Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />Frontend preview only. Saving these settings does not place orders or reserve real funds yet.</div>
        </div>
        <DialogFooter className="border-t border-white/10 p-5"><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} className="bg-gradient-to-r from-violet-600 to-indigo-500 px-6 text-white hover:from-violet-500 hover:to-indigo-400">{relationship ? "Save settings" : "Start copying"}<ArrowRight className="ml-2 h-4 w-4" /></Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeadTraderDialog({
  open,
  onOpenChange,
  profile,
  initialCategory,
  initialMarket,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: LeadTraderProfile | null;
  initialCategory: MarketCategory;
  initialMarket: MarketType;
  onSave: (profile: LeadTraderProfile) => void;
}) {
  const [form, setForm] = useState<LeadTraderProfile>(() => defaultLeadProfile(initialCategory, initialMarket));

  useEffect(() => {
    if (open) setForm(profile ?? defaultLeadProfile(initialCategory, initialMarket));
  }, [initialCategory, initialMarket, open, profile]);

  const marketOptions = MARKET_TABS[form.category];
  const instrumentOptions = LEAD_INSTRUMENTS[form.category][form.market] ?? [];
  const update = <K extends keyof LeadTraderProfile,>(key: K, value: LeadTraderProfile[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const changeCategory = (nextCategory: MarketCategory) => {
    const nextMarket = MARKET_TABS[nextCategory][0];
    setForm((current) => ({
      ...current,
      category: nextCategory,
      market: nextMarket,
      primaryInstrument: LEAD_INSTRUMENTS[nextCategory][nextMarket]?.[0] ?? "",
    }));
  };

  const changeMarket = (nextMarket: MarketType) => {
    setForm((current) => ({
      ...current,
      market: nextMarket,
      primaryInstrument: LEAD_INSTRUMENTS[current.category][nextMarket]?.[0] ?? "",
    }));
  };

  const save = () => {
    const displayName = form.displayName.trim();
    const strategySummary = form.strategySummary.trim();
    if (displayName.length < 3) { toast.error("Display name must contain at least 3 characters"); return; }
    if (strategySummary.length < 20) { toast.error("Strategy summary must contain at least 20 characters"); return; }
    if (!form.primaryInstrument) { toast.error("Select a primary instrument or strategy"); return; }
    if (!Number.isInteger(form.commissionPercent) || form.commissionPercent < 0 || form.commissionPercent > 30) {
      toast.error("Commission must be a whole percentage between 0% and 30%");
      return;
    }
    onSave({ ...form, displayName, strategySummary });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="copy-trading-theme glass-strong max-h-[92vh] max-w-2xl overflow-y-auto border-primary/20 p-0">
        <div className="border-b border-white/10 bg-gradient-to-r from-cyan-500/10 via-transparent to-violet-500/10 p-6">
          <DialogHeader>
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 text-primary ring-1 ring-primary/20"><Crown className="h-6 w-6" /></div>
            <DialogTitle className="text-xl">{profile ? "Edit Lead Trader Application" : "Lead Trader Application"}</DialogTitle>
            <DialogDescription>Describe your strategy, choose where you trade, and set the performance commission visible to Copiers.</DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 p-6">
          <section className="space-y-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Public profile</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="lead-name" className="mb-2 block text-sm font-medium">Public display name</label><Input id="lead-name" value={form.displayName} onChange={(event) => update("displayName", event.target.value)} placeholder="Example: QuantNavigator" className="h-11 border-white/10 bg-white/[0.035]" /></div>
              <div><label className="mb-2 block text-sm font-medium">Trading experience</label><Select value={form.experience} onValueChange={(value) => update("experience", value)}><SelectTrigger className="h-11 border-white/10 bg-white/[0.035]"><SelectValue /></SelectTrigger><SelectContent className="copy-trading-theme glass-strong border-white/10"><SelectItem value="Less than 1 year">Less than 1 year</SelectItem><SelectItem value="1-3 years">1–3 years</SelectItem><SelectItem value="3-5 years">3–5 years</SelectItem><SelectItem value="5+ years">5+ years</SelectItem></SelectContent></Select></div>
            </div>
            <div><label htmlFor="strategy-summary" className="mb-2 block text-sm font-medium">Strategy summary</label><Textarea id="strategy-summary" value={form.strategySummary} onChange={(event) => update("strategySummary", event.target.value)} placeholder="Explain your approach, typical holding period, and risk controls." className="min-h-24 resize-none border-white/10 bg-white/[0.035]" maxLength={280} /><div className="mt-1 text-right text-[10px] text-muted-foreground">{form.strategySummary.length}/280</div></div>
          </section>

          <section className="space-y-4 border-t border-white/10 pt-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Trading focus</div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><label className="mb-2 block text-sm font-medium">Asset class</label><Select value={form.category} onValueChange={(value) => changeCategory(value as MarketCategory)}><SelectTrigger className="h-11 border-white/10 bg-white/[0.035]"><SelectValue /></SelectTrigger><SelectContent className="copy-trading-theme glass-strong border-white/10">{(Object.keys(MARKET_TABS) as MarketCategory[]).map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="mb-2 block text-sm font-medium">Market type</label><Select value={form.market} onValueChange={(value) => changeMarket(value as MarketType)}><SelectTrigger className="h-11 border-white/10 bg-white/[0.035]"><SelectValue /></SelectTrigger><SelectContent className="copy-trading-theme glass-strong border-white/10">{marketOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="mb-2 block text-sm font-medium">{form.market === "AI Bots" ? "Primary strategy" : "Primary instrument"}</label><Select value={form.primaryInstrument} onValueChange={(value) => update("primaryInstrument", value)}><SelectTrigger className="h-11 border-white/10 bg-white/[0.035]"><SelectValue /></SelectTrigger><SelectContent className="copy-trading-theme glass-strong border-white/10">{instrumentOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><label className="mb-2 block text-sm font-medium">Declared risk level</label><div className="grid grid-cols-3 gap-2">{(["Low", "Medium", "High"] as RiskLevel[]).map((level) => <button type="button" key={level} onClick={() => update("riskLevel", level)} className={cn("rounded-lg border px-3 py-2 text-sm font-medium transition", form.riskLevel === level ? riskStyle[level] : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground")}>{level}</button>)}</div></div>
          </section>

          <section className="space-y-4 rounded-xl border border-primary/20 bg-primary/[0.055] p-4">
            <div className="flex items-start justify-between gap-4"><div><div className="text-sm font-semibold">Performance commission</div><div className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">Your selected percentage is deducted only from positive realized profit generated for a Copier. No commission is charged on deposits, allocated capital, or losses.</div></div><span className="font-mono text-2xl font-bold text-primary">{form.commissionPercent}%</span></div>
            <Slider value={[form.commissionPercent]} onValueChange={([value]) => update("commissionPercent", value)} min={0} max={30} step={1} />
            <div className="grid grid-cols-4 gap-2">{[0, 10, 20, 30].map((value) => <button type="button" key={value} onClick={() => update("commissionPercent", value)} className={cn("rounded-lg border py-1.5 text-xs transition", form.commissionPercent === value ? "border-primary/40 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20")}>{value}%</button>)}</div>
            <p className="text-[10px] text-muted-foreground">Example: at {form.commissionPercent}% commission, a Copier with 100 BIUSD realized profit pays {form.commissionPercent} BIUSD to the Lead Trader.</p>
          </section>

          <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4"><div className="flex items-center justify-between gap-4"><div><div className="text-sm font-medium">Accept new Copiers</div><div className="mt-1 text-xs text-muted-foreground">Allow new users to start copying after your application is approved.</div></div><Switch checked={form.acceptingCopiers} onCheckedChange={(value) => update("acceptingCopiers", value)} /></div></div>
          <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.025] p-4 text-xs text-muted-foreground">{["Application details must accurately describe your trading activity", "Only eligible trades in the selected market can be copied", "Commission changes apply only to new copying relationships"].map((item) => <div key={item} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" />{item}</div>)}</div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">Frontend preview: the application is stored in this browser. Backend review, eligibility verification, and commission settlement are not active yet.</p>
        </div>

        <DialogFooter className="border-t border-white/10 p-5"><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500">{profile ? "Save application" : "Submit application"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const CopyTrade = () => {
  const [view, setView] = useState<PageView>("discover");
  const [category, setCategory] = useState<MarketCategory>("Crypto");
  const [market, setMarket] = useState<MarketType>("Spot");
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState<"All" | RiskLevel>("All");
  const [sort, setSort] = useState("popular");
  const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [leadProfile, setLeadProfile] = useState<LeadTraderProfile | null>(() => {
    try {
      const stored = localStorage.getItem("bitdx-lead-profile");
      if (stored) return JSON.parse(stored) as LeadTraderProfile;
    } catch {
      // Ignore malformed preview storage and fall back to the previous name.
    }
    const legacyName = localStorage.getItem("bitdx-lead-name") ?? "";
    return legacyName ? { ...defaultLeadProfile(), displayName: legacyName } : null;
  });
  const leadName = leadProfile?.displayName ?? "";
  const [relationships, setRelationships] = useState<CopyRelationship[]>(() => {
    try { const stored = localStorage.getItem("bitdx-copy-preview"); return stored ? JSON.parse(stored) : []; } catch { return []; }
  });

  const availableMarkets = MARKET_TABS[category];
  useEffect(() => { if (!availableMarkets.includes(market)) setMarket(availableMarkets[0]); }, [availableMarkets, market]);
  useEffect(() => { localStorage.setItem("bitdx-copy-preview", JSON.stringify(relationships)); }, [relationships]);

  const visibleTraders = useMemo(() => {
    const filtered = TRADERS.filter((trader) => trader.category === category && trader.market === market && trader.name.toLowerCase().includes(query.toLowerCase()) && (risk === "All" || trader.risk === risk));
    return [...filtered].sort((a, b) => sort === "roi" ? b.roi30 - a.roi30 : sort === "win-rate" ? b.winRate - a.winRate : sort === "risk" ? a.drawdown - b.drawdown : b.followers - a.followers);
  }, [category, market, query, risk, sort]);

  const featuredTraders = visibleTraders.filter((trader) => trader.featured).slice(0, 4);
  const selectedRelationship = selectedTrader ? relationships.find((relationship) => relationship.traderId === selectedTrader.id) : undefined;
  const openCopyDialog = (trader: Trader) => { setSelectedTrader(trader); setCopyDialogOpen(true); };
  const saveRelationship = (next: CopyRelationship) => {
    setRelationships((current) => current.some((relationship) => relationship.traderId === next.traderId) ? current.map((relationship) => relationship.traderId === next.traderId ? next : relationship) : [...current, next]);
    toast.success(selectedRelationship ? "Copy settings updated" : `Now copying ${selectedTrader?.name}`, { description: "Saved locally for this frontend preview." });
  };
  const toggleRelationship = (traderId: string) => {
    setRelationships((current) => current.map((relationship) => relationship.traderId === traderId ? { ...relationship, status: relationship.status === "active" ? "paused" : "active" } : relationship));
    const relationship = relationships.find((item) => item.traderId === traderId);
    toast.info(relationship?.status === "active" ? "Copying paused" : "Copying resumed");
  };
  const totalAllocated = relationships.reduce((sum, relationship) => sum + relationship.allocation, 0);
  const activeRelationships = relationships.filter((relationship) => relationship.status === "active").length;

  return (
    <AppShell>
      <div className="copy-trading-theme relative min-h-full overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_22%_0%,rgba(124,58,237,0.15),transparent_42%),radial-gradient(circle_at_82%_5%,rgba(6,182,212,0.12),transparent_38%)]" />
        <div className="relative mx-auto max-w-[1480px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <section className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div><div className="mb-3 flex flex-wrap items-center gap-2"><span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Copy Trading</span><span className="rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">Preview data</span></div><h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">Follow proven strategies. <span className="gradient-text">Trade your way.</span></h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">Discover Lead Traders, define your own limits, and manage every copied strategy from one place.</p></div>
            <Button onClick={() => leadName ? setView("lead") : setLeadDialogOpen(true)} variant="outline" className="h-11 shrink-0 border-primary/30 bg-primary/[0.06] px-5 text-primary hover:bg-primary/10 hover:text-primary"><Crown className="mr-2 h-4 w-4" />{leadName ? "Lead Trader dashboard" : "Become a Lead Trader"}</Button>
          </section>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Preview Lead Traders", value: "184", detail: "Across 4 markets", icon: Users },
              { label: "Copied volume", value: "$28.6M", detail: "Last 30 days", icon: Activity },
              { label: "Your allocations", value: money(totalAllocated), detail: `${activeRelationships} active strategies`, icon: WalletCards },
              { label: "Risk controls", value: "Always on", detail: "Limits per strategy", icon: ShieldCheck },
            ].map((item) => <div key={item.label} className="rounded-2xl border border-white/10 bg-card/45 p-4 backdrop-blur-xl sm:p-5"><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{item.label}</div><div className="mt-2 font-mono text-xl font-bold sm:text-2xl">{item.value}</div><div className="mt-1 text-[11px] text-muted-foreground">{item.detail}</div></div><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-primary/15 bg-primary/[0.07] text-primary"><item.icon className="h-4 w-4" /></div></div></div>)}
          </section>

          <div className="flex w-full gap-1 overflow-x-auto rounded-xl border border-white/10 bg-card/45 p-1.5 sm:w-fit">
            {([{ id: "discover", label: "Discover", icon: Sparkles }, { id: "copying", label: `My Copying${relationships.length ? ` · ${relationships.length}` : ""}`, icon: CopyIcon }, { id: "lead", label: "Lead Trader", icon: Crown }] as const).map((item) => <button key={item.id} onClick={() => setView(item.id)} className={cn("flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition", view === item.id ? "bg-white/10 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}><item.icon className={cn("h-4 w-4", view === item.id && "text-primary")} />{item.label}</button>)}
          </div>

          {view === "discover" && <>
            <section className="space-y-3">
              <div className="flex items-center gap-2 overflow-x-auto border-b border-white/10 pb-3 scrollbar-none">{(Object.keys(MARKET_TABS) as MarketCategory[]).map((item) => <button key={item} onClick={() => setCategory(item)} className={cn("rounded-lg px-4 py-2 text-sm font-medium transition", category === item ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_8px_24px_rgba(6,182,212,0.16)]" : "text-muted-foreground hover:bg-white/5 hover:text-foreground")}>{item}</button>)}</div>
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">{availableMarkets.map((item) => <button key={item} onClick={() => setMarket(item)} className={cn("flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition", market === item ? "border-violet-400/30 bg-violet-500/15 text-violet-200" : "border-transparent text-muted-foreground hover:border-white/10 hover:text-foreground")}>{item === "AI Bots" && <Bot className="h-3.5 w-3.5" />}{item}</button>)}</div>
            </section>

            {featuredTraders.length > 0 && <section><div className="mb-3 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Featured Lead Traders</h2><p className="mt-1 text-xs text-muted-foreground">Popular strategies in {category} {market}</p></div><span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Preview profiles</span></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{featuredTraders.map((trader) => <FeaturedCard key={trader.id} trader={trader} relationship={relationships.find((relationship) => relationship.traderId === trader.id)} onCopy={openCopyDialog} />)}</div></section>}

            <section>
              <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-center"><div><h2 className="text-lg font-semibold">Lead Trader rankings</h2><p className="mt-1 text-xs text-muted-foreground">Compare return, risk, consistency, and Copier activity.</p></div><div className="flex flex-col gap-2 sm:flex-row"><div className="relative min-w-[230px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Lead Traders" className="h-10 border-white/10 bg-card/60 pl-9" /></div><Select value={sort} onValueChange={setSort}><SelectTrigger className="h-10 min-w-[165px] border-white/10 bg-card/60"><SelectValue /></SelectTrigger><SelectContent className="copy-trading-theme glass-strong border-white/10"><SelectItem value="popular">Most popular</SelectItem><SelectItem value="roi">Highest ROI</SelectItem><SelectItem value="win-rate">Best win rate</SelectItem><SelectItem value="risk">Lowest drawdown</SelectItem></SelectContent></Select></div></div>
              <div className="mb-3 flex flex-wrap items-center gap-2"><span className="mr-1 flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground"><Gauge className="h-3.5 w-3.5" /> Risk</span>{(["All", "Low", "Medium", "High"] as const).map((level) => <button key={level} onClick={() => setRisk(level)} className={cn("rounded-full border px-3 py-1.5 text-xs transition", risk === level ? "border-primary/30 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground hover:text-foreground")}>{level === "All" ? "All risk levels" : `${level} risk`}</button>)}</div>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-card/45 backdrop-blur-xl">
                {visibleTraders.length ? <div className="overflow-x-auto"><div className="min-w-[1130px]"><div className="grid grid-cols-[64px_minmax(220px,1.5fr)_110px_110px_150px_105px_105px_90px_80px_110px] items-center border-b border-white/10 bg-white/[0.025] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"><span>Rank</span><span>Lead Trader</span><span>ROI 30D</span><span>ROI 7D</span><span>Win rate</span><span>Copiers</span><span>AUM</span><span>Sharpe</span><span>Fee</span><span /></div>{visibleTraders.map((trader) => {
                  const relationship = relationships.find((item) => item.traderId === trader.id);
                  return <div key={trader.id} className="grid grid-cols-[64px_minmax(220px,1.5fr)_110px_110px_150px_105px_105px_90px_80px_110px] items-center border-b border-white/5 px-5 py-3.5 transition last:border-0 hover:bg-white/[0.035]"><div className="flex items-center gap-1.5">{trader.rank <= 3 ? <Medal className={cn("h-4 w-4", trader.rank === 1 ? "text-amber-300" : trader.rank === 2 ? "text-slate-300" : "text-orange-400")} /> : null}<span className="font-mono text-xs text-muted-foreground">#{trader.rank}</span></div><TraderIdentity trader={trader} compact /><span className="font-mono text-sm font-semibold text-buy">+{trader.roi30.toFixed(2)}%</span><span className={cn("font-mono text-sm font-semibold", trader.roi7 < 0 ? "text-rose-400" : "text-buy")}>{trader.roi7 > 0 ? "+" : ""}{trader.roi7.toFixed(2)}%</span><div className="pr-5"><div className="mb-1.5 flex justify-between font-mono text-xs"><span>{trader.winRate}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${trader.winRate}%` }} /></div></div><span className="font-mono text-sm">{trader.followers.toLocaleString()}</span><span className="font-mono text-sm">{money(trader.aum)}</span><span className="font-mono text-sm">{trader.sharpe.toFixed(1)}</span><span className="font-mono text-sm text-primary">{trader.commissionPercent}%</span><Button size="sm" onClick={() => openCopyDialog(trader)} className={cn("h-8", relationship ? "bg-primary/10 text-primary hover:bg-primary/15" : "bg-violet-600 text-white hover:bg-violet-500")}>{relationship ? "Manage" : "Copy"}</Button></div>;
                })}</div></div> : <div className="grid min-h-64 place-items-center p-8 text-center"><div><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/5 text-muted-foreground"><Search className="h-5 w-5" /></div><h3 className="mt-4 font-semibold">No Lead Traders found</h3><p className="mt-1 text-sm text-muted-foreground">Try another market, risk level, or search.</p></div></div>}
              </div>
            </section>
          </>}

          {view === "copying" && <section className="space-y-4">
            <div className="flex items-end justify-between gap-4"><div><h2 className="text-xl font-semibold">My Copying</h2><p className="mt-1 text-sm text-muted-foreground">Manage your strategy allocations and risk limits.</p></div>{relationships.length > 0 && <Button variant="outline" onClick={() => setView("discover")} className="border-white/10"><UserPlus className="mr-2 h-4 w-4" />Find traders</Button>}</div>
            {relationships.length === 0 ? <div className="grid min-h-[380px] place-items-center rounded-2xl border border-dashed border-white/15 bg-card/35 p-8 text-center"><div><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-400/10 text-violet-300 ring-1 ring-white/10"><CopyIcon className="h-7 w-7" /></div><h3 className="mt-5 text-lg font-semibold">You are not copying anyone yet</h3><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Explore Lead Traders, compare their risk and performance, then choose an allocation that fits you.</p><Button onClick={() => setView("discover")} className="mt-5 bg-gradient-to-r from-violet-600 to-indigo-500 text-white">Discover Lead Traders<ArrowRight className="ml-2 h-4 w-4" /></Button></div></div> : <div className="grid gap-4 lg:grid-cols-2">{relationships.map((relationship) => {
              const trader = TRADERS.find((item) => item.id === relationship.traderId); if (!trader) return null; const previewPnl = relationship.allocation * trader.roi7 / 100;
              return <article key={relationship.traderId} className="overflow-hidden rounded-2xl border border-white/10 bg-card/50"><div className="flex items-start justify-between gap-4 border-b border-white/5 p-5"><TraderIdentity trader={trader} /><span className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider", relationship.status === "active" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-amber-400/20 bg-amber-400/10 text-amber-300")}><span className={cn("h-1.5 w-1.5 rounded-full", relationship.status === "active" ? "bg-emerald-300" : "bg-amber-300")} />{relationship.status}</span></div><div className="grid grid-cols-2 gap-y-5 p-5 sm:grid-cols-4"><Metric label="Allocated" value={`${relationship.allocation.toLocaleString()} USDT`} /><Metric label="Preview PNL" value={`${previewPnl >= 0 ? "+" : ""}$${previewPnl.toFixed(2)}`} accent={previewPnl >= 0} /><Metric label="Multiplier" value={`${relationship.multiplier}×`} /><Metric label="Max / trade" value={`${relationship.maxPerTrade} USDT`} /></div><div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 bg-white/[0.018] p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Target className="h-3.5 w-3.5 text-rose-300" />Stop loss at -{relationship.stopLoss}%</div><div className="flex gap-2"><Button size="sm" variant="outline" className="h-8 border-white/10" onClick={() => toggleRelationship(trader.id)}>{relationship.status === "active" ? <Pause className="mr-1.5 h-3.5 w-3.5" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}{relationship.status === "active" ? "Pause" : "Resume"}</Button><Button size="sm" variant="outline" className="h-8 border-primary/20 text-primary hover:bg-primary/10 hover:text-primary" onClick={() => openCopyDialog(trader)}><Settings2 className="mr-1.5 h-3.5 w-3.5" />Settings</Button></div></div></article>;
            })}</div>}
          </section>}

          {view === "lead" && <section>{!leadProfile ? <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-card/50 p-8 sm:p-12"><div className="pointer-events-none absolute right-0 top-0 h-80 w-80 translate-x-1/3 -translate-y-1/3 rounded-full bg-violet-500/15 blur-3xl" /><div className="relative max-w-2xl"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/25 to-cyan-400/15 text-primary ring-1 ring-primary/20"><Crown className="h-7 w-7" /></div><h2 className="mt-6 text-2xl font-bold">Build your Lead Trader profile</h2><p className="mt-3 leading-relaxed text-muted-foreground">Apply to make your eligible strategy discoverable, describe your trading focus, and choose the performance commission shown to Copiers.</p><div className="mt-6 grid gap-3 sm:grid-cols-3">{[{ icon: BarChart3, title: "Show performance", body: "Share verified statistics." }, { icon: Users, title: "Grow Copiers", body: "Build a strategy following." }, { icon: TrendingUp, title: "Choose commission", body: "Set a 0–30% profit share." }].map((item) => <div key={item.title} className="rounded-xl border border-white/10 bg-white/[0.025] p-4"><item.icon className="h-5 w-5 text-primary" /><div className="mt-3 text-sm font-semibold">{item.title}</div><div className="mt-1 text-xs text-muted-foreground">{item.body}</div></div>)}</div><Button onClick={() => setLeadDialogOpen(true)} className="mt-6 bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500"><Crown className="mr-2 h-4 w-4" />Start application</Button></div></div> : <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]"><div className="rounded-2xl border border-white/10 bg-card/50 p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-lg font-bold text-white">{leadName.slice(0, 2).toUpperCase()}</div><div><div className="flex items-center gap-2 text-xl font-semibold">{leadName}<ShieldCheck className="h-4 w-4 text-primary" /></div><div className="mt-1 text-xs text-muted-foreground">{leadProfile.category} · {leadProfile.market} · {leadProfile.primaryInstrument}</div></div></div><Button variant="outline" className="border-white/10" onClick={() => setLeadDialogOpen(true)}><Settings2 className="mr-2 h-4 w-4" />Edit application</Button></div><p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">{leadProfile.strategySummary || "Add a strategy summary to complete your public application."}</p><div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4"><Metric label="Status" value={leadProfile.acceptingCopiers ? "Accepting" : "Paused"} accent={leadProfile.acceptingCopiers} /><Metric label="Risk" value={leadProfile.riskLevel} /><Metric label="Experience" value={leadProfile.experience} /><Metric label="Profit commission" value={`${leadProfile.commissionPercent}%`} /></div><div className="mt-6 flex gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[0.055] p-4 text-xs leading-relaxed text-muted-foreground"><Info className="h-4 w-4 shrink-0 text-amber-300" />Your application is stored only in this browser. Backend approval, eligibility verification, and commission settlement are not active yet.</div></div><div className="rounded-2xl border border-white/10 bg-card/50 p-6"><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /><h3 className="font-semibold">Application readiness</h3></div><div className="mt-5 space-y-4">{[{ label: "Public profile", done: true }, { label: "Trading focus", done: true }, { label: "Commission selected", done: true }, { label: "Backend verification", done: false }].map((item) => <div key={item.label} className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{item.label}</span><span className={cn("grid h-6 w-6 place-items-center rounded-full", item.done ? "bg-emerald-400/10 text-emerald-300" : "bg-white/5 text-muted-foreground")}>{item.done ? <Check className="h-3.5 w-3.5" /> : "–"}</span></div>)}</div></div></div>}</section>}

          <div className="flex items-center justify-between gap-3 border-t border-white/10 py-5 text-[11px] text-muted-foreground"><span>Copy Trading frontend preview · No real orders are submitted</span><span className="hidden items-center gap-1 sm:flex"><ShieldCheck className="h-3.5 w-3.5 text-primary" />Risk controls stay with the Copier</span></div>
        </div>
      </div>
      <CopySetupDialog trader={selectedTrader} relationship={selectedRelationship} open={copyDialogOpen} onOpenChange={setCopyDialogOpen} onSave={saveRelationship} />
      <LeadTraderDialog
        open={leadDialogOpen}
        onOpenChange={setLeadDialogOpen}
        profile={leadProfile}
        initialCategory={category}
        initialMarket={market}
        onSave={(profile) => {
          setLeadProfile(profile);
          localStorage.setItem("bitdx-lead-profile", JSON.stringify(profile));
          localStorage.removeItem("bitdx-lead-name");
          setView("lead");
          toast.success(leadProfile ? "Lead Trader application updated" : "Lead Trader application saved", {
            description: `${profile.commissionPercent}% performance commission selected.`,
          });
        }}
      />
    </AppShell>
  );
};

export default CopyTrade;
