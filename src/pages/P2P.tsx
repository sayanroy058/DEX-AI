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
  Search,
  Filter,
  ChevronDown,
  Shield,
  Clock,
  Users,
  Lock,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";

const merchants = [
  {
    id: 1,
    name: "CryptoKing_India",
    avatar: "CK",
    trades: 1240,
    completion: 99.8,
    price: 91.24,
    limit: "₹1,00,000 - ₹5,00,000",
    payment: "Bank Transfer",
    available: "4,500 USDT",
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
    available: "4,430 USDT",
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
    available: "5,300.25 USDT",
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
    available: "15,000 USDT",
  },
  {
    id: 5,
    name: "FastPay_Crypto",
    avatar: "FP",
    trades: 2250,
    completion: 97.5,
    price: 91.32,
    limit: "₹3,400 - ₹50,000",
    payment: "Payim, UPI",
    available: "3,400 USDT",
  },
  {
    id: 6,
    name: "EliteOTC",
    avatar: "EO",
    trades: 1540,
    completion: 98.3,
    price: 91.35,
    limit: "₹50,000 - ₹25,00,000",
    payment: "NEFTX",
    available: "45,000 USDT",
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
    available: "2,900 USDT",
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
    available: "8,000 USDT",
  },
];

const paymentMethods = [
  "All",
  "UPI",
  "Bank Transfer",
  "Wise",
  "NEFT",
  "Payim",
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

export default function P2P() {
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [selectedPayment, setSelectedPayment] = useState("All");
  const [amount, setAmount] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const todayPrice = 100; // Today's price in INR

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
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-2">{mode === "buy" ? "Buy" : "Sell"} Crypto</h1>
            <p className="text-muted-foreground">
              {mode === "buy" 
                ? "Buy & sell crypto with 0% maker fees in your local currency."
                : "Sell your crypto and receive payment in your local currency with 0% fees."}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Buy/Sell Tabs */}
              <div className="flex gap-3">
                <Button 
                  onClick={() => setMode("buy")}
                  className={`px-6 font-semibold ${mode === "buy" ? "bg-buy text-buy-foreground hover:bg-buy/90" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                  Buy
                </Button>
                <Button
                  onClick={() => setMode("sell")}
                  className={`px-6 font-semibold ${mode === "sell" ? "bg-red-500 text-white hover:bg-red-600" : "border border-border"}`}
                  variant={mode === "sell" ? "default" : "outline"}
                >
                  Sell
                </Button>
              </div>

              {/* Trading Panel */}
              <Card className="border-border/50 bg-card/30 backdrop-blur-sm p-6">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                      Asset
                    </label>
                    <Select defaultValue="usdt">
                      <SelectTrigger className="bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="usdt">USDT</SelectItem>
                        <SelectItem value="usdc">USDC</SelectItem>
                        <SelectItem value="busd">BUSD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
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
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
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
                              className={`text-xs ${mode === "buy" ? "bg-buy text-buy-foreground hover:bg-buy/90" : "bg-red-500 text-white hover:bg-red-600"}`}
                            >
                              {mode === "buy" ? "BUY" : "SELL"} USDT
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
                  <Badge className="bg-green-500/20 text-green-500">
                    +1.08%
                  </Badge>
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
    </AppShell>
  );
}
