import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Code2,
  Info,
  Link2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  LineChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useNavigate } from "react-router-dom";
import {
  predictionOrders,
  predictionSidePillClass,
  predictionStatusClass,
} from "@/lib/predictionOrders";

const PRICE_TO_BEAT = 73565.88;
const CHART_WINDOW = 44;
const TIME_SLOTS = ["2:45 AM", "2:50 AM", "2:55 AM", "3:00 AM"];
const RELATED_TIMEFRAMES = ["5 Min", "15 Min", "1 Day"] as const;

const RELATED = [
  { coin: "ETH", name: "Ethereum Up or Down", pct: 70, color: "bg-blue-500" },
  { coin: "SOL", name: "Solana Up or Down", pct: 28, color: "bg-purple-500" },
  { coin: "XRP", name: "XRP Up or Down", pct: 51, color: "bg-gray-500" },
  { coin: "DOGE", name: "Dogecoin Up or Down", pct: 16, color: "bg-yellow-500" },
];

interface Props {
  market: {
    q: string;
    yes: number;
    vol: string;
    end: string;
    category: string;
    participants: number;
    marketType: string;
  };
  initialSide: "YES" | "NO";
  onClose: () => void;
}

type ChartPoint = { idx: number; price: number; time: string };
type BookRow = { price: number; shares: number; total: number };

function formatChartTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

function initChart(base: number, points: number) {
  const arr: ChartPoint[] = [];
  let p = base;
  let velocity = 0;
  const now = Date.now();

  for (let i = 0; i < points; i++) {
    const drift = i < points * 0.45 ? -0.04 : 0.05;
    velocity = velocity * 0.78 + (Math.random() - 0.5) * 0.42 + drift;
    p += velocity;
    arr.push({
      idx: i,
      price: parseFloat(p.toFixed(2)),
      time: formatChartTime(new Date(now - (points - i - 1) * 5000)),
    });
  }

  return arr;
}

function LiveDot(props: { cx?: number; cy?: number; index?: number; dataLength: number }) {
  const { cx, cy, index, dataLength } = props;
  if (cx == null || cy == null || index !== dataLength - 1) return null;
  return <circle cx={cx} cy={cy} r={5} fill="#f97316" stroke="hsl(var(--background))" strokeWidth={2} />;
}

function genBook(upPct: number) {
  const asks: BookRow[] = [];
  const bids: BookRow[] = [];

  for (let i = 0; i < 7; i++) {
    const price = upPct + 1 + i;
    const shares = parseFloat((Math.random() * 200 + 20).toFixed(2));
    asks.push({ price, shares, total: parseFloat(((price * shares) / 100).toFixed(2)) });
  }

  for (let i = 0; i < 7; i++) {
    const price = upPct - 1 - i;
    const shares = parseFloat((Math.random() * 300 + 20).toFixed(2));
    bids.push({ price, shares, total: parseFloat(((price * shares) / 100).toFixed(2)) });
  }

  return { asks: asks.reverse(), bids };
}

function OutcomePanel({ outcome, market }: { outcome: "Up" | "Down"; market: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-6 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
        <CheckCircle2 className="h-8 w-8 text-primary" />
      </div>
      <div className={cn("mb-2 text-lg font-bold", outcome === "Up" ? "text-buy" : "text-sell")}>
        Outcome: {outcome}
      </div>
      <div className="text-xs leading-relaxed text-muted-foreground">{market}</div>
    </div>
  );
}

function CoinBadge({ label = "B", className = "" }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex shrink-0 items-center justify-center rounded-xl bg-orange-500 font-bold text-white", className)}>
      {label}
    </div>
  );
}

type ReferenceLineLabelProps = {
  viewBox?: {
    x?: number;
    y?: number;
    width?: number;
  };
};

function ReferenceLineLabel({
  viewBox,
  value,
  fill,
  background,
}: ReferenceLineLabelProps & {
  value: string;
  fill: string;
  background?: string;
}) {
  if (!viewBox || viewBox.x == null || viewBox.y == null || viewBox.width == null) return null;

  const x = viewBox.x + viewBox.width - 12;
  const y = viewBox.y - 7;
  const labelWidth = Math.max(46, value.length * 7 + 16);

  return (
    <g>
      {background && (
        <rect
          x={x - labelWidth}
          y={y - 15}
          width={labelWidth}
          height={22}
          rx={6}
          fill={background}
          stroke="hsl(var(--border))"
        />
      )}
      <text x={x - 8} y={y} textAnchor="end" fill={fill} fontSize={11} fontWeight={700}>
        {value}
      </text>
    </g>
  );
}

export function PredictionDetailModal({ market, initialSide, onClose }: Props) {
  const navigate = useNavigate();
  const upPct = market.yes;
  const downPct = 100 - upPct;

  const [currentPrice, setCurrentPrice] = useState(PRICE_TO_BEAT - 12);
  const [mins, setMins] = useState(1);
  const [secs, setSecs] = useState(0);
  const [activeTab, setActiveTab] = useState<"Buy" | "Sell">(initialSide === "YES" ? "Buy" : "Sell");
  const [tradeMode, setTradeMode] = useState<"1-Tap" | "Market">("1-Tap");
  const [activeSide, setActiveSide] = useState<"Up" | "Down">(initialSide === "YES" ? "Up" : "Down");
  const [shares, setShares] = useState(0);
  const [relatedTimeframe, setRelatedTimeframe] = useState<(typeof RELATED_TIMEFRAMES)[number]>("5 Min");
  const [activeSlot, setActiveSlot] = useState(TIME_SLOTS[0]);
  const [resolved, setResolved] = useState(false);
  const [orderBookOpen, setOrderBookOpen] = useState(false);
  const [orderBookTab, setOrderBookTab] = useState<"Up" | "Down">("Up");
  const [rulesTab, setRulesTab] = useState<"Rules" | "Market Context">("Rules");

  const idxRef = useRef(CHART_WINDOW);
  const liveVelocityRef = useRef(0);
  const [chartData, setChartData] = useState(() => initChart(PRICE_TO_BEAT - 12, CHART_WINDOW));
  const [book] = useState(() => genBook(upPct));

  useEffect(() => {
    if (resolved) return;

    const t = window.setInterval(() => {
      setCurrentPrice((prev) => {
        liveVelocityRef.current = liveVelocityRef.current * 0.74 + (Math.random() - 0.51) * 0.5;
        const next = parseFloat((prev + liveVelocityRef.current).toFixed(2));
        setChartData((data) => [...data.slice(1), { idx: idxRef.current++, price: next, time: formatChartTime(new Date()) }]);
        return next;
      });

      setSecs((seconds) => {
        if (seconds > 0) return seconds - 1;

        setMins((minutes) => {
          if (minutes > 0) return minutes - 1;
          setResolved(true);
          window.clearInterval(t);
          return 0;
        });

        return 59;
      });
    }, 1000);

    return () => window.clearInterval(t);
  }, [resolved]);

  const goToLiveMarket = () => {
    liveVelocityRef.current = 0;
    setMins(1);
    setSecs(0);
    setResolved(false);
  };

  const priceDiff = currentPrice - PRICE_TO_BEAT;
  const prices = chartData.map((d) => d.price);
  const minP = Math.min(...prices, PRICE_TO_BEAT) - 4;
  const maxP = Math.max(...prices, PRICE_TO_BEAT) + 4;

  const oneTap = useMemo(
    () => [
      { amount: 5, win: activeSide === "Up" ? 11 : 8 },
      { amount: 25, win: Math.max(1, Math.round(25 * (activeSide === "Up" ? upPct / 45 : downPct / 55))) },
      { amount: 100, win: Math.max(1, Math.round(100 * (activeSide === "Up" ? upPct / 45 : downPct / 55))) },
    ],
    [activeSide, downPct, upPct],
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background text-foreground [background:var(--gradient-bg)]">
      <div className="glass-strong flex shrink-0 items-center gap-3 rounded-none border-x-0 border-t-0 px-4 py-3">
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <CoinBadge className="h-10 w-10 text-lg" />
          <div className="min-w-0">
            <div className="truncate text-sm font-bold leading-tight">{market.q}</div>
            <div className="text-xs text-muted-foreground">Ends {market.end} | {market.category}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
          <button aria-label="View embed code" className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted/60 hover:text-foreground"><Code2 className="h-4 w-4" /></button>
          <button aria-label="Copy market link" className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted/60 hover:text-foreground"><Link2 className="h-4 w-4" /></button>
          <button aria-label="Bookmark market" className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted/60 hover:text-foreground"><Bookmark className="h-4 w-4" /></button>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="ml-1 flex h-8 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Preview prediction orders"
              >
                <ClipboardList className="h-4 w-4" />
                Orders
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              side="bottom"
              sideOffset={8}
              collisionPadding={12}
              className="w-[min(92vw,460px)] overflow-hidden rounded-xl border-border/60 bg-card/95 p-0 text-foreground shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
                <div className="text-sm font-semibold">
                  Open Predictions ({predictionOrders.filter(order => order.status === "Open").length})
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/prediction/orders")}
                  className="flex items-center gap-1 text-sm font-semibold transition-colors hover:text-primary"
                >
                  View All
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="divide-y divide-border/30">
                {predictionOrders.slice(0, 3).map(order => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => navigate("/prediction/orders")}
                    className="w-full px-4 py-3 text-left transition-colors hover:bg-muted/30"
                  >
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={predictionSidePillClass(order.side)}>{order.side}</span>
                        <span className="truncate text-xs font-semibold">{order.market}</span>
                      </div>
                      <span className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold",
                        predictionStatusClass(order.status),
                      )}>
                        {order.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <span className="font-mono text-muted-foreground">{order.id}</span>
                      <span className="text-right font-mono">{order.price}c | {order.shares.toFixed(2)} shares</span>
                      <span className="text-muted-foreground">{order.date}</span>
                      <span className="text-right font-mono">${order.cost.toFixed(2)}</span>
                    </div>
                  </button>
                  ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto border-r border-border/60 bg-background/35 backdrop-blur-sm">
          <div className="flex shrink-0 items-start gap-8 px-6 pb-3 pt-5">
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">Price To Beat</div>
              <div className="text-2xl font-bold tabular-nums">${PRICE_TO_BEAT.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
            </div>
            <div>
              <div className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                Current Price
                <span className={cn("ml-1 font-bold", priceDiff < 0 ? "text-sell" : "text-buy")}>
                  {priceDiff < 0 ? "Down" : "Up"} ${Math.abs(priceDiff).toFixed(2)}
                </span>
              </div>
              <div className="text-2xl font-bold tabular-nums text-orange-500">
                ${currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="ml-auto shrink-0 text-right">
              <div className={cn("font-bold leading-none tracking-tight tabular-nums", resolved ? "text-muted-foreground text-4xl" : "text-sell text-5xl")}>
                {String(mins).padStart(2, "0")}
                <span className="text-foreground/50">:</span>
                {String(secs).padStart(2, "0")}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                {resolved ? "Resolved" : "Mins : Secs"}
              </div>
            </div>
          </div>

          <div className="relative shrink-0" style={{ height: 300 }}>
            {resolved && (
              <div className="absolute inset-0 z-10 flex items-center justify-end pr-6">
                <button
                  type="button"
                  onClick={goToLiveMarket}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-sm transition-colors hover:bg-muted hover:text-primary"
                >
                  <span className="h-2 w-2 rounded-full bg-sell" />
                  Go to live market
                </button>
              </div>
            )}
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 16, right: 86, bottom: 30, left: 18 }}>
                <CartesianGrid
                  horizontal
                  vertical={false}
                  stroke="hsl(var(--border))"
                  strokeOpacity={0.65}
                  strokeDasharray="0"
                />
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={42}
                  padding={{ left: 28, right: 28 }}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  domain={[minP, maxP]}
                  orientation="right"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickCount={6}
                  tickFormatter={(v) => `$${Number(v).toFixed(0)}`}
                  tickLine={false}
                  width={62}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    color: "hsl(var(--foreground))",
                    fontSize: 11,
                  }}
                  formatter={(v: number) => [`$${v.toFixed(2)}`, "Price"]}
                  labelFormatter={() => ""}
                />
                <ReferenceLine
                  y={PRICE_TO_BEAT}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="6 4"
                  strokeWidth={1.4}
                  label={(props: ReferenceLineLabelProps) => (
                    <ReferenceLineLabel {...props} value="Target" fill="hsl(var(--muted-foreground))" />
                  )}
                />
                <ReferenceLine
                  y={currentPrice}
                  stroke="#f97316"
                  strokeDasharray="3 4"
                  strokeWidth={1.2}
                  label={(props: ReferenceLineLabelProps) => (
                    <ReferenceLineLabel
                      {...props}
                      value={`$${currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      fill="#f97316"
                      background="hsl(var(--card))"
                    />
                  )}
                />
                <Line
                  dataKey="price"
                  dot={<LiveDot dataLength={chartData.length} />}
                  isAnimationActive={false}
                  stroke="#f97316"
                  strokeWidth={2.6}
                  type="natural"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-y border-border/40 px-5 py-3 scrollbar-none">
            <button className="flex shrink-0 items-center gap-1 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-muted/50">
              Past <ChevronDown className="h-3 w-3" />
            </button>
            <div className="flex shrink-0 gap-1">
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-buy/40 bg-buy/20"><TrendingUp className="h-3 w-3 text-buy" /></span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-sell/40 bg-sell/20"><TrendingDown className="h-3 w-3 text-sell" /></span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-buy/40 bg-buy/20"><TrendingUp className="h-3 w-3 text-buy" /></span>
            </div>
            {TIME_SLOTS.map((slot) => (
              <button
                key={slot}
                onClick={() => setActiveSlot(slot)}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition-all",
                  activeSlot === slot
                    ? "border-foreground bg-foreground font-semibold text-background"
                    : "border-border/60 bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                {activeSlot === slot && <span className="h-1.5 w-1.5 rounded-full bg-sell" />}
                {slot}
              </button>
            ))}
            <button className="ml-auto flex shrink-0 items-center gap-1 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-muted/50">
              More <ChevronDown className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-5 p-5">
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card/70">
              <button
                onClick={() => setOrderBookOpen((open) => !open)}
                className="flex w-full items-center justify-between px-4 py-4 transition-colors hover:bg-muted/30"
              >
                <span className="flex items-center gap-2 text-sm font-bold">
                  <BookOpen className="h-4 w-4" /> Order Book
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  $0 Vol.
                  <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", orderBookOpen && "rotate-180")} />
                </span>
              </button>

              {orderBookOpen && (
                <div className="border-t border-border/50">
                  <div className="flex items-center justify-between gap-3 bg-muted/20 px-4 py-2">
                    <div className="flex gap-4">
                      {(["Up", "Down"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setOrderBookTab(tab)}
                          className={cn("text-sm font-semibold transition-colors", orderBookTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
                        >
                          Trade {tab}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-warning">Maker Rebate</span>
                      <span className="text-xs text-buy">+ Rewards</span>
                      <button className="text-muted-foreground transition-colors hover:text-foreground"><RefreshCw className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>

                  <div className="grid grid-cols-[90px_1fr_1fr_1fr] border-t border-border/40 bg-muted/10 px-4 py-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Trade {orderBookTab}</span>
                    <span className="text-center text-[10px] uppercase tracking-wider text-muted-foreground">Price</span>
                    <span className="text-center text-[10px] uppercase tracking-wider text-muted-foreground">Shares</span>
                    <span className="text-right text-[10px] uppercase tracking-wider text-muted-foreground">Total</span>
                  </div>

                  {(orderBookTab === "Up" ? book.asks : book.asks.map((a) => ({ ...a, price: 100 - a.price }))).map((row, i) => (
                    <BookRow key={`ask-${i}`} row={row} tone="sell" maxShares={300} />
                  ))}

                  <div className="flex items-center justify-between border-t border-border/40 bg-muted/10 px-4 py-2">
                    <span className="rounded bg-sell px-1.5 py-0.5 text-[10px] font-bold text-white">Asks</span>
                    <span className="text-[10px] text-muted-foreground">
                      Last: <span className="font-semibold text-foreground">{upPct}c</span>
                      <span className="mx-3">|</span>
                      Spread: <span className="font-semibold text-foreground">1c</span>
                    </span>
                  </div>

                  {(orderBookTab === "Up" ? book.bids : book.bids.map((b) => ({ ...b, price: 100 - b.price }))).map((row, i) => (
                    <BookRow key={`bid-${i}`} row={row} tone="buy" maxShares={400} />
                  ))}

                  <div className="border-t border-border/40 bg-muted/10 px-4 py-2">
                    <span className="rounded bg-buy px-1.5 py-0.5 text-[10px] font-bold text-white">Bids</span>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border/60 bg-card/70 p-4">
              <div className="mb-3 flex gap-5">
                {(["Rules", "Market Context"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setRulesTab(tab)}
                    className={cn(
                      "border-b-2 pb-1 text-sm font-bold transition-colors",
                      rulesTab === tab ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              {rulesTab === "Rules" ? (
                <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                  <p>
                    This market resolves to <strong className="text-foreground">Up</strong> if the selected asset price at the end of the time range is greater than or equal to the price at the beginning. Otherwise, it resolves to <strong className="text-foreground">Down</strong>.
                  </p>
                  <p>
                    The reference price is based on a market data feed for the underlying asset. This market is about the feed price, not any single exchange spot price.
                  </p>
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Short-duration markets are sensitive to liquidity, spread, and volatility. Watch the target line, latest tick, and order book depth before placing a prediction.
                </p>
              )}
            </div>
          </div>
        </div>

        <aside className="w-[360px] shrink-0 overflow-y-auto bg-card/45 p-5 backdrop-blur-xl">
          <div className="glass-strong rounded-2xl border border-border/70 p-4 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <CoinBadge className="h-11 w-11 text-xl" />
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{market.q}</div>
                <div className={cn("mt-0.5 text-xs font-bold", activeSide === "Up" ? "text-buy" : "text-sell")}>{activeSide}</div>
              </div>
            </div>

            {resolved ? (
              <OutcomePanel outcome={activeSide} market={market.q} />
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex gap-3">
                    {(["Buy", "Sell"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => {
                          setActiveTab(tab);
                          setTradeMode(tab === "Buy" ? "1-Tap" : "Market");
                        }}
                        className={cn(
                          "border-b-2 pb-1 text-sm font-bold transition-colors",
                          activeTab === tab ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setTradeMode((mode) => (mode === "1-Tap" ? "Market" : "1-Tap"))}
                    className="flex items-center gap-1 rounded-full border border-border/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  >
                    {tradeMode} <ChevronDown className="h-3 w-3" />
                  </button>
                </div>

                <div className="mb-5 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setActiveSide("Up")}
                    className={cn(
                      "h-9 rounded-md border text-xs font-bold transition-all",
                      activeSide === "Up" ? "border-buy bg-buy text-white" : "border-border/60 bg-muted/30 text-muted-foreground hover:border-buy/60 hover:text-foreground",
                    )}
                  >
                    Up {upPct}c
                  </button>
                  <button
                    onClick={() => setActiveSide("Down")}
                    className={cn(
                      "h-9 rounded-md border text-xs font-bold transition-all",
                      activeSide === "Down" ? "border-sell bg-sell text-white" : "border-border/60 bg-muted/30 text-muted-foreground hover:border-sell/60 hover:text-foreground",
                    )}
                  >
                    Down {downPct}c
                  </button>
                </div>

                {tradeMode === "1-Tap" ? (
                  <>
                    <div className="mb-2 text-sm font-bold text-muted-foreground">One-tap buy</div>
                    <div className="grid grid-cols-3 gap-2">
                      {oneTap.map((opt) => (
                        <button key={opt.amount} className="rounded-xl border border-border/70 bg-background/40 p-3 text-center transition-all hover:border-primary/50 hover:bg-primary/5">
                          <div className="text-lg font-bold">${opt.amount}</div>
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            win <span className="font-bold text-buy">${opt.win}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-2 text-sm font-bold text-muted-foreground">Shares</div>
                    <div className="mb-3 flex items-center rounded-lg border border-border/70 bg-background/50 px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={shares || ""}
                        onChange={(event) => setShares(Number(event.target.value))}
                        placeholder="0"
                        className="w-full bg-transparent text-sm font-semibold outline-none"
                      />
                    </div>
                    <div className="mb-3 flex gap-2">
                      {[25, 50, 75, "Max"].map((value) => (
                        <button
                          key={value}
                          onClick={() => setShares(value === "Max" ? 100 : Number(value))}
                          className="flex-1 rounded-full border border-border/70 py-1 text-xs transition-all hover:border-primary/50 hover:text-primary"
                        >
                          {value}{value !== "Max" ? "%" : ""}
                        </button>
                      ))}
                    </div>
                    <Button className="w-full bg-gradient-primary font-bold text-primary-foreground">Trade</Button>
                  </>
                )}
              </>
            )}

            <div className="mt-5 border-t border-border/60 pt-4 text-center text-[10px] text-muted-foreground">
              By trading, you agree to the <span className="cursor-pointer text-primary underline">Terms of Use</span>.
            </div>
          </div>

          <div className="mt-5 border-t border-border/60 pt-5">
            <div className="mb-3 flex gap-2">
              {RELATED_TIMEFRAMES.map((timeframe) => (
                <button
                  key={timeframe}
                  onClick={() => setRelatedTimeframe(timeframe)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                    relatedTimeframe === timeframe ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  {timeframe}
                </button>
              ))}
            </div>
            <div className="space-y-1">
              {RELATED.map((item) => (
                <button key={item.name} className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-muted/50">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white", item.color)}>
                    {item.coin[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold">{item.name} - {relatedTimeframe}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="h-2 w-2 rounded-full bg-sell" />
                      <span className="text-base font-bold">{item.pct}%</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">Up</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function BookRow({ row, tone, maxShares }: { row: BookRow; tone: "buy" | "sell"; maxShares: number }) {
  return (
    <div className="relative grid grid-cols-[90px_1fr_1fr_1fr] items-center overflow-hidden px-4 py-1.5 transition-colors hover:bg-muted/20">
      <div
        className={cn("pointer-events-none absolute left-0 top-0 h-full", tone === "buy" ? "bg-buy/10" : "bg-sell/10")}
        style={{ width: `${Math.min(100, (row.shares / maxShares) * 100)}%` }}
      />
      <span />
      <span className={cn("relative z-10 text-center text-xs font-semibold tabular-nums", tone === "buy" ? "text-buy" : "text-sell")}>
        {row.price}c
      </span>
      <span className="relative z-10 text-center text-xs tabular-nums">{row.shares.toFixed(2)}</span>
      <span className="relative z-10 text-right text-xs tabular-nums">${row.total.toFixed(2)}</span>
    </div>
  );
}
