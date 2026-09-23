import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Copy, Gift, Users, DollarSign, Share2, Twitter, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getMyReferral, formatBI2XUSDRaw, type MyReferral } from "@/lib/referralApi";

export default function Refer() {
  const [data, setData] = useState<MyReferral | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Refer & Earn | BitDx";
    getMyReferral()
      .then(setData)
      .catch((e) => setError(e.message || "Connect your wallet to see your referral link."))
      .finally(() => setLoading(false));
  }, []);

  const copy = (val: string, label: string) => {
    navigator.clipboard.writeText(val);
    toast.success(`${label} copied!`);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto p-6">
          <div className="glass rounded-xl p-8 text-center text-muted-foreground">
            {error || "Sign in to get your referral link."}
          </div>
        </div>
      </AppShell>
    );
  }

  const link = `${window.location.origin}/?ref=${data.code}`;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Refer & Earn</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Earn {data.sharePct}% of every trading fee your friends pay — for life, on every trade they
            ever make.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass rounded-xl p-5">
            <Users className="h-5 w-5 text-primary mb-2" />
            <div className="text-2xl font-bold gradient-text">{data.referredCount}</div>
            <div className="text-xs text-muted-foreground">Referrals</div>
          </div>
          <div className="glass rounded-xl p-5">
            <DollarSign className="h-5 w-5 text-primary mb-2" />
            <div className="text-2xl font-bold gradient-text">{formatBI2XUSDRaw(data.earningsRaw)} BI2XUSD</div>
            <div className="text-xs text-muted-foreground">Total Earnings</div>
          </div>
          <div className="glass rounded-xl p-5">
            <Gift className="h-5 w-5 text-primary mb-2" />
            <div className="text-2xl font-bold gradient-text">{data.sharePct}%</div>
            <div className="text-xs text-muted-foreground">Current Commission</div>
          </div>
        </div>

        {/* Referral code + link card */}
        <div className="glass-strong rounded-xl p-6 border border-primary/20 space-y-5">
          <h3 className="font-bold flex items-center gap-2"><Gift className="h-4 w-4 text-primary" /> Your Referral Details</h3>

          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Referral Code</div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 glass rounded-xl px-5 py-3 font-mono font-black text-primary text-2xl tracking-[0.2em] text-center border border-primary/20 select-all">
                {data.code}
              </div>
              <Button variant="outline" onClick={() => copy(data.code, "Code")} className="glass w-full sm:w-auto h-12 px-4 shrink-0">
                <Copy className="h-4 w-4 mr-1.5" /> Copy Code
              </Button>
            </div>
          </div>

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

          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Share via</div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="glass gap-1.5 text-xs" onClick={() => window.open(`https://twitter.com/intent/tweet?text=Trade+on+BitDx+with+my+referral+link&url=${encodeURIComponent(link)}`)}>
                <Twitter className="h-3.5 w-3.5 text-[#1DA1F2]" /> Twitter
              </Button>
              <Button variant="outline" size="sm" className="glass gap-1.5 text-xs" onClick={() => toast.success("Share via Telegram")}>
                <Send className="h-3.5 w-3.5 text-[#26A5E4]" /> Telegram
              </Button>
              <Button variant="outline" size="sm" className="glass gap-1.5 text-xs" onClick={() => { if (navigator.share) navigator.share({ title: "BitDx Referral", url: link }); else copy(link, "Link"); }}>
                <Share2 className="h-3.5 w-3.5" /> Share
              </Button>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground max-w-2xl">
          Your commission is a share of the platform's own trading-fee revenue — it never changes what your
          referral pays. This is a lifetime link: it's set the moment someone signs up through it and can't
          be changed or removed afterward.
        </p>
      </div>
    </AppShell>
  );
}
