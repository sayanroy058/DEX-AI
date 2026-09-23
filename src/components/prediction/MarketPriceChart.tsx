import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Info, Radio } from "lucide-react";
import { Tooltip as HelpTooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatPredictionCurrency, type PredictionMarket } from "@/lib/predictionMarkets";

export function MarketPriceChart({ market, live = false }: { market: PredictionMarket; live?: boolean }) {
  const history = market.priceHistory ?? [];
  if (history.length === 0 || market.referencePrice === undefined) {
    return (
      <section className="glass flex min-h-72 items-center justify-center rounded-xl p-6 text-center" aria-label="Underlying price chart unavailable">
        <div><Activity className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><h2 className="font-semibold">No underlying price chart</h2><p className="mt-1 max-w-sm text-xs text-muted-foreground">This event resolves from an official outcome rather than an asset price.</p></div>
      </section>
    );
  }

  const chartData = history.map((point) => ({ ...point, label: new Date(point.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }));
  const prices = chartData.map((point) => point.price).concat(market.referencePrice);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const padding = Math.max((max - min) * 0.2, max * 0.00005);
  const currentPrice = market.currentPrice ?? history.at(-1)?.price ?? 0;
  const positive = currentPrice >= market.referencePrice;
  const gradientId = `prediction-price-${market.id}`;
  const renderEndpoint = ({ cx, cy, index }: { cx?: number; cy?: number; index?: number }) => {
    if (index !== chartData.length - 1 || cx === undefined || cy === undefined) return <></>;
    return <circle cx={cx} cy={cy} r={5.5} fill="hsl(var(--primary))" stroke="hsl(var(--card))" strokeWidth={3} className="pointer-events-none drop-shadow-sm" />;
  };

  return (
    <section className="glass overflow-hidden rounded-xl" aria-labelledby="underlying-chart-title">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div><div className="flex items-center gap-1.5"><h2 id="underlying-chart-title" className="font-semibold">{market.symbol} underlying price</h2>{live && <span className="inline-flex items-center gap-1 rounded-full bg-sell/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sell"><Radio className="h-2.5 w-2.5 fill-current" />Live demo</span>}<HelpTooltip><TooltipTrigger asChild><button type="button" aria-label="About this chart" className="text-muted-foreground hover:text-primary"><Info className="h-3.5 w-3.5" /></button></TooltipTrigger><TooltipContent className="max-w-xs text-xs">This line is the underlying asset price. It is separate from the outcome contract prices.</TooltipContent></HelpTooltip></div><p className="mt-0.5 text-[10px] text-muted-foreground">Simulated price updates every second · Target line marks the Price to Beat</p></div>
        <div className={`text-right font-mono ${positive ? "text-buy" : "text-sell"}`}><div className="text-sm font-bold">{formatPredictionCurrency(currentPrice)}</div><div className="text-[10px]">{positive ? "Above" : "Below"} target</div></div>
      </div>
      <div className="h-72 w-full p-2 sm:h-80 sm:p-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 12, right: 12, left: 2, bottom: 2 }}>
            <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={36} />
            <YAxis domain={[min - padding, max + padding]} orientation="right" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value: number) => value.toLocaleString(undefined, { maximumFractionDigits: value < 10 ? 4 : 2 })} width={70} />
            <Tooltip cursor={{ stroke: "hsl(var(--primary))", strokeOpacity: 0.35 }} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(value: number) => [formatPredictionCurrency(Number(value), Number(value) < 10 ? 4 : 2), market.symbol ?? "Price"]} />
            <ReferenceLine y={currentPrice} stroke={positive ? "hsl(var(--buy))" : "hsl(var(--sell))"} strokeWidth={1.5} strokeDasharray="2 4" label={{ value: `Current ${formatPredictionCurrency(currentPrice)}`, position: "insideTopRight", fill: positive ? "hsl(var(--buy))" : "hsl(var(--sell))", fontSize: 10 }} />
            <ReferenceLine y={market.referencePrice} stroke="hsl(var(--warning))" strokeDasharray="5 5" label={{ value: `Target ${formatPredictionCurrency(market.referencePrice)}`, position: "insideBottomRight", fill: "hsl(var(--warning))", fontSize: 10 }} />
            <Area type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} fill={`url(#${gradientId})`} dot={renderEndpoint} activeDot={{ r: 5.5, fill: "hsl(var(--primary))", stroke: "hsl(var(--card))", strokeWidth: 3 }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
