import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Users, Copy as CopyIcon, TrendingUp, Sparkles } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STRATEGIES = [
  { name: "Alpha Whale", trader: "alphawhale.eth", roi: 842, copiers: 1240, aum: "$8.2M", risk: "High", desc: "Aggressive perp scalping with high leverage on majors. Average hold: 4h." },
  { name: "Steady Yield", trader: "QuantBot_v2", roi: 312, copiers: 3120, aum: "$24.1M", risk: "Low", desc: "Algorithmic delta-neutral strategy. Low drawdown, consistent monthly returns." },
  { name: "Momentum Hunter", trader: "ZeroToHero", roi: 521, copiers: 842, aum: "$5.6M", risk: "Med", desc: "Trend-following on alts during high volume. Holds 2-7 days per position." },
  { name: "Funding Farmer", trader: "DeltaNeutral", roi: 174, copiers: 2410, aum: "$18.4M", risk: "Low", desc: "Captures funding rate arbitrage. Best in high-funding environments." },
  { name: "Degen Plays", trader: "HyperDegen", roi: 412, copiers: 421, aum: "$2.1M", risk: "High", desc: "Low-cap meme coin perps, 20x+ leverage. High risk, high reward." },
  { name: "Macro Swing", trader: "WhaleWatch", roi: 198, copiers: 1820, aum: "$11.2M", risk: "Med", desc: "Position trades on macro events. 1-4 week holds, max 5x leverage." },
];

const CopyTrade = () => {
  const [following, setFollowing] = useState<Set<string>>(new Set(["Steady Yield"]));

  const toggle = (name: string) => {
    setFollowing(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
        toast.info(`Stopped copying ${name}`);
      } else {
        next.add(name);
        toast.success(`Now copying ${name}`, { description: "Trades will be mirrored to your account." });
      }
      return next;
    });
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-secondary" />
            Copy Trading
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Mirror top traders' positions automatically. Set your own size and risk limits.</p>
        </div>

        <div className="glass rounded-xl p-5 flex items-center gap-4 bg-gradient-to-r from-secondary/10 to-primary/10">
          <Sparkles className="h-8 w-8 text-secondary shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold">Smart Copy Engine</h3>
            <p className="text-xs text-muted-foreground">Trades are scaled to your balance. Stop loss and take profit copied automatically. Cancel anytime.</p>
          </div>
          <Button variant="outline" className="border-secondary/40 text-secondary">Learn more</Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STRATEGIES.map(s => {
            const isFollowing = following.has(s.name);
            return (
              <div key={s.name} className={cn("glass rounded-xl p-5 flex flex-col gap-3 transition-all hover:-translate-y-0.5", isFollowing && "neon-border")}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold">{s.name}</h3>
                    <p className="text-[11px] text-muted-foreground">by {s.trader}</p>
                  </div>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold",
                    s.risk === "High" ? "bg-sell/15 text-sell" : s.risk === "Med" ? "bg-warning/15 text-warning" : "bg-buy/15 text-buy"
                  )}>{s.risk} Risk</span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase">ROI</div>
                    <div className="font-mono font-bold text-buy text-sm">+{s.roi}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase">Copiers</div>
                    <div className="font-mono font-semibold text-sm">{s.copiers.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase">AUM</div>
                    <div className="font-mono font-semibold text-sm">{s.aum}</div>
                  </div>
                </div>

                <Button
                  onClick={() => toggle(s.name)}
                  className={cn(
                    "w-full",
                    isFollowing ? "bg-muted text-foreground hover:bg-muted/70" : "bg-gradient-primary text-primary-foreground hover:shadow-glow-primary"
                  )}
                >
                  <CopyIcon className="h-3.5 w-3.5 mr-1.5" />
                  {isFollowing ? "Following" : "Copy Trader"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
};

export default CopyTrade;
