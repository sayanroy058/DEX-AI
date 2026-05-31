import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Shield, CheckCircle2, Clock, Copy, MessageCircle,
  Send, X, Star, Ban, ArrowLeft, AlertTriangle,
} from "lucide-react";
import type { P2POrderStatus } from "@/lib/useP2POrders";

export interface Merchant {
  id: number; name: string; avatar: string; trades: number;
  completion: number; price: number; payment: string; rating: number;
}

export interface P2POrderPageProps {
  orderId: string;
  mode: "buy" | "sell";
  merchant: Merchant;
  amountINR: number;
  grossQty: number;
  feeQty: number;
  netQty: number;
  createdAt: number;
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
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${done?"bg-emerald-500 text-white":active?"bg-cyan-500 text-white ring-2 ring-cyan-400/40":"bg-slate-700 text-slate-400"}`}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : i+1}
              </div>
              <span className={`text-[10px] text-center leading-tight ${active?"text-cyan-300 font-semibold":done?"text-emerald-400":"text-slate-500"}`}>{label}</span>
            </div>
            {i < STEPS.length-1 && <div className={`flex-1 h-0.5 mb-4 mx-1 rounded-full ${done?"bg-emerald-500":"bg-slate-700"}`} />}
          </div>
        );
      })}
    </div>
  );
}

export function P2POrderPage({ orderId, mode, merchant, amountINR, grossQty, feeQty, netQty, createdAt, initialStatus="pending_payment", onStatusChange, onClose }: P2POrderPageProps) {
  const resumedSecs = Math.max(0, ORDER_TIMEOUT_SECONDS - Math.floor((Date.now()-createdAt)/1000));
  const [status, setStatus] = useState<P2POrderStatus>(initialStatus);
  const [secondsLeft, setSecondsLeft] = useState(initialStatus==="pending_payment"?resumedSecs:ORDER_TIMEOUT_SECONDS);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id:1, sender:"system", text:"Order created. Please complete payment within 15 minutes.", time:new Date(createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) },
    { id:2, sender:"them",   text:`Hi! I'm ready. Please send ₹${amountINR.toLocaleString()} via ${merchant.payment.split(",")[0].trim()}.`, time:new Date(createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [appealReason, setAppealReason] = useState("");
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const stepIndex = status==="pending_payment"?0:status==="payment_made"?1:status==="completed"?3:1;

  function changeStatus(s: P2POrderStatus) { setStatus(s); onStatusChange?.(s); }

  useEffect(() => {
    if (status!=="pending_payment") return;
    if (secondsLeft<=0) { changeStatus("cancelled"); addSystemMsg("Order expired — cancelled."); return; }
    const t = setTimeout(()=>setSecondsLeft(s=>s-1),1000);
    return ()=>clearTimeout(t);
  },[secondsLeft,status]);

  useEffect(()=>{ chatEndRef.current?.scrollIntoView({behavior:"smooth"}); },[chatMessages]);

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
    if (!appealReason.trim()) return;
    changeStatus("appeal"); setShowAppealForm(false);
    addSystemMsg(`Appeal submitted: "${appealReason}". Support will review within 24h.`); setAppealReason("");
  }
  function copyTo(text: string) { navigator.clipboard.writeText(text).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),1500); }

  const isBuy=mode==="buy";
  const accentBg=isBuy?"bg-emerald-500/10 border-emerald-500/20":"bg-red-500/10 border-red-500/20";
  const accentBtn=isBuy?"bg-emerald-500 hover:bg-emerald-400":"bg-red-500 hover:bg-red-400";
  const paymentDetails=[
    {label:"Payment Method",value:merchant.payment.split(",")[0].trim()},
    {label:"Account Name",  value:"DEX.ai Escrow Account"},
    {label:"Account / UPI", value:"dexai@upi"},
    {label:"Reference",     value:orderId},
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-[#0b1120] border border-slate-700/60 rounded-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top bar */}
        <div className={`px-6 py-4 border-b ${accentBg} flex items-center justify-between flex-shrink-0`}>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><ArrowLeft className="h-5 w-5"/></button>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded text-xs font-bold text-white ${isBuy?"bg-emerald-500":"bg-red-500"}`}>{isBuy?"BUY":"SELL"}</span>
                <span className="font-bold text-white text-base">DEXUSD · Order #{orderId}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{new Date(createdAt).toLocaleString([],{dateStyle:"medium",timeStyle:"short"})}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {status==="pending_payment"&&<Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 gap-1.5"><Clock className="h-3 w-3"/>Awaiting Payment</Badge>}
            {status==="payment_made"   &&<Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30 gap-1.5"><Clock className="h-3 w-3"/>Confirming…</Badge>}
            {status==="completed"      &&<Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 gap-1.5"><CheckCircle2 className="h-3 w-3"/>Completed</Badge>}
            {status==="cancelled"      &&<Badge className="bg-red-500/20 text-red-300 border border-red-500/30 gap-1.5"><Ban className="h-3 w-3"/>Cancelled</Badge>}
            {status==="appeal"         &&<Badge className="bg-orange-500/20 text-orange-300 border border-orange-500/30 gap-1.5"><AlertTriangle className="h-3 w-3"/>Under Appeal</Badge>}
            <button onClick={onClose} className="text-slate-400 hover:text-white ml-2"><X className="h-5 w-5"/></button>
          </div>
        </div>
        {/* Steps */}
        {status!=="cancelled"&&<div className="px-8 py-4 border-b border-slate-700/40 bg-slate-900/20 flex-shrink-0"><StepBar current={stepIndex}/></div>}
        {/* Body */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-700/40">
          {/* LEFT */}
          <div className="md:w-[55%] overflow-y-auto px-6 py-5 space-y-5">
            {status==="pending_payment"&&(
              <div className={`rounded-xl border px-5 py-4 flex items-center justify-between ${secondsLeft<120?"bg-red-500/10 border-red-500/30":"bg-amber-500/10 border-amber-500/20"}`}>
                <div className="flex items-center gap-2"><Clock className={`h-4 w-4 ${secondsLeft<120?"text-red-400":"text-amber-400"}`}/><span className="text-sm font-medium text-white">Time remaining to pay</span></div>
                <span className={`text-2xl font-mono font-black ${secondsLeft<120?"text-red-400":"text-amber-300"}`}>{formatTime(secondsLeft)}</span>
              </div>
            )}
            {status==="cancelled"&&(
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-center">
                <Ban className="h-8 w-8 text-red-400 mx-auto mb-2"/><p className="text-white font-bold">Order Cancelled</p>
                <p className="text-slate-400 text-sm mt-1">No funds transferred.</p>
                <Button onClick={onClose} className="mt-4 bg-slate-700 hover:bg-slate-600 text-white text-sm">Back to P2P</Button>
              </div>
            )}
            {status==="completed"&&(
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2"/>
                <p className="text-white font-bold text-lg">Order Completed! 🎉</p>
                <p className="text-slate-300 text-sm mt-1"><span className="text-emerald-400 font-bold">{netQty.toFixed(4)} DEXUSD</span> credited to your wallet.</p>
                <div className="mt-4 flex justify-center gap-1">{[1,2,3,4,5].map(s=><Star key={s} className="h-6 w-6 text-amber-400 fill-amber-400 cursor-pointer hover:scale-110 transition-transform"/>)}</div>
                <p className="text-xs text-slate-400 mt-1">Rate your experience</p>
                <Button onClick={onClose} className="mt-4 bg-emerald-500 hover:bg-emerald-400 text-white text-sm">Back to P2P</Button>
              </div>
            )}
            {/* Summary */}
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">Order Summary</p>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {label:"You Pay",     value:`₹${amountINR.toLocaleString()}`},
                  {label:"Price/DEXUSD",value:`₹${merchant.price}`},
                  {label:"Gross DEXUSD",value:grossQty.toFixed(4)},
                  {label:"Fee (1%)",     value:`-${feeQty.toFixed(4)} DEXUSD`},
                  {label:"You Receive", value:`${netQty.toFixed(4)} DEXUSD`,highlight:true},
                  {label:"Order ID",    value:orderId},
                ].map(({label,value,highlight})=>(
                  <div key={label} className={`rounded-xl px-3.5 py-3 border ${highlight?"bg-emerald-500/10 border-emerald-500/30":"bg-slate-800/60 border-slate-700/30"}`}>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest">{label}</p>
                    <p className={`text-sm font-semibold mt-0.5 ${highlight?"text-emerald-400":"text-white"}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
            <Separator className="bg-slate-700/40"/>
            {/* Seller */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-sm font-black text-white flex-shrink-0">{merchant.avatar}</div>
              <div>
                <div className="flex items-center gap-1.5"><span className="font-semibold text-sm text-white">{merchant.name}</span><Shield className="h-3.5 w-3.5 text-cyan-400"/></div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                  <span>{merchant.trades.toLocaleString()} trades</span><span>·</span>
                  <span>{merchant.completion}% completion</span><span>·</span>
                  <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-amber-400 fill-amber-400"/>{merchant.rating}</span>
                </div>
              </div>
            </div>
            {/* Payment instructions */}
            {(status==="pending_payment"||status==="payment_made")&&(<>
              <Separator className="bg-slate-700/40"/>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">Payment Instructions</p>
                <div className="space-y-2">
                  {paymentDetails.map(({label,value})=>(
                    <div key={label} className="flex items-center justify-between bg-slate-800/50 border border-slate-700/30 rounded-xl px-4 py-3">
                      <div><p className="text-[9px] text-slate-500 uppercase tracking-widest">{label}</p><p className="text-sm font-semibold text-white mt-0.5">{value}</p></div>
                      <button onClick={()=>copyTo(value)} className="text-slate-400 hover:text-cyan-400 transition-colors"><Copy className="h-4 w-4"/></button>
                    </div>
                  ))}
                </div>
                {copied&&<p className="text-xs text-emerald-400 mt-1.5">Copied!</p>}
                <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-400"/>Always include the Reference ID in your payment remarks.
                </div>
              </div>
              <div className="flex flex-col gap-2.5 pt-1">
                {status==="pending_payment"&&<Button onClick={handleIvePaid} className={`w-full h-11 font-bold rounded-xl ${accentBtn} text-white`}><CheckCircle2 className="h-4 w-4 mr-2"/>I've Sent the Payment</Button>}
                {status==="payment_made"&&<Button disabled className="w-full h-11 font-bold rounded-xl bg-blue-600/50 text-blue-300 cursor-not-allowed"><Clock className="h-4 w-4 mr-2 animate-spin"/>Waiting for Seller…</Button>}
                <div className="flex gap-2">
                  {status==="pending_payment"&&<Button onClick={handleCancel} variant="outline" className="flex-1 h-10 text-sm border-red-500/40 text-red-400 hover:bg-red-500/10"><Ban className="h-4 w-4 mr-1.5"/>Cancel Order</Button>}
                  {!showAppealForm&&<Button onClick={()=>setShowAppealForm(true)} variant="outline" className="flex-1 h-10 text-sm border-orange-500/40 text-orange-400 hover:bg-orange-500/10"><AlertTriangle className="h-4 w-4 mr-1.5"/>Raise Appeal</Button>}
                </div>
                {showAppealForm&&(
                  <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 space-y-3">
                    <p className="text-sm font-semibold text-orange-300">Describe your issue</p>
                    <textarea value={appealReason} onChange={e=>setAppealReason(e.target.value)} rows={3} placeholder="Explain the issue in detail…" className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-orange-400"/>
                    <div className="flex gap-2">
                      <Button onClick={handleAppeal} className="flex-1 h-9 text-sm bg-orange-500 hover:bg-orange-400 text-white">Submit Appeal</Button>
                      <Button onClick={()=>setShowAppealForm(false)} variant="outline" className="flex-1 h-9 text-sm border-slate-600 text-slate-400">Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            </>)}
          </div>
          {/* RIGHT — Chat */}
          <div className="md:w-[45%] flex flex-col bg-[#07101e]/60">
            <div className="px-5 py-3.5 border-b border-slate-700/40 flex items-center gap-2 flex-shrink-0">
              <MessageCircle className="h-4 w-4 text-cyan-400"/>
              <span className="font-semibold text-sm text-white">Order Chat</span>
              <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block animate-pulse"/>{merchant.name} online
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
              {chatMessages.map(msg=>(
                <div key={msg.id} className={`flex ${msg.sender==="me"?"justify-end":msg.sender==="system"?"justify-center":"justify-start"}`}>
                  {msg.sender==="system"
                    ?<div className="max-w-[85%] bg-slate-700/40 text-slate-400 text-[11px] text-center px-3 py-1.5 rounded-lg border border-slate-700/30">{msg.text}</div>
                    :msg.sender==="them"
                      ?<div className="max-w-[78%] space-y-0.5"><div className="bg-slate-700/60 border border-slate-600/30 rounded-2xl rounded-tl-sm px-3.5 py-2.5"><p className="text-sm text-white leading-snug">{msg.text}</p></div><p className="text-[10px] text-slate-500 pl-1">{msg.time}</p></div>
                      :<div className="max-w-[78%] space-y-0.5"><div className="bg-cyan-600/30 border border-cyan-500/20 rounded-2xl rounded-tr-sm px-3.5 py-2.5"><p className="text-sm text-white leading-snug">{msg.text}</p></div><p className="text-[10px] text-slate-500 text-right pr-1">{msg.time}</p></div>
                  }
                </div>
              ))}
              <div ref={chatEndRef}/>
            </div>
            <div className="px-4 py-2 border-t border-slate-700/30 flex gap-2 overflow-x-auto scrollbar-none flex-shrink-0">
              {["Payment sent ✓","Please check","Any issues?"].map(q=>(
                <button key={q} onClick={()=>setChatInput(q)} className="whitespace-nowrap text-[11px] px-3 py-1 rounded-full border border-slate-600/50 text-slate-400 hover:text-white hover:border-slate-500 transition-colors bg-slate-800/40 flex-shrink-0">{q}</button>
              ))}
            </div>
            <div className="px-4 pb-4 pt-2 flex gap-2 flex-shrink-0">
              <Input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Type a message…" className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 text-sm h-10"/>
              <Button onClick={sendChat} size="icon" className="h-10 w-10 flex-shrink-0 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl"><Send className="h-4 w-4"/></Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
