import { useState } from "react";
import {
  ArrowRight,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  Globe2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Token {
  symbol: string;
  name: string;
  color: string;
  textColor: string;
  icon: string;
}

type SwapDirection = "stable-to-usdn" | "usdn-to-stable";
type Balances = Record<string, number>;

const STABLE_TOKENS: Token[] = [
  { symbol: "USDT", name: "Tether", color: "#26A17B", textColor: "#fff", icon: "₮" },
  { symbol: "USDC", name: "USD Coin", color: "#2775CA", textColor: "#fff", icon: "$" },
  { symbol: "BUSD", name: "Binance USD", color: "#F0B90B", textColor: "#171717", icon: "B" },
];

const USDN_TOKEN: Token = {
  symbol: "USDN",
  name: "Neutrino USD",
  color: "#7C3AED",
  textColor: "#fff",
  icon: "N",
};

const INITIAL_BALANCES: Balances = {
  USDT: 5000,
  USDC: 2400,
  BUSD: 1200,
  USDN: 800,
};

const USDN_PER_STABLE = 0.9997;

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

function TokenDisplay({
  token,
  selectable = false,
  onSelect,
}: {
  token: Token;
  selectable?: boolean;
  onSelect?: (token: Token) => void;
}) {
  const content = (
    <span className="flex items-center gap-2">
      <TokenAvatar token={token} size={34} />
      <span className="font-bold">{token.symbol}</span>
      {selectable && <ChevronDown className="h-4 w-4 text-muted-foreground" />}
    </span>
  );

  if (!selectable) {
    return (
      <div className="flex h-12 items-center rounded-xl border border-border bg-muted/30 px-3">
        {content}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-12 items-center rounded-xl border border-transparent bg-muted/30 px-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Select token, currently ${token.symbol}`}
        >
          {content}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-52 border-glass-border bg-popover/95 p-1.5 backdrop-blur-xl"
      >
        {STABLE_TOKENS.map((option) => (
          <DropdownMenuItem
            key={option.symbol}
            onSelect={() => onSelect?.(option)}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5",
              option.symbol === token.symbol && "bg-primary/10 text-primary",
            )}
          >
            <TokenAvatar token={option} size={28} />
            <span>
              <span className="block text-sm font-semibold leading-none">{option.symbol}</span>
              <span className="mt-1 block text-[10px] text-muted-foreground">{option.name}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatAmount(value: number, maximumFractionDigits = 4) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  });
}

function amountForInput(value: number) {
  return value.toFixed(4).replace(/\.?0+$/, "");
}

function sanitizeAmount(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole = "", ...decimalParts] = cleaned.split(".");
  const decimal = decimalParts.join("").slice(0, 8);
  return decimalParts.length > 0 ? `${whole}.${decimal}` : whole;
}

export function SwapDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const [direction, setDirection] = useState<SwapDirection>("stable-to-usdn");
  const [stableToken, setStableToken] = useState(STABLE_TOKENS[0]);
  const [amount, setAmount] = useState("");
  const [balances, setBalances] = useState<Balances>(INITIAL_BALANCES);

  const isStableToUsdn = direction === "stable-to-usdn";
  const fromToken = isStableToUsdn ? stableToken : USDN_TOKEN;
  const toToken = isStableToUsdn ? USDN_TOKEN : stableToken;
  const numericAmount = Number.parseFloat(amount) || 0;
  const outputAmount = isStableToUsdn
    ? numericAmount * USDN_PER_STABLE
    : numericAmount / USDN_PER_STABLE;
  const fromBalance = balances[fromToken.symbol] ?? 0;
  const insufficient = numericAmount > fromBalance;
  const canSwap = numericAmount > 0 && !insufficient;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setAmount("");
    onOpenChange(nextOpen);
  };

  const handleDirectionChange = () => {
    setDirection((current) => (
      current === "stable-to-usdn" ? "usdn-to-stable" : "stable-to-usdn"
    ));
    setAmount(outputAmount > 0 ? amountForInput(outputAmount) : "");
  };

  const handleStableTokenChange = (token: Token) => {
    setStableToken(token);
  };

  const handleMax = () => {
    setAmount(amountForInput(fromBalance));
  };

  const handleSwap = () => {
    if (numericAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (insufficient) {
      toast.error(`Insufficient ${fromToken.symbol} balance`);
      return;
    }

    setBalances((current) => ({
      ...current,
      [fromToken.symbol]: Math.max(0, current[fromToken.symbol] - numericAmount),
      [toToken.symbol]: (current[toToken.symbol] ?? 0) + outputAmount,
    }));
    toast.success("Swap completed", {
      description: `${formatAmount(numericAmount)} ${fromToken.symbol} to ${formatAmount(outputAmount)} ${toToken.symbol}`,
    });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100%_-_2rem)] max-w-[526px] gap-0 overflow-visible rounded-2xl border-glass-border bg-background/95 p-0 shadow-2xl backdrop-blur-2xl [&>button]:right-6 [&>button]:top-6">
        <DialogHeader className="border-b border-border px-6 py-5 pr-14">
          <DialogTitle className="flex items-center gap-2.5 text-xl">
            <ArrowUpDown className="h-5 w-5 text-primary" />
            Swap
          </DialogTitle>
          <DialogDescription className="sr-only">
            Swap between supported stablecoins and USDN.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
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
                <Globe2 className="h-3.5 w-3.5 shrink-0 text-primary" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <TokenDisplay
                token={fromToken}
                selectable={isStableToUsdn}
                onSelect={handleStableTokenChange}
              />
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
              <TokenDisplay
                token={toToken}
                selectable={!isStableToUsdn}
                onSelect={handleStableTokenChange}
              />
              <div className="min-w-0 flex-1 truncate text-right font-mono text-2xl font-bold">
                <span className={outputAmount > 0 ? "text-foreground" : "text-muted-foreground/40"}>
                  {outputAmount > 0 ? formatAmount(outputAmount) : "0"}
                </span>
              </div>
            </div>
          </section>

          {numericAmount > 0 && (
            <div className="text-center font-mono text-[11px] text-muted-foreground">
              1 {fromToken.symbol} ≈{" "}
              {isStableToUsdn
                ? `${USDN_PER_STABLE.toFixed(4)} USDN`
                : `${(1 / USDN_PER_STABLE).toFixed(4)} ${stableToken.symbol}`}
            </div>
          )}

          <div className="space-y-3 rounded-xl border border-border bg-muted/20 px-4 py-3.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Transaction Fees</span>
              <span className="rounded-full bg-buy/15 px-2.5 py-1 text-xs font-semibold text-buy">
                0 Fee
              </span>
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
