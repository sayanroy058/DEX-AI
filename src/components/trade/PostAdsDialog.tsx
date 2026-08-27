import { useEffect,useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog,DialogContent,DialogHeader,DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select";
import { createP2PListing,formatINR,parseUSDC,P2P_PAYMENT_METHODS,type P2PListing,type P2PPaymentMethod } from "@/lib/p2pApi";

type Props={open:boolean;onOpenChange:(open:boolean)=>void;price:string;totalUSDC:number;availableUSDC:number;initialAmount?:string;initialPayment?:P2PPaymentMethod;onCreated:(listing:P2PListing)=>void};
export function PostAdsDialog({open,onOpenChange,price,totalUSDC,availableUSDC,initialAmount="",initialPayment="UPI",onCreated}:Props){
	const [amount,setAmount]=useState("");const [method,setMethod]=useState<P2PPaymentMethod>("UPI");const [submitting,setSubmitting]=useState(false);const [error,setError]=useState("");
	useEffect(()=>{if(open){setAmount(initialAmount);setMethod(initialPayment);setError("")}},[open,initialAmount,initialPayment]);
	const gross=Number(amount||0)*Number(price||0);const valid=Number(amount)>0&&Number(amount)<=availableUSDC;const reserved=Math.max(0,totalUSDC-availableUSDC);
	async function submit(){try{setSubmitting(true);setError("");const {listing}=await createP2PListing(parseUSDC(amount),method);onCreated(listing);onOpenChange(false)}catch(e){setError(e instanceof Error?e.message:"Could not post ad")}finally{setSubmitting(false)}}
	return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Post USDC sell ad</DialogTitle></DialogHeader><div className="space-y-5">
	<div className="rounded-lg border bg-muted/30 p-4 text-sm"><BalanceRow label="Today’s database price" value={`${formatINR(price)} / USDC`}/><BalanceRow label="Total balance" value={`${totalUSDC.toLocaleString()} USDC`}/><BalanceRow label="Reserved / pending" value={`${reserved.toLocaleString()} USDC`}/><BalanceRow label="Available to sell" value={`${availableUSDC.toLocaleString()} USDC`}/></div>
	<div className="space-y-2"><label className="text-sm font-medium">USDC amount to sell</label><Input type="number" min="0" step="0.000001" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Enter USDC amount"/></div>
	<div className="space-y-2"><label className="text-sm font-medium">Payment method</label><Select value={method} onValueChange={v=>setMethod(v as P2PPaymentMethod)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{P2P_PAYMENT_METHODS.map(item=><SelectItem value={item} key={item}>{item}</SelectItem>)}</SelectContent></Select></div>
	<div className="rounded-lg border p-4 text-sm"><BalanceRow label="Gross sale value" value={formatINR(gross)}/><BalanceRow label="Seller fee (1%)" value={formatINR(gross*.01)}/><BalanceRow label="You receive" value={formatINR(gross*.99)} strong/></div>
	{Number(amount)>availableUSDC&&<p className="text-sm text-destructive">Only {availableUSDC.toLocaleString()} USDC is currently available to sell.</p>}{error&&<p className="text-sm text-destructive">{error}</p>}<div className="flex gap-3"><Button className="flex-1" disabled={!valid||submitting} onClick={submit}>{submitting?"Posting…":"Post sell ad"}</Button><Button variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button></div></div></DialogContent></Dialog>;
}
function BalanceRow({label,value,strong=false}:{label:string;value:string;strong?:boolean}){return <div className={`flex justify-between gap-4 py-1 ${strong?"font-semibold":""}`}><span>{label}</span><strong>{value}</strong></div>}
