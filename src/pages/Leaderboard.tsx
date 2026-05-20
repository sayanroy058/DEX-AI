import { AppShell } from "@/components/AppShell";
import { Trophy, TrendingUp, Crown, Medal, Award } from "lucide-react";
import { cn } from "@/lib/utils";

const TRADERS = [
  { rank: 1, name: "alphawhale.eth", pnl: 4_823_421, roi: 842.3, trades: 1240, winrate: 78, vol: 124_000_000 },
  { rank: 2, name: "0xCrypt0King", pnl: 3_211_080, roi: 612.1, trades: 982, winrate: 71, vol: 89_000_000 },
  { rank: 3, name: "ZeroToHero", pnl: 2_104_234, roi: 521.4, trades: 1820, winrate: 68, vol: 76_000_000 },
  { rank: 4, name: "HyperDegen", pnl: 1_823_111, roi: 412.7, trades: 643, winrate: 74, vol: 58_000_000 },
  { rank: 5, name: "SolMaxi", pnl: 1_402_938, roi: 384.2, trades: 1102, winrate: 65, vol: 51_000_000 },
  { rank: 6, name: "QuantBot_v2", pnl: 1_184_213, roi: 312.8, trades: 4280, winrate: 72, vol: 142_000_000 },
  { rank: 7, name: "0xMoonShot", pnl: 942_180, roi: 284.1, trades: 532, winrate: 69, vol: 38_000_000 },
  { rank: 8, name: "StonksOnly", pnl: 812_421, roi: 231.5, trades: 1842, winrate: 61, vol: 64_000_000 },
  { rank: 9, name: "WhaleWatch", pnl: 681_234, roi: 198.4, trades: 412, winrate: 76, vol: 28_000_000 },
  { rank: 10, name: "DeltaNeutral", pnl: 542_109, roi: 174.2, trades: 921, winrate: 67, vol: 32_000_000 },
];

const Leaderboard = () => {
  const [first, second, third, ...rest] = TRADERS;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="h-7 w-7 text-warning" />
            Leaderboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Top performers across all markets · last 30 days</p>
        </div>

        {/* Podium */}
        <div className="grid md:grid-cols-3 gap-4">
          <PodiumCard trader={second} place={2} icon={Medal} />
          <PodiumCard trader={first} place={1} icon={Crown} />
          <PodiumCard trader={third} place={3} icon={Award} />
        </div>

        {/* Table */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full text-sm min-w-[750px]">
              <thead className="text-[11px] text-muted-foreground uppercase">
                <tr className="border-b border-border/50">
                  <th className="text-left px-4 py-3">Rank</th>
                  <th className="text-left">Trader</th>
                  <th className="text-right">PnL (30d)</th>
                  <th className="text-right">ROI</th>
                  <th className="text-right">Win Rate</th>
                  <th className="text-right">Trades</th>
                  <th className="text-right pr-4">Volume</th>
                </tr>
              </thead>
              <tbody>
                {rest.map(t => (
                  <tr key={t.rank} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-muted-foreground">#{t.rank}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-gradient-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                          {t.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium">{t.name}</span>
                      </div>
                    </td>
                    <td className="text-right font-mono font-bold text-buy">+${(t.pnl / 1000).toFixed(1)}K</td>
                    <td className="text-right font-mono text-buy">+{t.roi.toFixed(1)}%</td>
                    <td className="text-right font-mono">{t.winrate}%</td>
                    <td className="text-right font-mono text-muted-foreground">{t.trades.toLocaleString()}</td>
                    <td className="text-right pr-4 font-mono text-muted-foreground">${(t.vol / 1e6).toFixed(0)}M</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

function PodiumCard({ trader, place, icon: Icon }: { trader: any; place: number; icon: any }) {
  const colors = {
    1: "from-warning to-warning/40 text-warning",
    2: "from-muted-foreground to-muted-foreground/40 text-muted-foreground",
    3: "from-orange-500 to-orange-500/40 text-orange-400",
  } as Record<number, string>;
  return (
    <div className={cn(
      "glass rounded-xl p-5 relative overflow-hidden",
      place === 1 && "md:scale-105 order-1 md:order-2 neon-border",
      place === 2 && "order-2 md:order-1",
      place === 3 && "order-3 md:order-3"
    )}>
      <div className={cn("absolute top-0 right-0 h-16 w-16 rounded-full blur-2xl opacity-30 bg-gradient-to-br", colors[place])} />
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("h-12 w-12 rounded-full bg-gradient-to-br flex items-center justify-center text-primary-foreground font-bold", colors[place])}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground uppercase">Rank #{place}</div>
          <div className="font-semibold">{trader.name}</div>
        </div>
      </div>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground text-xs">PnL</span>
          <span className="font-mono font-bold text-buy">+${(trader.pnl / 1e6).toFixed(2)}M</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground text-xs">ROI</span>
          <span className="font-mono font-bold text-buy">+{trader.roi.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground text-xs">Win rate</span>
          <span className="font-mono">{trader.winrate}%</span>
        </div>
      </div>
    </div>
  );
}

export default Leaderboard;
