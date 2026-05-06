import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Calendar, TrendingUp, TrendingDown } from "lucide-react";

export default function SIP() {
  return (
    <AppShell>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SIP / SWP</h1>
          <p className="text-muted-foreground text-sm mt-1">Automate buying (SIP) or withdrawing (SWP) on a schedule. Dollar-cost average like a pro.</p>
        </div>

        <div className="glass-strong rounded-xl p-6 border border-border/50">
          <Tabs defaultValue="sip">
            <TabsList className="bg-muted/30">
              <TabsTrigger value="sip"><TrendingUp className="h-3.5 w-3.5 mr-1.5" /> SIP (Invest)</TabsTrigger>
              <TabsTrigger value="swp"><TrendingDown className="h-3.5 w-3.5 mr-1.5" /> SWP (Withdraw)</TabsTrigger>
            </TabsList>
            <TabsContent value="sip" className="mt-5 space-y-4">
              <Plan kind="invest" />
            </TabsContent>
            <TabsContent value="swp" className="mt-5 space-y-4">
              <Plan kind="withdraw" />
            </TabsContent>
          </Tabs>
        </div>

        <div className="glass rounded-xl p-5">
          <div className="text-sm font-semibold mb-3">Active plans</div>
          <div className="text-sm text-muted-foreground py-8 text-center">No active plans yet. Create one above to start.</div>
        </div>
      </div>
    </AppShell>
  );
}

function Plan({ kind }: { kind: "invest" | "withdraw" }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <Label>Asset</Label>
        <select className="w-full h-10 rounded-md bg-muted/30 border border-border px-3 text-sm">
          <option>BTC</option><option>ETH</option><option>SOL</option><option>DEX</option>
        </select>
      </div>
      <div>
        <Label>Amount per cycle (USD)</Label>
        <Input defaultValue={kind === "invest" ? "100" : "50"} />
      </div>
      <div>
        <Label>Frequency</Label>
        <select className="w-full h-10 rounded-md bg-muted/30 border border-border px-3 text-sm">
          <option>Daily</option><option>Weekly</option><option>Bi-weekly</option><option>Monthly</option>
        </select>
      </div>
      <div>
        <Label>Start date</Label>
        <Input type="date" />
      </div>
      <div className="md:col-span-2">
        <Button className="w-full bg-gradient-primary text-primary-foreground">
          <Calendar className="h-4 w-4 mr-2" /> Start {kind === "invest" ? "SIP" : "SWP"} Plan
        </Button>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1.5">{children}</div>;
}
