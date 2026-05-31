import { AppShell } from "@/components/AppShell";
import { Users, DollarSign, TrendingUp } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts";
import type { ComponentType } from "react";

const EARNINGS = [
  { day: "Mon", value: 120 },
  { day: "Tue", value: 180 },
  { day: "Wed", value: 140 },
  { day: "Thu", value: 260 },
  { day: "Fri", value: 220 },
  { day: "Sat", value: 310 },
  { day: "Sun", value: 280 },
];

const TRADE_SPLIT = [
  { type: "Spot", commission: 420 },
  { type: "Futures", commission: 690 },
  { type: "Options", commission: 210 },
  { type: "Copy", commission: 160 },
  { type: "P2P", commission: 95 },
];

const COMMISSION_TRADES = [
  { id: "AFF-10021", trader: "user_kr47", tradeType: "Futures", volume: "$18,200", commission: "$36.40", date: "2026-05-30" },
  { id: "AFF-10019", trader: "alpha_09", tradeType: "Spot", volume: "$7,410", commission: "$14.82", date: "2026-05-30" },
  { id: "AFF-10014", trader: "nova_xt", tradeType: "Copy", volume: "$3,800", commission: "$7.60", date: "2026-05-29" },
  { id: "AFF-10011", trader: "qbit_live", tradeType: "Options", volume: "$5,220", commission: "$10.44", date: "2026-05-29" },
  { id: "AFF-10008", trader: "safe_swap", tradeType: "P2P", volume: "$2,160", commission: "$4.32", date: "2026-05-28" },
];

export default function Affiliate() {
  return (
    <AppShell>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Affiliate Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your affiliate growth, commission trends, and trade-level earnings.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat icon={Users} label="Total Referrals" value="184" />
          <Stat icon={DollarSign} label="Total Commission" value="$5,284.90" />
          <Stat icon={TrendingUp} label="This Month" value="+$1,112.45" />
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="glass rounded-xl p-4 border border-border/40">
            <div className="text-sm font-semibold mb-3">Daily Commission Trend</div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={EARNINGS} margin={{ top: 12, right: 8, bottom: 0, left: -22 }}>
                <defs>
                  <linearGradient id="affEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 25% 18% / 0.4)" />
                <XAxis dataKey="day" tick={{ fill: "hsl(220 15% 55%)", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(220 15% 55%)", fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} fill="url(#affEarnings)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-xl p-4 border border-border/40">
            <div className="text-sm font-semibold mb-3">Commission by Trade Type</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={TRADE_SPLIT} margin={{ top: 10, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 25% 18% / 0.4)" />
                <XAxis dataKey="type" tick={{ fill: "hsl(220 15% 55%)", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(220 15% 55%)", fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="commission" fill="#38bdf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-xl p-5 border border-border/40">
          <h3 className="font-bold mb-4">Commission Trades</h3>
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full min-w-[780px] text-sm">
              <thead className="text-[11px] text-muted-foreground uppercase">
                <tr className="border-b border-border/40">
                  <th className="text-left py-2">Trade ID</th>
                  <th className="text-left">Trader</th>
                  <th className="text-left">Trade Type</th>
                  <th className="text-right">Volume</th>
                  <th className="text-right">Commission</th>
                  <th className="text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {COMMISSION_TRADES.map((row) => (
                  <tr key={row.id} className="border-b border-border/30 hover:bg-muted/10">
                    <td className="py-2.5 font-mono text-cyan-300">{row.id}</td>
                    <td>{row.trader}</td>
                    <td>{row.tradeType}</td>
                    <td className="text-right font-mono">{row.volume}</td>
                    <td className="text-right font-semibold text-primary">{row.commission}</td>
                    <td className="text-right text-muted-foreground">{row.date}</td>
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

function Stat({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="glass rounded-xl p-5 border border-border/40">
      <Icon className="h-5 w-5 text-primary mb-2" />
      <div className="text-2xl font-bold gradient-text">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
