import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { wallet, useWallet, WALLETS, shortAddress, getConnectedProvider } from "@/lib/useWallet";
import { requestWithdrawal } from "@/lib/authApi";
import { depositUsdc, isDexVaultConfigured } from "@/lib/contracts/dexVault";
import { DEPOSIT_ASSETS, chainsFor, isDepositAllowed, isDepositLive } from "@/lib/depositAssets";
import { ArrowDownToLine, ArrowUpFromLine, Wallet as WalletIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { parseUnits, type Address } from "viem";

const WITHDRAW_DECIMALS: Record<string, number> = { USDC: 6 };
// USDC on AVAX is the only (asset, chain) pair with a working contract/
// listener today (see depositAssets.ts's isDepositLive) — default both
// selectors to it, so the dialog opens ready to submit rather than on a
// combination that immediately errors.
const DEFAULT_DEPOSIT_ASSET = "USDC";
const DEFAULT_DEPOSIT_CHAIN = "AVAX";
const SNOWTRACE_TX_URL = "https://testnet.snowtrace.io/tx/";

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
  const [asset, setAsset] = useState(DEFAULT_DEPOSIT_ASSET);
  const [network, setNetwork] = useState(DEFAULT_DEPOSIT_CHAIN);
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const balance = w.balances.find((b) => b.asset === asset)?.available ?? 0;
  const fee = 0;

  // Deposits are restricted to a fixed (asset, chain) allowlist — BI2XUSD and
  // BI2X only on Avalanche (they're the platform's own assets, not real
  // tokens on any other chain); USDT/USDC across the chains they actually
  // circulate on. See depositAssets.ts. Withdrawals stay USDC-on-Avalanche
  // only for now (the only real on-chain path that exists at all today).
  const networksForAsset = mode === "deposit" ? chainsFor(asset) : ["AVAX"];
  const setAssetForDeposit = (next: string) => {
    setAsset(next);
    // Switching asset may invalidate the current network — snap to the
    // first allowed one rather than leaving an invalid pair selected.
    const allowed = chainsFor(next);
    if (!allowed.includes(network as (typeof allowed)[number])) setNetwork(allowed[0] ?? "");
  };

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!w.connected || !w.address) return toast.error("Connect a wallet first");

    setSubmitting(true);
    try {
      if (mode === "withdraw") {
        if (asset !== "USDC" || network !== "AVAX") return toast.error("Only USDC withdrawals on Avalanche are supported right now");
        if (amt > balance) return toast.error("Insufficient balance");

        const amountRaw = parseUnits(amount, WITHDRAW_DECIMALS[asset]).toString();
        const result = await requestWithdrawal(asset, amountRaw);
        await wallet.refreshBalances();
        toast.success(result.status === "confirmed" ? "Withdrawal completed" : "Withdrawal processing", {
          description: result.txHash ? `Tx ${shortAddress(result.txHash)}` : `Request ${result.id.slice(0, 8)} is ${result.status}`,
        });
      } else if (!isDepositAllowed(asset, network)) {
        // Shouldn't be reachable through the UI (the network selector only
        // ever offers chainsFor(asset)), but guard the actual submit path
        // too in case state gets out of sync.
        return toast.error(`${asset} cannot be deposited on ${network}`);
      } else if (isDepositLive(asset, network)) {
        // The one real combination: USDC on Avalanche, via the deployed
        // DexVault contract (see depositAssets.ts's isDepositLive).
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
        // Allowed by the product allowlist, but no contract/listener exists
        // for this exact (asset, chain) pair yet — including BI2XUSD/BI2X/
        // USDT on Avalanche itself, since DexVault only has a depositToken
        // path for USDC today (see isDepositLive's doc comment). Say so
        // rather than pretending to submit a deposit nothing on the backend
        // will ever see or credit.
        return toast.error(`${asset} deposits on ${network} are coming soon`, {
          description: "This combination is on the roadmap but isn't live yet — use USDC on Avalanche for now.",
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

        <Tabs
          value={mode}
          onValueChange={(v) => {
            const nextMode = v as "deposit" | "withdraw";
            setMode(nextMode);
            // Withdrawals only ever offer USDC on Avalanche today — reset to
            // that so a deposit-side pick like BI2XUSD/BI2X doesn't leave the
            // withdraw tab's asset selector on a value not in its own list.
            if (nextMode === "withdraw") {
              setAsset("USDC");
              setNetwork("AVAX");
            } else {
              setAsset(DEFAULT_DEPOSIT_ASSET);
              setNetwork(DEFAULT_DEPOSIT_CHAIN);
            }
          }}
        >
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
                  onValueChange={mode === "deposit" ? setAssetForDeposit : setAsset}
                >
                  <SelectTrigger className="h-9 bg-muted/30"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {mode === "deposit" ? (
                      // Deposits are restricted to the platform's fixed
                      // asset allowlist (see depositAssets.ts), not just
                      // whatever the user already holds a balance in.
                      DEPOSIT_ASSETS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)
                    ) : (
                      // BI2XUSD/BI2X have no on-chain withdrawal path (BI2XUSD
                      // is the platform's internal 1:1-pegged trading
                      // currency; BI2X only trades on this exchange — see
                      // useWallet.ts). Only assets with a real withdrawal
                      // path (currently USDC) belong here, so picking one
                      // never dead-ends in the submit-time "only USDC
                      // withdrawals" error.
                      w.balances.filter((b) => b.asset === "USDC").map((b) => (
                        <SelectItem key={b.asset} value={b.asset}>{b.asset}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Network</label>
                <Select value={network} onValueChange={setNetwork} disabled={mode === "withdraw"}>
                  <SelectTrigger className="h-9 bg-muted/30"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {networksForAsset.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
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
              <p className="text-[10px] text-muted-foreground">
                {isDepositLive(asset, network)
                  ? "Your wallet will ask to approve USDC, then confirm the deposit. Funds are forwarded to treasury on-chain."
                  : `${asset} deposits on ${network} are coming soon — not live yet. Use USDC on Avalanche for now.`}
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



