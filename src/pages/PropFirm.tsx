import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Zap, Shield, TrendingUp, ArrowRight, Flame, Sparkles, Crown, Bolt, Users, CheckCircle2, Clock, Wallet, BarChart3, Rocket, Gem, Medal, Star } from "lucide-react";
import type { CSSProperties } from "react";
import { useState, useEffect } from "react";

const challenges = [
  { name: "Starter", capital: "$5,000", fee: "$49", profit: "8%", drawdown: "5%", split: "80%", recommended: false, color: "border-slate-400/50", badge: "bg-slate-700/30 text-slate-300", glow: "148 163 184" },
  { name: "Popular", capital: "$10,000", fee: "$99", profit: "8%", drawdown: "5%", split: "85%", recommended: true, color: "border-primary/50", badge: "bg-primary/20 text-primary", glow: "34 211 238" },
  { name: "Pro", capital: "$25,000", fee: "$249", profit: "8%", drawdown: "8%", split: "90%", recommended: false, color: "border-violet-400/50", badge: "bg-violet-500/15 text-violet-400", glow: "167 139 250" },
  { name: "Elite", capital: "$100,000", fee: "$499", profit: "10%", drawdown: "8%", split: "90%", recommended: false, color: "border-amber-400/50", badge: "bg-amber-500/15 text-amber-400", glow: "251 191 36" },
  { name: "Whale", capital: "$500,000", fee: "$1,499", profit: "10%", drawdown: "10%", split: "90%", recommended: false, color: "border-cyan-400/50", badge: "bg-cyan-500/15 text-cyan-400", glow: "34 211 238" },
];

const features = [
  { icon: CheckCircle2, title: "Instant Funding", desc: "As you clear stages and get instant funding in minutes" },
  { icon: Shield, title: "Protected Trades", desc: "Multiple built in tools so trade make there risk managment more easier" },
  { icon: BarChart3, title: "Live Analytics", desc: "Real-time performance tracking dashboard" },
  { icon: Wallet, title: "Instant Payout", desc: "Give freedom to get payout instantly as you make profit, no dealy, no holding period" },
  { icon: Users, title: "Bot & Strategy Trading", desc: "Make your own bot & startegy to trade with the help of AI" },
  { icon: Bolt, title: "Zero Restrictions", desc: "Trade any asset, any strategy, anytime" },
];

const payoutFeed = [
  { trader: "CryptoTrader", amount: "$13,450.50", change: "+12.4%" },
  { trader: "BitExpert88", amount: "$3,200.50", change: "+8.2%" },
  { trader: "DayTradingKing", amount: "$8,900.00", change: "+15.3%" },
  { trader: "AlgoTrader", amount: "$25,120.00", change: "+22.1%" },
  { trader: "ScaleMaster", amount: "$1,350.25", change: "+3.8%" },
  { trader: "ForexWizard", amount: "$6,470.00", change: "+18.7%" },
];

const planModes = ["Step 1", "Step 2", "Instant Funding"] as const;
const planSizes = [
  { name: "Base", amount: "$5,000" },
  { name: "Starter", amount: "$10,000" },
  { name: "Skilled", amount: "$15,000" },
  { name: "Intermediate", amount: "$25,000" },
  { name: "Advanced", amount: "$50,000" },
  { name: "Expert", amount: "$100,000" },
] as const;

const objectiveData = {
  "Step 1": [
    { metric: "Profit Target", stage1: "10%", stage2: "-", trader: "Unlimited" },
    { metric: "Max Daily Loss", stage1: "4%", stage2: "-", trader: "4%" },
    { metric: "Max Loss", stage1: "6%", stage2: "-", trader: "6%" },
    { metric: "Min Trading Days", stage1: "0", stage2: "-", trader: "Unlimited" },
    { metric: "Trading Period", stage1: "Unlimited", stage2: "-", trader: "Unlimited" },
    { metric: "Max Leverage", stage1: "1:5", stage2: "-", trader: "1:5" },
  ],
  "Step 2": [
    { metric: "Profit Target", stage1: "8%", stage2: "5%", trader: "Unlimited" },
    { metric: "Max Daily Loss", stage1: "5%", stage2: "5%", trader: "5%" },
    { metric: "Max Loss", stage1: "10%", stage2: "8%", trader: "8%" },
    { metric: "Min Trading Days", stage1: "0", stage2: "0", trader: "Unlimited" },
    { metric: "Trading Period", stage1: "Unlimited", stage2: "Unlimited", trader: "Unlimited" },
    { metric: "Max Leverage", stage1: "1:5", stage2: "1:5", trader: "1:5" },
  ],
  "Instant Funding": [
    { metric: "Profit Target", stage1: "-", stage2: "-", trader: "Unlimited" },
    { metric: "Max Daily Loss", stage1: "-", stage2: "-", trader: "3%" },
    { metric: "Max Loss", stage1: "-", stage2: "-", trader: "6%" },
    { metric: "Profit Share", stage1: "-", stage2: "-", trader: "60%" },
    { metric: "Trading Period", stage1: "-", stage2: "-", trader: "Unlimited" },
    { metric: "Max Leverage", stage1: "-", stage2: "-", trader: "1:5" },
  ],
} as const;

const leaderboard = [
  { name: "Eric S.", payout: "$20,432", badge: "Gold", icon: Trophy, tone: "from-amber-300/40 to-yellow-500/10", iconColor: "text-amber-300" },
  { name: "Alex H.", payout: "$7,998", badge: "Silver", icon: Medal, tone: "from-slate-300/40 to-slate-500/10", iconColor: "text-slate-200" },
  { name: "Brian K.", payout: "$6,819", badge: "Bronze", icon: Gem, tone: "from-orange-300/40 to-amber-700/10", iconColor: "text-orange-300" },
];

export default function PropFirm() {
  const [displayedTraders, setDisplayedTraders] = useState(payoutFeed.slice(0, 5));
  const [selectedTier, setSelectedTier] = useState("Popular");
  const [selectedPlanMode, setSelectedPlanMode] = useState<(typeof planModes)[number]>("Step 1");
  const [selectedPlanSize, setSelectedPlanSize] = useState<(typeof planSizes)[number]["name"]>("Base");

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
      <div className="min-h-screen space-y-12 sm:space-y-20">
        {/* Hero Section - Redesigned */}
        <section className="relative overflow-hidden px-6 lg:px-10 pt-16 pb-20">
          {/* Background elements */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
          </div>

          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left content */}
              <div className="space-y-8">
                <div className="inline-block">
                  <Badge variant="outline" className="border-primary/40 bg-primary/10 px-4 py-1.5">
                    <Crown className="h-3.5 w-3.5 mr-1.5 text-primary" /> Trusted by 12,400+ Traders
                  </Badge>
                </div>

                <div className="space-y-4">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold leading-[1.15] tracking-tight">
                    Trade With <span className="gradient-text">Unlimited Capital</span>
                  </h1>
                  <p className="text-base sm:text-xl text-muted-foreground max-w-md">
                    Prove your skills. Get instant funding up to $500K. Keep up to 90% of your profits.
                  </p>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-6">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-primary">$4.2M+</div>
                    <div className="text-xs text-muted-foreground">Paid to Traders</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-primary">24/7</div>
                    <div className="text-xs text-muted-foreground">Support Available</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-primary">9 Days Avg</div>
                    <div className="text-xs text-muted-foreground">To Get Funded</div>
                  </div>
                </div>

                <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:shadow-glow-primary w-full sm:w-auto h-12 px-8 text-base">
                  Start Challenge <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>

              {/* Right visual - hidden on mobile to avoid excess whitespace */}
              <div className="relative h-96 lg:h-full min-h-96 hidden lg:block">
                {/* Animated cards background */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-full h-full max-w-sm max-h-sm">
                    {/* Main trophy card */}
                    <div className="absolute inset-0 glass-strong rounded-2xl border border-primary/30 shadow-glow-primary overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-purple-500/10" />
                      <div className="absolute top-6 left-6 rounded-xl bg-primary/10 border border-primary/30 px-3 py-2 flex items-center gap-2">
                        <Rocket className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold text-primary">Funding Velocity</span>
                      </div>
                      <div className="relative h-full flex flex-col items-center justify-center gap-6 p-8">
                        <div className="relative">
                          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl" />
                          <Trophy className="h-32 w-32 text-primary/60 relative" strokeWidth={0.8} />
                        </div>
                        <div className="text-center space-y-2">
                          <div className="text-sm font-bold text-primary">YOUR PATH TO SUCCESS</div>
                          <div className="text-xs text-muted-foreground">Join thousands of funded traders</div>
                        </div>
                      </div>
                    </div>

                    {/* Floating card 1 */}
                    <div className="absolute -top-6 -right-6 glass rounded-xl p-4 w-40 border border-border/50 animate-bounce" style={{ animationDelay: "0s" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-buy" />
                        <span className="text-xs font-bold">+$45.2K</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Last 30 days</p>
                    </div>

                    {/* Floating card 2 */}
                    <div className="absolute -bottom-6 -left-6 glass rounded-xl p-4 w-40 border border-border/50 animate-bounce" style={{ animationDelay: "0.2s" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold">90%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Profit split</p>
                    </div>

                    <div className="absolute top-1/2 -left-8 glass rounded-xl p-3 w-32 border border-border/50 animate-bounce" style={{ animationDelay: "0.35s" }}>
                      <div className="flex items-center gap-1 mb-1">
                        <Star className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-bold">4.9/5</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Trader score</p>
                    </div>

                    <div className="absolute bottom-12 -right-9 glass rounded-xl p-3 w-36 border border-border/50 animate-bounce" style={{ animationDelay: "0.5s" }}>
                      <div className="flex items-center gap-1 mb-1">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-bold">12.4K+</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Funded traders</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="px-6 lg:px-10">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Why Choose DEX.ai</h2>
              <p className="text-muted-foreground text-lg">Everything you need to succeed as a funded trader</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, idx) => (
                <div key={idx} className="glass rounded-xl p-6 border border-border/50 hover:border-primary/40 hover:shadow-glow-primary/20 transition-all group">
                  <div className="h-10 w-10 rounded-lg bg-gradient-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Tiers - New Design */}
        <section className="px-6 lg:px-10 py-20 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Choose Your Challenge</h2>
              <p className="text-muted-foreground text-lg">Select the funding level that matches your trading style</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 lg:gap-3">
              {challenges.map(c => (
                <div
                  key={c.name}
                  onClick={() => setSelectedTier(c.name)}
                  style={{ "--tier-glow": c.glow } as CSSProperties}
                  className={`relative cursor-pointer transition-all duration-300 group ${
                    selectedTier === c.name ? "lg:scale-105" : ""
                  }`}
                >
                  {c.recommended && (
                    <div className="absolute -top-4 left-0 right-0 flex justify-center">
                      <Badge className="bg-gradient-primary text-primary-foreground flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Most Popular
                      </Badge>
                    </div>
                  )}

                  <div
                    className={`h-full rounded-2xl p-6 border-2 transition-all duration-300 flex flex-col ${
                      selectedTier === c.name
                        ? `${c.color} bg-[rgb(var(--tier-glow)/0.08)] shadow-[0_0_28px_rgb(var(--tier-glow)/0.28),0_0_72px_rgb(var(--tier-glow)/0.12)]`
                        : "border-border/40 hover:border-primary/30 bg-glass hover:bg-muted/20"
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-lg ${c.badge} border flex items-center justify-center mb-4`}>
                      {c.name === "Starter" && <Target className="h-4.5 w-4.5" />}
                      {c.name === "Popular" && <Bolt className="h-4.5 w-4.5" />}
                      {c.name === "Pro" && <TrendingUp className="h-4.5 w-4.5" />}
                      {c.name === "Elite" && <Crown className="h-4.5 w-4.5" />}
                      {c.name === "Whale" && <Trophy className="h-4.5 w-4.5" />}
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-1">{c.name}</h3>
                      <div className="text-3xl font-bold mb-1 gradient-text">{c.capital}</div>
                      <div className="text-xs font-semibold mb-4 text-primary">{c.split} profit split</div>

                      <div className="space-y-2.5 mb-6">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Profit target</span>
                          <span className="font-bold">{c.profit}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Max drawdown</span>
                          <span className="font-bold">{c.drawdown}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">One-time fee</span>
                          <span className="font-bold">{c.fee}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      className={`w-full transition-all ${
                        selectedTier === c.name
                          ? "bg-gradient-primary text-primary-foreground hover:shadow-glow-primary"
                          : "glass border border-border/50 hover:border-primary/40"
                      }`}
                    >
                      Get Started
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Challenge Plans Matrix */}
        <section className="px-6 lg:px-10">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold mb-3">Challenge Plans</h2>
              <p className="text-muted-foreground">Pick your mode, select capital size, and review objective rules.</p>
            </div>

            <div className="flex justify-center gap-3 flex-wrap mb-6">
              {planModes.map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSelectedPlanMode(mode)}
                  className={`px-6 py-2.5 rounded-full text-sm font-semibold border transition-all ${
                    selectedPlanMode === mode
                      ? "bg-gradient-primary text-primary-foreground border-primary/50 shadow-glow-primary"
                      : "glass border-border/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-border/40 glass p-4 sm:p-5 mb-7">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {planSizes.map((size) => (
                  <button
                    key={size.name}
                    onClick={() => setSelectedPlanSize(size.name)}
                    className={`rounded-xl p-3 text-center border transition-all ${
                      selectedPlanSize === size.name
                        ? "bg-primary/20 border-primary/50 text-primary"
                        : "bg-muted/10 border-border/40 hover:border-primary/30"
                    }`}
                  >
                    <div className="text-[11px] text-muted-foreground">{size.name}</div>
                    <div className="font-bold">{size.amount}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-primary/35 overflow-hidden shadow-glow-primary/20">
              <div className="bg-gradient-to-r from-[#1a2f66] to-[#1b3f82] px-4 sm:px-6 py-3 grid grid-cols-4 text-sm font-semibold">
                <div>Objective</div>
                <div className="text-center">Stage 1</div>
                <div className="text-center">Stage 2</div>
                <div className="text-center">Trader Stage</div>
              </div>
              <div className="bg-[#0d1e46]/95">
                {objectiveData[selectedPlanMode].map((row) => (
                  <div key={row.metric} className="grid grid-cols-4 px-4 sm:px-6 py-3 text-sm border-t border-white/10">
                    <div className="text-cyan-100/90">{row.metric}</div>
                    <div className="text-center">{row.stage1}</div>
                    <div className="text-center">{row.stage2}</div>
                    <div className="text-center text-primary font-medium">{row.trader}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:shadow-glow-primary">
                Start Challenge
              </Button>
              <div className="text-4xl font-bold">
                {challenges.find((c) => c.capital === planSizes.find((p) => p.name === selectedPlanSize)?.amount)?.fee ?? "$99"}
              </div>
            </div>
          </div>
        </section>

        {/* Top Trader Leaderboard */}
        <section className="px-6 lg:px-10 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold mb-3">Top Trader Leaderboard</h2>
              <p className="text-muted-foreground">See our top prop traders earning real payouts every week.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {leaderboard.map((item) => (
                <div key={item.name} className="rounded-2xl border border-primary/30 bg-[#0d1e46]/90 p-6 relative overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-b ${item.tone} opacity-40`} />
                  <div className="relative">
                    <div className="h-24 w-24 rounded-2xl bg-black/25 border border-white/20 flex items-center justify-center mb-5">
                      <item.icon className={`h-12 w-12 ${item.iconColor}`} />
                    </div>
                    <div className="text-sm text-cyan-100/80">{item.badge}</div>
                    <div className="text-2xl font-bold mt-1">{item.name}</div>
                    <div className="text-4xl font-bold mt-4 gradient-text">{item.payout}</div>
                    <div className="text-sm text-muted-foreground mt-1">Payout Earned</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center mt-8">
              <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:shadow-glow-primary px-10">
                View
              </Button>
            </div>
          </div>
        </section>

        {/* Live Performance & Feed */}
        <section className="px-6 lg:px-10">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Live Payout Feed */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
                    <Flame className="h-6 w-6 text-primary animate-pulse" /> Real Trader Payouts
                  </h2>
                  <p className="text-muted-foreground">Live withdrawals from our community</p>
                </div>

                <div className="space-y-3">
                  {displayedTraders.map((trader, idx) => (
                    <div
                      key={idx}
                      className="glass rounded-xl p-4 border border-border/50 hover:border-primary/40 hover:shadow-glow-primary/20 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`h-12 w-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-bold text-sm`}>
                            {trader.trader[0]}
                          </div>
                          <div className="flex-1">
                            <div className="font-bold">{trader.trader}</div>
                            <div className="text-xs text-muted-foreground">Withdrawal • 2 hours ago</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">{trader.amount}</div>
                          <div className="text-xs text-buy font-bold">{trader.change}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats Card */}
              <div className="glass-strong rounded-2xl p-8 border border-primary/30 shadow-glow-primary h-fit space-y-6">
                <h3 className="font-bold text-2xl">Platform Stats</h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Payouts</span>
                      <span className="text-xs text-buy font-bold">+12.4%</span>
                    </div>
                    <div className="text-2xl font-bold gradient-text">$4.2M+</div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full w-3/4 bg-gradient-primary rounded-full" />
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">Active Traders</span>
                    <div className="text-2xl font-bold">12,400+</div>
                  </div>

                  <div className="h-px bg-border" />

                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">Avg Monthly Profit</span>
                    <div className="text-2xl font-bold text-primary">$3,820</div>
                  </div>

                  <div className="h-px bg-border" />

                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">Approval Time</span>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="font-bold">9 days avg</span>
                    </div>
                  </div>
                </div>

                <Button size="lg" className="w-full bg-gradient-primary text-primary-foreground hover:shadow-glow-primary">
                  View All Traders
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 lg:px-10 py-20">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl lg:text-5xl font-bold">Ready to Get Funded?</h2>
              <p className="text-xl text-muted-foreground">Join thousands of successful traders earning with DEX.ai</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:shadow-glow-primary h-12 px-8">
                Start Your Challenge <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="glass border-primary/40 text-primary hover:bg-primary/10 h-12 px-8">
                Learn More
              </Button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
