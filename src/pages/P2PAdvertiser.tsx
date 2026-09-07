import { useCallback,useEffect,useMemo,useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft,ChevronDown,Wallet } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PostAdsDialog } from "@/components/trade/PostAdsDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cancelP2PListing,effectiveP2PMaxOrderFiat,formatINR,formatBIUSDAmount,formatBIUSDSellCapacity,getMyP2PListings,getP2PPrice,getP2PProfile,getP2PWallet,type P2PAdSide,type P2PListing,type P2PWalletBalance } from "@/lib/p2pApi";
import { useWallet } from "@/lib/useWallet";

const empty:P2PWalletBalance={asset:"BIUSD",availableRaw:"0",reservedRaw:"0",totalRaw:"0"};

export default function P2PAdvertiser(){
	const {userId}=useWallet();
	const [listings,setListings]=useState<P2PListing[]>([]);
	const [balance,setBalance]=useState<P2PWalletBalance>(empty);
	const [price,setPrice]=useState("");
	const [username,setUsername]=useState("");
	const [side,setSide]=useState<P2PAdSide>("SELL");
	const [postOpen,setPostOpen]=useState(false);
	const [error,setError]=useState("");
	const [loading,setLoading]=useState(false);
	const load=useCallback(async()=>{if(!userId)return;try{setLoading(true);setError("");const [ads,wallet,market,profile]=await Promise.all([getMyP2PListings(),getP2PWallet(),getP2PPrice("BIUSD"),getP2PProfile()]);setListings(ads.listings);setBalance(wallet.balance??wallet.balances?.[0]??empty);setPrice(market.price.price);setUsername(profile.profile.username)}catch(e){setError(e instanceof Error?e.message:"Could not load ads")}finally{setLoading(false)}},[userId]);
	useEffect(()=>{void load()},[load]);
	const active=useMemo(()=>listings.filter(ad=>ad.status==="ACTIVE"),[listings]);
	async function cancel(id:string){try{await cancelP2PListing(id);await load()}catch(e){setError(e instanceof Error?e.message:"Could not cancel ad")}}
	function post(adSide:P2PAdSide){setSide(adSide);setPostOpen(true)}
	return <AppShell><main className="mx-auto min-h-screen max-w-6xl space-y-6 p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><Link to="/p2p" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4"/>Back to Marketplace</Link><h1 className="mt-4 text-3xl font-bold">My Ads</h1><p className="text-muted-foreground">Manage your Buy BIUSD and Sell BIUSD ads.</p></div><div className="flex gap-2"><Button asChild variant="outline"><Link to="/p2p/wallet"><Wallet className="mr-2 h-4 w-4"/>P2P Wallet</Link></Button><DropdownMenu><DropdownMenuTrigger asChild><Button>Post Ad<ChevronDown className="ml-2 h-4 w-4"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={()=>post("BUY")}>Buy BIUSD</DropdownMenuItem><DropdownMenuItem onClick={()=>post("SELL")}>Sell BIUSD</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></div>
		{!userId?<Card className="p-8 text-center text-muted-foreground">Connect and authenticate a wallet to view your ads.</Card>:<><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="P2P Wallet Balance" value={`${formatBIUSDAmount(balance.totalRaw)} BIUSD`}/><Kpi label="Current Price" value={`${formatINR(price)} / BIUSD`}/><Kpi label="Available for Sale" value={`${formatBIUSDSellCapacity(balance.availableRaw)} BIUSD`}/><Kpi label="Active Ads" value={String(active.length)}/></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Kpi label="Reserved in Sell Ads" value={`${formatBIUSDAmount(balance.reservedRaw)} BIUSD`}/><Kpi label="P2P Username" value={username||"Set when posting your first ad"}/></div>{error&&<Card className="p-4 text-destructive">{error}</Card>}<Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-sm"><thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-4">Created</th><th className="p-4">Ad</th><th className="p-4">Price</th><th className="p-4">Progress</th><th className="p-4">Order limits</th><th className="p-4">Payment methods</th><th className="p-4">Status</th><th className="p-4 text-right">Action</th></tr></thead><tbody>{loading?<tr><td colSpan={8} className="p-8 text-center">Loading…</td></tr>:listings.length===0?<tr><td colSpan={8} className="p-8 text-center text-muted-foreground">You have not posted any ads.</td></tr>:listings.map(ad=><tr className="border-b last:border-0" key={ad.id}><td className="p-4">{new Date(ad.createdAt).toLocaleString()}</td><td className="p-4 font-semibold">{ad.side} BIUSD</td><td className="p-4">{formatINR(ad.price)}</td><td className="p-4"><div className="font-medium">{formatBIUSDAmount(ad.completedAmountRaw)} / {formatBIUSDAmount(ad.amountRaw)} BIUSD</div><div className="text-xs text-muted-foreground">{ad.completedOrders} completed · {formatBIUSDAmount(ad.remainingRaw)} remaining</div></td><td className="p-4">{formatINR(ad.minOrderFiat)} – {formatINR(effectiveP2PMaxOrderFiat(ad))}</td><td className="p-4"><div className="flex flex-wrap gap-1">{ad.paymentMethods.map(method=><Badge key={method} variant="secondary">{method}</Badge>)}</div></td><td className="p-4">{ad.status}</td><td className="p-4 text-right"><Button size="sm" variant="outline" disabled={ad.status!=="ACTIVE"} onClick={()=>void cancel(ad.id)}>Cancel</Button></td></tr>)}</tbody></table></div></Card></>}
		<PostAdsDialog open={postOpen} onOpenChange={setPostOpen} side={side} username={username} price={price} onUsernameEstablished={setUsername} onCreated={()=>void load()}/>
	</main></AppShell>;
}
function Kpi({label,value}:{label:string;value:string}){return <Card className="border-border/50 bg-card/30 p-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-lg font-semibold">{value}</p></Card>}
