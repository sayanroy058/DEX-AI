export type P2POrderSummary = {
  id: string;
  side: "Buy" | "Sell";
  status: "In Progress" | "Completed" | "Cancelled";
  date: string;
  price: number;
  fiatAmount: number;
  cryptoAmount: number;
  counterparty: string;
  payment: string;
};

export const p2pOrders: P2POrderSummary[] = [
  {
    id: "P2P-240531-0821",
    side: "Buy",
    status: "In Progress",
    date: "2026-05-30 12:18",
    price: 91.24,
    fiatAmount: 25000,
    cryptoAmount: 274.0026,
    counterparty: "CryptoKing_India",
    payment: "Bank Transfer",
  },
  {
    id: "P2P-240530-1134",
    side: "Sell",
    status: "Completed",
    date: "2026-05-29 18:42",
    price: 91.35,
    fiatAmount: 13702.5,
    cryptoAmount: 150,
    counterparty: "EliteOTC",
    payment: "NEFT",
  },
  {
    id: "P2P-240529-4472",
    side: "Buy",
    status: "Completed",
    date: "2026-05-28 09:16",
    price: 91.4,
    fiatAmount: 9140,
    cryptoAmount: 100,
    counterparty: "Alpha_Merchant",
    payment: "IMPS",
  },
];

export function p2pStatusClass(status: P2POrderSummary["status"]) {
  if (status === "In Progress") return "text-primary bg-primary/10 border-primary/30";
  if (status === "Completed") return "text-buy bg-buy/10 border-buy/30";
  return "text-muted-foreground bg-muted/30 border-border";
}

export function p2pSidePillClass(side: P2POrderSummary["side"]) {
  return side === "Buy"
    ? "rounded bg-buy/15 px-2 py-0.5 text-[10px] font-bold text-buy"
    : "rounded bg-sell/15 px-2 py-0.5 text-[10px] font-bold text-sell";
}
