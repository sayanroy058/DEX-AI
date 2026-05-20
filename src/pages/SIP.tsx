import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Calendar, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const PROJECTION = Array.from({ length: 36 }, (_, i) => ({
  m: i + 1,
  value: Math.round(1000 + i * i * 40),
}));

export default function SIP() {
  const finalValue = useMemo(() => PROJECTION[PROJECTION.length - 1].value, []);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">SIP / SWP Investments</h1>
            <p className="text-muted-foreground text-sm mt-1">Build long-term wealth with systematic investing and withdrawals.</p>
          </div>
            <div className="glass rounded-xl px-4 py-3 border border-primary/30 w-full sm:w-auto sm:min-w-52">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Wallet className="h-3 w-3" /> Wallet Balance</div>
              <div className="text-xl font-bold font-mono mt-1">$84,260.00</div>
            </div>
        </div>

        <div className="glass-strong rounded-xl p-6 border border-border/50">
          <Tabs defaultValue="sip">
            <TabsList className="bg-muted/30 w-full justify-start overflow-x-auto scrollbar-none flex-nowrap">
              <TabsTrigger value="sip" className="shrink-0">
                <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                <span className="hidden sm:inline">Systematic Investment Plan</span>
                <span className="inline sm:hidden">SIP Plan</span>
              </TabsTrigger>
              <TabsTrigger value="swp" className="shrink-0">
                <TrendingDown className="h-3.5 w-3.5 mr-1.5" />
                <span className="hidden sm:inline">Systematic Withdrawal Plan</span>
                <span className="inline sm:hidden">SWP Plan</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid lg:grid-cols-2 gap-5 mt-5">
            <div className="glass rounded-xl p-4 border border-border/40 space-y-3">
              <div className="text-sm font-semibold">Set Up Your Plan</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Asset">
                  <select className="w-full h-10 rounded-md bg-muted/30 border border-border px-3 text-sm">
                    <option>BTC</option><option>ETH</option><option>SOL</option><option>DEXUSD</option>
                  </select>
                </Field>
                <Field label="Amount per cycle (USD)">
                  <Input defaultValue="1000" />
                </Field>
                <Field label="Frequency">
                  <select className="w-full h-10 rounded-md bg-muted/30 border border-border px-3 text-sm">
                    <option>Daily</option><option>Weekly</option><option>Monthly</option><option>Yearly</option>
                  </select>
                </Field>
                <Field label="Start Date">
                  <Input type="date" />
                </Field>
                <Field label="End Date">
                  <Input type="date" />
                </Field>
                <Field label="Plan Name">
                  <Input defaultValue="SIP Plan 01" />
                </Field>
              </div>
              <Button className="w-full bg-gradient-primary text-primary-foreground h-10">
                <Calendar className="h-4 w-4 mr-2" /> Start SIP Plan
              </Button>
            </div>

            <div className="glass rounded-xl p-4 border border-border/40">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold">AI Projection (3 Years)</div>
                <div className="text-[10px] text-muted-foreground">~12% yearly return</div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={PROJECTION} margin={{ top: 10, right: 8, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="sipProjection" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 25% 18% / 0.4)" />
                  <XAxis dataKey="m" tick={{ fill: "hsl(220 15% 55%)", fontSize: 10 }} />
                  <YAxis tick={{ fill: "hsl(220 15% 55%)", fontSize: 10 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} fill="url(#sipProjection)" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                <Mini label="Final Value" value={`$${finalValue.toLocaleString()}`} />
                <Mini label="Total Invested" value="$36,000" />
                <Mini label="Estimated Return" value="+$48,235" />
              </div>
            </div>
          </div>
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

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-lg p-2.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-mono font-bold text-sm">{value}</div>
    </div>
  );
}

