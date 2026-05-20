import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Key, Bell, Palette, Globe, Shield, Plus, Eye, EyeOff, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const Settings = () => {
  const [showKey, setShowKey] = useState(false);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Customize your trading environment</p>
        </div>

        <Tabs defaultValue="appearance">
          <TabsList className="glass w-full justify-start overflow-x-auto scrollbar-none flex-nowrap">
            <TabsTrigger value="appearance" className="shrink-0"><Palette className="h-3.5 w-3.5 mr-1.5" />Appearance</TabsTrigger>
            <TabsTrigger value="notifications" className="shrink-0"><Bell className="h-3.5 w-3.5 mr-1.5" />Notifications</TabsTrigger>
            <TabsTrigger value="security" className="shrink-0"><Shield className="h-3.5 w-3.5 mr-1.5" />Security</TabsTrigger>
            <TabsTrigger value="api" className="shrink-0"><Key className="h-3.5 w-3.5 mr-1.5" />API Keys</TabsTrigger>
            <TabsTrigger value="locale" className="shrink-0"><Globe className="h-3.5 w-3.5 mr-1.5" />Language</TabsTrigger>
          </TabsList>

          <TabsContent value="appearance" className="space-y-4 mt-4">
            <Card title="Theme">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { name: "DEX Dark", desc: "Default neon glass", active: true },
                  { name: "Pure Black", desc: "OLED minimal" },
                  { name: "Aurora", desc: "Violet-pink glow" },
                ].map(t => (
                  <button key={t.name} className={`glass rounded-lg p-4 text-left transition-all hover:bg-muted/30 ${t.active ? "neon-border" : ""}`}>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground">{t.desc}</div>
                  </button>
                ))}
              </div>
            </Card>

            <Card title="Trading Mode">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ModeButton title="Beginner" desc="Simplified UI, guided tooltips, lower default leverage" />
                <ModeButton title="Pro" desc="Full features, advanced order types, hotkeys enabled" active />
              </div>
            </Card>

            <Card title="Display">
              <Row label="Compact mode" desc="Tighter spacing for more data on screen" />
              <Row label="Animations" desc="Smooth transitions and micro-interactions" defaultChecked />
              <Row label="Show tooltips" desc="Explain trading terms on hover" defaultChecked />
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4 mt-4">
            <Card title="Trading Alerts">
              <Row label="Order filled" desc="Notify when a limit order executes" defaultChecked />
              <Row label="Liquidation warning" desc="Alert when position approaches liquidation" defaultChecked />
              <Row label="Stop loss / Take profit hit" defaultChecked />
              <Row label="Funding payments" desc="Notify on every funding interval" />
            </Card>
            <Card title="Market Alerts">
              <Row label="Price alerts" desc="Custom price targets per symbol" defaultChecked />
              <Row label="Volume spikes" desc="Sudden 24h volume increases" />
              <Row label="Whale movements" desc="Large position changes from top traders" />
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4 mt-4">
            <Card title="Account Security">
              <Row label="Two-factor authentication" desc="Require 2FA for withdrawals and orders" defaultChecked />
              <Row label="Hardware wallet only" desc="Disable hot wallet signing" />
              <Row label="Withdrawal whitelist" desc="Only send to approved addresses" defaultChecked />
            </Card>
            <Card title="Trading Limits">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Max position size (USD)</Label>
                  <Input defaultValue="50000" className="mt-1 font-mono" />
                </div>
                <div>
                  <Label className="text-xs">Max leverage</Label>
                  <Input defaultValue="25" className="mt-1 font-mono" />
                </div>
                <div>
                  <Label className="text-xs">Daily loss limit (USD)</Label>
                  <Input defaultValue="2500" className="mt-1 font-mono" />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="space-y-4 mt-4">
            <Card title="API Keys">
              <p className="text-xs text-muted-foreground mb-3">Create read-only or trading-enabled keys for external bots and integrations.</p>
              <div className="glass-strong rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-semibold text-sm">Trading Bot v1</div>
                    <div className="text-[10px] text-muted-foreground">Created 12 days ago · Read + Trade</div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-sell h-7 w-7"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] bg-background/50 p-2 rounded">
                  <span className="flex-1 truncate">{showKey ? "nx_live_8a3f9d2c1b4e5f6a7b8c9d0e1f2a3b4c" : "nx_live_••••••••••••••••••••••••••••"}</span>
                  <button onClick={() => setShowKey(!showKey)}>{showKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}</button>
                </div>
              </div>
              <Button onClick={() => toast.success("API key created", { description: "Save it now — you won't see it again." })} className="bg-gradient-primary text-primary-foreground">
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Create new key
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="locale" className="space-y-4 mt-4">
            <Card title="Language & Region">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {["English", "Español", "Français", "Deutsch", "中文", "日本語", "한국어", "Русский"].map((l, i) => (
                  <button key={l} className={`glass rounded-lg px-3 py-2 text-sm text-left hover:bg-muted/30 ${i === 0 ? "neon-border" : ""}`}>
                    {l}
                  </button>
                ))}
              </div>
            </Card>
            <Card title="Currency Display">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {["USD", "EUR", "GBP", "JPY"].map((c, i) => (
                  <button key={c} className={`glass rounded-lg py-2 font-mono text-sm hover:bg-muted/30 ${i === 0 ? "neon-border" : ""}`}>{c}</button>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl p-5">
      <h3 className="font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, desc, defaultChecked }: { label: string; desc?: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <div>
        <div className="text-sm">{label}</div>
        {desc && <div className="text-[11px] text-muted-foreground">{desc}</div>}
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}

function ModeButton({ title, desc, active }: { title: string; desc: string; active?: boolean }) {
  return (
    <button className={`glass rounded-lg p-4 text-left transition-all hover:bg-muted/30 ${active ? "neon-border" : ""}`}>
      <div className="font-semibold">{title}</div>
      <div className="text-[11px] text-muted-foreground mt-1">{desc}</div>
    </button>
  );
}

export default Settings;
