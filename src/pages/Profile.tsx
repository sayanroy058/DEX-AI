import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useWallet, shortAddress } from "@/lib/useWallet";
import { Mail, Shield, Award, TrendingUp, Calendar, Edit, Copy, Gift, Users, DollarSign, Star, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const AFFILIATE_TIERS = [
  { name: "Bronze", min: 0, max: 4, commission: "20%", color: "text-amber-600", bg: "bg-amber-600/10 border-amber-600/20" },
  { name: "Silver", min: 5, max: 19, commission: "25%", color: "text-slate-400", bg: "bg-slate-400/10 border-slate-400/20" },
  { name: "Gold", min: 20, max: 49, commission: "30%", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20" },
  { name: "Platinum", min: 50, max: 99, commission: "35%", color: "text-cyan-400", bg: "bg-cyan-400/10 border-cyan-400/20" },
  { name: "Diamond", min: 100, max: Infinity, commission: "40%", color: "text-primary", bg: "bg-primary/10 border-primary/20" },
];

export default function Profile() {
  const w = useWallet();
  const [activeTab, setActiveTab] = useState<"account" | "affiliate">("account");
  const referralCode = "DEX-NX7293";
  const referralLink = `https://dex.ai/r/${referralCode}`;

  const copyLink = () => { navigator.clipboard.writeText(referralLink); toast.success("Referral link copied!"); };
  const copyCode = () => { navigator.clipboard.writeText(referralCode); toast.success("Code copied!"); };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="glass-strong rounded-2xl p-6 border border-primary/20 flex flex-col md:flex-row gap-5 items-center md:items-start">
          <div className="h-20 w-20 rounded-full bg-gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground shadow-glow-primary">
            {w.connected ? w.address.slice(2, 4).toUpperCase() : "NX"}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-bold">{w.connected ? shortAddress(w.address) : "Anonymous Trader"}</h1>
            <div className="text-sm text-muted-foreground flex items-center gap-2 justify-center md:justify-start mt-1">
              <Mail className="h-3 w-3" /> trader@dex.ai
            </div>
            <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-primary/15 text-primary border border-primary/30"><Shield className="h-2.5 w-2.5" /> KYC verified</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-warning/15 text-warning border border-warning/30"><Award className="h-2.5 w-2.5" /> Pro tier</span>
            </div>
          </div>
          <Button variant="outline" className="glass"><Edit className="h-3.5 w-3.5 mr-1.5" /> Edit profile</Button>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          {[
            { icon: TrendingUp, k: "Total PnL", v: "+$12,840" },
            { icon: Calendar, k: "Member since", v: "Jan 2025" },
            { icon: Award, k: "Win rate", v: "62%" },
            { icon: Shield, k: "Trust score", v: "98/100" },
          ].map(s => (
            <div key={s.k} className="glass rounded-xl p-4">
              <s.icon className="h-4 w-4 text-primary mb-2" />
              <div className="text-xl font-bold">{s.v}</div>
              <div className="text-xs text-muted-foreground">{s.k}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 border-b border-border/50">
          {(["account", "affiliate"] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>
              {t === "affiliate" ? "Affiliate Program" : "Account"}
            </button>
          ))}
        </div>

        {activeTab === "account" ? (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass rounded-xl p-5">
              <h3 className="font-bold mb-3">Account</h3>
              <Row k="Username" v="trader_one" />
              <Row k="Email" v="trader@dex.ai" />
              <Row k="2FA" v="Enabled" />
              <Row k="Wallet" v={w.connected ? shortAddress(w.address) : "Not connected"} />
            </div>
            <div className="glass rounded-xl p-5">
              <h3 className="font-bold mb-3">Preferences</h3>
              <Row k="Theme" v="Dark glass" />
              <Row k="Language" v="English" />
              <Row k="Currency" v="USD" />
              <Row k="UI mode" v="Pro" />
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="glass rounded-xl p-5"><Users className="h-5 w-5 text-primary mb-2" /><div className="text-2xl font-bold gradient-text">0</div><div className="text-xs text-muted-foreground">Total Referrals</div></div>
              <div className="glass rounded-xl p-5"><DollarSign className="h-5 w-5 text-primary mb-2" /><div className="text-2xl font-bold gradient-text">$0.00</div><div className="text-xs text-muted-foreground">Commission Earned</div></div>
              <div className="glass rounded-xl p-5"><Star className="h-5 w-5 text-primary mb-2" /><div className="text-2xl font-bold gradient-text">Bronze</div><div className="text-xs text-muted-foreground">Current Tier</div></div>
            </div>

            <div className="glass-strong rounded-xl p-6 border border-primary/20 space-y-4">
              <h3 className="font-bold flex items-center gap-2"><Gift className="h-4 w-4 text-primary" /> Your Referral Details</h3>
              <div>
                <div className="text-xs text-muted-foreground mb-1.5">Referral Code</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 glass rounded-lg px-4 py-2.5 font-mono font-bold text-primary tracking-widest text-lg">{referralCode}</div>
                  <Button variant="outline" onClick={copyCode} className="glass shrink-0"><Copy className="h-3.5 w-3.5 mr-1.5" /> Copy Code</Button>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1.5">Referral Link</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 glass rounded-lg px-3 py-2 font-mono text-xs text-muted-foreground truncate">{referralLink}</div>
                  <Button onClick={copyLink} className="bg-gradient-primary text-primary-foreground shrink-0"><Copy className="h-3.5 w-3.5 mr-1.5" /> Copy Link</Button>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3 text-sm pt-2">
                <div className="glass rounded-lg p-3 text-center"><div className="text-xs text-muted-foreground">Your commission</div><div className="text-xl font-bold mt-1 text-primary">20%</div></div>
                <div className="glass rounded-lg p-3 text-center"><div className="text-xs text-muted-foreground">Friend's discount</div><div className="text-xl font-bold mt-1">10%</div></div>
                <div className="glass rounded-lg p-3 text-center"><div className="text-xs text-muted-foreground">Signup bonus</div><div className="text-xl font-bold mt-1 text-buy">$25</div></div>
              </div>
            </div>

            <div className="glass rounded-xl p-5">
              <h3 className="font-bold mb-4 flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> Affiliate Tiers</h3>
              <div className="space-y-2">
                {AFFILIATE_TIERS.map((tier, i) => (
                  <div key={tier.name} className={cn("flex items-center justify-between rounded-lg px-4 py-3 border", i === 0 ? tier.bg : "border-border/30")}>
                    <div className="flex items-center gap-3">
                      <span className={cn("font-bold text-sm", tier.color)}>{tier.name}</span>
                      <span className="text-[10px] text-muted-foreground">{tier.min === 0 ? `0–${tier.max}` : tier.max === Infinity ? `${tier.min}+` : `${tier.min}–${tier.max}`} referrals</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("font-bold text-sm", tier.color)}>{tier.commission}</span>
                      {i === 0 && <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">Current</span>}
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-sm py-2 border-b border-border/30 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
