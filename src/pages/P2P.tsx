import { useCallback,useEffect,useMemo,useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog,DialogContent,DialogHeader,DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select";
import { ArrowRight,ClipboardList,Clock,Filter,Lock,Search,Shield,TrendingUp,Users,Wallet } from "lucide-react";
import { useWallet } from "@/lib/useWallet";
import { effectiveP2PMaxOrderFiat,formatINR,formatBI2XUSDAmount,getP2PFeeRates,getP2PListings,getP2PPrice,grossBI2XUSDAmountForNet,netBI2XUSDAmountAfterBuyerFee,parseBI2XUSDAmount,P2P_PAYMENT_METHODS,sellerBI2XUSDDebitWithFee,takeP2PListing,bi2xusdAmountFromFiat,bi2xusdFeeAmount,type P2PListing,type P2POrder,type P2PPaymentMethod } from "@/lib/p2pApi";

const message=(error:unknown)=>error instanceof Error?error.message:"Something went wrong";
const validBI2XUSDInput=(value:string)=>/^\d*(?:\.\d{0,6})?$/.test(value);
const validFiatInput=(value:string)=>/^\d*(?:\.\d{0,2})?$/.test(value);

export default function P2P(){
	const {userId}=useWallet();
	const [action,setAction]=useState<"BUY"|"SELL">("BUY");
	const [price,setPrice]=useState("");
	const [priceDate,setPriceDate]=useState("");
	const [listings,setListings]=useState<P2PListing[]>([]);
	const [loading,setLoading]=useState(true);
	const [error,setError]=useState("");
	const [payment,setPayment]=useState("All");
	const [amount,setAmountState]=useState("");
	const [quickBI2XUSD,setQuickBI2XUSD]=useState("");
	const [quickINR,setQuickINR]=useState("");
	const [selected,setSelected]=useState<P2PListing|null>(null);
	const [quantity,setQuantityState]=useState("0");
	const [selectedPayment,setSelectedPayment]=useState<P2PPaymentMethod>("UPI");
	const [acting,setActing]=useState(false);
	const [order,setOrder]=useState<P2POrder|null>(null);
	// Real discount-adjusted rates (P2P-M2); default to the platform base 1%
	// until the fetch resolves so the UI shows a correct number immediately
	// for undiscounted users and briefly, harmlessly, for discounted ones.
	const [feeRates,setFeeRates]=useState({buyerRate:1,sellerRate:1});
	useEffect(()=>{getP2PFeeRates().then(r=>setFeeRates({buyerRate:Number(r.buyerRate)*100,sellerRate:Number(r.sellerRate)*100})).catch(()=>{})},[]);
	const setAmount=(value:string)=>{if(validBI2XUSDInput(value))setAmountState(value)};
	const setQuantity=(value:string)=>{if(validBI2XUSDInput(value))setQuantityState(value)};
	function updateQuickBI2XUSD(value:string){if(!validBI2XUSDInput(value))return;setQuickBI2XUSD(value);setQuickINR(value&&Number(price)>0?(Number(value)*Number(price)).toFixed(2):"")}
	function updateQuickINR(value:string){if(!validFiatInput(value))return;setQuickINR(value);setQuickBI2XUSD(value&&Number(price)>0?bi2xusdAmountFromFiat(value,price):"")}

	// P2P-L1: getP2PListings is now paginated server-side (default page size
	// 100, was unbounded); this page's own filtering (side/payment/amount)
	// still runs client-side over that one page rather than being pushed to
	// the server, so a market with more than 100 active ads for one side
	// would need real infinite-scroll/paging here to see the rest — accepted
	// for now since P2P volume is nowhere near that, revisit if it grows.
	const load=useCallback(async()=>{try{setLoading(true);setError("");const [{price:today},{listings:ads}]=await Promise.all([getP2PPrice("BI2XUSD"),getP2PListings(100,0)]);setPrice(today.price);setPriceDate(today.priceDate);setListings(ads)}catch(e){setError(message(e))}finally{setLoading(false)}},[]);
	useEffect(()=>{void load()},[load]);
	const wantedSide=action==="BUY"?"SELL":"BUY";
	const visible=useMemo(()=>listings.filter(ad=>{const requested=Number(amount||0);const fiat=requested*Number(ad.price);return ad.side===wantedSide&&(payment==="All"||ad.paymentMethods.includes(payment as P2PPaymentMethod))&&(!requested||(Number(formatBI2XUSDAmount(ad.remainingRaw))>=requested&&fiat>=Number(ad.minOrderFiat)&&fiat<=effectiveP2PMaxOrderFiat(ad)))}),[listings,wantedSide,payment,amount]);
	const total=visible.reduce((sum,ad)=>sum+Number(formatBI2XUSDAmount(ad.remainingRaw)),0);
	function open(ad:P2PListing,requestedQuantity?:string){const unitPrice=Number(ad.price);const remaining=Number(formatBI2XUSDAmount(ad.remainingRaw));const minimum=Math.ceil((Number(ad.minOrderFiat)/unitPrice)*1_000_000)/1_000_000;let initial=requestedQuantity?Number(requestedQuantity):Math.min(minimum,remaining);if(!requestedQuantity&&remaining>initial&&(remaining-initial)*unitPrice<Number(ad.minOrderFiat))initial=remaining;setSelected(ad);setQuantity(String(initial));setSelectedPayment(ad.paymentMethods[0]);setOrder(null);setError("")}
	async function take(){if(!selected)return;try{setActing(true);setError("");setOrder((await takeP2PListing(selected.id,parseBI2XUSDAmount(quantity),selectedPayment)).order);await load()}catch(e){setError(message(e))}finally{setActing(false)}}
	const match=visible.find(ad=>{const requested=Number(quickBI2XUSD);const remaining=Number(formatBI2XUSDAmount(ad.remainingRaw));const fiat=requested*Number(ad.price);const remainingAfter=remaining-requested;return ad.creatorId!==userId&&requested>0&&requested<=remaining&&fiat>=Number(ad.minOrderFiat)&&fiat<=effectiveP2PMaxOrderFiat(ad)&&(remainingAfter<=0||remainingAfter*Number(ad.price)>=Number(ad.minOrderFiat))});

	return <AppShell><div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background p-6"><div className="mx-auto max-w-7xl">
		<div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><h1 className="mb-2 text-4xl font-bold tracking-tight">{action==="BUY"?"Buy":"Sell"} BI2XUSD</h1><p className="text-muted-foreground">Trade BI2XUSD securely with authenticated P2P users in your local currency.</p></div><div className="flex flex-wrap items-center gap-2"><Button asChild variant="ghost" className="h-10 gap-2 text-primary"><Link to="/p2p/orders"><ClipboardList className="h-4 w-4"/>Orders</Link></Button><Button asChild variant="ghost"><Link to="/p2p/advertiser">My Ads</Link></Button><Button asChild variant="ghost"><Link to="/p2p/wallet"><Wallet className="mr-2 h-4 w-4"/>P2P Wallet</Link></Button></div></div>
		<div className="grid grid-cols-1 gap-6 lg:grid-cols-3"><div className="space-y-6 lg:col-span-2"><div className="flex gap-3"><Button onClick={()=>setAction("BUY")} className={`h-11 min-w-36 px-10 font-semibold ${action==="BUY"?"bg-buy text-buy-foreground":"bg-muted text-muted-foreground"}`}>Buy BI2XUSD</Button><Button onClick={()=>setAction("SELL")} variant={action==="SELL"?"default":"outline"} className={`h-11 min-w-36 px-10 font-semibold ${action==="SELL"?"bg-red-500 text-white":"border border-border"}`}>Sell BI2XUSD</Button></div>
			<Card className="border-border/50 bg-card/30 p-6 backdrop-blur-sm"><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><div><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Minimum available</label><Input className="mt-2 bg-background/50" placeholder="0 BI2XUSD" value={amount} onChange={event=>setAmount(event.target.value)}/></div><div><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment method</label><Select value={payment} onValueChange={setPayment}><SelectTrigger className="mt-2 bg-background/50"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="All">All</SelectItem>{P2P_PAYMENT_METHODS.map(item=><SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div></div></Card>
			<div className="flex items-center gap-2"><Badge variant="secondary"><Users className="mr-1 h-3 w-3"/>P2P advertisers</Badge><Button variant="ghost" size="sm"><Filter className="mr-1 h-4 w-4"/>Filter</Button></div>
			<Card className="overflow-hidden border-border/50 bg-card/20"><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead><tr className="border-b bg-muted/20"><th className="px-4 py-3 text-left">Advertiser</th><th className="px-4 py-3 text-center">Available / Limits</th><th className="px-4 py-3 text-center">Payment Methods</th><th className="px-4 py-3 text-center">Option</th></tr></thead><tbody>{loading?<tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Loading database listings…</td></tr>:visible.length===0?<tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No matching BI2XUSD ads found.</td></tr>:visible.map(ad=>{const own=userId===ad.creatorId;return <tr key={ad.id} className="border-b last:border-0"><td className="px-4 py-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">{ad.username.slice(0,2).toUpperCase()}</div><div><div className="flex items-center gap-2 font-semibold">{ad.username}<Shield className="h-3 w-3 text-primary"/></div><div className="text-xs text-muted-foreground">{ad.ratedOrders30d>0?`${ad.completedOrders30d} trades · ${Number(ad.completionRate30d).toFixed(2)}% completion`:"New advertiser"}</div></div></div></td><td className="px-4 py-4 text-center"><div className="font-semibold">{formatBI2XUSDAmount(ad.remainingRaw)} BI2XUSD</div><div className="mt-1 text-xs text-muted-foreground">Limits {formatINR(ad.minOrderFiat)} – {formatINR(effectiveP2PMaxOrderFiat(ad))}</div></td><td className="px-4 py-4 text-center"><div className="flex flex-wrap justify-center gap-1">{ad.paymentMethods.map(method=><Badge key={method} variant="secondary">{method}</Badge>)}</div></td><td className="px-4 py-4 text-center">{own?<Badge variant="outline">Your ad</Badge>:<Button size="sm" onClick={()=>open(ad)} className={ad.side==="SELL"?"bg-buy text-buy-foreground":"bg-red-500 text-white"}>{ad.side==="SELL"?"BUY BI2XUSD":"SELL BI2XUSD"}</Button>}</td></tr>})}</tbody></table></div></Card>{error&&<div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
		</div><div className="space-y-6"><Card className="border-border/50 bg-card/30 p-6"><span className="text-sm font-medium text-muted-foreground">Today’s Price</span><div className="mt-4 flex items-baseline gap-2"><span className="text-3xl font-bold">{price?formatINR(price):"Unavailable"}</span><span className="text-sm text-muted-foreground">/BI2XUSD</span></div><p className="pt-2 text-xs text-muted-foreground">Database price for {priceDate||"today"}</p></Card>
			<Card className="border-border/50 bg-card/30 p-6">
				<h3 className="mb-4 flex items-center gap-2 font-semibold"><TrendingUp className="h-4 w-4 text-primary"/>Quick Trade</h3>
				<div className="space-y-3">
					<div className="relative"><Input aria-label="Quick trade BI2XUSD amount" inputMode="decimal" className="pr-20" value={quickBI2XUSD} onChange={event=>updateQuickBI2XUSD(event.target.value)} placeholder="0"/><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold">BI2XUSD</span></div>
					<div className="relative"><Input aria-label="Quick trade INR amount" inputMode="decimal" className="pr-20" value={quickINR} onChange={event=>updateQuickINR(event.target.value)} placeholder="0"/><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold">INR</span></div>
				</div>
				<div className="my-4 rounded-lg bg-muted/20 p-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Available across ads</span><span>{Number(total.toFixed(6))} BI2XUSD</span></div></div>
				<Button disabled={!match} onClick={()=>match&&open(match,quickBI2XUSD)} className={`w-full ${action==="BUY"?"bg-buy text-buy-foreground":"bg-red-500 text-white"}`}>{action==="BUY"?"Proceed to Buy":"Proceed to Sell"}<ArrowRight className="ml-2 h-4 w-4"/></Button>
			</Card>
			{/* <Card className="border-border/50 bg-card/30 p-6"><h3 className="mb-4 font-semibold">Trust & Safety</h3><div className="space-y-3"><Safety icon={Lock} title="Escrow Protection" text="Seller BI2XUSD is held until release"/><Safety icon={Shield} title="Authenticated Users" text="Every ad has a permanent P2P username"/><Safety icon={Clock} title="Controlled Release" text="BI2XUSD moves only after payment confirmation"/></div></Card> */}
			{/* <MarketSnapshot listings={listings}/> */}
			</div></div>
		{/* <HowItWorks/> */}
	</div></div><TradeDialog ad={selected} quantity={quantity} setQuantity={setQuantity} payment={selectedPayment} setPayment={setSelectedPayment} order={order} error={error} acting={acting} userId={userId} feeRates={feeRates} onTake={take} onClose={()=>{setSelected(null);setOrder(null);setError("")}}/></AppShell>;
}

function TradeDialog({ad,quantity,setQuantity,payment,setPayment,order,error,acting,userId,feeRates,onTake,onClose}:{ad:P2PListing|null;quantity:string;setQuantity:(v:string)=>void;payment:P2PPaymentMethod;setPayment:(v:P2PPaymentMethod)=>void;order:P2POrder|null;error:string;acting:boolean;userId?:string;feeRates:{buyerRate:number;sellerRate:number};onTake:()=>void;onClose:()=>void}){
	const [linkedInputs,setLinkedInputs]=useState({adId:"",fiat:"0.00",receive:"0"});
	const amount=Number(quantity||0);
	const viewerAction=ad?.side==="SELL"?"Buy":"Sell";
	// The viewer is a buyer when taking a SELL ad, a seller when taking a BUY
	// ad — pick the matching side's real rate (P2P-M2).
	const feePct=viewerAction==="Buy"?feeRates.buyerRate:feeRates.sellerRate;
	const fiatInput=linkedInputs.adId===ad?.id?linkedInputs.fiat:(amount*Number(ad?.price||0)).toFixed(2);
	const receiveInput=linkedInputs.adId===ad?.id?linkedInputs.receive:netBI2XUSDAmountAfterBuyerFee(amount,feePct);
	const gross=amount*Number(ad?.price||0);
	const remaining=Number(formatBI2XUSDAmount(ad?.remainingRaw||"0"));
	const remainingAfter=remaining-amount;
	const effectiveMaximum=ad?effectiveP2PMaxOrderFiat(ad):0;
	const fee=bi2xusdFeeAmount(quantity,feePct);
	const remainderBelowMinimum=!!ad&&remainingAfter>0&&remainingAfter*Number(ad.price)<Number(ad.minOrderFiat);
	const validationMessage=!ad||amount<=0?"":amount>remaining?`Only ${formatBI2XUSDAmount(ad.remainingRaw)} BI2XUSD is available.`:gross<Number(ad.minOrderFiat)?`The minimum order is ${formatINR(ad.minOrderFiat)}.`:gross>effectiveMaximum?`The maximum order is ${formatINR(effectiveMaximum)}.`:remainderBelowMinimum?`This would leave ${Number(remainingAfter.toFixed(6))} BI2XUSD, below the ad minimum. ${viewerAction} the full ${formatBI2XUSDAmount(ad.remainingRaw)} BI2XUSD or leave at least ${Number((Number(ad.minOrderFiat)/Number(ad.price)).toFixed(6))} BI2XUSD for another order.`:"";
	const valid=!!ad&&userId!==ad.creatorId&&amount>0&&!validationMessage;
	function updateFiatInvestment(value:string){
		if(!validBI2XUSDInput(value))return;
		const nextQuantity=bi2xusdAmountFromFiat(value,ad?.price||0);
		setQuantity(nextQuantity);
		setLinkedInputs({adId:ad?.id??"",fiat:value,receive:netBI2XUSDAmountAfterBuyerFee(nextQuantity,feePct)});
	}
	function updateNetBI2XUSD(value:string){
		if(!validBI2XUSDInput(value))return;
		const nextQuantity=grossBI2XUSDAmountForNet(value,feePct);
		setQuantity(nextQuantity);
		setLinkedInputs({adId:ad?.id??"",fiat:(Number(nextQuantity)*Number(ad?.price||0)).toFixed(2),receive:value});
	}
	function updateGrossBI2XUSD(value:string){
		if(!validBI2XUSDInput(value))return;
		setQuantity(value);
		setLinkedInputs({adId:ad?.id??"",fiat:(Number(value||0)*Number(ad?.price||0)).toFixed(2),receive:netBI2XUSDAmountAfterBuyerFee(value,feePct)});
	}
	function normalizeFiatInvestment(){updateFiatInvestment((Number(fiatInput)||0).toFixed(2))}
	function normalizeNetBI2XUSD(){updateNetBI2XUSD(String(Number(receiveInput)||0))}
	function normalizeGrossBI2XUSD(){updateGrossBI2XUSD(String(Number(quantity)||0))}
	function close(){setLinkedInputs({adId:"",fiat:"0.00",receive:"0"});onClose()}
	return <TradeDialogView ad={ad} quantity={quantity} fiatInput={fiatInput} receiveInput={receiveInput} payment={payment} setPayment={setPayment} order={order} error={error} acting={acting} userId={userId} onTake={onTake} onClose={close} gross={gross} effectiveMaximum={effectiveMaximum} fee={fee} feePct={feePct} viewerAction={viewerAction} valid={valid} validationMessage={validationMessage} updateFiatInvestment={updateFiatInvestment} updateNetBI2XUSD={updateNetBI2XUSD} updateGrossBI2XUSD={updateGrossBI2XUSD} normalizeFiatInvestment={normalizeFiatInvestment} normalizeNetBI2XUSD={normalizeNetBI2XUSD} normalizeGrossBI2XUSD={normalizeGrossBI2XUSD}/>;
}

type TradeDialogViewProps={
	ad:P2PListing|null;
	quantity:string;
	fiatInput:string;
	receiveInput:string;
	payment:P2PPaymentMethod;
	setPayment:(value:P2PPaymentMethod)=>void;
	order:P2POrder|null;
	error:string;
	acting:boolean;
	userId?:string;
	onTake:()=>void;
	onClose:()=>void;
	gross:number;
	effectiveMaximum:number;
	fee:string;
	feePct:number;
	viewerAction:"Buy"|"Sell";
	valid:boolean;
	validationMessage:string;
	updateFiatInvestment:(value:string)=>void;
	updateNetBI2XUSD:(value:string)=>void;
	updateGrossBI2XUSD:(value:string)=>void;
	normalizeFiatInvestment:()=>void;
	normalizeNetBI2XUSD:()=>void;
	normalizeGrossBI2XUSD:()=>void;
};

function TradeDialogView({ad,quantity,fiatInput,receiveInput,payment,setPayment,order,error,acting,userId,onTake,onClose,gross,effectiveMaximum,fee,feePct,viewerAction,valid,validationMessage,updateFiatInvestment,updateNetBI2XUSD,updateGrossBI2XUSD,normalizeFiatInvestment,normalizeNetBI2XUSD,normalizeGrossBI2XUSD}:TradeDialogViewProps){
	return <Dialog open={!!ad} onOpenChange={open=>!open&&onClose()}>
		<DialogContent className="max-w-lg">
			<DialogHeader><DialogTitle>{order?"Order created":`${viewerAction} BI2XUSD ${ad?.side==="SELL"?"from":"to"} ${ad?.username??""}`}</DialogTitle></DialogHeader>
			{ad&&(order?<div className="space-y-4">
				<div className="rounded-xl border border-buy/30 bg-buy/10 p-5 text-center"><p className="text-lg font-bold text-buy">{formatBI2XUSDAmount(order.sellerDebitRaw)} BI2XUSD held in escrow</p></div>
				<Row label="Payment method" value={order.paymentMethod}/>
				<Row label="External payment" value={formatINR(order.grossAmount)}/>
				<Row label={`${order.buyerId===userId?"Buyer":"Seller"} fee (1%)`} value={`${formatBI2XUSDAmount(order.buyerId===userId?order.buyerFeeRaw:order.sellerFeeRaw)} BI2XUSD`}/>
				<Row label={order.buyerId===userId?"You receive":"BI2XUSD escrowed"} value={`${formatBI2XUSDAmount(order.buyerId===userId?order.buyerCreditRaw:order.sellerDebitRaw)} BI2XUSD`}/>
				<Button asChild className="w-full"><Link to={`/p2p/orders/${order.id}`}>Open order</Link></Button>
			</div>:<div className="space-y-5">
				<div className="rounded-xl border bg-muted/30 p-4 text-sm">
					<Row label="Advertiser" value={ad.username}/>
					<Row label="Price" value={`${formatINR(ad.price)} / BI2XUSD`}/>
					<Row label="Available" value={`${formatBI2XUSDAmount(ad.remainingRaw)} BI2XUSD`}/>
					<Row label="Order limit" value={`${formatINR(ad.minOrderFiat)} – ${formatINR(effectiveMaximum)}`}/>
				</div>
				{viewerAction==="Buy"?<div className="space-y-4">
					<div>
						<label className="mb-2 block text-xs font-semibold uppercase text-muted-foreground">You pay</label>
						<div className="flex gap-2"><Input aria-label="You pay in INR" inputMode="decimal" value={fiatInput} onChange={event=>updateFiatInvestment(event.target.value)} onBlur={normalizeFiatInvestment}/><span className="flex min-w-20 items-center justify-center rounded-md bg-muted/30 px-3">INR</span></div>
					</div>
					<div>
						<label className="mb-2 block text-xs font-semibold uppercase text-muted-foreground">You receive</label>
						<div className="flex gap-2"><Input aria-label="You receive in BI2XUSD" inputMode="decimal" value={receiveInput} onChange={event=>updateNetBI2XUSD(event.target.value)} onBlur={normalizeNetBI2XUSD}/><span className="flex min-w-20 items-center justify-center rounded-md bg-muted/30 px-3">BI2XUSD</span></div>
					</div>
					{/* <p className="text-xs text-muted-foreground">BI2XUSD received is shown after the 1% buyer fee. Order value must be within {formatINR(ad.minOrderFiat)} – {formatINR(effectiveMaximum)}.</p> */}
				</div>:<div className="space-y-4">
					<div>
						<label className="mb-2 block text-xs font-semibold uppercase text-muted-foreground">You receive</label>
						<div className="flex gap-2"><Input aria-label="You receive in INR" inputMode="decimal" value={fiatInput} onChange={event=>updateFiatInvestment(event.target.value)} onBlur={normalizeFiatInvestment}/><span className="flex min-w-20 items-center justify-center rounded-md bg-muted/30 px-3">INR</span></div>
					</div>
					<div>
						<label className="mb-2 block text-xs font-semibold uppercase text-muted-foreground">You sell</label>
						<div className="flex gap-2"><Input aria-label="You sell in BI2XUSD" inputMode="decimal" value={quantity} onChange={event=>updateGrossBI2XUSD(event.target.value)} onBlur={normalizeGrossBI2XUSD}/><span className="flex min-w-20 items-center justify-center rounded-md bg-muted/30 px-3">BI2XUSD</span></div>
					</div>
					<p className="text-xs text-muted-foreground">The 1% seller fee is added to the BI2XUSD escrow. Order value must be within {formatINR(ad.minOrderFiat)} – {formatINR(effectiveMaximum)}.</p>
				</div>}
				{validationMessage&&<p className="text-sm text-destructive">{validationMessage}</p>}
				<div>
					<label className="mb-2 block text-xs font-semibold uppercase text-muted-foreground">Payment method</label>
					<Select value={payment} onValueChange={value=>setPayment(value as P2PPaymentMethod)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{ad.paymentMethods.map(method=><SelectItem key={method} value={method}>{method}</SelectItem>)}</SelectContent></Select>
				</div>
				<div className="rounded-xl border p-4 text-sm">
					<Row label={viewerAction==="Buy"?"You pay externally":"You receive externally"} value={formatINR(gross)}/>
					<Row label={`${viewerAction} fee (${feePct}%)`} value={`${fee} BI2XUSD`}/>
					<Row label={viewerAction==="Buy"?"You receive":"Total BI2XUSD escrowed"} value={`${viewerAction==="Buy"?netBI2XUSDAmountAfterBuyerFee(quantity,feePct):sellerBI2XUSDDebitWithFee(quantity,feePct)} BI2XUSD`}/>
				</div>
				{error&&<p className="text-sm text-destructive">{error}</p>}
				<Button className={`w-full ${viewerAction==="Buy"?"bg-buy text-buy-foreground":"bg-red-500 text-white"}`} disabled={!valid||acting} onClick={onTake}>{acting?"Creating order…":viewerAction==="Buy"?`Buy ${netBI2XUSDAmountAfterBuyerFee(quantity,feePct)} BI2XUSD`:`Sell ${quantity || "0"} BI2XUSD`}</Button>
			</div>)}
		</DialogContent>
	</Dialog>;
}

function Row({label,value}:{label:string;value:string}){return <div className="flex justify-between gap-4 py-1"><span className="text-muted-foreground">{label}</span><span>{value}</span></div>}
function Safety({icon:Icon,title,text}:{icon:typeof Lock;title:string;text:string}){return <div className="flex items-start gap-3"><Icon className="mt-0.5 h-5 w-5 text-primary"/><div><p className="text-sm font-semibold">{title}</p><p className="text-xs text-muted-foreground">{text}</p></div></div>}
function MarketSnapshot({listings}:{listings:P2PListing[]}){const buyAds=listings.filter(ad=>ad.side==="BUY");const sellAds=listings.filter(ad=>ad.side==="SELL");const listed=listings.reduce((sum,ad)=>sum+Number(formatBI2XUSDAmount(ad.remainingRaw)),0);return <Card className="border-border/50 bg-card/30 p-6"><h3 className="mb-4 font-semibold">Market Snapshot</h3><div className="grid grid-cols-2 gap-4"><Stat label="Listed BI2XUSD" value={`${Number(listed.toFixed(6))} BI2XUSD`}/><Stat label="Active Ads" value={String(listings.length)}/><Stat label="Buy Ads" value={String(buyAds.length)}/><Stat label="Sell Ads" value={String(sellAds.length)}/></div></Card>}
function Stat({label,value}:{label:string;value:string}){return <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-semibold">{value}</p></div>}
function HowItWorks(){const steps=[{icon:Search,title:"Choose Offer",text:"Choose a live BI2XUSD buy or sell ad."},{icon:Clock,title:"Complete Payment",text:"The buyer pays externally and marks the order as paid."},{icon:Lock,title:"Receive BI2XUSD",text:"The seller releases escrow into the buyer's P2P wallet."}];return <div className="mb-12 mt-24 grid grid-cols-1 gap-6 md:grid-cols-3">{steps.map(({icon:Icon,title,text})=><Card key={title} className="flex flex-col items-center p-8 text-center"><Icon className="mb-4 h-6 w-6 text-primary"/><h3 className="mb-2 text-lg font-semibold">{title}</h3><p className="text-sm text-muted-foreground">{text}</p></Card>)}</div>}
