const P2P_API_URL = import.meta.env.VITE_AUTH_API_URL ?? "http://localhost:8081";

export const P2P_ASSETS = ["BIUSD"] as const;
export const P2P_PAYMENT_METHODS = ["UPI", "Bank Transfer", "MPESN", "NEFT", "IMPS"] as const;
export type P2PAsset = (typeof P2P_ASSETS)[number];
export type P2PPaymentMethod = (typeof P2P_PAYMENT_METHODS)[number];
export type P2PPrice = { asset:P2PAsset; fiatCurrency:string; price:string; priceDate:string; createdAt:string };
export type P2PWalletBalance = { asset:P2PAsset; availableRaw:string; reservedRaw:string; totalRaw:string };
export type P2PAdSide = "BUY"|"SELL";
export type P2PProfile = { username:string };
export type P2PListing = { id:string; creatorId:string; username:string; side:P2PAdSide; asset:P2PAsset; amountRaw:string; remainingRaw:string; price:string; fiatCurrency:string; minOrderFiat:string; maxOrderFiat:string; paymentMethods:P2PPaymentMethod[]; status:"ACTIVE"|"FILLED"|"CANCELLED"; completedOrders:number; completedAmountRaw:string; completedOrders30d:number; completionRate30d:string; ratedOrders30d:number; createdAt:string; updatedAt:string };
export type P2POrderStatus = "pending_payment"|"payment_made"|"completed"|"cancelled"|"appeal";
export type P2POrder = { id:string; listingId:string; sellerId:string; buyerId:string; asset:P2PAsset; amountRaw:string; escrowRaw:string; price:string; fiatCurrency:string; grossAmount:string; buyerFee:string; sellerFee:string; buyerPayable:string; sellerReceivable:string; buyerFeeRaw:string; sellerFeeRaw:string; buyerCreditRaw:string; sellerDebitRaw:string; paymentMethod:P2PPaymentMethod; paymentAccountName:string; paymentAccountIdentifier:string; paymentBankName?:string; paymentIfscCode?:string; paymentInstructions?:string; status:P2POrderStatus; expiresAt:string; paymentMarkedAt?:string; buyerOwnAccountAttested:boolean; appealAvailableAt?:string; appealedBy?:string; appealReason?:string; appealedAt?:string; updatedAt:string; cancellationReason?:string; completedAt?:string; createdAt:string };
export type P2PPaymentAccount={id:string;method:P2PPaymentMethod;accountName:string;accountIdentifier:string;bankName?:string;ifscCode?:string;instructions?:string;createdAt:string;updatedAt:string};
export type P2POrderProof={id:string;fileName:string;mimeType:string;sizeBytes:number;createdAt:string};
export type P2POrderMessage={id:string;senderId?:string;senderUsername:string;body:string;system:boolean;createdAt:string};
export type P2POrderEvent={id:string;actorId?:string;kind:string;metadata:Record<string,unknown>;createdAt:string};

async function request<T>(path:string,options?:RequestInit):Promise<T>{
	const response=await fetch(`${P2P_API_URL}${path}`,{...options,credentials:"include"});
	if(!response.ok){let message=`${response.status} ${response.statusText}`;try{const body=await response.json() as {error?:string};if(body.error)message=body.error}catch{/* non-JSON error */}throw new Error(message)}
	return response.json() as Promise<T>;
}
const json=(body:unknown):RequestInit=>({method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
const idempotencyKey=()=>globalThis.crypto?.randomUUID?.()??`p2p-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const getP2PPrice=(asset:P2PAsset)=>request<{price:P2PPrice}>(`/p2p/price?asset=${encodeURIComponent(asset)}`);
export const getP2PWallet=()=>request<{balance?:P2PWalletBalance;balances?:P2PWalletBalance[]}>("/p2p/wallet");
export const getP2PProfile=()=>request<{profile:P2PProfile}>("/p2p/profile");
export const establishP2PUsername=(username:string)=>request<{profile:P2PProfile}>("/p2p/profile",json({username}));
export const getP2PListings=()=>request<{listings:P2PListing[]}>("/p2p/listings");
export const getMyP2PListings=()=>request<{listings:P2PListing[]}>("/p2p/my-listings");
export const getP2POrders=()=>request<{orders:P2POrder[]}>("/p2p/orders");
export const getP2POrder=(orderId:string)=>request<{order:P2POrder}>(`/p2p/order?orderId=${encodeURIComponent(orderId)}`);
export const getP2PPaymentAccounts=()=>request<{accounts:P2PPaymentAccount[]}>("/p2p/payment-accounts");
export const saveP2PPaymentAccount=(method:P2PPaymentMethod,accountName:string,accountIdentifier:string,instructions:string,bankName="",ifscCode="")=>request<{account:P2PPaymentAccount}>("/p2p/payment-accounts",json({method,accountName,accountIdentifier,instructions,bankName,ifscCode}));
export const getP2POrderMessages=(orderId:string)=>request<{messages:P2POrderMessage[]}>(`/p2p/order/messages?orderId=${encodeURIComponent(orderId)}`);
export const sendP2POrderMessage=(orderId:string,body:string)=>request<{message:P2POrderMessage}>("/p2p/order/messages",json({orderId,body}));
export const getP2POrderProofs=(orderId:string)=>request<{proofs:P2POrderProof[]}>(`/p2p/order/proofs?orderId=${encodeURIComponent(orderId)}`);
export async function uploadP2POrderProof(orderId:string,file:File){const body=new FormData();body.append("orderId",orderId);body.append("proof",file);return request<{proof:P2POrderProof}>("/p2p/order/proofs",{method:"POST",body})}
export const p2pProofURL=(proofId:string)=>`${P2P_API_URL}/p2p/order/proofs/download?proofId=${encodeURIComponent(proofId)}`;
export const getP2POrderEvents=(orderId:string)=>request<{events:P2POrderEvent[]}>(`/p2p/order/events?orderId=${encodeURIComponent(orderId)}`);
export const fundP2PWallet=(asset:P2PAsset,amountRaw:string)=>request<{balance:P2PWalletBalance}>("/p2p/wallet/fund",json({asset,amountRaw,idempotencyKey:idempotencyKey()}));
export const createP2PListing=(side:P2PAdSide,amountRaw:string,minOrderFiat:string,maxOrderFiat:string,paymentMethods:P2PPaymentMethod[],username?:string)=>request<{listing:P2PListing}>("/p2p/listings",json({asset:"BIUSD",side,amountRaw,minOrderFiat,maxOrderFiat,paymentMethods,username}));
export const takeP2PListing=(listingId:string,amountRaw:string,paymentMethod:P2PPaymentMethod)=>request<{order:P2POrder}>("/p2p/orders/create",json({listingId,amountRaw,paymentMethod,idempotencyKey:idempotencyKey()}));
export const markP2POrderPaid=(orderId:string,ownAccountAttested=true)=>request<{order:P2POrder}>("/p2p/orders/paid",json({orderId,ownAccountAttested}));
export const releaseP2POrder=(orderId:string)=>request<{order:P2POrder}>("/p2p/orders/release",json({orderId}));
export const cancelP2POrder=(orderId:string,reason="I do not want to trade anymore")=>request<{order:P2POrder}>("/p2p/orders/cancel",json({orderId,reason}));
export const appealP2POrder=(orderId:string,reason:string)=>request<{order:P2POrder}>("/p2p/orders/appeal",json({orderId,reason}));
export const cancelP2PAppeal=(orderId:string)=>request<{order:P2POrder}>("/p2p/orders/appeal/cancel",json({orderId}));
export const cancelP2PListing=(listingId:string)=>request<{status:string}>("/p2p/listings/cancel",json({listingId}));

export function parseP2PAmount(value:string,asset:P2PAsset):string{
	if(!/^\d+(\.\d{0,6})?$/.test(value)||Number(value)<=0)throw new Error(`Enter a valid ${asset} amount with up to 6 decimals`);
	const [whole,fraction=""]=value.split(".");return (BigInt(whole)*1_000_000n+BigInt(fraction.padEnd(6,"0"))).toString();
}
export function formatP2PAmount(raw:string,maximumFractionDigits=6):string{
	const value=BigInt(raw||"0");const whole=value/1_000_000n;const fraction=(value%1_000_000n).toString().padStart(6,"0").replace(/0+$/,"").slice(0,maximumFractionDigits);return fraction?`${whole}.${fraction}`:whole.toString();
}
export function parseBIUSDAmount(value:string):string{
	if(!/^\d+(?:\.\d{0,6})?$/.test(value)||Number(value)<=0)throw new Error("Enter a valid BIUSD amount with up to 6 decimal places");
	return parseP2PAmount(value,"BIUSD");
}
export function formatBIUSDAmount(raw:string):string{
	return formatP2PAmount(raw,6);
}
export function formatBIUSDSellCapacity(raw:string):string{
	const balance=BigInt(raw||"0");
	return formatP2PAmount((balance-balance/101n).toString(),6);
}
export function effectiveP2PMaxOrderFiat(listing:Pick<P2PListing,"maxOrderFiat"|"remainingRaw"|"price">):number{
	const remainingFiat=Number(formatBIUSDAmount(listing.remainingRaw))*Number(listing.price);
	return Math.max(0,Math.min(Number(listing.maxOrderFiat),remainingFiat));
}
export function biusdAmountFromFiat(fiatAmount:string|number,price:string|number):string{
	const fiat=Number(fiatAmount);const unitPrice=Number(price);
	if(!Number.isFinite(fiat)||!Number.isFinite(unitPrice)||fiat<=0||unitPrice<=0)return "0";
	return (Math.floor((fiat/unitPrice)*1_000_000)/1_000_000).toFixed(6).replace(/\.?0+$/,"");
}
export function grossBIUSDAmountForNet(netAmount:string|number):string{
	const net=biusdRawOrZero(netAmount);
	if(net<=0n)return "0";
	return formatBIUSDAmount((net+(net-1n)/99n).toString());
}
export function netBIUSDAmountAfterBuyerFee(grossAmount:string|number):string{
	const gross=biusdRawOrZero(grossAmount);
	if(gross<=0n)return "0";
	return formatBIUSDAmount((gross-gross/100n).toString());
}
export function biusdFeeAmount(grossAmount:string|number):string{
	const gross=biusdRawOrZero(grossAmount);
	return formatBIUSDAmount((gross/100n).toString());
}
export function sellerBIUSDDebitWithFee(grossAmount:string|number):string{
	const gross=biusdRawOrZero(grossAmount);
	return formatBIUSDAmount((gross+gross/100n).toString());
}
function biusdRawOrZero(value:string|number):bigint{
	const text=typeof value==="number"?value.toFixed(6).replace(/\.?0+$/,""):value;
	try{return BigInt(parseBIUSDAmount(text))}catch{return 0n}
}
export const formatINR=(value:string|number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(Number(value));
