import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";

const markets = [
  { q: "Will BTC close above $80k by year-end?", yes: 62, vol: "$4.2M", end: "Dec 31" },
  { q: "ETH ETF approved by Q3 2026?", yes: 48, vol: "$2.1M", end: "Sep 30" },
  { q: "Will Fed cut rates next meeting?", yes: 71, vol: "$1.8M", end: "Jun 18" },
  { q: "SOL > $300 by Aug?", yes: 34, vol: "$980K", end: "Aug 31" },
  { q: "New AI token in top 10 by Q4?", yes: 56, vol: "$640K", end: "Oct 31" },
  { q: "BTC dominance > 60%?", yes: 41, vol: "$1.2M", end: "Jul 15" },
];

export default function Prediction() {
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prediction Markets</h1>
          <p className="text-muted-foreground text-sm mt-1">Trade the outcome of real-world events.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {markets.map(m => (
            <div key={m.q} className="glass rounded-xl p-5 hover:border-primary/40 transition-all">
              <div className="text-sm font-semibold mb-3 min-h-[3rem]">{m.q}</div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Vol {m.vol}</span><span>Ends {m.end}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
                <div className="h-full bg-gradient-buy" style={{ width: `${m.yes}%` }} />
              </div>
              <div className="flex justify-between text-[11px] mb-3"><span className="text-buy font-bold">YES {m.yes}¢</span><span className="text-sell font-bold">NO {100 - m.yes}¢</span></div>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" className="bg-buy/15 text-buy hover:bg-buy/25 border border-buy/30">Buy YES</Button>
                <Button size="sm" className="bg-sell/15 text-sell hover:bg-sell/25 border border-sell/30">Buy NO</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
