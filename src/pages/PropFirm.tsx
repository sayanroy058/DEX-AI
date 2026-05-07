import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Zap, Shield, TrendingUp, ArrowRight, Flame, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";

const challenges = [
  { name: "Starter", capital: "$5,000", fee: "$49", profit: "8%", drawdown: "5%", split: "80%", recommended: false },
  { name: "Popular", capital: "$10,000", fee: "$99", profit: "8%", drawdown: "5%", split: "85%", recommended: true },
  { name: "Pro", capital: "$25,000", fee: "$249", profit: "8%", drawdown: "8%", split: "90%", recommended: false },
  { name: "Elite", capital: "$100,000", fee: "$499", profit: "10%", drawdown: "8%", split: "90%", recommended: false },
  { name: "Whale", capital: "$500,000", fee: "$1,499", profit: "10%", drawdown: "10%", split: "90%", recommended: false },
];

const payoutFeed = [
  { trader: "CryptoTrader", amount: "$13,450.50", change: "+12.4%" },
  { trader: "BitExpert88", amount: "$3,200.50", change: "+8.2%" },
  { trader: "DayTradingKing", amount: "$8,900.00", change: "+15.3%" },
  { trader: "AlgoTrader", amount: "$25,120.00", change: "+22.1%" },
  { trader: "ScaleMaster", amount: "$1,350.25", change: "+3.8%" },
  { trader: "ForexWizard", amount: "$6,470.00", change: "+18.7%" },
];

const pathSteps = [
  { icon: Target, title: "Pick a challenge", desc: "Select the capital level that fits your experience." },
  { icon: TrendingUp, title: "Trade & Evaluation", desc: "Reach the profit target while staying within max drawdown." },
  { icon: Zap, title: "Get Funded & Paid", desc: "Become a DEX.ai Verified Trader and keep up to 90% of profits." },
];

export default function PropFirm() {
  const [displayedTraders, setDisplayedTraders] = useState(payoutFeed.slice(0, 5));

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayedTraders(prev => {
        const next = [...prev];
        next.shift();
        next.push(payoutFeed[Math.floor(Math.random() * payoutFeed.length)]);
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppShell>
      <div className="min-h-screen space-y-12">
        {/* Hero Section */}
        <section className="relative overflow-hidden px-6 lg:px-10 pt-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <Badge variant="outline" className="mb-4 border-primary/40 bg-primary/5">
                  <Sparkles className="h-3 w-3 mr-1.5" /> GET FUNDED FOR FREE
                </Badge>
                <h1 className="text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight mb-4">
                  Get funded.<br />
                  <span className="gradient-text">Trade with our<br />capital.</span>
                </h1>
                <p className="text-lg text-muted-foreground mb-6 max-w-md">
                  Pass the challenge, keep up to 90% of profits. Up to $500K in trading capital with the lowest spreads and highest leverage in the market.
                </p>
                <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:shadow-glow-primary">
                  Start Challenge <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative w-64 h-64 lg:w-80 lg:h-80">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-3xl blur-3xl" />
                  <div className="relative h-full bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-3xl border border-primary/30 flex items-center justify-center backdrop-blur-sm">
                    <Trophy className="h-32 w-32 text-primary/50" strokeWidth={1} />
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
              {[
                { icon: Trophy, k: "Funded Traders", v: "12,400+" },
                { icon: Target, k: "Avg Payout", v: "$3,820" },
                { icon: Zap, k: "Avg Eval Time", v: "9 days" },
                { icon: Shield, k: "24/7 Support", v: "Always on" },
              ].map(s => (
                <div key={s.k} className="glass rounded-xl p-4 border border-border/50 hover:border-primary/40 transition-all">
                  <s.icon className="h-5 w-5 text-primary mb-2" />
                  <div className="text-2xl font-bold gradient-text">{s.v}</div>
                  <div className="text-xs text-muted-foreground">{s.k}</div>
                </div>
              ))}
            </div>

            {/* Special Offer */}
            <div className="mt-12 glass-strong rounded-2xl p-6 lg:p-8 border border-primary/30 shadow-glow-primary bg-gradient-to-r from-primary/10 to-purple-500/10">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm uppercase tracking-wide text-primary font-bold mb-2">limited offer</div>
                  <h2 className="text-3xl lg:text-4xl font-bold mb-2">
                    <span className="gradient-text">$10,000 trading capital for just $100</span>
                  </h2>
                  <p className="text-muted-foreground max-w-xl">
                    Our most aggressive leverage challenge yet 1 million coins available for the next 48 hours. Start trading immediately upon payment.
                  </p>
                </div>
                <div className="hidden sm:block text-right">
                  <div className="text-2xl font-bold text-primary mb-1">02</div>
                  <div className="text-xs text-muted-foreground">14</div>
                  <div className="text-xs text-muted-foreground">22</div>
                </div>
              </div>
              <Button size="lg" className="mt-6 bg-gradient-primary text-primary-foreground hover:shadow-glow-primary">
                Claim Now <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </section>

        {/* Choose Your Funding Level */}
        <section className="px-6 lg:px-10">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-3">Choose your funding level</h2>
              <p className="text-muted-foreground">No hidden fees. One-time payment, infinite potential.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {challenges.map(c => (
                <div
                  key={c.name}
                  className={`glass-strong rounded-xl p-5 border transition-all relative ${
                    c.recommended
                      ? "border-primary/60 shadow-glow-primary bg-gradient-to-br from-primary/10 to-transparent"
                      : "border-border/50 hover:border-primary/40"
                  }`}
                >
                  {c.recommended && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary text-primary-foreground">
                      MOST POPULAR
                    </Badge>
                  )}
                  <div className="text-xs uppercase text-muted-foreground font-bold">{c.name}</div>
                  <div className="text-3xl font-bold mt-2">{c.capital}</div>
                  <div className="text-xs text-primary mt-1 font-medium">{c.split} profit split</div>
                  <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Profit target</span>
                      <span className="text-foreground font-mono font-bold">{c.profit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max drawdown</span>
                      <span className="text-foreground font-mono font-bold">{c.drawdown}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>One-time fee</span>
                      <span className="text-foreground font-mono font-bold">{c.fee}</span>
                    </div>
                  </div>
                  <Button
                    className={`w-full mt-5 ${
                      c.recommended
                        ? "bg-gradient-primary text-primary-foreground hover:shadow-glow-primary"
                        : "glass border border-border/50 hover:border-primary/40 text-foreground"
                    }`}
                  >
                    Start Challenge
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Path to $500K */}
        <section className="px-6 lg:px-10">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-3">Your path to $500K</h2>
              <p className="text-muted-foreground">Simple three-step process to transform from retail trader to institutional-grade funding.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {pathSteps.map((step, idx) => (
                <div key={idx} className="relative">
                  {idx < pathSteps.length - 1 && (
                    <div className="hidden md:block absolute top-12 left-[60%] w-[calc(100%-80px)] h-0.5 bg-gradient-to-r from-primary/30 to-transparent" />
                  )}
                  <div className="glass rounded-xl p-6 relative z-10">
                    <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4">
                      <step.icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Live Payout Feed */}
        <section className="px-6 lg:px-10 pb-12">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Flame className="h-5 w-5 text-primary" /> Live Payout Feed
                </h2>
                <div className="space-y-3">
                  {displayedTraders.map((trader, idx) => (
                    <div key={idx} className="glass rounded-lg p-4 flex items-center justify-between hover:border-primary/40 transition-all border border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-primary/20 border border-primary/40 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">{trader.trader[0]}</span>
                        </div>
                        <div>
                          <div className="font-medium text-sm">{trader.trader}</div>
                          <div className="text-xs text-muted-foreground">2 hours ago</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary">{trader.amount}</div>
                        <div className="text-xs text-buy font-medium">{trader.change}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-strong rounded-xl p-6 border border-border/50 h-fit">
                <h3 className="font-bold text-lg mb-4">Platform Performance</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-xs uppercase text-muted-foreground tracking-wide">Total payouts</div>
                    <div className="text-2xl font-bold gradient-text">$4.2H</div>
                    <div className="text-xs text-muted-foreground">+12.4% vs last month</div>
                  </div>
                  <div className="h-0.5 bg-border" />
                  <div className="space-y-2">
                    <div className="text-xs uppercase text-muted-foreground tracking-wide">Avg Profit per trader</div>
                    <div className="text-xl font-bold">$3,420</div>
                  </div>
                  <div className="h-0.5 bg-border" />
                  <div className="space-y-2">
                    <div className="text-xs uppercase text-muted-foreground tracking-wide">Active challenges</div>
                    <div className="text-xl font-bold">8,240</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
