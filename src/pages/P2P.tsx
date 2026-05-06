import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Star } from "lucide-react";

const offers = [
  { user: "CryptoKing", trades: 1240, rate: 99.8, price: 67520, limits: "$100 - $5,000", methods: ["Bank", "PayPal"], coin: "USDT" },
  { user: "WhaleHunter", trades: 880, rate: 99.5, price: 67510, limits: "$500 - $20,000", methods: ["Wise", "Revolut"], coin: "USDT" },
  { user: "FastFox", trades: 422, rate: 98.9, price: 67498, limits: "$50 - $2,000", methods: ["UPI", "Paytm"], coin: "USDT" },
  { user: "MoonTrader", trades: 2100, rate: 100, price: 67485, limits: "$1,000 - $50,000", methods: ["SEPA", "Wire"], coin: "USDT" },
  { user: "PixelPay", trades: 654, rate: 99.2, price: 67472, limits: "$200 - $8,000", methods: ["Cash App", "Zelle"], coin: "USDT" },
];

export default function P2P() {
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">P2P Trading</h1>
            <p className="text-muted-foreground text-sm mt-1">Buy & sell crypto directly with verified merchants. Zero fees.</p>
          </div>
          <Button className="bg-gradient-primary text-primary-foreground">Post an Ad</Button>
        </div>

        <Tabs defaultValue="buy">
          <TabsList className="bg-muted/30">
            <TabsTrigger value="buy">Buy</TabsTrigger>
            <TabsTrigger value="sell">Sell</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-[11px] text-muted-foreground uppercase">
              <tr className="border-b border-border/50">
                <th className="text-left px-4 py-3">Merchant</th>
                <th className="text-right">Price (USD)</th>
                <th className="text-right">Limits</th>
                <th className="text-left px-4">Methods</th>
                <th className="text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {offers.map(o => (
                <tr key={o.user} className="border-b border-border/30 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-full bg-gradient-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">{o.user.slice(0,2).toUpperCase()}</div>
                      <div>
                        <div className="font-semibold flex items-center gap-1">{o.user} <Shield className="h-3 w-3 text-primary" /></div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Star className="h-2.5 w-2.5 text-warning" /> {o.rate}% · {o.trades} trades</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-right font-mono">${o.price.toLocaleString()}</td>
                  <td className="text-right font-mono text-muted-foreground text-xs">{o.limits}</td>
                  <td className="px-4 text-xs text-muted-foreground">{o.methods.join(" · ")}</td>
                  <td className="text-right pr-4"><Button size="sm" className="bg-buy text-buy-foreground hover:bg-buy/90">Buy {o.coin}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
