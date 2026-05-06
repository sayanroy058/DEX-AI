import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Gift, Users, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function Refer() {
  const link = "https://dex.ai/r/0xY0URC0DE";
  const copy = () => { navigator.clipboard.writeText(link); toast.success("Referral link copied"); };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Refer & Earn</h1>
          <p className="text-muted-foreground text-sm mt-1">Earn 30% of every trading fee your friends pay — for life.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Users, k: "Referrals", v: "0" },
            { icon: DollarSign, k: "Earned", v: "$0.00" },
            { icon: Gift, k: "Tier", v: "Bronze" },
          ].map(s => (
            <div key={s.k} className="glass rounded-xl p-5">
              <s.icon className="h-5 w-5 text-primary mb-2" />
              <div className="text-2xl font-bold gradient-text">{s.v}</div>
              <div className="text-xs text-muted-foreground">{s.k}</div>
            </div>
          ))}
        </div>

        <div className="glass-strong rounded-xl p-6 border border-primary/20">
          <div className="text-sm font-semibold mb-3">Your referral link</div>
          <div className="flex gap-2">
            <Input value={link} readOnly className="font-mono bg-muted/30" />
            <Button onClick={copy} className="bg-gradient-primary text-primary-foreground"><Copy className="h-4 w-4 mr-1" /> Copy</Button>
          </div>
          <div className="grid md:grid-cols-3 gap-4 mt-6 text-sm">
            <div className="glass rounded-lg p-4"><div className="text-xs text-muted-foreground">Your share</div><div className="text-2xl font-bold mt-1">30%</div></div>
            <div className="glass rounded-lg p-4"><div className="text-xs text-muted-foreground">Friend's discount</div><div className="text-2xl font-bold mt-1">10%</div></div>
            <div className="glass rounded-lg p-4"><div className="text-xs text-muted-foreground">Bonus on signup</div><div className="text-2xl font-bold mt-1">$25</div></div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
