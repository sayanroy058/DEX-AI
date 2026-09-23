import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCountdownParts } from "@/lib/predictionMarkets";

const two = (value: number) => String(value).padStart(2, "0");

export function CountdownTimer({ endTime, compact = false }: { endTime: string; compact?: boolean }) {
  const [countdown, setCountdown] = useState(() => getCountdownParts(endTime));

  useEffect(() => {
    const update = () => setCountdown(getCountdownParts(endTime));
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [endTime]);

  if (countdown.expired) {
    return <span className="inline-flex items-center gap-1.5 font-medium text-sell"><Clock3 className="h-3.5 w-3.5" /> Closed</span>;
  }

  if (compact) {
    const value = countdown.days > 0
      ? `${countdown.days}d ${two(countdown.hours)}h`
      : countdown.hours > 0
        ? `${two(countdown.hours)}:${two(countdown.minutes)}:${two(countdown.seconds)}`
        : `${two(countdown.minutes)}:${two(countdown.seconds)}`;
    return <span className="font-mono tabular-nums">{value}</span>;
  }

  const units = countdown.days > 0
    ? [[countdown.days, "DAYS"], [countdown.hours, "HRS"], [countdown.minutes, "MIN"]]
    : countdown.hours > 0
      ? [[countdown.hours, "HRS"], [countdown.minutes, "MIN"], [countdown.seconds, "SEC"]]
      : [[countdown.minutes, "MIN"], [countdown.seconds, "SEC"]];

  return (
    <div className={cn("flex items-end gap-2", countdown.days === 0 && countdown.hours === 0 && "text-warning")} aria-label="Time remaining">
      {units.map(([value, label], index) => (
        <div key={String(label)} className="flex items-end gap-2">
          {index > 0 && <span className="pb-4 text-lg text-muted-foreground">:</span>}
          <div className="text-center">
            <div className="font-mono text-2xl font-bold leading-none sm:text-3xl">{two(Number(value))}</div>
            <div className="mt-1 text-[9px] font-semibold tracking-widest text-muted-foreground">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
