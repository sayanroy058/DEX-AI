import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PropFirmPurchaseDialog } from "@/components/prop-firm/PropFirmPurchaseDialog";
import { Trophy, Target, Zap, Shield, TrendingUp, ArrowRight, Sparkles, Crown, Bolt, Users, CheckCircle2, Wallet, BarChart3, Rocket, Star } from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";
import {
  formatAccountSize,
  formatPropFirmProgram,
  formatUsd,
  getPropFirmPrice,
  propFirmPrograms,
  propFirmSizes,
  type PropFirmProgram,
  type PropFirmSize,
} from "@/lib/propFirmPlans";

const challenges = [
  { name: "Starter", capital: 5000 as PropFirmSize, recommended: false, color: "border-slate-400/50", badge: "bg-slate-700/30 text-slate-700 dark:text-slate-300", glow: "148 163 184" },
  { name: "Growth", capital: 10000 as PropFirmSize, recommended: true, color: "border-primary/50", badge: "bg-primary/20 text-primary", glow: "34 211 238" },
  { name: "Pro", capital: 25000 as PropFirmSize, recommended: false, color: "border-violet-400/50", badge: "bg-violet-500/15 text-violet-400", glow: "167 139 250" },
  { name: "Advanced", capital: 50000 as PropFirmSize, recommended: false, color: "border-amber-400/50", badge: "bg-amber-500/15 text-amber-400", glow: "251 191 36" },
  { name: "Elite", capital: 100000 as PropFirmSize, recommended: false, color: "border-cyan-400/50", badge: "bg-cyan-500/15 text-cyan-400", glow: "34 211 238" },
];

const features = [
  { icon: CheckCircle2, title: "Three Programs", desc: "Choose a 1-Step Challenge, 2-Step Challenge, or Instant Funding." },
  { icon: Shield, title: "Visible Risk Limits", desc: "See confirmed loss rules clearly before purchasing." },
  { icon: BarChart3, title: "Trading Workspace", desc: "Use a dedicated PropFirm Trade and Profile application." },
  { icon: Wallet, title: "Secure Checkout", desc: "Payment confirmation will be verified by the backend." },
  { icon: Users, title: "Separate Account Access", desc: "Receive a dedicated PropFirm login after provisioning." },
  { icon: Bolt, title: "5x Maximum Leverage", desc: "The same maximum leverage applies to every account type." },
];

const objectiveData: Record<PropFirmProgram, { metric: string; evaluation: string; funded: string }[]> = {
  "One-Step": [
    { metric: "Maximum leverage", evaluation: "5x", funded: "5x" },
    { metric: "Maximum daily loss", evaluation: "Not confirmed", funded: "4%" },
    { metric: "Maximum total loss", evaluation: "6%", funded: "6%" },
    { metric: "Profit target", evaluation: "Not confirmed", funded: "—" },
  ],
  "Two-Step": [
    { metric: "Maximum leverage", evaluation: "5x", funded: "5x" },
    { metric: "Step 1 / Step 2 loss", evaluation: "Ambiguous — confirmation required", funded: "—" },
    { metric: "Maximum daily loss", evaluation: "Not confirmed", funded: "5%" },
    { metric: "Maximum total loss", evaluation: "Not confirmed", funded: "8%" },
  ],
  "Instant Funding": [
    { metric: "Maximum leverage", evaluation: "No evaluation expected*", funded: "5x" },
    { metric: "Maximum daily loss", evaluation: "—", funded: "Not provided" },
    { metric: "Maximum total loss", evaluation: "—", funded: "4%" },
    { metric: "Profit target", evaluation: "—", funded: "—" },
  ],
};

export default function PropFirm() {
  const [selectedTier, setSelectedTier] = useState("Growth");
  const [selectedPlanMode, setSelectedPlanMode] = useState<PropFirmProgram>("Two-Step");
  const [selectedPlanSize, setSelectedPlanSize] = useState<PropFirmSize>(10000);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchasePreset, setPurchasePreset] = useState<{ program: PropFirmProgram; size: PropFirmSize }>({
    program: "Two-Step",
    size: 10000,
  });

  const openPurchase = (program: PropFirmProgram = selectedPlanMode, size: PropFirmSize = selectedPlanSize) => {
    setPurchasePreset({ program, size });
    setPurchaseOpen(true);
  };

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
                    <Crown className="h-3.5 w-3.5 mr-1.5 text-primary" /> Three Flexible Account Programs
                  </Badge>
                </div>

                <div className="space-y-4">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold leading-[1.15] tracking-tight">
                    Choose Your <span className="gradient-text">PropFirm Account</span>
                  </h1>
                  <p className="text-base sm:text-xl text-muted-foreground max-w-md">
                    Select an account type and size, review the confirmed rules, and continue through secure checkout.
                  </p>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-6">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-primary">3</div>
                    <div className="text-xs text-muted-foreground">Account Programs</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-primary">5</div>
                    <div className="text-xs text-muted-foreground">Account Sizes</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-primary">5x</div>
                    <div className="text-xs text-muted-foreground">Maximum Leverage</div>
                  </div>
                </div>

                <Button onClick={() => openPurchase()} size="lg" className="bg-gradient-primary text-primary-foreground hover:shadow-glow-primary w-full sm:w-auto h-12 px-8 text-base">
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
                          <div className="text-sm font-bold text-primary">YOUR PROPFIRM ACCOUNT</div>
                          <div className="text-xs text-muted-foreground">Purchased on Diggs, traded separately</div>
                        </div>
                      </div>
                    </div>

                    {/* Floating card 1 */}
                    <div className="absolute -top-6 -right-6 glass rounded-xl p-4 w-40 border border-border/50 animate-bounce" style={{ animationDelay: "0s" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-buy" />
                        <span className="text-xs font-bold">$100K</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Maximum size</p>
                    </div>

                    {/* Floating card 2 */}
                    <div className="absolute -bottom-6 -left-6 glass rounded-xl p-4 w-40 border border-border/50 animate-bounce" style={{ animationDelay: "0.2s" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold">5x</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Maximum leverage</p>
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
                        <span className="text-xs font-bold">3</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Program types</p>
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
              <h2 className="text-4xl font-bold mb-4">Why Choose PropFirm</h2>
              <p className="text-muted-foreground text-lg">A clear purchase flow and a separate focused trading workspace</p>
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
                      {c.name === "Growth" && <Bolt className="h-4.5 w-4.5" />}
                      {c.name === "Pro" && <TrendingUp className="h-4.5 w-4.5" />}
                      {c.name === "Advanced" && <Crown className="h-4.5 w-4.5" />}
                      {c.name === "Elite" && <Trophy className="h-4.5 w-4.5" />}
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-1">{c.name}</h3>
                      <div className="text-3xl font-bold mb-1 gradient-text">{formatAccountSize(c.capital)}</div>
                      <div className="text-xs font-semibold mb-4 text-primary">1-Step Challenge &middot; 2-Step Challenge &middot; Instant Funding</div>

                      <div className="space-y-2.5 mb-6">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Maximum leverage</span>
                          <span className="font-bold">5x</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Programs available</span>
                          <span className="font-bold">3</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">One-time fee</span>
                          <span className="font-bold">From {formatUsd(getPropFirmPrice("Two-Step", c.capital))}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={(event) => {
                        event.stopPropagation();
                        openPurchase("Two-Step", c.capital);
                      }}
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
              {propFirmPrograms.map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSelectedPlanMode(mode)}
                  className={`px-6 py-2.5 rounded-full text-sm font-semibold border transition-all ${
                    selectedPlanMode === mode
                      ? "bg-gradient-primary text-primary-foreground border-primary/50 shadow-glow-primary"
                      : "glass border-border/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {formatPropFirmProgram(mode)}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-border/40 glass p-4 sm:p-5 mb-7">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {propFirmSizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedPlanSize(size)}
                    className={`rounded-xl p-3 text-center border transition-all ${
                      selectedPlanSize === size
                        ? "bg-primary/20 border-primary/50 text-primary"
                        : "bg-muted/10 border-border/40 hover:border-primary/30"
                    }`}
                  >
                    <div className="text-[11px] text-muted-foreground">Account size</div>
                    <div className="font-bold">{formatAccountSize(size)}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-primary/35 overflow-hidden shadow-glow-primary/20">
              <div className="bg-gradient-primary px-4 sm:px-6 py-3 grid grid-cols-3 text-sm font-semibold text-primary-foreground">
                <div>Objective</div>
                <div className="text-center">Evaluation</div>
                <div className="text-center">Funded / Live</div>
              </div>
              <div className="bg-card/95">
                {objectiveData[selectedPlanMode].map((row) => (
                  <div key={row.metric} className="grid grid-cols-3 px-4 sm:px-6 py-3 text-sm border-t border-border">
                    <div className="font-medium text-foreground">{row.metric}</div>
                    <div className="text-center">{row.evaluation}</div>
                    <div className="text-center text-primary font-medium">{row.funded}</div>
                  </div>
                ))}
              </div>
            </div>
            {selectedPlanMode === "Instant Funding" && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                * Instant Funding is expected to bypass evaluation based on its name, but this must be confirmed before production.
              </p>
            )}

            <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button onClick={() => openPurchase()} size="lg" className="bg-gradient-primary text-primary-foreground hover:shadow-glow-primary">
                Start Challenge
              </Button>
              <div className="text-4xl font-bold">
                {formatUsd(getPropFirmPrice(selectedPlanMode, selectedPlanSize))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 lg:px-10 py-20">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl lg:text-5xl font-bold">Ready to Get Funded?</h2>
              <p className="text-xl text-muted-foreground">Choose an account, review the confirmed rules, and preview the secure purchase flow.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => openPurchase()} size="lg" className="bg-gradient-primary text-primary-foreground hover:shadow-glow-primary h-12 px-8">
                Start Your Challenge <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="glass border-primary/40 text-primary hover:bg-primary/10 h-12 px-8">
                Learn More
              </Button>
            </div>
          </div>
        </section>
      </div>
      <PropFirmPurchaseDialog
        open={purchaseOpen}
        onOpenChange={setPurchaseOpen}
        initialProgram={purchasePreset.program}
        initialSize={purchasePreset.size}
      />
    </AppShell>
  );
}
