import { useEffect,useMemo,useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select";
import { createP2PListing,formatFiat,formatFiatPrice,getP2PPaymentAccounts,getP2PPrice,parseBI2XUSDAmount,P2P_ASSETS,type P2PAdSide,type P2PAsset,type P2PListing,type P2PPaymentMethod } from "@/lib/p2pApi";
import { useP2PCatalog } from "@/lib/p2pCatalog";

type Props={open:boolean;onOpenChange:(open:boolean)=>void;side:P2PAdSide;username:string;price:string;onUsernameEstablished:(username:string)=>void;onCreated:(listing:P2PListing)=>void};

export function PostAdsDialog({open,onOpenChange,side,username,price:initialPrice,onUsernameEstablished,onCreated}:Props){
	const {countries}=useP2PCatalog();
	const [countryCode,setCountryCode]=useState("IN");
	const [price,setPrice]=useState(initialPrice);
	const [priceError,setPriceError]=useState("");
	const [asset,setAsset]=useState<P2PAsset>("BI2XUSD");
	const [amount,setAmount]=useState("0");
	const [minOrderFiat,setMinOrderFiat]=useState("0.00");
	const [maxOrderFiat,setMaxOrderFiat]=useState("0.00");
	const [name,setName]=useState("");
	const [methods,setMethods]=useState<P2PPaymentMethod[]>([]);
	const [submitting,setSubmitting]=useState(false);
	const [error,setError]=useState("");
	const [configuredMethods,setConfiguredMethods]=useState<P2PPaymentMethod[]>([]);
	const country=countries.find(c=>c.code===countryCode)??countries[0];
	const currency=country?.currency??"INR";
	const countryMethods=useMemo(()=>country?.methods.map(m=>m.id)??[],[country]);
	const totalAdValue=Math.max(0,Number(amount||0)*Number(price||0));
	const maximumLimitExceeded=Number(maxOrderFiat)>totalAdValue;

	useEffect(()=>{if(open){setCountryCode("IN");setAsset("BI2XUSD");setAmount("0");setMinOrderFiat("0.00");setMaxOrderFiat("0.00");setName(username);setMethods([]);setError("");void getP2PPaymentAccounts().then(({accounts})=>setConfiguredMethods(accounts.map(account=>account.method))).catch(()=>setConfiguredMethods([]))}},[open,side,username]);
	// Today's price is per asset AND currency, so refetch when either changes.
	useEffect(()=>{if(!open||!currency)return;let live=true;setPriceError("");void getP2PPrice(asset,currency).then(({price:p})=>{if(live)setPrice(p.price)}).catch(e=>{if(live){setPrice("");setPriceError(e instanceof Error?e.message:"Price unavailable")}});return()=>{live=false}},[open,asset,currency]);
	// Pre-select a sensible default method whenever the country (or the set of
	// configured accounts) changes: buyers get the country's first method; sellers
	// the first method they have actually configured for it.
	useEffect(()=>{if(!open)return;setMethods(current=>{const valid=current.filter(m=>countryMethods.includes(m));if(valid.length>0)return valid;const first=side==="SELL"?countryMethods.find(m=>configuredMethods.includes(m)):countryMethods[0];return first?[first]:[]})},[open,side,countryMethods,configuredMethods]);
	function toggleMethod(method:P2PPaymentMethod){setMethods(current=>current.includes(method)?current.filter(item=>item!==method):[...current,method])}
	function updateAmount(value:string){if(/^\d*(?:\.\d{0,6})?$/.test(value))setAmount(value)}
	function normalizeAmount(){const value=Number(amount);const normalized=Number.isFinite(value)&&value>=0?value:0;const nextTotal=normalized*Number(price||0);setAmount(String(normalized));if(Number(maxOrderFiat)<=0||Number(maxOrderFiat)>nextTotal)setMaxOrderFiat(nextTotal.toFixed(2))}
	function updateFiat(setter:(value:string)=>void,value:string){if(/^\d*(?:\.\d{0,2})?$/.test(value))setter(value)}
	function normalizeFiat(value:string,setter:(value:string)=>void){const parsed=Number(value);setter(Number.isFinite(parsed)&&parsed>=0?parsed.toFixed(2):"0.00")}
	async function submit(){
		try{
			setSubmitting(true);setError("");
			if(methods.length===0)throw new Error("Select at least one payment method");
				if(!(Number(price)>0))throw new Error(priceError||`Today's ${asset}/${currency} price has not been entered`);
			if(Number(minOrderFiat)<=0||Number(maxOrderFiat)<=0)throw new Error("Enter positive minimum and maximum order limits");
			if(Number(minOrderFiat)>Number(maxOrderFiat))throw new Error("Minimum order limit cannot exceed maximum order limit");
			if(Number(maxOrderFiat)>totalAdValue)throw new Error(`Maximum order limit cannot exceed ${formatFiat(totalAdValue,currency)}`);
			const {listing}=await createP2PListing(asset,side,parseBI2XUSDAmount(amount),minOrderFiat,maxOrderFiat,methods,username?undefined:name.trim());
			if(!username)onUsernameEstablished(name.trim());
			onCreated(listing);onOpenChange(false);
		}catch(e){setError(e instanceof Error?e.message:"Could not post ad")}finally{setSubmitting(false)}
	}

	return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto"><DialogHeader><DialogTitle>Post {side==="BUY"?"Buy":"Sell"} {asset} ad</DialogTitle><DialogDescription>Set the total amount, per-order limits, and accepted payment methods.</DialogDescription></DialogHeader><div className="space-y-5">
		{username?<div className="rounded-lg border bg-muted/30 p-4 text-sm"><span className="text-muted-foreground">P2P username</span><strong className="float-right">{username}</strong></div>:<div className="space-y-2"><label className="text-sm font-medium">Choose your permanent P2P username</label><Input value={name} maxLength={24} onChange={event=>setName(event.target.value.replace(/[^A-Za-z0-9_]/g,""))} placeholder="3-24 letters, numbers, or underscores"/><p className="text-xs text-muted-foreground">This username is permanent and cannot be changed later.</p></div>}
		<div className="space-y-2"><label className="text-sm font-medium">Asset</label><Select value={asset} onValueChange={value=>setAsset(value as P2PAsset)}><SelectTrigger className="max-w-40"><SelectValue/></SelectTrigger><SelectContent>{P2P_ASSETS.map(item=><SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
		<div className="space-y-2"><label className="text-sm font-medium">{asset} amount to {side==="BUY"?"buy":"sell"}</label><div className="flex gap-2"><Input aria-label={`${asset} amount`} inputMode="decimal" value={amount} onChange={event=>updateAmount(event.target.value)} onBlur={normalizeAmount}/><span className="flex items-center rounded-md bg-muted/30 px-3">{asset}</span></div>
		{/* <p className="text-xs text-muted-foreground">Enter up to 6 decimal places.</p> */}
		</div>
		<div className="space-y-2"><label className="text-sm font-medium">Order limits per transaction</label><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div className="flex gap-2"><Input aria-label="Minimum order limit" inputMode="decimal" value={minOrderFiat} onChange={event=>updateFiat(setMinOrderFiat,event.target.value)} onBlur={()=>normalizeFiat(minOrderFiat,setMinOrderFiat)} placeholder="Minimum"/><span className="flex items-center rounded-md bg-muted/30 px-3">{currency}</span></div><div className="flex gap-2"><Input aria-label="Maximum order limit" inputMode="decimal" max={totalAdValue.toFixed(2)} value={maxOrderFiat} onChange={event=>updateFiat(setMaxOrderFiat,event.target.value)} onBlur={()=>{const value=Math.min(Number(maxOrderFiat)||0,totalAdValue);setMaxOrderFiat(value.toFixed(2))}} placeholder="Maximum"/><span className="flex items-center rounded-md bg-muted/30 px-3">{currency}</span></div></div><p className={`text-xs ${maximumLimitExceeded?"text-destructive":"text-muted-foreground"}`}>{maximumLimitExceeded?`Maximum limit cannot exceed ${formatFiat(totalAdValue,currency)}.`:`Maximum allowed for this ad: ${formatFiat(totalAdValue,currency)}.`}</p></div>
		<div className="space-y-2"><label className="text-sm font-medium">Country / currency</label><Select value={country?.code} onValueChange={code=>{setCountryCode(code);setMethods([])}}><SelectTrigger aria-label="Country" className="max-w-sm"><SelectValue/></SelectTrigger><SelectContent>{countries.map(c=><SelectItem key={c.code} value={c.code}>{c.name} — {c.currency} ({c.symbol})</SelectItem>)}</SelectContent></Select>{price&&<p className="text-xs text-muted-foreground">Current price: {formatFiatPrice(price,currency)} / {asset}</p>}{priceError&&<p className="text-xs text-destructive">{priceError}</p>}</div>
		<div className="space-y-3"><label className="text-sm font-medium">Payment methods</label><div className="grid grid-cols-1 gap-2 rounded-lg border p-4 sm:grid-cols-2">{countryMethods.map(method=>{const disabled=side==="SELL"&&!configuredMethods.includes(method);return <label key={method} className={`flex items-center gap-2 text-sm ${disabled?"cursor-not-allowed text-muted-foreground":"cursor-pointer"}`}><Checkbox checked={methods.includes(method)} disabled={disabled} onCheckedChange={()=>toggleMethod(method)}/><span>{method}{disabled?" (not configured)":""}</span></label>})}
		</div>
		{/* <p className="text-xs text-muted-foreground">{side==="SELL"?"Configure receiving accounts in P2P Wallet, then select the methods for this ad.":"Select the methods you can use to pay a counterparty seller."}</p> */}
		</div>
		{/* {side==="SELL"&&<p className="text-xs text-muted-foreground">Posting reserves {sellerBI2XUSDDebitWithFee(amount)} BI2XUSD from your P2P wallet, including the 1% seller fee. Transfer funds separately before posting.</p>} */}
		{error&&<p className="text-sm text-destructive">{error}</p>}<div className="flex gap-3"><Button className="flex-1" disabled={submitting||methods.length===0||Number(amount)<=0||Number(minOrderFiat)<=0||Number(maxOrderFiat)<Number(minOrderFiat)||maximumLimitExceeded||(!username&&name.length<3)} onClick={submit}>{submitting?"Posting…":`Post ${side==="BUY"?"Buy":"Sell"} Ad`}</Button><Button variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button></div>
	</div></DialogContent></Dialog>;
}
