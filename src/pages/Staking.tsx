import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coins, Loader2, Lock, TrendingUp, Unlock } from "lucide-react";
import { wallet, useWallet } from "@/lib/useWallet";
import { getStakingHistory, getStakingPositions, redeemStake, stakeBI2X, type StakingEvent, type StakingPosition } from "@/lib/apiClient";
import { estimateAccruedInterest, estimateCurrentValue, rawToHuman } from "@/lib/stakingMath";
import { cn } from "@/lib/utils";

const APR_PCT = 5; // fixed product APR, matches the backend's aprBps=500 default

function formatBI2X(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

export default function Staking() {
  const walletState = useWallet();
  const [positions, setPositions] = useState<StakingPosition[]>([]);
  const [events, setEvents] = useState<StakingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [stakeAmount, setStakeAmount] = useState("");
  const [staking, setStaking] = useState(false);
  const [stakeError, setStakeError] = useState("");
  const [stakeMessage, setStakeMessage] = useState("");

  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [redeemAmounts, setRedeemAmounts] = useState<Record<string, string>>({});
  const [redeemError, setRedeemError] = useState<Record<string, string>>({});

  // Re-render once a second while any position is active, purely so the
  // live accrued-interest estimate visibly ticks up — this is a display-
  // only clock, it never calls the backend (see stakingMath.ts's doc
  // comment: the backend recalculates authoritatively at redeem time).
  const [, setTick] = useState(0);

  const bi2xBalance = walletState.balances.find((b) => b.asset === "BI2X")?.available ?? 0;

  const load = () =>
    Promise.all([getStakingPositions(), getStakingHistory()])
      .then(([positionsRes, historyRes]) => {
        setPositions(positionsRes.positions ?? []);
        setEvents(historyRes.events ?? []);
      })
      .catch(() => setError("Could not load your staking positions."));

  useEffect(() => {
    document.title = "BI2X Staking | BitDx";
    load().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!positions.some((p) => p.status === "active")) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [positions]);

  const submitStake = async (event: FormEvent) => {
    event.preventDefault();
    setStakeError("");
    setStakeMessage("");
    const amount = stakeAmount.trim();
    if (!amount || Number(amount) <= 0) {
      setStakeError("Enter an amount greater than 0.");
      return;
    }
    if (Number(amount) > bi2xBalance) {
      setStakeError("Amount exceeds your available BI2X balance.");
      return;
    }
    setStaking(true);
    try {
      await stakeBI2X(amount);
      setStakeAmount("");
      setStakeMessage(`Staked ${formatBI2X(Number(amount))} BI2X.`);
      await Promise.all([load(), wallet.refreshBalances()]);
    } catch (err) {
      setStakeError(err instanceof Error ? err.message : "Could not stake this amount.");
    } finally {
      setStaking(false);
    }
  };

  const submitRedeem = async (position: StakingPosition, full: boolean) => {
    setRedeemError((e) => ({ ...e, [position.id]: "" }));
    const principal = rawToHuman(position.principalRaw);
    const amountInput = redeemAmounts[position.id]?.trim();
    let amount: string | undefined;
    if (!full) {
      if (!amountInput || Number(amountInput) <= 0) {
        setRedeemError((e) => ({ ...e, [position.id]: "Enter an amount greater than 0." }));
        return;
      }
      if (Number(amountInput) > principal) {
        setRedeemError((e) => ({ ...e, [position.id]: "Amount exceeds this stake's principal." }));
        return;
      }
      amount = amountInput;
    }
    setRedeemingId(position.id);
    try {
      const result = await redeemStake(position.id, amount);
      const paid = rawToHuman(result.totalRaw);
      setStakeMessage(`Redeemed ${formatBI2X(rawToHuman(result.principalRaw))} BI2X principal + ${formatBI2X(rawToHuman(result.interestRaw))} BI2X interest = ${formatBI2X(paid)} BI2X credited to your wallet.`);
      setRedeemAmounts((a) => ({ ...a, [position.id]: "" }));
      await Promise.all([load(), wallet.refreshBalances()]);
    } catch (err) {
      setRedeemError((e) => ({ ...e, [position.id]: err instanceof Error ? err.message : "Could not redeem." }));
    } finally {
      setRedeemingId(null);
    }
  };

  const activePositions = positions.filter((p) => p.status === "active");
  const redeemEvents = events.filter((e) => e.kind === "redeem");
  const totalStaked = activePositions.reduce((sum, p) => sum + rawToHuman(p.principalRaw), 0);
  const totalAccrued = activePositions.reduce(
    (sum, p) => sum + estimateAccruedInterest(rawToHuman(p.principalRaw), p.aprBps, p.startedAt),
    0
  );

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">BI2X Staking</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Stake BI2X to earn {APR_PCT}% APR, credited every hour. No lock-up period — redeem any time.
          </p>
        </div>

        {error && <div className="rounded-lg border border-sell/30 bg-sell/10 px-3 py-2 text-sm text-sell">{error}</div>}

        <div className="grid sm:grid-cols-3 gap-3">
          <div className="glass rounded-xl p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Wallet Available</div>
            <div className="text-lg font-bold font-mono">{formatBI2X(bi2xBalance)} BI2X</div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Currently Staked</div>
            <div className="text-lg font-bold font-mono text-primary">{formatBI2X(totalStaked)} BI2X</div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Accrued Interest (live)</div>
            <div className="text-lg font-bold font-mono text-buy">+{formatBI2X(totalAccrued)} BI2X</div>
          </div>
        </div>

        <div className="glass rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
              <Coins className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-sm font-semibold">Stake BI2X</h2>
          </div>
          <form onSubmit={submitStake} className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1 space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Amount</span>
                <button type="button" className="text-primary hover:underline" onClick={() => setStakeAmount(String(bi2xBalance))}>
                  Max: {formatBI2X(bi2xBalance)} BI2X
                </button>
              </div>
              <Input inputMode="decimal" placeholder="0.00" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} />
            </div>
            <Button type="submit" disabled={staking} className="h-9 whitespace-nowrap bg-gradient-primary text-primary-foreground hover:opacity-90">
              {staking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
              Stake
            </Button>
          </form>
          {stakeMessage && <div className="rounded-lg border border-buy/30 bg-buy/10 px-3 py-2 text-sm text-buy">{stakeMessage}</div>}
          {stakeError && <div className="rounded-lg border border-sell/30 bg-sell/10 px-3 py-2 text-sm text-sell">{stakeError}</div>}
        </div>

        <div className="glass rounded-xl p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-semibold">Your Stakes</h2>
          {loading ? (
            <div className="h-24 grid place-items-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : activePositions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No active stakes yet.</p>
          ) : (
            <div className="space-y-3">
              {activePositions.map((p) => {
                const principal = rawToHuman(p.principalRaw);
                const accrued = estimateAccruedInterest(principal, p.aprBps, p.startedAt);
                const currentValue = estimateCurrentValue(principal, p.aprBps, p.startedAt);
                return (
                  <div key={p.id} className="rounded-lg border border-border/50 bg-muted/10 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-mono font-semibold">{formatBI2X(principal)} BI2X staked</div>
                        <div className="text-[11px] text-muted-foreground">
                          Since {new Date(p.startedAt).toLocaleString()} · {(p.aprBps / 100).toFixed(2)}% APR
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Current Value</div>
                        <div className="text-sm font-mono font-semibold">
                          {formatBI2X(currentValue)} BI2X
                          <span className="text-buy ml-1.5">(+{formatBI2X(accrued)})</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center pt-2 border-t border-border/40">
                      <Input
                        className="h-8 flex-1 text-sm"
                        placeholder={`Amount to redeem (up to ${formatBI2X(principal)})`}
                        value={redeemAmounts[p.id] ?? ""}
                        onChange={(e) => setRedeemAmounts((a) => ({ ...a, [p.id]: e.target.value }))}
                        disabled={redeemingId === p.id}
                      />
                      <div className="flex gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 text-xs"
                          disabled={redeemingId === p.id}
                          onClick={() => submitRedeem(p, false)}
                        >
                          Redeem Partial
                        </Button>
                        <Button
                          type="button"
                          className="h-8 text-xs bg-gradient-primary text-primary-foreground hover:opacity-90"
                          disabled={redeemingId === p.id}
                          onClick={() => submitRedeem(p, true)}
                        >
                          {redeemingId === p.id ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Unlock className="h-3.5 w-3.5 mr-1.5" />}
                          Redeem All
                        </Button>
                      </div>
                    </div>
                    {redeemError[p.id] && <div className="text-xs text-sell">{redeemError[p.id]}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {redeemEvents.length > 0 && (
          <div className="glass rounded-xl p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Redemption History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-muted-foreground uppercase tracking-wide border-b border-border/50">
                    <th className="text-left font-medium py-2 pr-4">Redeemed</th>
                    <th className="text-right font-medium py-2 pr-4">Principal</th>
                    <th className="text-right font-medium py-2 pr-4">Interest</th>
                    <th className="text-right font-medium py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {/* One row per actual redemption (not per position), so a
                      partial redemption shows its own principal+interest
                      instead of only ever seeing the position's final state
                      when it eventually fully closes. */}
                  {redeemEvents.map((e) => {
                    const principal = rawToHuman(e.principalRaw);
                    const interest = rawToHuman(e.interestRaw);
                    return (
                      <tr key={e.id} className={cn("border-b border-border/30 last:border-0")}>
                        <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</td>
                        <td className="py-2.5 pr-4 text-right font-mono">{formatBI2X(principal)} BI2X</td>
                        <td className="py-2.5 pr-4 text-right font-mono text-buy">+{formatBI2X(interest)} BI2X</td>
                        <td className="py-2.5 text-right font-mono font-semibold">{formatBI2X(principal + interest)} BI2X</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
