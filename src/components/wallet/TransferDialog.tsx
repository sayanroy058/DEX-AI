import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { wallet, useWallet, WALLETS, shortAddress, getTreasuryAddress, getConnectedProvider } from "@/lib/useWallet";
import { requestWithdrawal } from "@/lib/authApi";
import { depositUsdc, isDexVaultConfigured } from "@/lib/contracts/dexVault";
import { ArrowDownToLine, ArrowUpFromLine, Wallet as WalletIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { parseUnits, type Address } from "viem";

const NETWORKS = ["Avalanche Fuji", "Ethereum", "Arbitrum", "Base", "BNB Chain", "Solana"];
const WITHDRAW_DECIMALS: Record<string, number> = { USDC: 6 };
const DEFAULT_DEPOSIT_CHAIN = "Avalanche Fuji";
const SNOWTRACE_TX_URL = "https://testnet.snowtrace.io/tx/";

function assetChainSymbol(asset: string) {
  return asset === "USDT" || asset === "USDC" ? "0x0" : "0x0";
}

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
  const [asset, setAsset] = useState("USDC");
  const [network, setNetwork] = useState(DEFAULT_DEPOSIT_CHAIN);
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const balance = w.balances.find((b) => b.asset === asset)?.available ?? 0;
  const fee = 0;
  const treasuryAddress = getTreasuryAddress();

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!w.connected || !w.address) return toast.error("Connect a wallet first");

    setSubmitting(true);
    try {
      if (mode === "withdraw") {
        if (asset !== "USDC" || network !== "Avalanche Fuji") return toast.error("Only USDC withdrawals on Avalanche Fuji are supported right now");
        if (amt > balance) return toast.error("Insufficient balance");

        const amountRaw = parseUnits(amount, WITHDRAW_DECIMALS[asset]).toString();
        const result = await requestWithdrawal(asset, amountRaw);
        await wallet.refreshBalances();
        toast.success(result.status === "confirmed" ? "Withdrawal completed" : "Withdrawal processing", {
          description: result.txHash ? `Tx ${shortAddress(result.txHash)}` : `Request ${result.id.slice(0, 8)} is ${result.status}`,
        });
      } else if (asset === "USDC" && network === "Avalanche Fuji") {
        if (!isDexVaultConfigured()) return toast.error("DexVault contract is not configured yet");
        const provider = getConnectedProvider();
        if (!provider) return toast.error("Connect a wallet first");

        const txHash = await depositUsdc(provider, w.address as Address, amount);

        wallet.deposit(asset, amt);
        toast.success("Deposit confirmed on-chain", {
          description: `${amt} USDC sent to treasury`,
          action: {
            label: "View on Snowtrace",
            onClick: () => window.open(`${SNOWTRACE_TX_URL}${txHash}`, "_blank"),
          },
        });
      } else {
        if (!treasuryAddress) return toast.error("Treasury address is not configured");

        await wallet.sendTransfer({
          from: w.address,
          to: treasuryAddress,
          value: "0x0",
          data: "0x",
        });

        wallet.deposit(asset, amt);
        toast.success("Deposit confirmed in wallet", {
          description: `${amt} ${asset} sent to treasury on ${network}`,
        });
      }

      setAmount("");
      setDestination("");
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Transfer failed";
      toast.error(message.includes("rejected") ? "Transaction rejected in wallet" : message);
    } finally {
      setSubmitting(false);
    }
  };

  const walletName = WALLETS.find((x) => x.id === w.walletId)?.name ?? "ï¿½";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-glass-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WalletIcon className="h-4 w-4 text-primary" />
            Transfer
          </DialogTitle>
          <DialogDescription>
            {w.connected ? `Connected via ${walletName} ${shortAddress(w.address)}` : "Connect a wallet to deposit or withdraw."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "deposit" | "withdraw") }>
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
                <Select
                  value={asset}
                  onValueChange={setAsset}
                  disabled={mode === "deposit" && network === "Avalanche Fuji"}
                >
                  <SelectTrigger className="h-9 bg-muted/30"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {mode === "deposit" && network === "Avalanche Fuji" ? (
                      <SelectItem value="USDC">USDC</SelectItem>
                    ) : (
                      w.balances.map((b) => (
                        <SelectItem key={b.asset} value={b.asset}>{b.asset}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Network</label>
                <Select value={network} onValueChange={setNetwork}>
                  <SelectTrigger className="h-9 bg-muted/30"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NETWORKS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Amount</span>
                {mode === "withdraw" && (
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setAmount(String(balance))}
                  >
                    Max: {balance.toLocaleString(undefined, { maximumFractionDigits: 6 })} {asset}
                  </button>
                )}
              </div>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="h-10 font-mono bg-muted/30"
                inputMode="decimal"
              />
            </div>

            <TabsContent value="deposit" className="m-0 space-y-2">
              {/* <div className="glass rounded-lg p-3 text-[11px] space-y-1">
                <div className="text-muted-foreground">
                  {network === "Avalanche Fuji" ? "Deposit via DexVault contract" : "Deposit via wallet confirmation"}
                </div>
                <div className="font-mono text-xs break-all">Treasury address: {treasuryAddress}</div>
              </div> */}
              <p className="text-[10px] text-muted-foreground">
                {network === "Avalanche Fuji"
                  ? "Your wallet will ask to approve USDC, then confirm the deposit. Funds are forwarded to treasury on-chain."
                  : `Your connected wallet will ask for confirmation before sending ${asset} to the treasury.`}
              </p>
            </TabsContent>

            <TabsContent value="withdraw" className="m-0 space-y-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Destination address</label>
                <Input
                  value={w.address ?? destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder={w.address ?? "Connect wallet"}
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
              disabled={!w.connected || submitting}
              className={cn(
                "w-full h-10 font-bold",
                mode === "deposit"
                  ? "bg-gradient-buy text-buy-foreground hover:shadow-glow-buy"
                  : "bg-gradient-primary text-primary-foreground"
              )}
            >
              {submitting ? (mode === "deposit" ? "Waiting for wallet..." : "Processing withdrawal...") : mode === "deposit" ? "Confirm deposit" : "Confirm withdrawal"}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}



