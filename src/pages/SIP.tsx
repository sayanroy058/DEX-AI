import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

const PROJECTION = Array.from({ length: 36 }, (_, i) => ({
  m: i + 1,
  value: Math.round(1000 + i * i * 40),
}));

type PlanType = "sip" | "swp";

interface Plan {
  id: string;
  type: PlanType;
  name: string;
  asset: string;
  amount: number;
  frequency: string;
  startDate: string;
  endDate: string;
  status: "active" | "paused";
  totalInvested: number;
  currentValue: number;
  returns: number;
  nextExecution: string;
  executionsCompleted: number;
}

const MOCK_PLANS: Plan[] = [
  {
    id: "1",
    type: "sip",
    name: "BTC Growth Plan",
    asset: "BTC",
    amount: 1000,
    frequency: "Monthly",
    startDate: "2026-01-01",
    endDate: "2027-01-01",
    status: "active",
    totalInvested: 5000,
    currentValue: 5820,
    returns: 820,
    nextExecution: "2026-06-01",
    executionsCompleted: 5,
  },
  {
    id: "2",
    type: "sip",
    name: "ETH Weekly SIP",
    asset: "ETH",
    amount: 250,
    frequency: "Weekly",
    startDate: "2026-02-01",
    endDate: "2026-12-01",
    status: "active",
    totalInvested: 3750,
    currentValue: 4100,
    returns: 350,
    nextExecution: "2026-06-07",
    executionsCompleted: 15,
  },
  {
    id: "3",
    type: "swp",
    name: "Monthly Withdrawal",
    asset: "DEXUSD",
    amount: 500,
    frequency: "Monthly",
    startDate: "2026-03-01",
    endDate: "2027-03-01",
    status: "active",
    totalInvested: 10000,
    currentValue: 8500,
    returns: -1500,
    nextExecution: "2026-06-01",
    executionsCompleted: 3,
  },
  {
    id: "4",
    type: "swp",
    name: "SOL Income Plan",
    asset: "SOL",
    amount: 200,
    frequency: "Weekly",
    startDate: "2026-01-15",
    endDate: "2026-12-15",
    status: "paused",
    totalInvested: 5000,
    currentValue: 4200,
    returns: -800,
    nextExecution: "—",
    executionsCompleted: 10,
  },
];

const EXECUTION_HISTORY = [
  { date: "2026-05-01", amount: 1000, status: "completed", price: 62400 },
  { date: "2026-04-01", amount: 1000, status: "completed", price: 59100 },
  { date: "2026-03-01", amount: 1000, status: "completed", price: 61200 },
  { date: "2026-02-01", amount: 1000, status: "completed", price: 57800 },
  { date: "2026-01-01", amount: 1000, status: "completed", price: 55300 },
];

export default function SIP() {
  const finalValue = useMemo(() => PROJECTION[PROJECTION.length - 1].value, []);
  const [activeTab, setActiveTab] = useState<PlanType>("sip");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<Plan[]>(MOCK_PLANS);

  const filteredPlans = plans.filter((p) => p.type === activeTab);

  function cancelPlan(id: string) {
    setPlans((prev) => prev.filter((p) => p.id !== id));
    setSelectedPlan(null);
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
                onClick={() => setSelectedPlan(null)}
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
              <div className="font-mono font-bold text-lg">${selectedPlan.currentValue.toLocaleString()}</div>
            </div>
            <div className="glass rounded-xl p-4 border border-border/40">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                {isSip ? "Returns" : "Net Change"}
              </div>
              <div
                className={`font-mono font-bold text-lg ${
                  selectedPlan.returns >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {selectedPlan.returns >= 0 ? "+" : ""}${selectedPlan.returns.toLocaleString()}
              </div>
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
                <div
                  className={`text-2xl font-bold font-mono ${
                    selectedPlan.returns >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {selectedPlan.totalInvested > 0
                    ? `${selectedPlan.returns >= 0 ? "+" : ""}${(
                        (selectedPlan.returns / selectedPlan.totalInvested) *
                        100
                      ).toFixed(2)}%`
                    : "—"}
                </div>
              </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Projected Runway</div>
                  <div className="text-2xl font-bold font-mono text-primary">
                    {Math.floor(selectedPlan.currentValue / selectedPlan.amount)}
                  </div>
                  <div className="text-xs text-muted-foreground">cycles remaining at current withdrawal</div>
                </div>
              )}

              {isSip && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">P&L</div>
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500/70 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (selectedPlan.currentValue / (selectedPlan.totalInvested || 1)) * 100
                        )}%`,
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
                  {EXECUTION_HISTORY.map((row, i) => (
                    <tr key={i} className="hover:bg-muted/10 transition-colors">
                      <td className="py-2.5 font-mono text-xs">{row.date}</td>
                      <td className="py-2.5 font-mono text-xs text-right">${row.amount.toLocaleString()}</td>
                      <td className="py-2.5 font-mono text-xs text-right">${row.price.toLocaleString()}</td>
                      <td className="py-2.5 text-right">
                        <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/15 text-emerald-400 rounded-full px-2 py-0.5">
                          ✓ {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
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
              <Wallet className="h-3 w-3" /> Wallet Balance
            </div>
            <div className="text-xl font-bold font-mono mt-1">$84,260.00</div>
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
                  <select className="w-full h-10 rounded-md bg-muted/30 border border-border px-3 text-sm">
                    <option>BTC</option>
                    <option>ETH</option>
                    <option>SOL</option>
                    <option>DEXUSD</option>
                  </select>
                </Field>
                <Field label={activeTab === "sip" ? "Amount per cycle (USD)" : "Withdrawal per cycle (USD)"}>
                  <Input defaultValue="1000" />
                </Field>
                <Field label="Frequency">
                  <select className="w-full h-10 rounded-md bg-muted/30 border border-border px-3 text-sm">
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                    <option>Yearly</option>
                  </select>
                </Field>
                <Field label="Start Date">
                  <Input type="date" />
                </Field>
                <Field label="End Date">
                  <Input type="date" />
                </Field>
                <Field label="Plan Name">
                  <Input defaultValue={activeTab === "sip" ? "SIP Plan 01" : "SWP Plan 01"} />
                </Field>
              </div>
              <Button className="w-full bg-gradient-primary text-primary-foreground h-10">
                <Calendar className="h-4 w-4 mr-2" />
                {activeTab === "sip" ? "Start SIP Plan" : "Start SWP Plan"}
              </Button>
            </div>

            <div className="glass rounded-xl p-4 border border-border/40">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold">AI Projection (3 Years)</div>
                <div className="text-[10px] text-muted-foreground">
                  {activeTab === "sip" ? "~12% yearly return" : "~8% yearly withdrawal"}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={PROJECTION} margin={{ top: 10, right: 8, bottom: 0, left: -20 }}>
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
                  <XAxis dataKey="m" tick={{ fill: "hsl(220 15% 55%)", fontSize: 10 }} />
                  <YAxis tick={{ fill: "hsl(220 15% 55%)", fontSize: 10 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={activeTab === "sip" ? "#22d3ee" : "#a78bfa"}
                    strokeWidth={2}
                    fill="url(#planProjection)"
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                <Mini label="Final Value" value={`$${finalValue.toLocaleString()}`} />
                <Mini label={activeTab === "sip" ? "Total Invested" : "Total Withdrawn"} value="$36,000" />
                <Mini
                  label="Estimated Return"
                  value={activeTab === "sip" ? "+$48,235" : "-$36,000"}
                  positive={activeTab === "sip"}
                />
              </div>
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
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(selectedPlan?.id === plan.id ? null : plan)}
                  className={`glass rounded-xl p-4 border text-left transition-all hover:border-primary/50 group ${
                    selectedPlan?.id === plan.id
                      ? "border-primary ring-1 ring-primary/30"
                      : "border-border/40"
                  }`}
                >
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
                      <div className="text-[10px] text-muted-foreground">Current Value</div>
                      <div className="font-mono font-bold text-sm">${plan.currentValue.toLocaleString()}</div>
                    </div>
                    <div className={`text-xs font-mono font-semibold ${plan.returns >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {plan.returns >= 0 ? "+" : ""}${plan.returns.toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center justify-end mt-2 text-primary/60 group-hover:text-primary transition-colors">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </button>
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

