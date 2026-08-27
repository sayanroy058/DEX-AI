import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Copy, Gift, Users, DollarSign, Share2, Twitter, Send } from "lucide-react";
import { toast } from "sonner";

export default function Refer() {
  const code = "DEX-NX7293";
  const link = `https://dex.ai/r/${code}`;

  const copy = (val: string, label: string) => { navigator.clipboard.writeText(val); toast.success(`${label} copied!`); };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Refer & Earn</h1>
          <p className="text-muted-foreground text-sm mt-1">Earn up to 20% of every trading fee your friends pay for life.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Users, k: "Referrals", v: "0" },
            { icon: DollarSign, k: "Total Earning", v: "$0.00" },
            { icon: DollarSign, k: "Daily Earning", v: "$0.00" },
            { icon: Gift, k: "Current Commission", v: "20%" },
          ].map(s => (
            <div key={s.k} className="glass rounded-xl p-5">
              <s.icon className="h-5 w-5 text-primary mb-2" />
              <div className="text-2xl font-bold gradient-text">{s.v}</div>
              <div className="text-xs text-muted-foreground">{s.k}</div>
            </div>
          ))}
        </div>

        {/* Referral code + link card */}
        <div className="glass-strong rounded-xl p-6 border border-primary/20 space-y-5">
          <h3 className="font-bold flex items-center gap-2"><Gift className="h-4 w-4 text-primary" /> Your Referral Details</h3>

          {/* Code */}
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Referral Code</div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 glass rounded-xl px-5 py-3 font-mono font-black text-primary text-2xl tracking-[0.2em] text-center border border-primary/20 select-all">
                {code}
              </div>
              <Button variant="outline" onClick={() => copy(code, "Code")} className="glass w-full sm:w-auto h-12 px-4 shrink-0">
                <Copy className="h-4 w-4 mr-1.5" /> Copy Code
              </Button>
            </div>
          </div>

          {/* Link */}
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Referral Link</div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 glass rounded-lg px-3 py-2.5 font-mono text-sm text-muted-foreground truncate border border-border/40 text-center sm:text-left">
                {link}
              </div>
              <Button onClick={() => copy(link, "Link")} className="bg-gradient-primary text-primary-foreground w-full sm:w-auto shrink-0">
                <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy Link
              </Button>
            </div>
          </div>

          {/* Share buttons */}
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Share via</div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="glass gap-1.5 text-xs" onClick={() => window.open(`https://twitter.com/intent/tweet?text=Trade+on+DEX.ai+with+my+referral+code+${code}+and+get+10%25+discount!&url=${encodeURIComponent(link)}`)}>
                <Twitter className="h-3.5 w-3.5 text-[#1DA1F2]" /> Twitter
              </Button>
              <Button variant="outline" size="sm" className="glass gap-1.5 text-xs" onClick={() => toast.success("Share via Telegram")}>
                <Send className="h-3.5 w-3.5 text-[#26A5E4]" /> Telegram
              </Button>
              <Button variant="outline" size="sm" className="glass gap-1.5 text-xs" onClick={() => { if (navigator.share) navigator.share({ title: "DEX.ai Referral", url: link }); else copy(link, "Link"); }}>
                <Share2 className="h-3.5 w-3.5" /> Share
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-sm">
            <div className="glass rounded-lg p-4 text-center"><div className="text-xs text-muted-foreground">Your commission</div><div className="text-2xl font-bold mt-1 text-primary">20%</div></div>
            <div className="glass rounded-lg p-4 text-center"><div className="text-xs text-muted-foreground">Friend's discount</div><div className="text-2xl font-bold mt-1">10%</div></div>
            <div className="glass rounded-lg p-4 text-center"><div className="text-xs text-muted-foreground">Today referrals</div><div className="text-2xl font-bold mt-1 text-buy">0</div></div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
