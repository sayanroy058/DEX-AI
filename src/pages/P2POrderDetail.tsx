import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock, FileText, MessageSquare, Send, ShieldCheck, Upload } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  appealP2POrder,
  cancelP2PAppeal,
  cancelP2POrder,
  formatINR,
  formatBIUSDAmount,
  getP2POrder,
  getP2POrderEvents,
  getP2POrderMessages,
  getP2POrderProofs,
  markP2POrderPaid,
  p2pProofURL,
  releaseP2POrder,
  sendP2POrderMessage,
  uploadP2POrderProof,
  type P2POrder,
  type P2POrderEvent,
  type P2POrderMessage,
  type P2POrderProof,
} from "@/lib/p2pApi";
import { useWallet } from "@/lib/useWallet";

const cancelReasons = ["I do not want to trade anymore", "I cannot use the selected payment method", "Technical or payment-platform problem", "Other reason"];

export default function P2POrderDetail() {
  const { orderId = "" } = useParams();
  const { userId } = useWallet();
  const [order, setOrder] = useState<P2POrder | null>(null);
  const [messages, setMessages] = useState<P2POrderMessage[]>([]);
  const [proofs, setProofs] = useState<P2POrderProof[]>([]);
  const [events, setEvents] = useState<P2POrderEvent[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [confirmPaidOpen, setConfirmPaidOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [appealOpen, setAppealOpen] = useState(false);
  const [ownAccount, setOwnAccount] = useState(false);
  const [cancelReason, setCancelReason] = useState(cancelReasons[0]);
  const [appealReason, setAppealReason] = useState("");

  const load = useCallback(async () => {
    if (!userId || !orderId) return;
    try {
      const [orderResult, messageResult, proofResult, eventResult] = await Promise.all([
        getP2POrder(orderId), getP2POrderMessages(orderId), getP2POrderProofs(orderId), getP2POrderEvents(orderId),
      ]);
      setOrder(orderResult.order);
      setMessages(messageResult.messages);
      setProofs(proofResult.proofs);
      setEvents(eventResult.events);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the P2P order");
    }
  }, [orderId, userId]);

  useEffect(() => { void load(); const poll = window.setInterval(() => void load(), 5000); return () => window.clearInterval(poll); }, [load]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);

  const buyer = order?.buyerId === userId;
  const seller = order?.sellerId === userId;
  const paymentRemaining = useMemo(() => countdown(order?.expiresAt, now), [order?.expiresAt, now]);
  const appealRemaining = useMemo(() => countdown(order?.appealAvailableAt, now), [order?.appealAvailableAt, now]);
  const appealReady = !order?.appealAvailableAt || new Date(order.appealAvailableAt).getTime() <= now;

  async function perform(action: () => Promise<unknown>, close?: () => void) {
    try { setActing(true); setError(""); await action(); close?.(); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update the order"); }
    finally { setActing(false); }
  }

  async function upload(file?: File) {
    if (!file) return;
    await perform(() => uploadP2POrderProof(orderId, file));
  }

  async function sendMessage() {
    const body = message.trim();
    if (!body) return;
    await perform(() => sendP2POrderMessage(orderId, body));
    setMessage("");
  }

  if (!userId) return <AppShell><main className="mx-auto min-h-screen max-w-6xl p-6"><Card className="p-8 text-center text-muted-foreground">Connect and authenticate a wallet to view this order.</Card></main></AppShell>;

  return <AppShell><main className="mx-auto min-h-screen max-w-7xl space-y-6 p-6">
    <div><Link to="/p2p/orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4"/>Back to My Orders</Link><div className="mt-4 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl font-bold">{headline(order, buyer, paymentRemaining)}</h1><p className="mt-1 break-all text-sm text-muted-foreground">Order {orderId}</p></div>{order && <Badge variant="outline">{order.status.replaceAll("_", " ")}</Badge>}</div></div>
    {error && <Card className="p-4 text-destructive">{error}</Card>}
    {!order ? <Card className="p-8 text-center text-muted-foreground">Loading order…</Card> : <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <Card className="border-border/50 bg-card/30 p-6"><div className="mb-5 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary"/><h2 className="font-semibold">Payment and order details</h2></div>
          {buyer && <div className="mb-5 rounded-lg border bg-muted/20 p-4"><Detail label="Transfer via" value={order.paymentMethod}/><Detail label="Account name" value={order.paymentAccountName}/><Detail label="Payment identifier" value={order.paymentAccountIdentifier}/>{order.paymentBankName && <Detail label="Bank name" value={order.paymentBankName}/>} {order.paymentIfscCode && <Detail label="IFSC" value={order.paymentIfscCode}/>} {order.paymentInstructions && <Detail label="Instructions" value={order.paymentInstructions}/>}</div>}
          <div className="grid gap-x-8 sm:grid-cols-2"><Detail label="Fiat amount" value={formatINR(order.grossAmount)}/><Detail label="Price" value={`${formatINR(order.price)} / BIUSD`}/><Detail label="Trade quantity" value={`${formatBIUSDAmount(order.amountRaw)} BIUSD`}/><Detail label="Your 1% fee" value={`${formatBIUSDAmount(buyer ? order.buyerFeeRaw : order.sellerFeeRaw)} BIUSD`}/><Detail label={buyer ? "You receive" : "BIUSD escrowed"} value={`${formatBIUSDAmount(buyer ? order.buyerCreditRaw : order.sellerDebitRaw)} BIUSD`}/><Detail label="Payment deadline" value={new Date(order.expiresAt).toLocaleString()}/></div>
        </Card>

        <Card className="border-border/50 bg-card/30 p-6"><div className="mb-4 flex items-center gap-2"><FileText className="h-5 w-5 text-primary"/><h2 className="font-semibold">Payment proof</h2></div><div className="flex flex-wrap gap-2">{proofs.map(proof => <Button key={proof.id} variant="outline" size="sm" onClick={() => window.open(p2pProofURL(proof.id), "_blank", "noopener,noreferrer")}>{proof.fileName}</Button>)}{proofs.length === 0 && <p className="text-sm text-muted-foreground">No payment proof uploaded.</p>}</div>{buyer && order.status === "pending_payment" && proofs.length < 3 && <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"><Upload className="h-4 w-4"/>Upload proof<Input className="hidden" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={event => { void upload(event.target.files?.[0]); event.currentTarget.value = ""; }}/></label>}</Card>

        <div className="flex flex-wrap gap-3">{buyer && order.status === "pending_payment" && <><Button disabled={proofs.length === 0 || acting} onClick={() => setConfirmPaidOpen(true)}>I have paid</Button><Button variant="outline" disabled={acting} onClick={() => setCancelOpen(true)}>Cancel order</Button></>}{seller && order.status === "payment_made" && <Button disabled={acting} onClick={() => setReleaseOpen(true)}>Confirm receipt and release BIUSD</Button>}{order.status === "payment_made" && <Button variant="outline" disabled={!appealReady || acting} onClick={() => setAppealOpen(true)}>{appealReady ? "Open appeal" : `Appeal after ${appealRemaining}`}</Button>}{order.status === "appeal" && order.appealedBy === userId && <Button variant="outline" disabled={acting} onClick={() => void perform(() => cancelP2PAppeal(order.id))}>Cancel appeal</Button>}</div>

        <Card className="border-border/50 bg-card/20 p-6"><h2 className="mb-4 font-semibold">Order activity</h2><div className="space-y-3">{events.map(event => <div key={event.id} className="flex justify-between gap-4 border-b pb-2 text-sm last:border-0"><span>{event.kind.replaceAll("_", " ")}</span><span className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</span></div>)}</div></Card>
      </div>

      <Card className="flex min-h-[560px] flex-col overflow-hidden border-border/50 bg-card/30 lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)]"><div className="flex items-center gap-2 border-b p-4"><MessageSquare className="h-5 w-5 text-primary"/><h2 className="font-semibold">Order chat</h2></div><div className="flex-1 space-y-3 overflow-y-auto p-4">{messages.map(item => item.system ? <div key={item.id} className="rounded-lg bg-muted/30 p-3 text-center text-xs text-muted-foreground">{item.body}</div> : <div key={item.id} className={`max-w-[85%] rounded-xl p-3 text-sm ${item.senderId === userId ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}><p className="mb-1 text-xs opacity-70">{item.senderUsername}</p><p>{item.body}</p><p className="mt-1 text-right text-[10px] opacity-60">{new Date(item.createdAt).toLocaleTimeString()}</p></div>)}</div><div className="flex gap-2 border-t p-3"><Input value={message} maxLength={1000} onChange={event => setMessage(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void sendMessage(); }} placeholder="Enter message"/><Button size="icon" disabled={!message.trim() || acting} onClick={() => void sendMessage()}><Send className="h-4 w-4"/></Button></div></Card>
    </div>}

    <Dialog open={confirmPaidOpen} onOpenChange={setConfirmPaidOpen}><DialogContent><DialogHeader><DialogTitle>Payment confirmation</DialogTitle><DialogDescription>Confirm only after the payment has successfully left your account.</DialogDescription></DialogHeader><label className="flex items-start gap-3 rounded-lg border p-4 text-sm"><Checkbox checked={ownAccount} onCheckedChange={value => setOwnAccount(value === true)}/><span>I made this transfer using my own payment account under the name shown by my payment provider.</span></label><Button disabled={!ownAccount || proofs.length === 0 || acting} onClick={() => void perform(() => markP2POrderPaid(orderId, ownAccount), () => setConfirmPaidOpen(false))}>Confirm payment</Button></DialogContent></Dialog>
    <Dialog open={releaseOpen} onOpenChange={setReleaseOpen}><DialogContent><DialogHeader><DialogTitle>Release BIUSD?</DialogTitle><DialogDescription>Check your bank or payment account directly. A screenshot or chat message alone is not proof that money was received.</DialogDescription></DialogHeader><Button disabled={acting} onClick={() => void perform(() => releaseP2POrder(orderId), () => setReleaseOpen(false))}>I received the payment — release BIUSD</Button></DialogContent></Dialog>
    <Dialog open={cancelOpen} onOpenChange={setCancelOpen}><DialogContent><DialogHeader><DialogTitle>Cancellation reason</DialogTitle><DialogDescription>You can cancel only before marking the payment as completed.</DialogDescription></DialogHeader><Select value={cancelReason} onValueChange={setCancelReason}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{cancelReasons.map(reason => <SelectItem key={reason} value={reason}>{reason}</SelectItem>)}</SelectContent></Select><Button variant="destructive" disabled={acting} onClick={() => void perform(() => cancelP2POrder(orderId, cancelReason), () => setCancelOpen(false))}>Cancel order</Button></DialogContent></Dialog>
    <Dialog open={appealOpen} onOpenChange={setAppealOpen}><DialogContent><DialogHeader><DialogTitle>Open an appeal</DialogTitle><DialogDescription>Explain the issue clearly. Escrow will remain locked until the appeal is cancelled or resolved by an administrator.</DialogDescription></DialogHeader><Textarea value={appealReason} maxLength={500} onChange={event => setAppealReason(event.target.value)} placeholder="Describe the payment or release problem"/><Button disabled={appealReason.trim().length < 3 || acting} onClick={() => void perform(() => appealP2POrder(orderId, appealReason), () => setAppealOpen(false))}>Submit appeal</Button></DialogContent></Dialog>
  </main></AppShell>;
}

function Detail({label,value}:{label:string;value:string}){return <div className="flex justify-between gap-4 border-b py-3 text-sm last:border-0"><span className="text-muted-foreground">{label}</span><span className="break-all text-right font-medium">{value}</span></div>}
function countdown(value:string|undefined,now:number){if(!value)return "00:00";const seconds=Math.max(0,Math.ceil((new Date(value).getTime()-now)/1000));return `${Math.floor(seconds/60).toString().padStart(2,"0")}:${(seconds%60).toString().padStart(2,"0")}`}
function headline(order:P2POrder|null,buyer:boolean,remaining:string){if(!order)return "P2P Order";if(order.status==="pending_payment")return buyer?`Pay the seller within ${remaining}`:"Waiting for buyer payment";if(order.status==="payment_made")return buyer?"Waiting for seller release":"Verify payment and release BIUSD";if(order.status==="appeal")return "Order under appeal";if(order.status==="completed")return "Order completed";return "Order cancelled"}
