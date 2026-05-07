import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Zap, Shield, TrendingUp, ArrowRight, Flame, Sparkles, Crown, Bolt, Users, CheckCircle2, Clock, Wallet, BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";

const challenges = [
  { name: "Starter", capital: "$5,000", fee: "$49", profit: "8%", drawdown: "5%", split: "80%", recommended: false, color: "from-blue-500 to-cyan-500" },
  { name: "Popular", capital: "$10,000", fee: "$99", profit: "8%", drawdown: "5%", split: "85%", recommended: true, color: "from-primary to-purple-500" },
  { name: "Pro", capital: "$25,000", fee: "$249", profit: "8%", drawdown: "8%", split: "90%", recommended: false, color: "from-orange-500 to-pink-500" },
  { name: "Elite", capital: "$100,000", fee: "$499", profit: "10%", drawdown: "8%", split: "90%", recommended: false, color: "from-yellow-500 to-orange-500" },
  { name: "Whale", capital: "$500,000", fee: "$1,499", profit: "10%", drawdown: "10%", split: "90%", recommended: false, color: "from-cyan-500 to-blue-500" },
];

const features = [
  { icon: CheckCircle2, title: "Instant Funding", desc: "Get approved and funded within 24 hours" },
  { icon: Shield, title: "Protected Trades", desc: "Stop losses and risk management built-in" },
  { icon: BarChart3, title: "Live Analytics", desc: "Real-time performance tracking dashboard" },
  { icon: Wallet, title: "Direct Payouts", desc: "Withdraw profits weekly or monthly" },
  { icon: Users, title: "Community", desc: "Access to exclusive trader network" },
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

export default function PropFirm() {
  const [displayedTraders, setDisplayedTraders] = useState(payoutFeed.slice(0, 5));
  const [selectedTier, setSelectedTier] = useState("Popular");

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
      <div className="min-h-screen space-y-20">
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
                  <h1 className="text-5xl lg:text-6xl font-extrabold leading-[1.15] tracking-tight">
                    Trade With <span className="gradient-text">Unlimited Capital</span>
                  </h1>
                  <p className="text-xl text-muted-foreground max-w-md">
                    Prove your skills. Get instant funding up to $500K. Keep up to 90% of your profits.
                  </p>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-4 py-6">
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
                  Start Free Challenge <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>

              {/* Right visual - Enhanced */}
              <div className="relative h-96 lg:h-full min-h-96">
                {/* Animated cards background */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-full h-full max-w-sm max-h-sm">
                    {/* Main trophy card */}
                    <div className="absolute inset-0 glass-strong rounded-2xl border border-primary/30 shadow-glow-primary overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-purple-500/10" />
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
                        ? `border-primary bg-gradient-to-br ${c.color} bg-opacity-10 shadow-glow-primary`
                        : "border-border/50 hover:border-primary/40 bg-glass hover:bg-muted/30"
                    }`}
                  >
                    <div className={`h-12 w-12 rounded-lg bg-gradient-to-br ${c.color} flex items-center justify-center mb-4 shadow-lg`}>
                      {c.name === "Starter" && <Target className="h-5 w-5 text-white" />}
                      {c.name === "Popular" && <Bolt className="h-5 w-5 text-white" />}
                      {c.name === "Pro" && <TrendingUp className="h-5 w-5 text-white" />}
                      {c.name === "Elite" && <Crown className="h-5 w-5 text-white" />}
                      {c.name === "Whale" && <Trophy className="h-5 w-5 text-white" />}
                    </div>

                    <div className="flex-1">
                      <h3 className={`text-lg font-bold mb-1 ${selectedTier === c.name ? "text-white" : ""}`}>{c.name}</h3>
                      <div className={`text-3xl font-bold mb-1 ${selectedTier === c.name ? "text-white" : "gradient-text"}`}>{c.capital}</div>
                      <div className={`text-xs font-semibold mb-4 ${selectedTier === c.name ? "text-white/90" : "text-primary"}`}>{c.split} profit split</div>

                      <div className="space-y-2.5 mb-6">
                        <div className="flex justify-between text-xs">
                          <span className={selectedTier === c.name ? "text-white/70" : "text-muted-foreground"}>Profit target</span>
                          <span className={`font-bold ${selectedTier === c.name ? "text-white" : "text-foreground"}`}>{c.profit}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className={selectedTier === c.name ? "text-white/70" : "text-muted-foreground"}>Max drawdown</span>
                          <span className={`font-bold ${selectedTier === c.name ? "text-white" : "text-foreground"}`}>{c.drawdown}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className={selectedTier === c.name ? "text-white/70" : "text-muted-foreground"}>One-time fee</span>
                          <span className={`font-bold ${selectedTier === c.name ? "text-white" : "text-foreground"}`}>{c.fee}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      className={`w-full transition-all ${
                        selectedTier === c.name
                          ? `bg-gradient-to-r ${c.color} text-white hover:shadow-glow-primary`
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
