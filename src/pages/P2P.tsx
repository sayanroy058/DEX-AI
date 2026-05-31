import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Shield,
  Clock,
  Users,
  Lock,
  TrendingUp,
  ArrowRight,
  Star,
  CheckCircle2,
  ClipboardList,
  MoreHorizontal,
  MonitorUp,
  CirclePlus,
  X,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { P2POrderPage } from "@/components/trade/P2POrderPage";
import { PostAdsDialog } from "@/components/trade/PostAdsDialog";
import { p2pOrders, p2pSidePillClass, p2pStatusClass, type P2POrderSummary } from "@/lib/p2pOrders";

type Merchant = {
  id: number;
  name: string;
  avatar: string;
  trades: number;
  completion: number;
  price: number;
  limit: string;
  payment: string;
  available: string;
  rating: number;
  avgTradeTime: string;
  assets: string[];
  joined: string;
};

const merchants: Merchant[] = [
  {
    id: 1,
    name: "CryptoKing_India",
    avatar: "CK",
    trades: 1240,
    completion: 99.8,
    price: 91.24,
    limit: "₹1,00,000 - ₹5,00,000",
    payment: "Bank Transfer",
    available: "4,500 DEXUSD",
    rating: 4.9,
    avgTradeTime: "3.2 min",
    assets: ["DEXUSD", "USDT", "BTC"],
    joined: "Jan 2022",
  },
  {
    id: 2,
    name: "ZenTrader_X",
    avatar: "ZT",
    trades: 950,
    completion: 98.2,
    price: 91.25,
    limit: "₹5,00,000 - ₹25,00,000",
    payment: "UPI, GPay",
    available: "4,430 DEXUSD",
    rating: 4.7,
    avgTradeTime: "4.8 min",
    assets: ["DEXUSD", "USDT"],
    joined: "Mar 2022",
  },
  {
    id: 3,
    name: "SwiftLiquid",
    avatar: "SL",
    trades: 2200,
    completion: 97.1,
    price: 91.28,
    limit: "₹10,000 - ₹75,00,000",
    payment: "IMPS",
    available: "5,300.25 DEXUSD",
    rating: 4.6,
    avgTradeTime: "5.1 min",
    assets: ["DEXUSD", "ETH", "USDT"],
    joined: "Jun 2021",
  },
  {
    id: 4,
    name: "Global_Escrow",
    avatar: "GE",
    trades: 3500,
    completion: 99.0,
    price: 91.30,
    limit: "₹15,000 - ₹1,00,00,000",
    payment: "Bank Transfer",
    available: "15,000 DEXUSD",
    rating: 4.8,
    avgTradeTime: "2.9 min",
    assets: ["DEXUSD", "BTC", "ETH", "USDT"],
    joined: "Sep 2020",
  },
  {
    id: 5,
    name: "FastPay_Crypto",
    avatar: "FP",
    trades: 2250,
    completion: 97.5,
    price: 91.32,
    limit: "₹3,400 - ₹50,000",
    payment: "Paytm, UPI",
    available: "3,400 DEXUSD",
    rating: 4.5,
    avgTradeTime: "6.0 min",
    assets: ["DEXUSD", "USDT"],
    joined: "Nov 2022",
  },
  {
    id: 6,
    name: "EliteOTC",
    avatar: "EO",
    trades: 1540,
    completion: 98.3,
    price: 91.35,
    limit: "₹50,000 - ₹25,00,000",
    payment: "NEFT",
    available: "45,000 DEXUSD",
    rating: 4.7,
    avgTradeTime: "3.7 min",
    assets: ["DEXUSD", "BTC", "USDT"],
    joined: "Apr 2021",
  },
  {
    id: 7,
    name: "SafeSwap_IN",
    avatar: "SS",
    trades: 1100,
    completion: 98.8,
    price: 91.38,
    limit: "₹2,900 - ₹3,00,000",
    payment: "GPay",
    available: "2,900 DEXUSD",
    rating: 4.8,
    avgTradeTime: "4.2 min",
    assets: ["DEXUSD", "ETH"],
    joined: "Aug 2022",
  },
  {
    id: 8,
    name: "Alpha_Merchant",
    avatar: "AM",
    trades: 4501,
    completion: 95.4,
    price: 91.40,
    limit: "₹8,000 - ₹10,00,000",
    payment: "IMPS",
    available: "8,000 DEXUSD",
    rating: 4.4,
    avgTradeTime: "7.3 min",
    assets: ["DEXUSD", "USDT", "BTC", "ETH"],
    joined: "Feb 2021",
  },
];

const paymentMethods = [
  "All",
  "UPI",
  "Bank Transfer",
  "Wise",
  "NEFT",
  "Paytm",
  "More",
];

const steps = [
  {
    number: "Step 1",
    title: "Choose Offer",
    description:
      "Find the best price and payment method from our list of verified advertisers",
    icon: Search,
  },
  {
    number: "Step 2",
    title: "Pay Seller",
    description:
      "Send the payment to the seller's provided details within the specified time",
    icon: Clock,
  },
  {
    number: "Step 3",
    title: "Receive Crypto",
    description:
      "Once the seller confirms your payment, the crypto is released to your wallet",
    icon: Lock,
  },
];

function P2POrdersPopover({
  orders,
  onViewAll,
}: {
  orders: P2POrderSummary[];
  onViewAll: () => void;
}) {
  const inProgress = orders.filter(order => order.status === "In Progress");
  const recent = orders.slice(0, 3);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 text-primary hover:text-primary hover:bg-primary/10">
          <ClipboardList className="h-4 w-4" />
          Orders
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,440px)] border-border/50 bg-card/95 p-0 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
          <div className="text-sm font-semibold">Order in Progress ({inProgress.length})</div>
          <button
            type="button"
            onClick={onViewAll}
            className="flex items-center gap-1 text-sm font-semibold text-foreground hover:text-primary"
          >
            View All
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {recent.length === 0 ? (
            <div className="flex h-28 items-center justify-center text-sm text-muted-foreground">No Records Found</div>
          ) : (
            <div className="divide-y divide-border/30">
              {recent.map(order => (
                <button
                  key={order.id}
                  type="button"
                  onClick={onViewAll}
                  className="w-full px-4 py-3 text-left transition-colors hover:bg-muted/25"
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                    <span className={p2pSidePillClass(order.side)}>{order.side}</span>
                      <span className="font-mono text-xs text-muted-foreground">{order.id}</span>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${p2pStatusClass(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span className="text-muted-foreground">{order.counterparty}</span>
                    <span className="text-right font-mono">{order.cryptoAmount.toFixed(4)} DEXUSD</span>
                    <span className="text-muted-foreground">{order.payment}</span>
                    <span className="text-right font-mono">INR {order.fiatAmount.toLocaleString()}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function P2PMoreMenu({
  onMyAds,
  onPostAds,
}: {
  onMyAds: () => void;
  onPostAds: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 text-muted-foreground hover:bg-primary/10 hover:text-primary">
          <MoreHorizontal className="h-4 w-4" />
          More
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 border-border/50 bg-card/95 p-1.5 shadow-2xl backdrop-blur-xl">
        <DropdownMenuItem onSelect={onMyAds} className="gap-2 rounded-md py-2.5">
          <MonitorUp className="h-4 w-4" />
          My Ads
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onPostAds} className="gap-2 rounded-md py-2.5">
          <CirclePlus className="h-4 w-4" />
          Post Ads
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function P2P() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [selectedPayment, setSelectedPayment] = useState("All");
  const [amount, setAmount] = useState("");
  const [bankOption, setBankOption] = useState("UPI");
  const [searchTerm, setSearchTerm] = useState("");
  const [postAdsDialogOpen, setPostAdsDialogOpen] = useState(false);
  const todayPrice = 100;

  // Trade Dialog state
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [showOrderPage, setShowOrderPage] = useState(false);
  const [tradeInputType, setTradeInputType] = useState<"quantity" | "dollars">("dollars");
  const [tradeAmount, setTradeAmount] = useState("");

  const openTradeDialog = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    setTradeAmount("");
    setTradeInputType("dollars");
    setTradeDialogOpen(true);
  };

  // Gross DEXUSD before fee
  const grossQty = selectedMerchant && tradeAmount
    ? tradeInputType === "dollars"
      ? parseFloat(tradeAmount) / selectedMerchant.price
      : parseFloat(tradeAmount)
    : 0;

  // INR equivalent of the entered qty
  const tradeDollars = selectedMerchant && tradeAmount
    ? tradeInputType === "quantity"
      ? (parseFloat(tradeAmount) * selectedMerchant.price).toFixed(2)
      : tradeAmount
    : "";

  // Fee is 1% of gross DEXUSD, deducted from what user receives
  const feeQty   = +(grossQty * 0.01).toFixed(6);
  const netQty   = +(grossQty - feeQty).toFixed(6);

  // For display in the auto-calc field: net DEXUSD received
  const tradeQty = grossQty > 0 ? netQty.toFixed(4) : "";

  // INR user actually pays (what they entered or derived)
  const subtotal = selectedMerchant && tradeDollars ? parseFloat(tradeDollars) : 0; // Today's price in INR

  const filteredMerchants = merchants.filter((m) =>
    selectedPayment === "All"
      ? true
      : m.payment.toLowerCase().includes(selectedPayment.toLowerCase())
  );

  return (
    <AppShell>
      <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">{mode === "buy" ? "Buy" : "Sell"} Crypto</h1>
              <p className="text-muted-foreground">
                {mode === "buy" 
                  ? "Buy & sell crypto with 0% maker fees in your local currency."
                  : "Sell your crypto and receive payment in your local currency with 0% fees."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <P2POrdersPopover
                orders={p2pOrders}
                onViewAll={() => navigate("/p2p/orders")}
              />
              <P2PMoreMenu
                onMyAds={() => navigate("/p2p/advertiser")}
                onPostAds={() => setPostAdsDialogOpen(true)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Buy/Sell Tabs */}
              <div className="flex gap-3">
                <Button 
                  onClick={() => setMode("buy")}
                  className={`px-10 min-w-36 h-11 font-semibold ${mode === "buy" ? "bg-buy text-buy-foreground hover:bg-buy/90" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                  Buy
                </Button>
                <Button
                  onClick={() => setMode("sell")}
                  className={`px-10 min-w-36 h-11 font-semibold ${mode === "sell" ? "bg-red-500 text-white hover:bg-red-600" : "border border-border"}`}
                  variant={mode === "sell" ? "default" : "outline"}
                >
                  Sell
                </Button>
              </div>

              {/* Trading Panel */}
              <Card className="border-border/50 bg-card/30 backdrop-blur-sm p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                      Fiat
                    </label>
                    <Select defaultValue="inr">
                      <SelectTrigger className="bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inr">INR (₹)</SelectItem>
                        <SelectItem value="usd">USD ($)</SelectItem>
                        <SelectItem value="eur">EUR (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                      {mode === "buy" ? "Amount" : "Crypto Amount"}
                    </label>
                    <Input
                      placeholder={mode === "buy" ? "Enter amount to pay" : "Enter crypto amount to sell"}
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>
              </Card>

              {/* Payment Methods */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      <Users className="w-3 h-3 mr-1" />
                      Verified merchants
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-8">
                      <Filter className="w-4 h-4 mr-1" />
                      Filter
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8">
                    Sort: Best price
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </div>

                {/* Payment Method Pills */}
                <div className="flex flex-wrap gap-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method}
                      onClick={() => setSelectedPayment(method)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedPayment === method
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/30 hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Merchants Table */}
              <Card className="border-border/50 bg-card/20 backdrop-blur-sm overflow-hidden">
                <div className="overflow-x-auto scrollbar-none">
                  <table className="w-full text-sm min-w-[650px]">
                    <thead>
                      <tr className="border-b border-border/30 bg-muted/20">
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Advertiser
                        </th>
                        <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Limit / Available
                        </th>
                        <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Payment
                        </th>
                        <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Trade
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMerchants.map((merchant) => (
                        <tr
                          key={merchant.id}
                          className="border-b border-border/20 hover:bg-muted/10 transition-colors"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                                {merchant.avatar}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 font-semibold">
                                  {merchant.name}
                                  <Shield className="w-3 h-3 text-primary" />
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {merchant.trades} orders ·{" "}
                                  {merchant.completion}% completion
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="text-center px-4 py-4">
                            <div className="text-xs">
                              <div className="font-medium">{merchant.available}</div>
                              <div className="text-muted-foreground text-xs">
                                {merchant.limit}
                              </div>
                            </div>
                          </td>
                          <td className="text-center px-4 py-4">
                            <Badge variant="secondary" className="text-xs">
                              {merchant.payment}
                            </Badge>
                          </td>
                          <td className="text-center px-4 py-4">
                            <Button
                              size="sm"
                              onClick={() => openTradeDialog(merchant)}
                              className={`text-xs ${mode === "buy" ? "bg-buy text-buy-foreground hover:bg-buy/90" : "bg-red-500 text-white hover:bg-red-600"}`}
                            >
                              {mode === "buy" ? "BUY" : "SELL"} DEXUSD
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Today's Price */}
              <Card className="border-border/50 bg-card/30 backdrop-blur-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-muted-foreground text-sm font-medium">
                    Today's Price
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">₹{todayPrice}</span>
                    <span className="text-sm text-muted-foreground">/USDT</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    1h · 24h based on market demand
                  </p>
                  <div className="text-xs text-muted-foreground pt-2">
                    last update in{" "}
                    <span className="font-mono font-semibold">14h 22m 08s</span>
                  </div>
                </div>
              </Card>

              {/* Quick Trade */}
              <Card className="border-border/50 bg-card/30 backdrop-blur-sm p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  {mode === "buy" ? "Quick Trade" : "Quick Sell"}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground font-medium mb-2 block">
                      Bank / Payment Option
                    </label>
                    <Select value={bankOption} onValueChange={setBankOption}>
                      <SelectTrigger className="bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="IMPS">IMPS</SelectItem>
                        <SelectItem value="NEFT">NEFT</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium mb-2 block">
                      {mode === "buy" ? "I want to pay" : "I want to sell"}
                    </label>
                    <div className="flex gap-2">
                      <Input placeholder="0.00" className="bg-background/50" />
                      <span className="flex items-center px-3 bg-muted/30 rounded-md">
                        {mode === "buy" ? "INR" : "USDT"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium mb-2 block">
                      I will {mode === "buy" ? "receive" : "get"}
                    </label>
                    <div className="flex gap-2">
                      <Input placeholder="0.00" className="bg-background/50" />
                      <span className="flex items-center px-3 bg-muted/30 rounded-md">
                        {mode === "buy" ? "USDT" : "INR"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="my-4 p-3 bg-muted/20 rounded-lg">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-muted-foreground">Reference Price</span>
                    <span className="font-semibold">₹{todayPrice}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Payment Time</span>
                    <span className="font-semibold">15 Minutes</span>
                  </div>
                </div>

                <Button className={`w-full ${mode === "buy" ? "bg-buy text-buy-foreground hover:bg-buy/90" : "bg-red-500 text-white hover:bg-red-600"}`}>
                  {mode === "buy" ? "Proceed to Buy" : "Proceed to Sell"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Card>

              {/* Trust & Safety */}
              <Card className="border-border/50 bg-card/30 backdrop-blur-sm p-6">
                <h3 className="font-semibold mb-4">Trust & Safety</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">Escrow Protection</p>
                      <p className="text-xs text-muted-foreground">
                        Your funds are secure
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">Verified Merchants</p>
                      <p className="text-xs text-muted-foreground">
                        Trade with confidence on our platform
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">24/7 Dispute Support</p>
                      <p className="text-xs text-muted-foreground">
                        Always here to help resolve issues quickly
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Market Snapshot */}
              <Card className="border-border/50 bg-card/30 backdrop-blur-sm p-6">
                <h3 className="font-semibold mb-4">Market Snapshot</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground text-xs">24h Volume</p>
                    <p className="font-semibold text-lg">614.2M</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Active Ads</p>
                    <p className="font-semibold text-lg">1,842</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Avg Completion</p>
                    <p className="font-semibold text-lg text-green-500">
                      98.4%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Avg Time</p>
                    <p className="font-semibold text-lg">4.2m</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Steps Section */}
          <div className="mt-24 mb-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                return (
                  <div key={index} className="relative">
                    <Card className="border-border/50 bg-card/30 backdrop-blur-sm p-8 h-full flex flex-col items-center text-center">
                      <div className="mb-4 p-3 bg-primary/10 rounded-full">
                        <StepIcon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </Card>
                    {index < steps.length - 1 && (
                      <div className="hidden md:block absolute top-1/2 right-0 w-8 h-0.5 bg-border/30 -translate-y-1/2 translate-x-1/2" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── P2P Order Page overlay ── */}
      <PostAdsDialog
        open={postAdsDialogOpen}
        onOpenChange={setPostAdsDialogOpen}
      />

      {showOrderPage && selectedMerchant && (
        <P2POrderPage
          mode={mode}
          merchant={selectedMerchant}
          amountINR={subtotal}
          grossQty={grossQty}
          feeQty={feeQty}
          netQty={netQty}
          onClose={() => setShowOrderPage(false)}
        />
      )}

      {/* ── Trade Dialog ── */}
      <Dialog open={tradeDialogOpen} onOpenChange={setTradeDialogOpen}>
        <DialogContent className="max-w-4xl w-full bg-[#0b1120] border border-slate-700/60 text-white p-0 overflow-hidden rounded-2xl">
          {selectedMerchant && (
            <>
              {/* Top header bar */}
              <div className={`px-6 py-4 flex items-center justify-between ${mode === "buy" ? "bg-emerald-500/10 border-b border-emerald-500/20" : "bg-red-500/10 border-b border-red-500/20"}`}>
                <DialogHeader className="flex-1">
                  <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${mode === "buy" ? "bg-emerald-500" : "bg-red-500"} text-white`}>
                      {mode === "buy" ? "BUY" : "SELL"}
                    </span>
                    DEXUSD · {selectedMerchant.name}
                  </DialogTitle>
                </DialogHeader>
              </div>

              {/* Two-column body */}
              <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-700/50 max-h-[82vh]">

                {/* ── LEFT: Seller details ── */}
                <div className="md:w-[52%] overflow-y-auto px-6 py-5 space-y-5">

                  {/* Profile */}
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-base font-black text-white flex-shrink-0 shadow-lg shadow-cyan-500/20">
                      {selectedMerchant.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base leading-tight">{selectedMerchant.name}</span>
                        <Shield className="h-4 w-4 text-cyan-400" />
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">Member since {selectedMerchant.joined}</div>
                      <div className="flex items-center gap-1 mt-1.5">
                        {[1,2,3,4,5].map((s) => (
                          <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(selectedMerchant.rating) ? "text-amber-400 fill-amber-400" : "text-slate-600"}`} />
                        ))}
                        <span className="text-xs text-slate-300 ml-1 font-semibold">{selectedMerchant.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-slate-700/50" />

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { label: "Total Trades",     value: selectedMerchant.trades.toLocaleString() },
                      { label: "Completion Rate",  value: `${selectedMerchant.completion}%` },
                      { label: "Avg. Trade Time",  value: selectedMerchant.avgTradeTime },
                      { label: "Price / DEXUSD",   value: `₹${selectedMerchant.price}` },
                      { label: "Trade Limit",      value: selectedMerchant.limit },
                      { label: "Available",        value: selectedMerchant.available },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-slate-800/60 rounded-xl px-3.5 py-3 border border-slate-700/30">
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest">{label}</p>
                        <p className="text-sm font-semibold text-white mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Payment methods */}
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Payment Methods</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedMerchant.payment.split(",").map((p) => (
                        <Badge key={p.trim()} className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs px-3 py-1">
                          {p.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Available assets */}
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Available Assets</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedMerchant.assets.map((asset) => (
                        <Badge key={asset} className="bg-violet-500/15 text-violet-300 border border-violet-500/30 text-xs px-3 py-1">
                          {asset}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── RIGHT: Trade form ── */}
                <div className="md:w-[48%] flex flex-col px-6 py-5 space-y-5 bg-[#080f1e]/60">

                  <p className="text-base font-bold text-white">Enter Amount</p>

                  {/* Toggle */}
                  <div className="flex rounded-xl overflow-hidden border border-slate-700">
                    <button
                      onClick={() => { setTradeInputType("dollars"); setTradeAmount(""); }}
                      className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${tradeInputType === "dollars" ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:text-white"}`}
                    >
                      ₹ Rupees
                    </button>
                    <button
                      onClick={() => { setTradeInputType("quantity"); setTradeAmount(""); }}
                      className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${tradeInputType === "quantity" ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:text-white"}`}
                    >
                      Qty (DEXUSD)
                    </button>
                  </div>

                  {/* Primary input */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest">
                      {tradeInputType === "dollars" ? "Amount (INR)" : "Quantity (DEXUSD)"}
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder={tradeInputType === "dollars" ? "0.00" : "0.0000"}
                        value={tradeAmount}
                        onChange={(e) => setTradeAmount(e.target.value)}
                        className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-600 pr-20 h-11"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">
                        {tradeInputType === "dollars" ? "INR" : "DEXUSD"}
                      </span>
                    </div>
                  </div>

                  {/* Auto-calculated */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest">
                      {tradeInputType === "dollars" ? "You Get (DEXUSD)" : "You Pay (INR)"}
                    </label>
                    <div className="relative">
                      <Input
                        readOnly
                        value={tradeInputType === "dollars" ? (tradeQty || "") : (tradeDollars || "")}
                        placeholder="Auto-calculated"
                        className="bg-slate-900/50 border-slate-700/50 text-slate-300 placeholder:text-slate-600 pr-20 h-11 cursor-default"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">
                        {tradeInputType === "dollars" ? "DEXUSD" : "INR"}
                      </span>
                    </div>
                  </div>

                  {/* Fee + Summary */}
                  <div className="rounded-xl bg-slate-800/40 border border-slate-700/40 divide-y divide-slate-700/40">
                    <div className="flex justify-between px-4 py-2.5 text-sm">
                      <span className="text-slate-400">You Pay</span>
                      <span className="text-white font-medium">{subtotal > 0 ? `₹${subtotal.toFixed(2)}` : "—"}</span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5 text-sm">
                      <span className="text-slate-400">Gross DEXUSD</span>
                      <span className="text-white font-medium">{grossQty > 0 ? grossQty.toFixed(4) : "—"}</span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5 text-sm">
                      <span className="text-slate-400">Platform Fee (1%)</span>
                      <span className="text-red-400">{grossQty > 0 ? `-${feeQty.toFixed(4)} DEXUSD` : "—"}</span>
                    </div>
                    <div className="flex justify-between px-4 py-3 text-sm font-bold">
                      <span className="text-white">You Receive (Net)</span>
                      <span className={grossQty > 0 ? "text-emerald-400" : "text-slate-500"}>
                        {grossQty > 0 ? `${netQty.toFixed(4)} DEXUSD` : "—"}
                      </span>
                    </div>
                  </div>

                  {/* CTA */}
                  <Button
                    disabled={!tradeAmount || parseFloat(tradeAmount) <= 0}
                    className={`w-full h-12 text-base font-bold rounded-xl transition-all mt-auto ${
                      mode === "buy"
                        ? "bg-emerald-500 hover:bg-emerald-400 text-white disabled:opacity-40"
                        : "bg-red-500 hover:bg-red-400 text-white disabled:opacity-40"
                    }`}
                    onClick={() => { setTradeDialogOpen(false); setShowOrderPage(true); }}
                  >
                    {mode === "buy" ? "Confirm Buy" : "Confirm Sell"}
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── P2P Order Page overlay ── */}
      {showOrderPage && selectedMerchant && (
        <P2POrderPage
          mode={mode}
          merchant={selectedMerchant}
          amountINR={subtotal}
          grossQty={grossQty}
          feeQty={feeQty}
          netQty={netQty}
          onClose={() => setShowOrderPage(false)}
        />
      )}

    </AppShell>
  );
}
