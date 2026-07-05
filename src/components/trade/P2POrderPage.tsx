import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Shield, CheckCircle2, Clock, Copy, MessageCircle,
  Send, X, Star, Ban, ArrowLeft, AlertTriangle,
} from "lucide-react";

export type P2POrderStatus = "pending_payment" | "payment_made" | "completed" | "cancelled" | "appeal";

export interface Merchant {
  id: number; name: string; avatar: string; trades: number;
  completion: number; price: number; payment: string; rating: number;
}

export interface P2POrderPageProps {
  orderId?: string;
  mode: "buy" | "sell";
  merchant: Merchant;
  amountINR: number;
  grossQty: number;
  feeQty: number;
  netQty: number;
  createdAt?: number;
  initialStatus?: P2POrderStatus;
  onStatusChange?: (status: P2POrderStatus) => void;
  onClose: () => void;
}

interface ChatMessage {
  id: number; sender: "me" | "them" | "system"; text: string; time: string;
}

const ORDER_TIMEOUT_SECONDS = 15 * 60;

function formatTime(secs: number) {
  return `${Math.floor(secs/60).toString().padStart(2,"0")}:${(secs%60).toString().padStart(2,"0")}`;
}

const STEPS = ["Order Placed","Payment Sent","Crypto Released","Completed"];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center w-full">
      {STEPS.map((label, i) => {
        const done = i < current, active = i === current;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 min-w-[60px]">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${done?"bg-buy text-buy-foreground":active?"bg-primary text-primary-foreground ring-2 ring-primary/40":"bg-muted text-muted-foreground"}`}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : i+1}
              </div>
              <span className={`text-[10px] text-center leading-tight ${active?"text-primary font-semibold":done?"text-buy":"text-muted-foreground"}`}>{label}</span>
            </div>
            {i < STEPS.length-1 && <div className={`flex-1 h-0.5 mb-4 mx-1 rounded-full ${done?"bg-buy":"bg-border"}`} />}
          </div>
        );
      })}
    </div>
  );
}

export function P2POrderPage({ orderId: providedOrderId, mode, merchant, amountINR, grossQty, feeQty, netQty, createdAt: providedCreatedAt, initialStatus="pending_payment", onStatusChange, onClose }: P2POrderPageProps) {
  const orderIdRef = useRef(providedOrderId ?? `P2P-${Date.now().toString().slice(-8)}`);
  const createdAtRef = useRef(providedCreatedAt ?? Date.now());
  const orderId = orderIdRef.current;
  const createdAt = createdAtRef.current;
  const resumedSecs = Math.max(0, ORDER_TIMEOUT_SECONDS - Math.floor((Date.now()-createdAt)/1000));
  const [status, setStatus] = useState<P2POrderStatus>(initialStatus);
  const [secondsLeft, setSecondsLeft] = useState(initialStatus==="pending_payment"?resumedSecs:ORDER_TIMEOUT_SECONDS);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id:1, sender:"system", text:"Order created. Please complete payment within 15 minutes.", time:new Date(createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) },
    { id:2, sender:"them",   text:`Hi! I'm ready. Please send ₹${amountINR.toLocaleString()} via ${merchant.payment.split(",")[0].trim()}.`, time:new Date(createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [appealReason, setAppealReason] = useState("");
  const [appealId, setAppealId] = useState<string | null>(null);
  const [appealView, setAppealView] = useState<"order" | "form">("order");
  const [copied, setCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const stepIndex = status==="pending_payment"||status==="appeal"?0:status==="payment_made"?1:status==="completed"?3:1;

  function changeStatus(s: P2POrderStatus) { setStatus(s); onStatusChange?.(s); }

  useEffect(() => {
    if (status!=="pending_payment") return;
    if (secondsLeft<=0) {
      setStatus("cancelled");
      onStatusChange?.("cancelled");
      setChatMessages(p=>[...p,{id:Date.now(),sender:"system",text:"Order expired — cancelled.",time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}]);
      return;
    }
    const t = setTimeout(()=>setSecondsLeft(s=>s-1),1000);
    return ()=>clearTimeout(t);
  },[onStatusChange,secondsLeft,status]);

  useEffect(()=>{ chatEndRef.current?.scrollIntoView?.({behavior:"smooth"}); },[chatMessages]);

  function addSystemMsg(text: string) {
    setChatMessages(p=>[...p,{id:Date.now(),sender:"system",text,time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}]);
  }
  function sendChat() {
    if (!chatInput.trim()) return;
    const msg=chatInput.trim(); setChatInput("");
    setChatMessages(p=>[...p,{id:Date.now(),sender:"me",text:msg,time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}]);
    setTimeout(()=>setChatMessages(p=>[...p,{id:Date.now()+1,sender:"them",text:"Got it, please complete the payment and confirm.",time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}]),1200);
  }
  function handleIvePaid() {
    changeStatus("payment_made"); addSystemMsg("Payment marked as sent. Waiting for seller…");
    setTimeout(()=>{ addSystemMsg("Seller confirmed. Releasing crypto…"); setTimeout(()=>{ changeStatus("completed"); addSystemMsg(`Order completed! ${netQty.toFixed(4)} DEXUSD credited.`); },2500); },3000);
  }
  function handleCancel() { changeStatus("cancelled"); addSystemMsg("You cancelled this order."); }
  function handleAppeal() {
    const reason = appealReason.trim();
    if (!reason) return;
    const nextAppealId = `APL-${Date.now().toString().slice(-8)}`;
    changeStatus("appeal");
    setAppealId(nextAppealId);
    addSystemMsg(`Appeal submitted. Appeal ID: ${nextAppealId}. Reason: "${reason}". Support will review within 24h.`);
    setAppealReason("");
    setAppealView("order");
  }
  function copyTo(text: string) { navigator.clipboard.writeText(text).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),1500); }

  const isBuy=mode==="buy";
  const accentBg=isBuy?"bg-buy/10 border-buy/20":"bg-sell/10 border-sell/20";
  const accentBtn=isBuy?"bg-buy text-buy-foreground hover:bg-buy/90":"bg-sell text-sell-foreground hover:bg-sell/90";
  const paymentDetails=[
    {label:"Payment Method",value:merchant.payment.split(",")[0].trim()},
    {label:"Account Name",  value:"DEX.ai Escrow Account"},
    {label:"Account / UPI", value:"dexai@upi"},
    {label:"Reference",     value:orderId},
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background/75 backdrop-blur-sm flex items-center justify-center p-4">
      {appealView === "form" ? (
        <div className="w-full max-w-lg rounded-2xl border border-warning/30 bg-card p-6 text-card-foreground shadow-2xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Raise Appeal</h2>
                <p className="mt-1 text-xs text-muted-foreground">Order #{orderId}</p>
              </div>
            </div>
            <button onClick={()=>setAppealView("order")} className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Close appeal form">
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="mb-3 text-sm leading-6 text-muted-foreground">
            Explain what went wrong. Include payment references or other details that can help support review the order.
          </p>
          <textarea
            value={appealReason}
            onChange={e=>setAppealReason(e.target.value)}
            rows={5}
            placeholder="Explain the issue in detail..."
            className="w-full resize-none rounded-xl border border-border bg-input px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-warning"
          />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button onClick={()=>setAppealView("order")} variant="outline" className="h-10 border-border text-foreground hover:bg-muted">
              Back
            </Button>
            <Button onClick={handleAppeal} disabled={!appealReason.trim()} className="h-10 bg-warning text-primary-foreground hover:bg-warning/90 disabled:opacity-40">
              Submit Appeal
            </Button>
          </div>
        </div>
      ) : (
      <div className="h-[95vh] max-h-[95vh] w-full max-w-5xl bg-card text-card-foreground border border-border rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        {/* Top bar */}
        <div className={`px-6 py-4 border-b ${accentBg} flex items-center justify-between flex-shrink-0`}>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="h-5 w-5"/></button>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${isBuy?"bg-buy text-buy-foreground":"bg-sell text-sell-foreground"}`}>{isBuy?"BUY":"SELL"}</span>
                <span className="font-bold text-foreground text-base">DEXUSD · Order #{orderId}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{new Date(createdAt).toLocaleString([],{dateStyle:"medium",timeStyle:"short"})}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {status==="pending_payment"&&<Badge className="bg-warning/15 text-warning border border-warning/30 gap-1.5"><Clock className="h-3 w-3"/>Awaiting Payment</Badge>}
            {status==="payment_made"   &&<Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30 gap-1.5"><Clock className="h-3 w-3"/>Confirming…</Badge>}
            {status==="completed"      &&<Badge className="bg-buy/15 text-buy border border-buy/30 gap-1.5"><CheckCircle2 className="h-3 w-3"/>Completed</Badge>}
            {status==="cancelled"      &&<Badge className="bg-destructive/15 text-destructive border border-destructive/30 gap-1.5"><Ban className="h-3 w-3"/>Cancelled</Badge>}
            {status==="appeal"         &&<Badge className="bg-warning/15 text-warning border border-warning/30 gap-1.5"><AlertTriangle className="h-3 w-3"/>Under Appeal</Badge>}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-2"><X className="h-5 w-5"/></button>
          </div>
        </div>
        {/* Steps */}
        {status!=="cancelled"&&<div className="px-8 py-4 border-b border-border bg-muted/20 flex-shrink-0"><StepBar current={stepIndex}/></div>}
        {/* Body */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-border">
          {/* LEFT */}
          <div className="md:w-[55%] overflow-y-auto px-6 py-5 space-y-5">
            {status==="pending_payment"&&(
              <div className={`rounded-xl border px-5 py-4 flex items-center justify-between ${secondsLeft<120?"bg-destructive/10 border-destructive/30":"bg-warning/10 border-warning/20"}`}>
                <div className="flex items-center gap-2"><Clock className={`h-4 w-4 ${secondsLeft<120?"text-destructive":"text-warning"}`}/><span className="text-sm font-medium text-foreground">Time remaining to pay</span></div>
                <span className={`text-2xl font-mono font-black ${secondsLeft<120?"text-destructive":"text-warning"}`}>{formatTime(secondsLeft)}</span>
              </div>
            )}
            {status==="appeal"&&(
              <div className="rounded-xl border border-warning/30 bg-warning/10 px-5 py-4">
                <div className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="h-4 w-4"/>
                  <span className="text-sm font-semibold">Appeal under review</span>
                </div>
                {appealId&&<p className="mt-1 text-xs text-muted-foreground">Appeal ID: {appealId}</p>}
              </div>
            )}
            {status==="cancelled"&&(
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-center">
                <Ban className="h-8 w-8 text-destructive mx-auto mb-2"/><p className="text-foreground font-bold">Order Cancelled</p>
                <p className="text-muted-foreground text-sm mt-1">No funds transferred.</p>
                <Button onClick={onClose} variant="secondary" className="mt-4 text-sm">Back to P2P</Button>
              </div>
            )}
            {status==="completed"&&(
              <div className="rounded-xl border border-buy/30 bg-buy/10 px-5 py-4 text-center">
                <CheckCircle2 className="h-10 w-10 text-buy mx-auto mb-2"/>
                <p className="text-foreground font-bold text-lg">Order Completed! 🎉</p>
                <p className="text-muted-foreground text-sm mt-1"><span className="text-buy font-bold">{netQty.toFixed(4)} DEXUSD</span> credited to your wallet.</p>
                <div className="mt-4 flex justify-center gap-1">{[1,2,3,4,5].map(s=><Star key={s} className="h-6 w-6 text-amber-400 fill-amber-400 cursor-pointer hover:scale-110 transition-transform"/>)}</div>
                <p className="text-xs text-muted-foreground mt-1">Rate your experience</p>
                <Button onClick={onClose} className="mt-4 bg-buy text-buy-foreground hover:bg-buy/90 text-sm">Back to P2P</Button>
              </div>
            )}
            {/* Summary */}
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Order Summary</p>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {label:"You Pay",     value:`₹${amountINR.toLocaleString()}`},
                  {label:"Price/DEXUSD",value:`₹${merchant.price}`},
                  {label:"Gross DEXUSD",value:grossQty.toFixed(4)},
                  {label:"Fee (1%)",     value:`-${feeQty.toFixed(4)} DEXUSD`},
                  {label:"You Receive", value:`${netQty.toFixed(4)} DEXUSD`,highlight:true},
                  {label:"Order ID",    value:orderId},
                ].map(({label,value,highlight})=>(
                  <div key={label} className={`rounded-xl px-3.5 py-3 border ${highlight?"bg-buy/10 border-buy/30":"bg-muted/50 border-border"}`}>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest">{label}</p>
                    <p className={`text-sm font-semibold mt-0.5 ${highlight?"text-buy":"text-foreground"}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
            <Separator className="bg-border"/>
            {/* Seller */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-black text-primary-foreground flex-shrink-0">{merchant.avatar}</div>
              <div>
                <div className="flex items-center gap-1.5"><span className="font-semibold text-sm text-foreground">{merchant.name}</span><Shield className="h-3.5 w-3.5 text-primary"/></div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>{merchant.trades.toLocaleString()} trades</span><span>·</span>
                  <span>{merchant.completion}% completion</span><span>·</span>
                  <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-amber-400 fill-amber-400"/>{merchant.rating}</span>
                </div>
              </div>
            </div>
            {/* Payment instructions */}
            {(status==="pending_payment"||status==="payment_made"||status==="appeal")&&(<>
              <Separator className="bg-border"/>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Payment Instructions</p>
                <div className="space-y-2">
                  {paymentDetails.map(({label,value})=>(
                    <div key={label} className="flex items-center justify-between bg-muted/50 border border-border rounded-xl px-4 py-3">
                      <div><p className="text-[9px] text-muted-foreground uppercase tracking-widest">{label}</p><p className="text-sm font-semibold text-foreground mt-0.5">{value}</p></div>
                      <button onClick={()=>copyTo(value)} className="text-muted-foreground hover:text-primary transition-colors"><Copy className="h-4 w-4"/></button>
                    </div>
                  ))}
                </div>
                {copied&&<p className="text-xs text-buy mt-1.5">Copied!</p>}
                <div className="mt-3 p-3 rounded-xl bg-warning/10 border border-warning/20 text-xs text-foreground flex gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-warning"/>Always include the Reference ID in your payment remarks.
                </div>
              </div>
              <div className="flex flex-col gap-2.5 pt-1">
                {status==="pending_payment"&&<Button onClick={handleIvePaid} className={`w-full h-11 font-bold rounded-xl ${accentBtn}`}><CheckCircle2 className="h-4 w-4 mr-2"/>I've Sent the Payment</Button>}
                {status==="payment_made"&&<Button disabled className="w-full h-11 font-bold rounded-xl bg-blue-600/50 text-blue-300 cursor-not-allowed"><Clock className="h-4 w-4 mr-2 animate-spin"/>Waiting for Seller…</Button>}
                {status==="appeal"&&<Button disabled className="w-full h-11 font-bold rounded-xl border border-warning/30 bg-warning/10 text-warning opacity-100"><AlertTriangle className="h-4 w-4 mr-2"/>Appeal Under Review</Button>}
                {status!=="appeal"&&<div className="flex gap-2">
                  {status==="pending_payment"&&<Button onClick={handleCancel} variant="outline" className="flex-1 h-10 text-sm border-destructive/40 text-destructive hover:bg-destructive/10"><Ban className="h-4 w-4 mr-1.5"/>Cancel Order</Button>}
                  <Button onClick={()=>setAppealView("form")} variant="outline" className="flex-1 h-10 text-sm border-warning/40 text-warning hover:bg-warning/10"><AlertTriangle className="h-4 w-4 mr-1.5"/>Raise Appeal</Button>
                </div>}
              </div>
            </>)}
          </div>
          {/* RIGHT — Chat */}
          <div className="md:w-[45%] flex flex-col bg-muted/20">
            <div className="px-5 py-3.5 border-b border-border flex items-center gap-2 flex-shrink-0">
              <MessageCircle className="h-4 w-4 text-primary"/>
              <span className="font-semibold text-sm text-foreground">Order Chat</span>
              <span className="ml-auto flex items-center gap-1.5 text-xs text-buy">
                <span className="h-2 w-2 rounded-full bg-buy inline-block animate-pulse"/>{merchant.name} online
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
              {chatMessages.map(msg=>(
                <div key={msg.id} className={`flex ${msg.sender==="me"?"justify-end":msg.sender==="system"?"justify-center":"justify-start"}`}>
                  {msg.sender==="system"
                    ?<div className="max-w-[85%] bg-muted/60 text-muted-foreground text-[11px] text-center px-3 py-1.5 rounded-lg border border-border">{msg.text}</div>
                    :msg.sender==="them"
                      ?<div className="max-w-[78%] space-y-0.5"><div className="bg-muted border border-border rounded-2xl rounded-tl-sm px-3.5 py-2.5"><p className="text-sm text-foreground leading-snug">{msg.text}</p></div><p className="text-[10px] text-muted-foreground pl-1">{msg.time}</p></div>
                      :<div className="max-w-[78%] space-y-0.5"><div className="bg-primary/20 border border-primary/30 rounded-2xl rounded-tr-sm px-3.5 py-2.5"><p className="text-sm text-foreground leading-snug">{msg.text}</p></div><p className="text-[10px] text-muted-foreground text-right pr-1">{msg.time}</p></div>
                  }
                </div>
              ))}
              <div ref={chatEndRef}/>
            </div>
            <div className="px-4 py-2 border-t border-border flex gap-2 overflow-x-auto scrollbar-none flex-shrink-0">
              {["Payment sent ✓","Please check","Any issues?"].map(q=>(
                <button key={q} onClick={()=>setChatInput(q)} className="whitespace-nowrap text-[11px] px-3 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors bg-muted/40 flex-shrink-0">{q}</button>
              ))}
            </div>
            <div className="px-4 pb-4 pt-2 flex gap-2 flex-shrink-0">
              <Input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Type a message…" className="bg-input border-border text-foreground placeholder:text-muted-foreground text-sm h-10"/>
              <Button onClick={sendChat} size="icon" className="h-10 w-10 flex-shrink-0 rounded-xl"><Send className="h-4 w-4"/></Button>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
