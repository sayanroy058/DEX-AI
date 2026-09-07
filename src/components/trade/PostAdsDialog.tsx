import { useEffect,useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createP2PListing,formatINR,getP2PPaymentAccounts,parseBIUSDAmount,P2P_PAYMENT_METHODS,sellerBIUSDDebitWithFee,type P2PAdSide,type P2PListing,type P2PPaymentMethod } from "@/lib/p2pApi";

type Props={open:boolean;onOpenChange:(open:boolean)=>void;side:P2PAdSide;username:string;price:string;onUsernameEstablished:(username:string)=>void;onCreated:(listing:P2PListing)=>void};

export function PostAdsDialog({open,onOpenChange,side,username,price,onUsernameEstablished,onCreated}:Props){
	const [amount,setAmount]=useState("0");
	const [minOrderFiat,setMinOrderFiat]=useState("0.00");
	const [maxOrderFiat,setMaxOrderFiat]=useState("0.00");
	const [name,setName]=useState("");
	const [methods,setMethods]=useState<P2PPaymentMethod[]>(["UPI"]);
	const [submitting,setSubmitting]=useState(false);
	const [error,setError]=useState("");
	const [configuredMethods,setConfiguredMethods]=useState<P2PPaymentMethod[]>([]);
	const totalAdValue=Math.max(0,Number(amount||0)*Number(price||0));
	const maximumLimitExceeded=Number(maxOrderFiat)>totalAdValue;

	useEffect(()=>{if(open){setAmount("0");setMinOrderFiat("0.00");setMaxOrderFiat("0.00");setName(username);setMethods(side==="BUY"?["UPI"]:[]);setError("");void getP2PPaymentAccounts().then(({accounts})=>{const configured=accounts.map(account=>account.method);setConfiguredMethods(configured);if(side==="SELL"&&configured.length)setMethods([configured[0]])}).catch(()=>setConfiguredMethods([]))}},[open,side,username]);
	function toggleMethod(method:P2PPaymentMethod){setMethods(current=>current.includes(method)?current.filter(item=>item!==method):[...current,method])}
	function updateAmount(value:string){if(/^\d*(?:\.\d{0,6})?$/.test(value))setAmount(value)}
	function normalizeAmount(){const value=Number(amount);const normalized=Number.isFinite(value)&&value>=0?value:0;const nextTotal=normalized*Number(price||0);setAmount(String(normalized));if(Number(maxOrderFiat)<=0||Number(maxOrderFiat)>nextTotal)setMaxOrderFiat(nextTotal.toFixed(2))}
	function updateFiat(setter:(value:string)=>void,value:string){if(/^\d*(?:\.\d{0,2})?$/.test(value))setter(value)}
	function normalizeFiat(value:string,setter:(value:string)=>void){const parsed=Number(value);setter(Number.isFinite(parsed)&&parsed>=0?parsed.toFixed(2):"0.00")}
	async function submit(){
		try{
			setSubmitting(true);setError("");
			if(methods.length===0)throw new Error("Select at least one payment method");
			if(Number(minOrderFiat)<=0||Number(maxOrderFiat)<=0)throw new Error("Enter positive minimum and maximum order limits");
			if(Number(minOrderFiat)>Number(maxOrderFiat))throw new Error("Minimum order limit cannot exceed maximum order limit");
			if(Number(maxOrderFiat)>totalAdValue)throw new Error(`Maximum order limit cannot exceed ${formatINR(totalAdValue)}`);
			const {listing}=await createP2PListing(side,parseBIUSDAmount(amount),minOrderFiat,maxOrderFiat,methods,username?undefined:name.trim());
			if(!username)onUsernameEstablished(name.trim());
			onCreated(listing);onOpenChange(false);
		}catch(e){setError(e instanceof Error?e.message:"Could not post ad")}finally{setSubmitting(false)}
	}

	return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto"><DialogHeader><DialogTitle>Post {side==="BUY"?"Buy":"Sell"} BIUSD ad</DialogTitle><DialogDescription>Set the total amount, per-order limits, and accepted payment methods.</DialogDescription></DialogHeader><div className="space-y-5">
		{username?<div className="rounded-lg border bg-muted/30 p-4 text-sm"><span className="text-muted-foreground">P2P username</span><strong className="float-right">{username}</strong></div>:<div className="space-y-2"><label className="text-sm font-medium">Choose your permanent P2P username</label><Input value={name} maxLength={24} onChange={event=>setName(event.target.value.replace(/[^A-Za-z0-9_]/g,""))} placeholder="3-24 letters, numbers, or underscores"/><p className="text-xs text-muted-foreground">This username is permanent and cannot be changed later.</p></div>}
		<div className="space-y-2"><label className="text-sm font-medium">BIUSD amount to {side==="BUY"?"buy":"sell"}</label><div className="flex gap-2"><Input aria-label="BIUSD amount" inputMode="decimal" value={amount} onChange={event=>updateAmount(event.target.value)} onBlur={normalizeAmount}/><span className="flex items-center rounded-md bg-muted/30 px-3">BIUSD</span></div>
		{/* <p className="text-xs text-muted-foreground">Enter up to 6 decimal places.</p> */}
		</div>
		<div className="space-y-2"><label className="text-sm font-medium">Order limits per transaction</label><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div className="flex gap-2"><Input aria-label="Minimum order limit" inputMode="decimal" value={minOrderFiat} onChange={event=>updateFiat(setMinOrderFiat,event.target.value)} onBlur={()=>normalizeFiat(minOrderFiat,setMinOrderFiat)} placeholder="Minimum"/><span className="flex items-center rounded-md bg-muted/30 px-3">INR</span></div><div className="flex gap-2"><Input aria-label="Maximum order limit" inputMode="decimal" max={totalAdValue.toFixed(2)} value={maxOrderFiat} onChange={event=>updateFiat(setMaxOrderFiat,event.target.value)} onBlur={()=>{const value=Math.min(Number(maxOrderFiat)||0,totalAdValue);setMaxOrderFiat(value.toFixed(2))}} placeholder="Maximum"/><span className="flex items-center rounded-md bg-muted/30 px-3">INR</span></div></div><p className={`text-xs ${maximumLimitExceeded?"text-destructive":"text-muted-foreground"}`}>{maximumLimitExceeded?`Maximum limit cannot exceed ${formatINR(totalAdValue)}.`:`Maximum allowed for this ad: ${formatINR(totalAdValue)}.`}</p></div>
		<div className="space-y-3"><label className="text-sm font-medium">Payment methods</label><div className="grid grid-cols-1 gap-2 rounded-lg border p-4 sm:grid-cols-2">{P2P_PAYMENT_METHODS.map(method=>{const disabled=side==="SELL"&&!configuredMethods.includes(method);return <label key={method} className={`flex items-center gap-2 text-sm ${disabled?"cursor-not-allowed text-muted-foreground":"cursor-pointer"}`}><Checkbox checked={methods.includes(method)} disabled={disabled} onCheckedChange={()=>toggleMethod(method)}/><span>{method}{disabled?" (not configured)":""}</span></label>})}
		</div>
		{/* <p className="text-xs text-muted-foreground">{side==="SELL"?"Configure receiving accounts in P2P Wallet, then select the methods for this ad.":"Select the methods you can use to pay a counterparty seller."}</p> */}
		</div>
		{/* {side==="SELL"&&<p className="text-xs text-muted-foreground">Posting reserves {sellerBIUSDDebitWithFee(amount)} BIUSD from your P2P wallet, including the 1% seller fee. Transfer funds separately before posting.</p>} */}
		{error&&<p className="text-sm text-destructive">{error}</p>}<div className="flex gap-3"><Button className="flex-1" disabled={submitting||methods.length===0||Number(amount)<=0||Number(minOrderFiat)<=0||Number(maxOrderFiat)<Number(minOrderFiat)||maximumLimitExceeded||(!username&&name.length<3)} onClick={submit}>{submitting?"Posting…":`Post ${side==="BUY"?"Buy":"Sell"} Ad`}</Button><Button variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button></div>
	</div></DialogContent></Dialog>;
}
