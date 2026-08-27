const P2P_API_URL = import.meta.env.VITE_AUTH_API_URL ?? "http://localhost:8081";

export const P2P_PAYMENT_METHODS = ["UPI", "Bank Transfer", "NEFT", "IMPS"] as const;
export type P2PPaymentMethod = (typeof P2P_PAYMENT_METHODS)[number];
export type P2PPrice = { asset:string; fiatCurrency:string; price:string; priceDate:string; createdAt:string };
export type P2PListing = { id:string; sellerId:string; sellerAddress:string; asset:string; amountRaw:string; remainingRaw:string; price:string; fiatCurrency:string; paymentMethod:P2PPaymentMethod; status:"ACTIVE"|"FILLED"|"CANCELLED"; createdAt:string; updatedAt:string };
export type P2POrder = { id:string; listingId:string; sellerId:string; buyerId:string; asset:string; amountRaw:string; price:string; fiatCurrency:string; grossAmount:string; buyerFee:string; sellerFee:string; buyerPayable:string; sellerReceivable:string; paymentMethod:P2PPaymentMethod; status:"COMPLETED"; createdAt:string };

async function request<T>(path:string,options?:RequestInit):Promise<T>{
	const response=await fetch(`${P2P_API_URL}${path}`,{...options,credentials:"include"});
	if(!response.ok){let message=`${response.status} ${response.statusText}`;try{const body=await response.json() as {error?:string};if(body.error)message=body.error}catch{/* non-JSON error */}throw new Error(message)}
	return response.json() as Promise<T>;
}
const json=(body:unknown):RequestInit=>({method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
export const getP2PPrice=()=>request<{price:P2PPrice}>("/p2p/price");
export const getP2PListings=()=>request<{listings:P2PListing[]}>("/p2p/listings");
export const getMyP2PListings=()=>request<{listings:P2PListing[]}>("/p2p/my-listings");
export const getP2POrders=()=>request<{orders:P2POrder[]}>("/p2p/orders");
export const createP2PListing=(amountRaw:string,paymentMethod:P2PPaymentMethod)=>request<{listing:P2PListing}>("/p2p/listings",json({amountRaw,paymentMethod}));
export const buyP2PListing=(listingId:string,amountRaw:string)=>request<{order:P2POrder}>("/p2p/buy",json({listingId,amountRaw}));
export const cancelP2PListing=(listingId:string)=>request<{status:string}>("/p2p/listings/cancel",json({listingId}));

export function parseUSDC(value:string):string{
	if(!/^\d+(\.\d{0,6})?$/.test(value)||Number(value)<=0)throw new Error("Enter a valid USDC amount with up to 6 decimals");
	const [whole,fraction=""]=value.split(".");return (BigInt(whole)*1_000_000n+BigInt(fraction.padEnd(6,"0"))).toString();
}
export function formatUSDC(raw:string,maximumFractionDigits=6):string{
	const value=BigInt(raw||"0");const whole=value/1_000_000n;const fraction=(value%1_000_000n).toString().padStart(6,"0").replace(/0+$/,"").slice(0,maximumFractionDigits);return fraction?`${whole}.${fraction}`:whole.toString();
}
export const formatINR=(value:string|number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(Number(value));
