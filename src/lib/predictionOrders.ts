export type PredictionOrderStatus = "Open" | "Won" | "Lost" | "Cancelled";
export type PredictionOrderSide = "Up" | "Down";

export type PredictionOrderSummary = {
  id: string;
  market: string;
  side: PredictionOrderSide;
  status: PredictionOrderStatus;
  date: string;
  closeTime: string;
  price: number;
  shares: number;
  cost: number;
  potentialReturn: number;
  category: string;
};

export const predictionOrders: PredictionOrderSummary[] = [
  {
    id: "PRD-240531-0819",
    market: "SOL > $300 by Aug?",
    side: "Up",
    status: "Open",
    date: "2026-05-31 15:12",
    closeTime: "Aug 31",
    price: 34,
    shares: 73.52,
    cost: 25,
    potentialReturn: 73.52,
    category: "Crypto",
  },
  {
    id: "PRD-240531-0774",
    market: "Will BTC close above $80k by year-end?",
    side: "Up",
    status: "Open",
    date: "2026-05-31 14:48",
    closeTime: "Dec 31",
    price: 62,
    shares: 161.29,
    cost: 100,
    potentialReturn: 161.29,
    category: "Crypto",
  },
  {
    id: "PRD-240530-2291",
    market: "Will Fed cut rates next meeting?",
    side: "Down",
    status: "Won",
    date: "2026-05-30 18:20",
    closeTime: "Jun 18",
    price: 29,
    shares: 86.2,
    cost: 25,
    potentialReturn: 86.2,
    category: "Macro",
  },
  {
    id: "PRD-240529-4410",
    market: "ETH ETF approved by Q3 2026?",
    side: "Up",
    status: "Lost",
    date: "2026-05-29 10:05",
    closeTime: "Sep 30",
    price: 48,
    shares: 20.83,
    cost: 10,
    potentialReturn: 20.83,
    category: "Regulation",
  },
];

export function predictionSidePillClass(side: PredictionOrderSide) {
  return side === "Up"
    ? "rounded bg-buy/15 px-2 py-0.5 text-[10px] font-bold text-buy"
    : "rounded bg-sell/15 px-2 py-0.5 text-[10px] font-bold text-sell";
}

export function predictionStatusClass(status: PredictionOrderStatus) {
  if (status === "Open") return "border-primary/30 bg-primary/10 text-primary";
  if (status === "Won") return "border-buy/30 bg-buy/10 text-buy";
  if (status === "Lost") return "border-sell/30 bg-sell/10 text-sell";
  return "border-muted-foreground/25 bg-muted/50 text-muted-foreground";
}
