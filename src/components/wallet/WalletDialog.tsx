import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WALLETS, WalletId, wallet, useWallet, shortAddress } from "@/lib/useWallet";
import { cn } from "@/lib/utils";
import { Loader2, Check, Copy, LogOut, Wallet as WalletIcon, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const ICONS: Record<WalletId, string> = {
  metamask: "🦊",
  coinbase: "🔵",
  binance: "🟡",
  trust: "🛡️",
  bitget: "🟢",
};

export function WalletDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const w = useWallet();
  const [connecting, setConnecting] = useState<WalletId | null>(null);

  const handleConnect = (id: WalletId) => {
    setConnecting(id);
    setTimeout(() => {
      wallet.connect(id);
      setConnecting(null);
      toast.success(`${WALLETS.find(x => x.id === id)?.name} connected`);
      onOpenChange(false);
    }, 900);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-glass-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WalletIcon className="h-4 w-4 text-primary" />
            {w.connected ? "Wallet" : "Connect a wallet"}
          </DialogTitle>
          <DialogDescription>
            {w.connected
              ? "Manage your connected wallet."
              : "Choose your preferred wallet to sign in, deposit, and trade."}
          </DialogDescription>
        </DialogHeader>

        {w.connected ? (
          <div className="space-y-3">
            <div className="glass rounded-xl p-4 flex items-center gap-3">
              <div className="text-2xl">{ICONS[w.walletId!]}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{WALLETS.find(x => x.id === w.walletId)?.name}</div>
                <div className="text-xs font-mono text-muted-foreground truncate">{shortAddress(w.address)}</div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => { navigator.clipboard.writeText(w.address ?? ""); toast.success("Address copied"); }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="glass rounded-xl p-3">
              <div className="text-[11px] uppercase text-muted-foreground mb-2">Balances</div>
              <div className="space-y-1.5">
                {w.balances.map(b => (
                  <div key={b.asset} className="flex justify-between text-sm">
                    <span className="font-medium">{b.asset}</span>
                    <span className="font-mono">{b.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => { wallet.disconnect(); toast.message("Wallet disconnected"); onOpenChange(false); }}
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" /> Disconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {WALLETS.map(opt => {
              const isConnecting = connecting === opt.id;
              return (
                <button
                  key={opt.id}
                  disabled={!!connecting}
                  onClick={() => handleConnect(opt.id)}
                  className={cn(
                    "w-full glass rounded-xl p-3 flex items-center gap-3 text-left transition-all",
                    "hover:border-primary/40 hover:shadow-[0_0_20px_hsl(var(--primary)/0.15)]",
                    isConnecting && "border-primary/60"
                  )}
                >
                  <div className="text-2xl w-10 h-10 rounded-lg glass-strong flex items-center justify-center">
                    {ICONS[opt.id]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{opt.name}</span>
                      {opt.popular && (
                        <Badge variant="outline" className="h-4 px-1.5 text-[9px] border-primary/40 text-primary">
                          {opt.tag}
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{opt.desc}</div>
                  </div>
                  {isConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <Check className="h-4 w-4 opacity-0 group-hover:opacity-100 text-primary" />
                  )}
                </button>
              );
            })}

            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-2">
              <ShieldCheck className="h-3 w-3 text-buy" />
              Non-custodial. We never store your seed phrase.
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
