import { AppShell } from "@/components/AppShell";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, History, Clock, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Moved out of Portfolio.tsx into its own page — same mock data for now
// (still not backed by a real deposit/withdraw ledger endpoint; see
// Portfolio.tsx's own long-standing comment on this). Kept as mock here
// rather than invented real data, since wiring this to a real endpoint is
// a separate piece of work.
const TRANSACTIONS = [
  { id: "T001", type: "Deposit", asset: "USDT", amount: "+5,000", date: "2026-05-10", status: "completed", network: "TRC-20" },
  { id: "T002", type: "Withdraw", asset: "USDT", amount: "-2,000", date: "2026-05-08", status: "completed", network: "ERC-20" },
  { id: "T003", type: "Deposit", asset: "BTC", amount: "+0.05", date: "2026-05-06", status: "completed", network: "BTC" },
  { id: "T004", type: "Withdraw", asset: "ETH", amount: "-0.8", date: "2026-05-04", status: "pending", network: "ERC-20" },
  { id: "T005", type: "Deposit", asset: "SOL", amount: "+12", date: "2026-05-02", status: "completed", network: "SOL" },
  { id: "T006", type: "Withdraw", asset: "USDT", amount: "-500", date: "2026-04-29", status: "failed", network: "TRC-20" },
];

const TransactionHistory = () => {
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/portfolio" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Portfolio
          </Link>
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transaction History</h1>
          <p className="text-muted-foreground text-sm mt-1">Every deposit and withdrawal on your account</p>
        </div>

        <div className="glass rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2"><History className="h-4 w-4 text-primary" /> All Transactions</h3>
            <div className="flex gap-1">
              {["All", "Deposit", "Withdraw"].map((f, i) => (
                <button key={f} className={cn("px-2 py-1 text-[10px] rounded", i === 0 ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/40")}>{f}</button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="text-[11px] text-muted-foreground uppercase">
                <tr className="border-b border-border/50">
                  <th className="text-left px-4 py-2">Type</th>
                  <th className="text-left">Asset</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Network</th>
                  <th className="text-right">Date</th>
                  <th className="text-right pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {TRANSACTIONS.map(t => (
                  <tr key={t.id} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <span className={cn("flex items-center gap-1.5 font-medium text-xs", t.type === "Deposit" ? "text-buy" : "text-sell")}>
                        {t.type === "Deposit" ? <ArrowDownToLine className="h-3 w-3" /> : <ArrowUpFromLine className="h-3 w-3" />}
                        {t.type}
                      </span>
                    </td>
                    <td className="font-mono font-semibold">{t.asset}</td>
                    <td className={cn("text-right font-mono font-bold", t.type === "Deposit" ? "text-buy" : "text-sell")}>{t.amount}</td>
                    <td className="text-right text-xs text-muted-foreground">{t.network}</td>
                    <td className="text-right text-xs text-muted-foreground">{t.date}</td>
                    <td className="text-right pr-4">
                      {t.status === "completed" && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-buy bg-buy/10 border border-buy/20 rounded px-2 py-0.5"><CheckCircle2 className="h-2.5 w-2.5" /> Completed</span>}
                      {t.status === "pending" && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-warning bg-warning/10 border border-warning/20 rounded px-2 py-0.5"><Clock className="h-2.5 w-2.5" /> Pending</span>}
                      {t.status === "failed" && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sell bg-sell/10 border border-sell/20 rounded px-2 py-0.5"><XCircle className="h-2.5 w-2.5" /> Failed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default TransactionHistory;
