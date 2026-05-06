import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useWallet, shortAddress } from "@/lib/useWallet";
import { Mail, Shield, Award, TrendingUp, Calendar, Edit } from "lucide-react";

export default function Profile() {
  const w = useWallet();
  return (
    <AppShell>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="glass-strong rounded-2xl p-6 border border-primary/20 flex flex-col md:flex-row gap-5 items-center md:items-start">
          <div className="h-20 w-20 rounded-full bg-gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground shadow-glow-primary">
            {w.connected ? w.address.slice(2,4).toUpperCase() : "NX"}
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
