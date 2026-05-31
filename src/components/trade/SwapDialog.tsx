import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Token config ───────────────────────────────────────────────────────────

interface Token {
  symbol: string;
  name: string;
  color: string;        // bg gradient class / inline style key
  textColor: string;
  icon: string;         // emoji / letter avatar
  balance: number;
}

const STABLE_TOKENS: Token[] = [
  { symbol: "USDT", name: "Tether",        color: "#26A17B", textColor: "#fff", icon: "₮", balance: 5000 },
  { symbol: "USDC", name: "USD Coin",      color: "#2775CA", textColor: "#fff", icon: "◎", balance: 2400 },
  { symbol: "BUSD", name: "Binance USD",   color: "#F0B90B", textColor: "#1a1a1a", icon: "B", balance: 1200 },
];

const USDN_TOKEN: Token = {
  symbol: "USDN",
  name: "Neutrino USD",
  color: "#7C3AED",
  textColor: "#fff",
  icon: "N",
  balance: 800,
};

// USDN rate relative to 1 stable (slight peg offset for realism)
const RATE = 0.9997;
const FEE_RATE = 0; // 0 fee

// ─── TokenAvatar ────────────────────────────────────────────────────────────

function TokenAvatar({ token, size = 32 }: { token: Token; size?: number }) {
  return (
    <span
      style={{
        background: token.color,
        color: token.textColor,
        width: size,
        height: size,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.44,
        flexShrink: 0,
        boxShadow: `0 0 12px ${token.color}55`,
      }}
    >
      {token.icon}
    </span>
  );
}

// ─── TokenSelector ──────────────────────────────────────────────────────────

function TokenSelector({
  tokens,
  selected,
  onSelect,
  label,
}: {
  tokens: Token[];
  selected: Token;
  onSelect: (t: Token) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 glass rounded-xl px-3 py-1.5 border border-transparent",
          "hover:border-primary/40 transition-all cursor-pointer select-none"
        )}
      >
        <TokenAvatar token={selected} size={28} />
        <span className="font-bold text-sm">{selected.symbol}</span>
        <svg
          className={cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 glass-strong rounded-xl border border-glass-border shadow-[0_8px_32px_hsl(230_50%_2%/0.7)] overflow-hidden"
          style={{ minWidth: 160 }}
        >
          {tokens.map((t) => (
            <button
              key={t.symbol}
              onClick={() => { onSelect(t); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors",
                "hover:bg-primary/10",
                t.symbol === selected.symbol && "bg-primary/10 text-primary"
              )}
            >
              <TokenAvatar token={t} size={24} />
              <div>
                <div className="font-semibold leading-none">{t.symbol}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{t.name}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SwapDialog ─────────────────────────────────────────────────────────────

export function SwapDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  // direction: true = stable → USDN, false = USDN → stable
  const [stableToUsdn, setStableToUsdn] = useState(true);
  const [fromToken, setFromToken] = useState<Token>(STABLE_TOKENS[0]);
  const [amount, setAmount] = useState("");

  const fromList  = stableToUsdn ? STABLE_TOKENS : [USDN_TOKEN];
  const toToken   = stableToUsdn ? USDN_TOKEN : fromToken;

  const numAmount = parseFloat(amount) || 0;
  const outAmount = stableToUsdn
    ? numAmount * RATE
    : numAmount / RATE;
  const fromBalance = stableToUsdn ? fromToken.balance : USDN_TOKEN.balance;
  const insufficient = numAmount > fromBalance && numAmount > 0;

  const handleSwapDirection = useCallback(() => {
    setStableToUsdn((prev) => !prev);
    setAmount("");
  }, []);

  const handleMax = () => setAmount(String(fromBalance));

  const handleSwap = () => {
    if (!numAmount || numAmount <= 0) return toast.error("Enter a valid amount");
    if (insufficient) return toast.error("Insufficient balance");
    const fromSym = stableToUsdn ? fromToken.symbol : "USDN";
    const toSym   = stableToUsdn ? "USDN" : fromToken.symbol;
    toast.success(`Swap submitted`, {
      description: `${numAmount.toLocaleString()} ${fromSym} → ${outAmount.toFixed(4)} ${toSym}`,
    });
    setAmount("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="glass-strong border-glass-border p-0 overflow-visible gap-0"
        style={{ maxWidth: 420 }}
      >
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-glass-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ArrowUpDown className="h-4 w-4 text-primary" />
            Swap
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-3">
          {/* ── FROM box ── */}
          <div
            className={cn(
              "rounded-2xl border p-4 transition-all",
              insufficient
                ? "border-sell/60 bg-sell/5"
                : "border-glass-border bg-muted/20 hover:border-primary/30"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                From
              </span>
              <button
                onClick={handleMax}
                className="text-[11px] text-muted-foreground hover:text-primary transition-colors"
              >
                Available:&nbsp;
                <span className="font-mono font-semibold">
                  {fromBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  &nbsp;{stableToUsdn ? fromToken.symbol : "USDN"}
                </span>
                <span className="ml-1 text-primary">⊕</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <TokenSelector
                tokens={fromList}
                selected={stableToUsdn ? fromToken : USDN_TOKEN}
                onSelect={(t) => { setFromToken(t); setAmount(""); }}
                label="from"
              />
              <div className="flex-1 flex items-center justify-end gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={cn(
                    "bg-transparent text-right text-2xl font-bold font-mono outline-none w-full",
                    "placeholder:text-muted-foreground/40",
                    insufficient ? "text-sell" : "text-foreground"
                  )}
                />
                <button
                  onClick={handleMax}
                  className="shrink-0 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors px-1"
                >
                  All
                </button>
              </div>
            </div>
          </div>

          {/* ── Insufficient balance warning ── */}
          {insufficient && (
            <div className="flex items-start gap-1.5 text-sell text-xs px-1 animate-slide-up">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Insufficient balance. The amount you entered exceeds the single-transaction limit.
              </span>
            </div>
          )}

          {/* ── Swap direction button ── */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-glass-border" />
            <button
              onClick={handleSwapDirection}
              className={cn(
                "relative z-10 h-9 w-9 rounded-full flex items-center justify-center",
                "transition-all duration-200 group",
                "bg-gradient-to-br from-warning to-amber-500",
                "shadow-[0_0_16px_hsl(40_100%_60%/0.45)] hover:shadow-[0_0_24px_hsl(40_100%_60%/0.65)]",
                "hover:scale-110"
              )}
              title="Swap direction"
            >
              <ArrowUpDown className="h-4 w-4 text-zinc-900 group-hover:rotate-180 transition-transform duration-300" />
            </button>
          </div>

          {/* ── TO box ── */}
          <div className="rounded-2xl border border-glass-border bg-muted/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">To</span>
            </div>
            <div className="flex items-center gap-3">
              {/* static token display */}
              <div className="flex items-center gap-2 glass rounded-xl px-3 py-1.5">
                <TokenAvatar token={toToken} size={28} />
                <span className="font-bold text-sm">{toToken.symbol}</span>
              </div>
              <div className="flex-1 text-right">
                <span
                  className={cn(
                    "text-2xl font-bold font-mono",
                    outAmount > 0 ? "text-foreground" : "text-muted-foreground/40"
                  )}
                >
                  {outAmount > 0
                    ? outAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })
                    : "0"}
                </span>
              </div>
            </div>
          </div>

          {/* ── Rate ── */}
          {numAmount > 0 && (
            <div className="flex items-center gap-2 px-1">
              <div className="flex-1 h-px bg-glass-border" />
              <span className="text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                1&nbsp;{stableToUsdn ? fromToken.symbol : "USDN"}
                &nbsp;≈&nbsp;
                {stableToUsdn
                  ? `${RATE.toFixed(4)} USDN`
                  : `${(1 / RATE).toFixed(4)} ${fromToken.symbol}`}
              </span>
              <div className="flex-1 h-px bg-glass-border" />
            </div>
          )}

          {/* ── Summary rows ── */}
          <div className="glass rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Transaction Fees</span>
              <span className="px-2 py-0.5 rounded-md bg-buy/15 text-buy text-[11px] font-semibold">
                {FEE_RATE === 0 ? "0 Fee" : `${FEE_RATE}%`}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">You get</span>
              <span className="font-mono font-bold">
                {outAmount > 0
                  ? `${outAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${toToken.symbol}`
                  : "—"}
              </span>
            </div>
          </div>

          {/* ── CTA ── */}
          <Button
            onClick={handleSwap}
            disabled={!numAmount || numAmount <= 0 || insufficient}
            className={cn(
              "w-full h-12 font-bold text-sm rounded-2xl transition-all",
              insufficient || !numAmount
                ? "opacity-50 cursor-not-allowed"
                : "bg-gradient-to-r from-amber-400 to-orange-500 text-zinc-900 hover:shadow-[0_0_24px_hsl(40_100%_60%/0.5)] hover:scale-[1.01]"
            )}
          >
            {!numAmount
              ? "Enter Amount"
              : insufficient
              ? "Insufficient Balance"
              : (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Swap {stableToUsdn ? fromToken.symbol : "USDN"} → {toToken.symbol}
                </span>
              )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
