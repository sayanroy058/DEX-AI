import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Trophy, Target, Zap, Shield } from "lucide-react";

const challenges = [
  { name: "Starter", capital: "$10,000", fee: "$99", profit: "8%", drawdown: "5%", split: "80%" },
  { name: "Pro", capital: "$50,000", fee: "$299", profit: "8%", drawdown: "6%", split: "85%" },
  { name: "Elite", capital: "$100,000", fee: "$499", profit: "10%", drawdown: "8%", split: "90%" },
  { name: "Whale", capital: "$250,000", fee: "$999", profit: "10%", drawdown: "10%", split: "90%" },
];

export default function PropFirm() {
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prop Firm</h1>
          <p className="text-muted-foreground text-sm mt-1">Trade our capital. Keep up to 90% of profits.</p>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          {[
            { icon: Trophy, k: "Funded Traders", v: "12,400+" },
            { icon: Target, k: "Avg Payout", v: "$3,820" },
            { icon: Zap, k: "Avg Eval Time", v: "9 days" },
            { icon: Shield, k: "Total Paid", v: "$48M" },
          ].map(s => (
            <div key={s.k} className="glass rounded-xl p-4">
              <s.icon className="h-5 w-5 text-primary mb-2" />
              <div className="text-2xl font-bold gradient-text">{s.v}</div>
              <div className="text-xs text-muted-foreground">{s.k}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {challenges.map(c => (
            <div key={c.name} className="glass-strong rounded-xl p-5 border border-border/50 hover:border-primary/40 transition-all">
              <div className="text-xs uppercase text-muted-foreground">{c.name}</div>
              <div className="text-2xl font-bold mt-1">{c.capital}</div>
              <div className="text-xs text-primary mt-1">{c.split} profit split</div>
              <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between"><span>Profit target</span><span className="text-foreground font-mono">{c.profit}</span></div>
                <div className="flex justify-between"><span>Max drawdown</span><span className="text-foreground font-mono">{c.drawdown}</span></div>
                <div className="flex justify-between"><span>One-time fee</span><span className="text-foreground font-mono">{c.fee}</span></div>
              </div>
              <Button className="w-full mt-4 bg-gradient-primary text-primary-foreground">Start Challenge</Button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
