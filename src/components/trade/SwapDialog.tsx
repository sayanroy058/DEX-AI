import { useState } from "react";
import {
  ArrowRight,
  ArrowUpDown,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { formatUnits, parseUnits } from "viem";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { swapAssets } from "@/lib/authApi";
import { wallet, useWallet } from "@/lib/useWallet";
import { cn } from "@/lib/utils";

type TokenSymbol = "USDC" | "USDT" | "BIUSD";

interface Token {
  symbol: TokenSymbol;
  name: string;
  color: string;
  textColor: string;
  icon: string;
}

// BIUSD is the platform's internal stable quote currency (pegged 1:1 to
// USDT, no on-chain contract of its own) — every market trades against it.
// This swap lets a user move deposit-intake USDC/USDT into tradable BIUSD
// manually; real on-chain deposits already convert automatically (see
// Dex-Backend's chain.Listener), this covers balances credited before that
// migration or credited directly as USDC/USDT.
//
// Direction rules (mirroring the backend's swapDestinations allowlist):
//   - USDT → BIUSD and USDC → BIUSD: allowed, no fee.
//   - BIUSD → USDT and BIUSD → USDC: allowed, 1% conversion fee.
//   - Direct USDT ↔ USDC is NOT offered (route through BIUSD instead).
const TOKENS: Record<TokenSymbol, Token> = {
  USDC: { symbol: "USDC", name: "USD Coin", color: "#2775CA", textColor: "#fff", icon: "$" },
  USDT: { symbol: "USDT", name: "Tether", color: "#26A17B", textColor: "#fff", icon: "₮" },
  BIUSD: { symbol: "BIUSD", name: "BitDx USD", color: "#7C5CFC", textColor: "#fff", icon: "B" },
};
const TOKEN_LIST = Object.values(TOKENS);

// All three assets use 6 decimals, so the 1:1 base rate needs no conversion
// factor between any pair.
const SWAP_DECIMALS = 6;

// Fee (in basis points of the source amount) charged on a swap OUT of BIUSD.
// Swaps INTO BIUSD are free.
const SWAP_FEE_BPS_OUT_OF_BIUSD = 100; // 1%

// Destinations allowed for each source asset — must match the backend's
// swapDestinations map in Dex-Backend's /wallet/swap handler.
const SWAP_DESTINATIONS: Record<TokenSymbol, TokenSymbol[]> = {
  USDT: ["BIUSD"],
  USDC: ["BIUSD"],
  BIUSD: ["USDT", "USDC"],
};

function swapFeeBps(to: TokenSymbol): number {
  return to === "BIUSD" ? 0 : SWAP_FEE_BPS_OUT_OF_BIUSD;
}

// creditedFor computes the exact destination amount the backend will credit:
// 1:1 base rate with the fee deducted in raw integer units (fee = floor(
// amount × feeBps / 10000)) — identical integer math to the backend, so the
// displayed "You get" figure can never disagree with what actually lands.
function creditedFor(amount: string, feeBps: number): number | null {
  if (!amount) return null;
  let raw: bigint;
  try {
    raw = parseUnits(amount, SWAP_DECIMALS);
  } catch {
    return null;
  }
  if (raw <= 0n) return null;
  const feeRaw = (raw * BigInt(feeBps)) / 10000n;
  return Number(formatUnits(raw - feeRaw, SWAP_DECIMALS));
}

function TokenAvatar({ token, size = 32 }: { token: Token; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{
        background: token.color,
        boxShadow: `0 0 12px ${token.color}55`,
        color: token.textColor,
        fontSize: size * 0.44,
        height: size,
        width: size,
      }}
      aria-hidden="true"
    >
      {token.icon}
    </span>
  );
}

function TokenSelect({
  value, options, onChange,
}: {
  value: TokenSymbol;
  options: TokenSymbol[];
  onChange: (symbol: TokenSymbol) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as TokenSymbol)}>
      <SelectTrigger className="h-12 w-auto shrink-0 min-w-[128px] rounded-xl border border-border bg-muted/30 px-3">
        <SelectValue asChild>
          <span className="flex items-center gap-2">
            <TokenAvatar token={TOKENS[value]} size={26} />
            <span className="font-bold">{value}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((symbol) => {
          const t = TOKENS[symbol];
          return (
            <SelectItem key={t.symbol} value={t.symbol}>
              <span className="flex items-center gap-2">
                <TokenAvatar token={t} size={20} />
                {t.symbol}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

function formatAmount(value: number, maximumFractionDigits = 4) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  });
}

function amountForInput(value: number) {
  return value.toFixed(SWAP_DECIMALS).replace(/\.?0+$/, "");
}

function sanitizeAmount(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole = "", ...decimalParts] = cleaned.split(".");
  const decimal = decimalParts.join("").slice(0, SWAP_DECIMALS);
  return decimalParts.length > 0 ? `${whole}.${decimal}` : whole;
}

export function SwapDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const [fromSymbol, setFromSymbol] = useState<TokenSymbol>("USDC");
  const [toSymbol, setToSymbol] = useState<TokenSymbol>("BIUSD");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { balances } = useWallet();

  const fromToken = TOKENS[fromSymbol];
  const toToken = TOKENS[toSymbol];
  const numericAmount = Number.parseFloat(amount) || 0;
  // 1:1 base rate with the directional fee deducted, computed with the same
  // integer math as the backend so the preview matches the credited amount.
  const feeBps = swapFeeBps(toSymbol);
  const creditedAmount = creditedFor(amount, feeBps);
  const outputAmount = creditedAmount ?? 0;
  const fromBalance = balances.find((b) => b.asset === fromToken.symbol)?.available ?? 0;
  const insufficient = creditedAmount !== null && creditedAmount <= 0 ? true : numericAmount > fromBalance;
  const canSwap = creditedAmount !== null && creditedAmount > 0 && !insufficient && !submitting;

  // Allowed choices per side, restricted to the backend's directional pair
  // allowlist: the "From" picker lists every asset with at least one
  // destination, and the "To" picker lists only what the chosen "From" can
  // legally convert into.
  const fromOptions = TOKEN_LIST.map((t) => t.symbol).filter(
    (symbol) => SWAP_DESTINATIONS[symbol].length > 0,
  );
  const toOptions = SWAP_DESTINATIONS[fromSymbol];

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setAmount("");
    onOpenChange(nextOpen);
  };

  // Picking a "From" token that has no legal route to the current "To" snaps
  // "To" to the first allowed destination (there is always exactly one for
  // USDT/USDC; BIUSD keeps the current pick when it stays legal).
  const handleFromChange = (symbol: TokenSymbol) => {
    setFromSymbol(symbol);
    if (!SWAP_DESTINATIONS[symbol].includes(toSymbol)) {
      setToSymbol(SWAP_DESTINATIONS[symbol][0]);
    }
  };
  const handleToChange = (symbol: TokenSymbol) => {
    setToSymbol(symbol);
  };

  const handleDirectionChange = () => {
    // Only reversed when the reverse direction is itself a legal pair —
    // USDT ↔ USDC has no direct route, so the button is a no-op there.
    if (!SWAP_DESTINATIONS[toSymbol].includes(fromSymbol)) {
      return;
    }
    setFromSymbol(toSymbol);
    setToSymbol(fromSymbol);
    setAmount(outputAmount > 0 ? amountForInput(outputAmount) : "");
  };

  const handleMax = () => {
    setAmount(amountForInput(fromBalance));
  };

  const handleSwap = async () => {
    if (creditedAmount === null || creditedAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (insufficient) {
      toast.error(`Insufficient ${fromToken.symbol} balance`);
      return;
    }

    setSubmitting(true);
    try {
      const amountRaw = parseUnits(amount, SWAP_DECIMALS).toString();
      await swapAssets(fromToken.symbol, toToken.symbol, amountRaw);
      await wallet.refreshBalances();
      toast.success("Swap completed", {
        description: `${formatAmount(numericAmount)} ${fromToken.symbol} to ${formatAmount(outputAmount)} ${toToken.symbol}`,
      });
      handleOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Swap failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100%_-_2rem)] max-w-[526px] min-w-0 gap-0 overflow-visible rounded-2xl border-glass-border bg-background/95 p-0 shadow-2xl backdrop-blur-2xl [&>button]:right-6 [&>button]:top-6">
        <DialogHeader className="border-b border-border px-6 py-5 pr-14">
          <DialogTitle className="flex items-center gap-2.5 text-xl">
            <ArrowUpDown className="h-5 w-5 text-primary" />
            Swap
          </DialogTitle>
          <DialogDescription className="sr-only">
            Swap USDT or USDC into BIUSD with no fee, or BIUSD back into USDT or USDC with a 1% conversion fee.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4 px-6 py-5">
          <section
            className={cn(
              "rounded-2xl border bg-muted/10 p-5 transition-colors",
              insufficient ? "border-sell/60 bg-sell/5" : "border-border",
            )}
          >
            <div className="mb-3 flex items-center justify-between gap-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                From
              </span>
              <button
                type="button"
                onClick={handleMax}
                className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Use full balance of ${formatAmount(fromBalance)} ${fromToken.symbol}`}
              >
                <span className="truncate">
                  Available: <span className="font-mono">{formatAmount(fromBalance)} {fromToken.symbol}</span>
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <TokenSelect value={fromSymbol} options={fromOptions} onChange={handleFromChange} />
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  value={amount}
                  onChange={(event) => setAmount(sanitizeAmount(event.target.value))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && canSwap) handleSwap();
                  }}
                  className={cn(
                    "min-w-0 flex-1 bg-transparent text-right font-mono text-2xl font-bold outline-none placeholder:text-muted-foreground/40",
                    insufficient ? "text-sell" : "text-foreground",
                  )}
                  aria-label={`Amount of ${fromToken.symbol} to swap`}
                />
                <button
                  type="button"
                  onClick={handleMax}
                  className="shrink-0 px-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  All
                </button>
              </div>
            </div>

            {insufficient && (
              <p className="mt-3 text-xs text-sell">
                Amount exceeds your available {fromToken.symbol} balance.
              </p>
            )}
          </section>

          <div className="-my-1 flex justify-center">
            <button
              type="button"
              onClick={handleDirectionChange}
              className="group flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-warning to-amber-500 shadow-[0_0_20px_hsl(40_100%_60%/0.45)] transition-all hover:scale-105 hover:shadow-[0_0_28px_hsl(40_100%_60%/0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning"
              title="Reverse swap direction"
              aria-label="Reverse swap direction"
            >
              <ArrowUpDown className="h-5 w-5 text-zinc-900 transition-transform duration-300 group-hover:rotate-180" />
            </button>
          </div>

          <section className="rounded-2xl border border-border bg-muted/10 p-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              To
            </div>
            <div className="flex items-center gap-3">
              <TokenSelect value={toSymbol} options={toOptions} onChange={handleToChange} />
              <div className="min-w-0 flex-1 truncate text-right font-mono text-2xl font-bold">
                <span className={outputAmount > 0 ? "text-foreground" : "text-muted-foreground/40"}>
                  {outputAmount > 0 ? formatAmount(outputAmount) : "0"}
                </span>
              </div>
            </div>
          </section>

          {numericAmount > 0 && (
            <div className="text-center font-mono text-[11px] text-muted-foreground">
              1 {fromToken.symbol} ≈ 1.0000 {toToken.symbol}
              {feeBps > 0 ? " (1% conversion fee)" : " (no fee)"}
            </div>
          )}

          <div className="space-y-3 rounded-xl border border-border bg-muted/20 px-4 py-3.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Conversion Fee</span>
              {feeBps > 0 ? (
                <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
                  1% ({formatAmount(numericAmount * (feeBps / 10000))} {fromToken.symbol})
                </span>
              ) : (
                <span className="rounded-full bg-buy/15 px-2.5 py-1 text-xs font-semibold text-buy">
                  No Fee
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">You get</span>
              <span className="truncate font-mono font-bold">
                {outputAmount > 0 ? `${formatAmount(outputAmount)} ${toToken.symbol}` : "-"}
              </span>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleSwap}
            disabled={!canSwap}
            className="h-14 w-full rounded-2xl bg-primary text-base font-bold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {!numericAmount ? (
              "Enter Amount"
            ) : insufficient ? (
              "Insufficient Balance"
            ) : submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Swapping...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Swap {fromToken.symbol}
                <ArrowRight className="h-4 w-4" />
                {toToken.symbol}
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
