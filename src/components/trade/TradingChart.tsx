import { useEffect, useRef, useState } from "react";
import { generateCandles } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import {
  Activity, BarChart3, CandlestickChart, Maximize2, Pencil, Settings2,
  MousePointer2, Crosshair, Minus, TrendingUp as TrendUp, Type, Square as SquareIcon, Triangle, Ruler, Eraser, LayoutGrid
} from "lucide-react";
import { cn } from "@/lib/utils";

const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "1D", "1W"];
const INDICATORS = ["MA", "EMA", "RSI", "MACD", "BB", "Vol"];

const TOOLS = [
  { id: "cursor", icon: MousePointer2, label: "Cursor" },
  { id: "cross", icon: Crosshair, label: "Crosshair" },
  { id: "trend", icon: TrendUp, label: "Trendline" },
  { id: "hline", icon: Minus, label: "Horizontal" },
  { id: "rect", icon: SquareIcon, label: "Rectangle" },
  { id: "fib", icon: Triangle, label: "Fibonacci" },
  { id: "ruler", icon: Ruler, label: "Measure" },
  { id: "text", icon: Type, label: "Text" },
  { id: "erase", icon: Eraser, label: "Clear" },
];

type Tool = typeof TOOLS[number]["id"];
type Drawing =
  | { tool: "trend"; x1: number; y1: number; x2: number; y2: number }
  | { tool: "hline"; y: number }
  | { tool: "rect"; x1: number; y1: number; x2: number; y2: number }
  | { tool: "fib"; y1: number; y2: number }
  | { tool: "ruler"; x1: number; y1: number; x2: number; y2: number };

function ChartPane({ symbol, price, indicators }: { symbol: string; price: number; indicators: string[] }) {
  const [candles, setCandles] = useState(() => generateCandles(price, 80));
  const [tool, setTool] = useState<Tool>("cursor");
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [draft, setDraft] = useState<Drawing | null>(null);
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCandles(prev => {
      const next = [...prev];
      const last = { ...next[next.length - 1] };
      last.c = price;
      last.h = Math.max(last.h, price);
      last.l = Math.min(last.l, price);
      next[next.length - 1] = last;
      return next;
    });
  }, [price]);

  useEffect(() => {
    const id = setInterval(() => {
      setCandles(prev => {
        const last = prev[prev.length - 1];
        return [...prev.slice(1), { t: Date.now(), o: last.c, h: last.c, l: last.c, c: last.c, v: Math.random() * 100 }];
      });
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  // draw
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const W = rect.width;
    const H = rect.height;
    const padL = 4, padR = 56, padT = 8, padB = 22;
    const chartW = W - padL - padR;
    const volH = indicators.includes("Vol") ? 36 : 0;
    const chartH = H - padT - padB - volH;

    const prices = candles.flatMap(c => [c.h, c.l]);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const rangeP = (maxP - minP) || 1;
    const padPrice = rangeP * 0.08;
    const yMin = minP - padPrice;
    const yMax = maxP + padPrice;
    const yRange = yMax - yMin;

    const candleW = chartW / candles.length;
    const bodyW = Math.max(candleW * 0.65, 1);

    // grid
    ctx.strokeStyle = "hsl(230 25% 18% / 0.6)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 6; i++) {
      const y = padT + (chartH / 6) * i;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
    }
    for (let i = 0; i <= 8; i++) {
      const x = padL + (chartW / 8) * i;
      ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + chartH); ctx.stroke();
    }

    ctx.fillStyle = "hsl(220 15% 60%)";
    ctx.font = "9px JetBrains Mono";
    for (let i = 0; i <= 6; i++) {
      const y = padT + (chartH / 6) * i;
      const p = yMax - (yRange / 6) * i;
      ctx.fillText(p.toFixed(p < 1 ? 4 : 2), W - padR + 4, y + 3);
    }

    if (indicators.includes("MA")) {
      const period = 20;
      ctx.strokeStyle = "hsl(186 100% 55%)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      candles.forEach((_, i) => {
        if (i < period) return;
        const slice = candles.slice(i - period, i);
        const ma = slice.reduce((s, c) => s + c.c, 0) / period;
        const x = padL + i * candleW + candleW / 2;
        const y = padT + ((yMax - ma) / yRange) * chartH;
        if (i === period) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    candles.forEach((c, i) => {
      const x = padL + i * candleW + candleW / 2;
      const isUp = c.c >= c.o;
      const color = isUp ? "hsl(145 85% 50%)" : "hsl(350 90% 60%)";
      const yO = padT + ((yMax - c.o) / yRange) * chartH;
      const yC = padT + ((yMax - c.c) / yRange) * chartH;
      const yH = padT + ((yMax - c.h) / yRange) * chartH;
      const yL = padT + ((yMax - c.l) / yRange) * chartH;
      ctx.strokeStyle = color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, yH); ctx.lineTo(x, yL); ctx.stroke();
      ctx.fillStyle = color;
      const bodyTop = Math.min(yO, yC);
      const bodyH = Math.max(Math.abs(yC - yO), 1);
      ctx.fillRect(x - bodyW / 2, bodyTop, bodyW, bodyH);
    });

    if (indicators.includes("Vol") && volH > 0) {
      const maxV = Math.max(...candles.map(c => c.v));
      const volTop = padT + chartH + 4;
      candles.forEach((c, i) => {
        const x = padL + i * candleW;
        const h = (c.v / maxV) * (volH - 4);
        const isUp = c.c >= c.o;
        ctx.fillStyle = isUp ? "hsl(145 85% 50% / 0.4)" : "hsl(350 90% 60% / 0.4)";
        ctx.fillRect(x + (candleW - bodyW) / 2, volTop + (volH - 4 - h), bodyW, h);
      });
    }

    // live price line
    const yPrice = padT + ((yMax - price) / yRange) * chartH;
    ctx.strokeStyle = "hsl(186 100% 55%)";
    ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(padL, yPrice); ctx.lineTo(W - padR, yPrice); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "hsl(186 100% 55%)";
    ctx.fillRect(W - padR + 2, yPrice - 7, padR - 4, 14);
    ctx.fillStyle = "hsl(230 30% 6%)";
    ctx.font = "bold 9px JetBrains Mono";
    ctx.fillText(price.toFixed(price < 1 ? 4 : 2), W - padR + 5, yPrice + 3);

    // drawings
    const drawShape = (d: Drawing, color = "hsl(265 85% 65%)") => {
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash([]);
      if (d.tool === "trend" || d.tool === "ruler") {
        ctx.beginPath(); ctx.moveTo(d.x1, d.y1); ctx.lineTo(d.x2, d.y2); ctx.stroke();
        if (d.tool === "ruler") {
          ctx.fillStyle = color; ctx.font = "10px JetBrains Mono";
          const dy = d.y2 - d.y1;
          const pct = ((-dy / chartH) * yRange / price * 100).toFixed(2);
          ctx.fillText(`${pct}%`, d.x2 + 4, d.y2);
        }
      } else if (d.tool === "hline") {
        ctx.beginPath(); ctx.moveTo(padL, d.y); ctx.lineTo(W - padR, d.y); ctx.stroke();
      } else if (d.tool === "rect") {
        ctx.strokeRect(d.x1, d.y1, d.x2 - d.x1, d.y2 - d.y1);
        ctx.fillStyle = "hsl(265 85% 65% / 0.1)";
        ctx.fillRect(d.x1, d.y1, d.x2 - d.x1, d.y2 - d.y1);
      } else if (d.tool === "fib") {
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        levels.forEach((lv, i) => {
          const y = d.y1 + (d.y2 - d.y1) * lv;
          ctx.strokeStyle = `hsl(${40 + i * 20} 90% 60% / 0.7)`;
          ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
          ctx.fillStyle = `hsl(${40 + i * 20} 90% 60%)`;
          ctx.font = "9px JetBrains Mono";
          ctx.fillText(lv.toFixed(3), padL + 4, y - 2);
        });
      }
    };
    drawings.forEach(d => drawShape(d));
    if (draft) drawShape(draft, "hsl(186 100% 55%)");

    // crosshair
    if ((tool === "cross" || tool === "cursor") && mouse) {
      ctx.strokeStyle = "hsl(220 15% 50% / 0.6)";
      ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(mouse.x, padT); ctx.lineTo(mouse.x, padT + chartH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(padL, mouse.y); ctx.lineTo(W - padR, mouse.y); ctx.stroke();
      ctx.setLineDash([]);
      const py = yMax - ((mouse.y - padT) / chartH) * yRange;
      ctx.fillStyle = "hsl(230 35% 12%)";
      ctx.fillRect(W - padR + 2, mouse.y - 7, padR - 4, 14);
      ctx.strokeStyle = "hsl(186 100% 55%)";
      ctx.strokeRect(W - padR + 2, mouse.y - 7, padR - 4, 14);
      ctx.fillStyle = "hsl(186 100% 55%)";
      ctx.font = "bold 9px JetBrains Mono";
      ctx.fillText(py.toFixed(py < 1 ? 4 : 2), W - padR + 5, mouse.y + 3);
    }
  }, [candles, price, indicators, drawings, draft, mouse, tool]);

  const getPos = (e: React.MouseEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getPos(e);
    if (tool === "hline") {
      setDrawings(d => [...d, { tool: "hline", y }]);
    } else if (tool === "trend" || tool === "rect" || tool === "fib" || tool === "ruler") {
      const t = tool;
      if (t === "fib") setDraft({ tool: "fib", y1: y, y2: y });
      else setDraft({ tool: t, x1: x, y1: y, x2: x, y2: y } as Drawing);
    } else if (tool === "erase") {
      setDrawings([]);
    }
  };
  const onMouseMove = (e: React.MouseEvent) => {
    const p = getPos(e);
    setMouse(p);
    if (!draft) return;
    if (draft.tool === "fib") setDraft({ ...draft, y2: p.y });
    else if ("x1" in draft) setDraft({ ...draft, x2: p.x, y2: p.y });
  };
  const onMouseUp = () => {
    if (draft) { setDrawings(d => [...d, draft]); setDraft(null); }
  };
  const onMouseLeave = () => { setMouse(null); if (draft) { setDrawings(d => [...d, draft]); setDraft(null); } };

  return (
    <div className="relative h-full flex flex-col">
      {/* Drawing toolbar */}
      <div className="absolute left-1 top-1 z-10 glass-strong rounded-lg p-1 flex flex-col gap-0.5">
        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            title={t.label}
            className={cn(
              "h-6 w-6 rounded flex items-center justify-center transition-colors",
              tool === t.id ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            <t.icon className="h-3 w-3" />
          </button>
        ))}
      </div>
      <div className="absolute top-1 right-1 z-10 text-[10px] glass-strong px-2 py-0.5 rounded font-mono flex items-center gap-1">
        <span className="font-bold">{symbol}</span>
        <span className="text-primary">{price.toFixed(price < 1 ? 4 : 2)}</span>
      </div>
      <div ref={containerRef} className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className={cn("absolute inset-0", tool === "cursor" ? "cursor-default" : "cursor-crosshair")}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
        />
      </div>
    </div>
  );
}

const LAYOUTS = [
  { id: "1", label: "1", cols: 1, rows: 1 },
  { id: "2v", label: "2 ↔", cols: 2, rows: 1 },
  { id: "2h", label: "2 ↕", cols: 1, rows: 2 },
  { id: "4", label: "4", cols: 2, rows: 2 },
  { id: "6", label: "6", cols: 3, rows: 2 },
];

export function TradingChart({ symbol, price }: { symbol: string; price: number }) {
  const [tf, setTf] = useState("15m");
  const [activeIndicators, setActiveIndicators] = useState<string[]>(["MA", "Vol"]);
  const [layoutId, setLayoutId] = useState("1");
  const layout = LAYOUTS.find(l => l.id === layoutId)!;
  const panes = layout.cols * layout.rows;

  return (
    <div className="glass rounded-xl flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border/50 flex-wrap">
        <div className="flex items-center gap-1 mr-2">
          {TIMEFRAMES.map(t => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className={cn(
                "px-2 py-1 text-xs font-medium rounded transition-colors",
                tf === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-border mx-1" />

        <div className="flex items-center gap-1">
          {INDICATORS.map(ind => {
            const active = activeIndicators.includes(ind);
            return (
              <button
                key={ind}
                onClick={() => setActiveIndicators(p => active ? p.filter(i => i !== ind) : [...p, ind])}
                className={cn(
                  "px-2 py-1 text-[10px] font-medium rounded border transition-all",
                  active ? "bg-secondary/15 text-secondary border-secondary/40"
                         : "border-border/50 text-muted-foreground hover:text-foreground"
                )}
              >
                {ind}
              </button>
            );
          })}
        </div>

        <div className="h-4 w-px bg-border mx-1" />

        {/* Layout */}
        <LayoutGrid className="h-3 w-3 text-muted-foreground" />
        <div className="flex items-center gap-1">
          {LAYOUTS.map(l => (
            <button
              key={l.id}
              onClick={() => setLayoutId(l.id)}
              className={cn(
                "px-2 py-1 text-[10px] font-medium rounded transition-colors",
                layoutId === l.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <Button variant="ghost" size="icon" className="h-7 w-7"><CandlestickChart className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7"><BarChart3 className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7"><Settings2 className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7"><Maximize2 className="h-3.5 w-3.5" /></Button>
        <span className="ml-2 flex items-center gap-1 text-[10px] text-primary"><Activity className="h-3 w-3 animate-pulse" /> Live</span>
      </div>

      <div
        className="flex-1 grid gap-1 p-1 min-h-0"
        style={{
          gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: panes }).map((_, i) => (
          <div key={i} className="glass-strong rounded-lg overflow-hidden border border-border/40 min-h-0">
            <ChartPane symbol={symbol} price={price} indicators={activeIndicators} />
          </div>
        ))}
      </div>
    </div>
  );
}
