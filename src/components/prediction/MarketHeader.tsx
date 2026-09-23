import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bookmark, Check, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatPredictionDate, type PredictionMarket } from "@/lib/predictionMarkets";

export function MarketHeader({ market, closed }: { market: PredictionMarket; closed: boolean }) {
  const [bookmarked, setBookmarked] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Market link copied");
    } catch {
      toast.error("Could not copy the market link");
    }
  };

  return (
    <header className="space-y-4">
      <Link to="/prediction" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" /> All prediction markets</Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-12 min-w-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 px-2 font-mono text-sm font-bold text-primary shadow-[0_0_20px_hsl(var(--primary)/0.12)] sm:h-14 sm:min-w-14">{market.icon}</div>
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={closed ? "border-sell/30 bg-sell/10 text-sell" : "border-buy/30 bg-buy/10 text-buy"}>{closed ? (market.status === "RESOLVED" ? "Resolved" : "Closed") : "Live"}</Badge>
              {market.interval && <span className="text-xs text-muted-foreground">{market.interval}</span>}
            </div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">{market.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{formatPredictionDate(market.startTime)} — {formatPredictionDate(market.endTime)}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Copy market link" title="Copy market link" onClick={copyLink}><Copy className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" aria-label="Share market" title="Share market" onClick={copyLink}><Share2 className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" aria-label={bookmarked ? "Remove bookmark" : "Bookmark market"} title="Bookmark market" onClick={() => setBookmarked((value) => !value)}>
            {bookmarked ? <Check className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
