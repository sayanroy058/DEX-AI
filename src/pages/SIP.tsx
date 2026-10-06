import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
  X,
  ChevronRight,
  ArrowLeft,
  Pause,
  Play,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  createSipSwpPlan, getSipSwpPlans, getSipSwpExecutions, pauseSipSwpPlan, resumeSipSwpPlan, cancelSipSwpPlan,
  parseSipAmount, formatSipAmount,
  type SipSwpPlan, type SipSwpExecution, type SipSwpFrequency,
} from "@/lib/apiClient";
import { registeredSpotSymbols } from "@/lib/backendMarkets";
import { useWallet } from "@/lib/useWallet";
import { useMarket } from "@/lib/useMarkets";

const DEFAULT_PROJECTION_MONTHS = 36;
const CYCLES_PER_YEAR: Record<string, number> = {
  Daily: 365,
  Weekly: 52,
  Monthly: 12,
  Yearly: 1,
};

function projectionMonths(startDate: string, endDate: string) {
  if (!startDate || !endDate) return DEFAULT_PROJECTION_MONTHS;
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return DEFAULT_PROJECTION_MONTHS;
  const fullMonths = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth();
  const includesPartialMonth = end.getUTCDate() > start.getUTCDate();
  return Math.max(1, fullMonths + (includesPartialMonth ? 1 : 0));
}

function projectionDurationLabel(months: number) {
  if (months < 12) return `${months} Month${months === 1 ? "" : "s"}`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return `${years} Year${years === 1 ? "" : "s"}${remainingMonths ? ` ${remainingMonths} Month${remainingMonths === 1 ? "" : "s"}` : ""}`;
}

function projectionTick(month: number, totalMonths: number): string {
  // Was `return month` on the short-projection branch — inferred this
  // function's return type as `string | number`, which Recharts'
  // XAxis tickFormatter (string-only) rejected.
  if (totalMonths <= 36) return String(month);
  const years = month / 12;
  return `${Number.isInteger(years) ? years : years.toFixed(1)}Y`;
}

function projectionMoney(value: number) {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

type PlanType = "sip" | "swp";

// FREQUENCY_OPTIONS/frequencyToBackend/frequencyFromBackend bridge the
// form's display labels ("Daily"/"Weekly"/"Monthly"/"Yearly") and the
// backend's SipSwpFrequency ("DAILY"/"WEEKLY"/"MONTHLY"/"YEARLY").
const FREQUENCY_OPTIONS: { value: SipSwpFrequency; label: string }[] = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

// A real plan's displayable fields — derived from SipSwpPlan (the raw API
// shape) once per fetch, so the render code below works with plain numbers/
// strings instead of raw-unit conversions scattered everywhere.
interface DisplayPlan {
  id: string;
  type: PlanType;
  name: string;
  asset: string;
  amount: number; // per-cycle USD amount, human units
  frequency: string; // display label, e.g. "Monthly"
  dayOfPeriod?: number;
  startDate: string;
  endDate: string;
  status: "active" | "paused" | "cancelled" | "completed";
  totalInvested: number; // totalUsdRaw, human units — SIP: invested; SWP: withdrawn
  nextExecution: string;
  executionsCompleted: number;
  raw: SipSwpPlan;
}

function toDisplayPlan(p: SipSwpPlan): DisplayPlan {
  const freqLabel = FREQUENCY_OPTIONS.find((f) => f.value === p.frequency)?.label ?? p.frequency;
  return {
    id: p.id,
    type: p.kind === "SIP" ? "sip" : "swp",
    name: p.name,
    asset: p.asset,
    amount: Number(formatSipAmount(p.amountUsdRaw)),
    frequency: freqLabel,
    dayOfPeriod: p.dayOfPeriod,
    startDate: p.startDate,
    endDate: p.endDate ?? "",
    status: p.status,
    totalInvested: Number(formatSipAmount(p.totalUsdRaw)),
    nextExecution: p.status === "active" ? p.nextRunDate : "—",
    executionsCompleted: p.executionsCompleted,
    raw: p,
  };
}

export default function SIP() {
  const wallet = useWallet();
  const [activeTab, setActiveTab] = useState<PlanType>("sip");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [plans, setPlans] = useState<DisplayPlan[]>([]);
  const [executions, setExecutions] = useState<SipSwpExecution[]>([]);
  const [amountPerCycle, setAmountPerCycle] = useState("0");
  const [frequency, setFrequency] = useState<SipSwpFrequency>("DAILY");
  const [dayOfPeriod, setDayOfPeriod] = useState("1");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [planName, setPlanName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Spot-tradable base assets, from the engine's own registered SPOT
  // symbols — not a hardcoded list, so this automatically reflects
  // whichever assets actually have a live Spot order book to execute a
  // SIP/SWP MARKET order against (today, just BI2X-BI2XUSD — see
  // backendMarkets.ts's own doc comment on why the rest are FUTURES-only).
  const spotAssets = useMemo(
    () => registeredSpotSymbols().map((s) => s.symbol.split("-")[0]),
    []
  );
  const [asset, setAsset] = useState(spotAssets[0] ?? "BI2X");

  const refreshPlans = () => {
    getSipSwpPlans()
      .then((r) => setPlans((r.plans ?? []).map(toDisplayPlan)))
      .catch(() => {/* transient network error; next poll will retry */});
  };

  useEffect(() => {
    if (!wallet.connected) return;
    refreshPlans();
    const timer = window.setInterval(refreshPlans, 15000);
    return () => window.clearInterval(timer);
  }, [wallet.connected]);

  useEffect(() => {
    if (!selectedPlanId) {
      setExecutions([]);
      return;
    }
    let cancelled = false;
    getSipSwpExecutions(selectedPlanId)
      .then((r) => { if (!cancelled) setExecutions(r.executions ?? []); })
      .catch(() => { if (!cancelled) setExecutions([]); });
    return () => { cancelled = true; };
  }, [selectedPlanId]);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;

  // Real current value: sum the base-asset qty actually bought (SIP) or
  // sold (SWP) across every COMPLETED execution, priced at the asset's
  // current Spot mark — replacing the old mock's fabricated currentValue/
  // returns figures. null while the asset's market price hasn't loaded yet
  // (useMarket returns undefined for an unknown/not-yet-loaded symbol),
  // distinct from a genuine 0 — same "unknown vs zero" convention used
  // elsewhere in this codebase (e.g. Portfolio.tsx's area cards).
  const selectedPlanMarket = useMarket(selectedPlan ? `${selectedPlan.asset}-BI2XUSD` : "");
  const selectedPlanValue = useMemo(() => {
    if (!selectedPlan) return null;
    const price = selectedPlanMarket?.price;
    if (!price || price <= 0) return null;
    const totalQty = executions.reduce((sum, e) => {
      if (e.status !== "completed" || !e.qtyRaw) return sum;
      return sum + Number(formatSipAmount(e.qtyRaw));
    }, 0);
    return totalQty * price;
  }, [selectedPlan, selectedPlanMarket, executions]);

  const projection = useMemo(() => {
    const months = projectionMonths(startDate, endDate);
    const amount = Math.max(0, Number(amountPerCycle) || 0);
    const cyclesPerYear = CYCLES_PER_YEAR[FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.label ?? "Monthly"] ?? 12;
    const data = Array.from({ length: months + 1 }, (_, month) => {
      const completedCycles = month === 0 ? 0 : Math.max(1, Math.round((month / 12) * cyclesPerYear));
      const contributed = amount * completedCycles;
      const progress = month / months;
      return {
        m: month,
        invested: Math.round(contributed),
        lowerValue: Math.round(contributed * (1 + 0.3 * progress)),
        upperValue: Math.round(contributed * (1 + 0.4 * progress)),
      };
    });
    const final = data[data.length - 1];
    return {
      months,
      data,
      totalInvested: final.invested,
      lowerValue: final.lowerValue,
      upperValue: final.upperValue,
      lowerGain: final.lowerValue - final.invested,
      upperGain: final.upperValue - final.invested,
    };
  }, [amountPerCycle, endDate, frequency, startDate]);

  const projectionDuration = projectionDurationLabel(projection.months);

  const filteredPlans = plans.filter((p) => p.type === activeTab);

  async function handleCreatePlan() {
    if (submitting) return;
    let amountUsdRaw: string;
    try {
      amountUsdRaw = parseSipAmount(amountPerCycle);
    } catch (e) {
      toast({ title: "Invalid amount", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
      return;
    }
    if (!startDate) {
      toast({ title: "Pick a start date", variant: "destructive" });
      return;
    }
    const needsDayOfPeriod = frequency === "MONTHLY" || frequency === "YEARLY";
    const dayNum = Number(dayOfPeriod);
    if (needsDayOfPeriod && (!Number.isInteger(dayNum) || dayNum < 1 || dayNum > 31)) {
      toast({ title: "Day of month must be between 1 and 31", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await createSipSwpPlan({
        kind: activeTab === "sip" ? "SIP" : "SWP",
        name: planName.trim() || undefined,
        asset,
        amountUsdRaw,
        frequency,
        dayOfPeriod: needsDayOfPeriod ? dayNum : undefined,
        startDate,
        endDate: endDate || undefined,
      });
      toast({ title: `${activeTab === "sip" ? "SIP" : "SWP"} plan created`, description: `${amountPerCycle} USD every ${FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.label.toLowerCase()} in ${asset}.` });
      setPlanName("");
      refreshPlans();
    } catch (e) {
      toast({ title: "Could not create plan", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function pausePlan(id: string) {
    try {
      await pauseSipSwpPlan(id);
      refreshPlans();
    } catch (e) {
      toast({ title: "Could not pause plan", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  }

  async function resumePlan(id: string) {
    try {
      await resumeSipSwpPlan(id);
      refreshPlans();
    } catch (e) {
      toast({ title: "Could not resume plan", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  }

  async function cancelPlan(id: string) {
    try {
      await cancelSipSwpPlan(id);
      refreshPlans();
      setSelectedPlanId(null);
    } catch (e) {
      toast({ title: "Could not cancel plan", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  }

  if (selectedPlan) {
    const isSip = selectedPlan.type === "sip";
    const progressPct = Math.round(
      (selectedPlan.executionsCompleted /
        (selectedPlan.executionsCompleted + 7)) *
        100
    );
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto p-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
          {/* Back header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedPlanId(null)}
                className="glass rounded-lg p-2 border border-border/40 hover:border-primary/40 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{selectedPlan.name}</h1>
                  <Badge
                    className={
                      selectedPlan.status === "active"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {selectedPlan.status}
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {selectedPlan.type.toUpperCase()} · {selectedPlan.asset} · {selectedPlan.frequency}
                </div>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-1.5">
                  <X className="h-3.5 w-3.5" />
                  Cancel Plan
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel {selectedPlan.type.toUpperCase()} Plan?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel "{selectedPlan.name}"? This action cannot be undone
                    and all future scheduled executions will be stopped.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Plan</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => cancelPlan(selectedPlan.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, Cancel Plan
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="glass rounded-xl p-4 border border-border/40">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                {isSip ? "Total Invested" : "Total Withdrawn"}
              </div>
              <div className="font-mono font-bold text-lg">${selectedPlan.totalInvested.toLocaleString()}</div>
            </div>
            <div className="glass rounded-xl p-4 border border-border/40">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Current Value</div>
              <div className="font-mono font-bold text-lg">{selectedPlanValue === null ? "—" : `$${selectedPlanValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}</div>
            </div>
            <div className="glass rounded-xl p-4 border border-border/40">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                {isSip ? "Returns" : "Net Change"}
              </div>
              {(() => {
                if (selectedPlanValue === null) return <div className="font-mono font-bold text-lg text-muted-foreground">—</div>;
                const returns = selectedPlanValue - selectedPlan.totalInvested;
                return (
                  <div className={`font-mono font-bold text-lg ${returns >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {returns >= 0 ? "+" : ""}${returns.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                );
              })()}
            </div>
            <div className="glass rounded-xl p-4 border border-border/40">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Executions Done</div>
              <div className="font-mono font-bold text-lg">{selectedPlan.executionsCompleted}</div>
            </div>
          </div>

          {/* Plan details + progress */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="glass rounded-xl p-5 border border-border/40 space-y-4">
              <div className="text-sm font-semibold">Plan Details</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Asset</div>
                  <div className="font-semibold">{selectedPlan.asset}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                    {isSip ? "Amount / Cycle" : "Withdrawal / Cycle"}
                  </div>
                  <div className="font-semibold font-mono">${selectedPlan.amount.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Frequency</div>
                  <div className="font-semibold">{selectedPlan.frequency}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Next Execution</div>
                  <div className="font-semibold">{selectedPlan.nextExecution}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Start Date</div>
                  <div className="font-semibold">{selectedPlan.startDate}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">End Date</div>
                  <div className="font-semibold">{selectedPlan.endDate}</div>
                </div>
              </div>
            </div>

            <div className="glass rounded-xl p-5 border border-border/40 space-y-4">
              <div className="text-sm font-semibold">Progress</div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{selectedPlan.executionsCompleted} cycles completed</span>
                  <span>{progressPct}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-primary transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
              {isSip ? (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Return rate</div>
                {(() => {
                  if (selectedPlanValue === null || selectedPlan.totalInvested <= 0) return <div className="text-2xl font-bold font-mono text-muted-foreground">—</div>;
                  const returns = selectedPlanValue - selectedPlan.totalInvested;
                  const pct = (returns / selectedPlan.totalInvested) * 100;
                  return (
                    <div className={`text-2xl font-bold font-mono ${returns >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {returns >= 0 ? "+" : ""}{pct.toFixed(2)}%
                    </div>
                  );
                })()}
              </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Total Withdrawn</div>
                  <div className="text-2xl font-bold font-mono text-primary">
                    ${selectedPlan.totalInvested.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-muted-foreground">across {selectedPlan.executionsCompleted} completed cycle{selectedPlan.executionsCompleted === 1 ? "" : "s"}</div>
                </div>
              )}

              {isSip && selectedPlanValue !== null && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">P&L</div>
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500/70 rounded-full"
                      style={{
                        width: `${Math.min(100, (selectedPlanValue / (selectedPlan.totalInvested || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Execution history */}
          <div className="glass-strong rounded-xl p-5 border border-border/50">
            <div className="text-sm font-semibold mb-4">Execution History</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-muted-foreground uppercase tracking-wide border-b border-border/40">
                    <th className="text-left pb-2 font-medium">Date</th>
                    <th className="text-right pb-2 font-medium">Amount (USD)</th>
                    <th className="text-right pb-2 font-medium">{selectedPlan.asset} Price</th>
                    <th className="text-right pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {executions.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-2.5 font-mono text-xs">{row.scheduledDate}</td>
                      <td className="py-2.5 font-mono text-xs text-right">${Number(formatSipAmount(row.amountUsdRaw)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="py-2.5 font-mono text-xs text-right">{row.price ? `$${Number(row.price).toLocaleString(undefined, { maximumFractionDigits: 6 })}` : "—"}</td>
                      <td className="py-2.5 text-right">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5 ${
                            row.status === "completed"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-amber-500/15 text-amber-400"
                          }`}
                          title={row.skipReason ?? undefined}
                        >
                          {row.status === "completed" ? "✓" : "⚠"} {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {executions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-xs text-muted-foreground">No executions yet — this fills in as scheduled cycles run.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">SIP / SWP Investments</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Build long-term wealth with systematic investing and withdrawals.
            </p>
          </div>
          <div className="glass rounded-xl px-4 py-3 border border-primary/30 w-full sm:w-auto sm:min-w-52">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Wallet className="h-3 w-3" /> Spot BI2XUSD Balance
            </div>
            <div className="text-xl font-bold font-mono mt-1">
              {(() => {
                const bal = wallet.balances.find((b) => b.asset === "BI2XUSD")?.available;
                return bal === undefined ? "—" : `$${bal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
              })()}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/30 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab("sip")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "sip"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Systematic Investment Plan</span>
            <span className="inline sm:hidden">SIP</span>
          </button>
          <button
            onClick={() => setActiveTab("swp")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "swp"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingDown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Systematic Withdrawal Plan</span>
            <span className="inline sm:hidden">SWP</span>
          </button>
        </div>

        {/* Setup + Chart */}
        <div className="glass-strong rounded-xl p-6 border border-border/50">
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="glass rounded-xl p-4 border border-border/40 space-y-3">
              <div className="text-sm font-semibold">
                {activeTab === "sip" ? "Set Up Your SIP Plan" : "Set Up Your SWP Plan"}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Asset">
                  <select
                    value={asset}
                    onChange={(event) => setAsset(event.target.value)}
                    className="w-full h-10 rounded-md bg-muted/30 border border-border px-3 text-sm"
                  >
                    {spotAssets.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </Field>
                <Field label={activeTab === "sip" ? "Amount per cycle (USD)" : "Withdrawal per cycle (USD)"}>
                  <Input
                    type="number"
                    min="0"
                    value={amountPerCycle}
                    onChange={(event) => setAmountPerCycle(event.target.value)}
                  />
                </Field>
                <Field label="Frequency">
                  <select
                    value={frequency}
                    onChange={(event) => setFrequency(event.target.value as SipSwpFrequency)}
                    className="w-full h-10 rounded-md bg-muted/30 border border-border px-3 text-sm"
                  >
                    {FREQUENCY_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </Field>
                {(frequency === "MONTHLY" || frequency === "YEARLY") && (
                  <Field label="Day of month">
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={dayOfPeriod}
                      onChange={(event) => setDayOfPeriod(event.target.value)}
                    />
                  </Field>
                )}
                <Field label="Start Date">
                  <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                </Field>
                <Field label="End Date (optional)">
                  <Input
                    type="date"
                    min={startDate || undefined}
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                  />
                </Field>
                <Field label="Plan Name (optional)">
                  <Input
                    placeholder={activeTab === "sip" ? "SIP Plan" : "SWP Plan"}
                    value={planName}
                    onChange={(event) => setPlanName(event.target.value)}
                  />
                </Field>
              </div>
              <Button className="w-full bg-gradient-primary text-primary-foreground h-10" onClick={handleCreatePlan} disabled={submitting}>
                <Calendar className="h-4 w-4 mr-2" />
                {submitting ? "Starting…" : activeTab === "sip" ? "Start SIP Plan" : "Start SWP Plan"}
              </Button>
            </div>

            <div className="glass rounded-xl p-4 border border-border/40">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold">AI Projection ({projectionDuration})</div>
                <div className="text-[10px] text-muted-foreground">
                  {activeTab === "sip" ? "30–40% estimated return range" : "Scheduled withdrawal estimate"}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={projection.data} margin={{ top: 10, right: 8, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id="planProjection" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={activeTab === "sip" ? "#22d3ee" : "#a78bfa"}
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="95%"
                        stopColor={activeTab === "sip" ? "#22d3ee" : "#a78bfa"}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 25% 18% / 0.4)" />
                  <XAxis
                    dataKey="m"
                    minTickGap={24}
                    tick={{ fill: "hsl(220 15% 55%)", fontSize: 10 }}
                    tickFormatter={(month) => projectionTick(Number(month), projection.months)}
                  />
                  <YAxis
                    width={58}
                    tick={{ fill: "hsl(220 15% 55%)", fontSize: 10 }}
                    tickFormatter={(value) => `$${Number(value).toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 })}`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [projectionMoney(value), name]}
                    labelFormatter={(month) => {
                      const numericMonth = Number(month);
                      if (projection.months <= 36) return `Month ${numericMonth}`;
                      const years = Math.floor(numericMonth / 12);
                      const remainingMonths = numericMonth % 12;
                      return `Year ${years}${remainingMonths ? `, Month ${remainingMonths}` : ""}`;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={activeTab === "sip" ? "upperValue" : "invested"}
                    name={activeTab === "sip" ? "40% projection" : "Total scheduled"}
                    stroke={activeTab === "sip" ? "#22d3ee" : "#a78bfa"}
                    strokeWidth={2}
                    fill="url(#planProjection)"
                  />
                  {activeTab === "sip" && (
                    <Area
                      type="monotone"
                      dataKey="lowerValue"
                      name="30% projection"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fill="transparent"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                {activeTab === "sip" ? (
                  <>
                    <Mini label="30% Projected Value" value={projectionMoney(projection.lowerValue)} positive />
                    <Mini label="40% Projected Value" value={projectionMoney(projection.upperValue)} positive />
                    <Mini label="Total Invested" value={projectionMoney(projection.totalInvested)} />
                  </>
                ) : (
                  <>
                    <Mini label="Projected Withdrawals" value={projectionMoney(projection.totalInvested)} />
                    <Mini label="Cycles Scheduled" value={`${Math.round(projection.totalInvested / Math.max(1, Number(amountPerCycle) || 1))}`} />
                    <Mini label="Projection Period" value={projectionDuration} />
                  </>
                )}
              </div>
              {activeTab === "sip" && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                  <span>Estimated gain at 30%: <strong className="font-mono text-emerald-500">+{projectionMoney(projection.lowerGain)}</strong></span>
                  <span>Estimated gain at 40%: <strong className="font-mono text-emerald-500">+{projectionMoney(projection.upperGain)}</strong></span>
                </div>
              )}
              <p className="mt-3 border-t border-border/40 pt-3 text-[10px] leading-relaxed text-muted-foreground">
                AI-generated projections are illustrative estimates only; actual market performance may vary materially.
              </p>
            </div>
          </div>
        </div>

        {/* Plans List */}
        <div>
          <h2 className="text-base font-semibold mb-3">
            Your {activeTab === "sip" ? "SIP" : "SWP"} Plans
          </h2>

          {filteredPlans.length === 0 ? (
            <div className="glass rounded-xl p-8 border border-border/40 text-center text-muted-foreground text-sm">
              No {activeTab === "sip" ? "SIP" : "SWP"} plans found. Create one above.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`glass rounded-xl p-4 border transition-all hover:border-primary/50 group ${
                    selectedPlan?.id === plan.id
                      ? "border-primary ring-1 ring-primary/30"
                      : "border-border/40"
                  }`}
                >
                  <button onClick={() => setSelectedPlanId(selectedPlanId === plan.id ? null : plan.id)} className="w-full text-left">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {plan.asset}
                      </span>
                      <Badge
                        variant={plan.status === "active" ? "default" : "secondary"}
                        className={`text-[10px] px-1.5 py-0 ${
                          plan.status === "active"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {plan.status}
                      </Badge>
                    </div>
                    <div className="font-semibold text-sm truncate">{plan.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      ${plan.amount} / {plan.frequency}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-muted-foreground">{plan.type === "sip" ? "Total Invested" : "Total Withdrawn"}</div>
                        <div className="font-mono font-bold text-sm">${plan.totalInvested.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">{plan.executionsCompleted} cycle{plan.executionsCompleted === 1 ? "" : "s"}</div>
                    </div>
                  </button>
                  <div className="flex items-center justify-between mt-2">
                    {plan.status === "active" || plan.status === "paused" ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); (plan.status === "active" ? pausePlan : resumePlan)(plan.id); }}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {plan.status === "active" ? <><Pause className="h-3 w-3" /> Pause</> : <><Play className="h-3 w-3" /> Resume</>}
                      </button>
                    ) : <span />}
                    <button onClick={() => setSelectedPlanId(selectedPlanId === plan.id ? null : plan.id)} className="text-primary/60 group-hover:text-primary transition-colors">
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function Mini({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="glass rounded-lg p-2.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div
        className={`font-mono font-bold text-sm ${
          positive === undefined ? "" : positive ? "text-emerald-400" : "text-red-400"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

