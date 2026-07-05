import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Play,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

type FlowStatus = "idle" | "ready" | "accepted";

const strategyTypes = ["Spot Grid", "Futures Grid", "Spot DCA", "Futures DCA", "Arbitrage", "TWAP"];
const riskLevels = ["Conservative", "Balanced", "Aggressive"];
const timeframes = ["Intraday", "1-7 Days", "2-4 Weeks", "Long Term"];

export default function AIAgent() {
  const [status, setStatus] = useState<FlowStatus>("idle");
  const [strategyType, setStrategyType] = useState("Spot Grid");
  const [risk, setRisk] = useState("Balanced");
  const [timeframe, setTimeframe] = useState("1-7 Days");
  const [market, setMarket] = useState("TON/USDN");
  const [investment, setInvestment] = useState("280");
  const [goal, setGoal] = useState("Steady compounding with controlled drawdown");

  const flow = useMemo(() => {
    const gridCount = risk === "Conservative" ? 36 : risk === "Balanced" ? 48 : 72;
    const maxDrawdown = risk === "Conservative" ? "3.5%" : risk === "Balanced" ? "6.5%" : "10%";
    const profitMode = strategyType.includes("Grid") ? "geometric grid spacing" : "scaled recurring entries";

    return [
      {
        title: "Market Scan",
        body: `Analyze ${market || "selected market"} volatility, liquidity, spread, and trend strength for the ${timeframe.toLowerCase()} window.`,
      },
      {
        title: "Strategy Build",
        body: `Create a ${strategyType} bot using ${profitMode}, ${gridCount} execution levels, and ${risk.toLowerCase()} risk controls.`,
      },
      {
        title: "Risk Guard",
        body: `Cap estimated drawdown near ${maxDrawdown}, enable stop rules, and pause entries during abnormal volatility spikes.`,
      },
      {
        title: "Deployment Review",
        body: `Allocate ${investment || "0"} USDN, preview expected trade frequency, then wait for your acceptance before activation.`,
      },
    ];
  }, [investment, market, risk, strategyType, timeframe]);

  const generateFlow = () => setStatus("ready");
  const acceptFlow = () => setStatus("accepted");
  const refineFlow = () => setStatus("idle");

  return (
    <AppShell>
      <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link to="/trading-bots" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
                <ArrowLeft className="h-4 w-4" />
                Back to Trading Bots
              </Link>
              <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight sm:text-4xl">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                  <Bot className="h-6 w-6" />
                </span>
                AI Agent Builder
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Tell the agent what you want. It will draft a trading-bot flow and wait for your acceptance before anything is created.
              </p>
            </div>
            <div className="rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">
              UI preview only
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-2xl border border-border/60 bg-card/75 p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">Preferences</h2>
              </div>

              <div className="space-y-5">
                <Field label="Market Pair">
                  <input
                    value={market}
                    onChange={(event) => setMarket(event.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="BTC/USDN"
                  />
                </Field>

                <Field label="Preferred Strategy">
                  <Segmented options={strategyTypes} value={strategyType} onChange={setStrategyType} />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Risk Level">
                    <Segmented options={riskLevels} value={risk} onChange={setRisk} compact />
                  </Field>
                  <Field label="Time Horizon">
                    <Segmented options={timeframes} value={timeframe} onChange={setTimeframe} compact />
                  </Field>
                </div>

                <Field label="Investment">
                  <div className="flex h-11 items-center rounded-xl border border-border bg-background px-3">
                    <input
                      value={investment}
                      onChange={(event) => setInvestment(event.target.value)}
                      className="w-full bg-transparent text-sm font-semibold outline-none"
                      placeholder="0"
                    />
                    <span className="text-sm font-black">USDN</span>
                  </div>
                </Field>

                <Field label="Goal and Constraints">
                  <Textarea
                    value={goal}
                    onChange={(event) => setGoal(event.target.value)}
                    className="min-h-28 resize-none rounded-xl bg-background text-sm"
                    placeholder="Describe your goal, preferred assets, stop rules, and anything the bot should avoid."
                  />
                </Field>

                <Button onClick={generateFlow} className="h-12 w-full bg-gradient-primary font-bold text-primary-foreground">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate AI Flow
                </Button>
              </div>
            </section>

            <section className="rounded-2xl border border-border/60 bg-card/75 p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">AI Proposed Flow</h2>
                </div>
                <StatusPill status={status} />
              </div>

              {status === "idle" ? (
                <div className="flex min-h-[460px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold">Waiting for preferences</h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    Fill the form and generate a flow. The agent will summarize the steps, safeguards, and deployment plan here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-primary">Agent Summary</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Build a {risk.toLowerCase()} {strategyType} bot for {market || "your selected market"} with {investment || "0"} USDN.
                      Primary goal: {goal || "not specified"}.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {flow.map((step, index) => (
                      <div key={step.title} className="rounded-2xl border border-border/60 bg-background/45 p-4">
                        <div className="mb-2 flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground">
                            {index + 1}
                          </span>
                          <h3 className="font-bold">{step.title}</h3>
                        </div>
                        <p className="text-sm leading-6 text-muted-foreground">{step.body}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-background/45 p-4">
                    <div className="mb-3 flex items-center gap-2 font-bold">
                      <ShieldCheck className="h-4 w-4 text-buy" />
                      Acceptance Required
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      The bot will remain in draft mode until the user accepts this flow. No trades are placed from this UI preview.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button variant="outline" onClick={refineFlow} className="h-11 gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Refine Preferences
                    </Button>
                    <Button onClick={acceptFlow} className="h-11 gap-2 bg-buy text-buy-foreground hover:bg-buy/90">
                      {status === "accepted" ? <CheckCircle2 className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {status === "accepted" ? "Flow Accepted" : "Accept Flow"}
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Segmented({
  options,
  value,
  onChange,
  compact = false,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("grid gap-2", compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "min-h-10 rounded-xl border px-3 py-2 text-sm font-bold transition-colors",
            value === option
              ? "border-primary/50 bg-primary/15 text-primary"
              : "border-border bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: FlowStatus }) {
  if (status === "accepted") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-buy/30 bg-buy/10 px-3 py-1 text-xs font-bold text-buy">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Accepted
      </span>
    );
  }

  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
        <ChevronRight className="h-3.5 w-3.5" />
        Awaiting User
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1 text-xs font-bold text-muted-foreground">
      Draft
    </span>
  );
}
