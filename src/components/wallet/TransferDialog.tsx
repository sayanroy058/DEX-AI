import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { wallet, useWallet, WALLETS, shortAddress } from "@/lib/useWallet";
import { ArrowDownToLine, ArrowUpFromLine, Wallet as WalletIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const NETWORKS = ["Ethereum", "Arbitrum", "Base", "BNB Chain", "Solana"];

export function TransferDialog({
  open,
  onOpenChange,
  defaultMode = "deposit",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultMode?: "deposit" | "withdraw";
}) {
  const w = useWallet();
  const [mode, setMode] = useState<"deposit" | "withdraw">(defaultMode);
  const [asset, setAsset] = useState("USDT");
  const [network, setNetwork] = useState("Ethereum");
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");

  const balance = w.balances.find(b => b.asset === asset)?.amount ?? 0;
  const fee = mode === "withdraw" ? 1.5 : 0;

  const handleSubmit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!w.connected) return toast.error("Connect a wallet first");
    if (mode === "withdraw") {
      if (amt > balance) return toast.error("Insufficient balance");
      if (!destination) return toast.error("Enter destination address");
      wallet.withdraw(asset, amt);
      toast.success(`Withdrawal submitted`, { description: `${amt} ${asset} → ${shortAddress(destination)} on ${network}` });
    } else {
      wallet.deposit(asset, amt);
      toast.success(`Deposit confirmed`, { description: `${amt} ${asset} added on ${network}` });
    }
    setAmount("");
    setDestination("");
    onOpenChange(false);
  };

  const walletName = WALLETS.find(x => x.id === w.walletId)?.name ?? "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-glass-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WalletIcon className="h-4 w-4 text-primary" />
            Transfer
          </DialogTitle>
          <DialogDescription>
            {w.connected ? `Connected via ${walletName} · ${shortAddress(w.address)}` : "Connect a wallet to deposit or withdraw."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "deposit" | "withdraw")}>
          <TabsList className="grid grid-cols-2 w-full bg-muted/30">
            <TabsTrigger value="deposit" className="text-xs">
              <ArrowDownToLine className="h-3 w-3 mr-1.5" /> Deposit
            </TabsTrigger>
            <TabsTrigger value="withdraw" className="text-xs">
              <ArrowUpFromLine className="h-3 w-3 mr-1.5" /> Withdraw
            </TabsTrigger>
          </TabsList>

          <div className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Asset</label>
                <Select value={asset} onValueChange={setAsset}>
                  <SelectTrigger className="h-9 bg-muted/30"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {w.balances.map(b => (
                      <SelectItem key={b.asset} value={b.asset}>{b.asset}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Network</label>
                <Select value={network} onValueChange={setNetwork}>
                  <SelectTrigger className="h-9 bg-muted/30"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NETWORKS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Amount</span>
                <button
                  className="text-primary hover:underline"
                  onClick={() => setAmount(String(balance))}
                >
                  Max: {balance.toLocaleString(undefined, { maximumFractionDigits: 6 })} {asset}
                </button>
              </div>
              <Input
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="h-10 font-mono bg-muted/30"
                inputMode="decimal"
              />
            </div>

            <TabsContent value="deposit" className="m-0 space-y-2">
              <div className="glass rounded-lg p-3 text-[11px] space-y-1">
                <div className="text-muted-foreground">Deposit address ({network})</div>
                <div className="font-mono text-xs break-all">
                  {w.address ?? "Connect wallet to view address"}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Only send {asset} on {network}. Other assets may be lost.
              </p>
            </TabsContent>

            <TabsContent value="withdraw" className="m-0 space-y-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Destination address</label>
                <Input
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                  placeholder="0x… or wallet address"
                  className="h-10 font-mono text-xs bg-muted/30"
                />
              </div>
              <div className="glass rounded-lg p-2.5 text-[11px] space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Network fee</span><span className="font-mono">{fee} {asset}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">You receive</span><span className="font-mono">{Math.max(0, (parseFloat(amount) || 0) - fee).toFixed(4)} {asset}</span></div>
              </div>
            </TabsContent>

            <Button
              onClick={handleSubmit}
              disabled={!w.connected}
              className={cn(
                "w-full h-10 font-bold",
                mode === "deposit"
                  ? "bg-gradient-buy text-buy-foreground hover:shadow-glow-buy"
                  : "bg-gradient-primary text-primary-foreground"
              )}
            >
              {mode === "deposit" ? "Confirm deposit" : "Withdraw"}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
