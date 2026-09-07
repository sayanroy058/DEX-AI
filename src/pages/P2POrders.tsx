import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  formatINR,
  formatBIUSDAmount,
  getP2POrders,
  type P2POrder,
} from "@/lib/p2pApi";
import { useWallet } from "@/lib/useWallet";

const statusLabel: Record<P2POrder["status"], string> = {
  pending_payment: "Awaiting payment",
  payment_made: "Payment marked paid",
  completed: "Completed",
  cancelled: "Cancelled",
  appeal: "In appeal",
};

function settlementLabel(order: P2POrder, bought: boolean) {
  if (order.status === "completed") {
    return bought
      ? `Received ${formatBIUSDAmount(order.buyerCreditRaw)} BIUSD`
      : `Released ${formatBIUSDAmount(order.buyerCreditRaw)} BIUSD`;
  }
  if (order.status === "cancelled") {
    return bought
      ? "No BIUSD received"
      : `Refunded ${formatBIUSDAmount(order.sellerDebitRaw)} BIUSD`;
  }
  return bought
    ? `Pending ${formatBIUSDAmount(order.buyerCreditRaw)} BIUSD`
    : `Escrowed ${formatBIUSDAmount(order.sellerDebitRaw)} BIUSD`;
}

export default function P2POrders() {
  const { userId } = useWallet();
  const [orders, setOrders] = useState<P2POrder[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError("");
      setOrders((await getP2POrders()).orders);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load orders");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return <AppShell><main className="mx-auto min-h-screen max-w-7xl space-y-6 p-6">
    <div><Link to="/p2p" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4"/>Back to P2P</Link><h1 className="mt-4 text-3xl font-bold">My P2P orders</h1><p className="text-muted-foreground">Buyers pay externally; BIUSD escrow, fees, release, and refunds are handled inside the system.</p></div>
    {!userId ? <Card className="p-8 text-center text-muted-foreground">Connect and authenticate a wallet to view your orders.</Card> : <>
      {error && <Card className="p-4 text-destructive">{error}</Card>}
      <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-sm">
        <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-4">Order</th><th className="p-4">Side</th><th className="p-4">Amount</th><th className="p-4">Payment</th><th className="p-4">Fiat</th><th className="p-4">Fee (1%)</th><th className="p-4">BIUSD settlement</th><th className="p-4">Status</th><th className="p-4 text-right">Action</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan={9} className="p-8 text-center">Loading…</td></tr> : orders.length === 0 ? <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No P2P orders found.</td></tr> : orders.map(order => {
          const bought = order.buyerId === userId;
          const pending = order.status === "pending_payment";
          return <tr className="border-b last:border-0" key={order.id}>
            <td className="p-4"><Link to={`/p2p/orders/${order.id}`} className="font-mono text-xs text-primary hover:underline">{order.id}</Link><p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</p></td>
            <td className="p-4 font-semibold">{bought ? "BUY" : "SELL"}</td>
            <td className="p-4">{formatBIUSDAmount(order.amountRaw)} BIUSD</td>
            <td className="p-4">{order.paymentMethod}</td>
            <td className="p-4">{formatINR(order.grossAmount)}</td>
            <td className="p-4">{formatBIUSDAmount(bought ? order.buyerFeeRaw : order.sellerFeeRaw)} BIUSD</td>
            <td className="p-4">{settlementLabel(order, bought)}</td>
            <td className="p-4"><span className={order.status === "completed" ? "text-green-600" : order.status === "cancelled" ? "text-destructive" : "text-amber-500"}>{statusLabel[order.status]}</span>{pending && <p className="text-xs text-muted-foreground">Pay before {new Date(order.expiresAt).toLocaleString()}</p>}{order.cancellationReason && <p className="text-xs text-muted-foreground">{order.cancellationReason}</p>}</td>
            <td className="p-4 text-right"><Button asChild size="sm" variant="outline"><Link to={`/p2p/orders/${order.id}`}>Open order</Link></Button></td>
          </tr>;
        })}</tbody>
      </table></div></Card>
    </>}
  </main></AppShell>;
}
