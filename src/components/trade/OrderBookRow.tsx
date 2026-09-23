import { memo } from "react";
import { formatPrice } from "@/lib/mockData";

// Extracted and memoized (PERFORMANCE-CODE-REVIEW-FINDINGS.md frontend item
// #4): Index.tsx's order book used to inline this JSX directly inside its
// bids/asks .map() calls, so every one of the ~20 visible rows re-rendered
// on every parent re-render — not just the 500ms-coalesced depth refresh
// this data actually changes on, but ANY unrelated state change in the
// (very large) Index page component, since a plain inline JSX element has
// no identity for React to bail out on. React.memo here lets a row skip
// re-rendering whenever its own (price, size, total, side) haven't
// changed between two renders, which is the common case: on a busy market
// most levels in a depth snapshot are the same tick to tick, only a few
// actually move.
export type OrderBookRowProps = {
  price: number;
  size: number;
  total: number;
  depthPct: number;
  side: "buy" | "sell";
};

function OrderBookRowImpl({ price, size, total, depthPct, side }: OrderBookRowProps) {
  const sideClass = side === "buy" ? "text-buy" : "text-sell";
  const gradient =
    side === "buy"
      ? "linear-gradient(to left, hsl(var(--buy)/0.45), hsl(var(--buy)/0.05))"
      : "linear-gradient(to left, hsl(var(--sell)/0.45), hsl(var(--sell)/0.05))";
  return (
    <div className="relative grid grid-cols-3 gap-1 px-2 flex-1 items-center hover:bg-muted/20 cursor-pointer">
      <div
        className="absolute inset-y-0 right-0 pointer-events-none"
        style={{ width: `${depthPct}%`, background: gradient }}
      />
      <span className={`relative ${sideClass}`}>{formatPrice(price)}</span>
      <span className="relative text-right">{size.toFixed(3)}</span>
      <span className="relative text-right text-muted-foreground">{total.toFixed(2)}</span>
    </div>
  );
}

export const OrderBookRow = memo(OrderBookRowImpl);
