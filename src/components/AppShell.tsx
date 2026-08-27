import { useState } from "react";
import { NavLink as RouterNavLink, useLocation, Link } from "react-router-dom";
import { LayoutDashboard, LineChart, Wallet, Users, Settings, Zap, Bell, Search, ArrowDownToLine, ArrowUpFromLine, User, Building2, Sparkles, Repeat, Coins, Gift, CalendarClock, Bot, CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { WalletDialog } from "@/components/wallet/WalletDialog";
import { TransferDialog } from "@/components/wallet/TransferDialog";
import { useWallet, shortAddress, getWalletSourceLabel } from "@/lib/useWallet";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

const navItems = [
  { to: "/trade", icon: LineChart, label: "Trade" },
  { to: "/trading-bots", icon: Bot, label: "Bots" },
  { to: "/markets", icon: LayoutDashboard, label: "Markets" },
  { to: "/copy", icon: Users, label: "Copy" },
  { to: "/prop", icon: Building2, label: "Prop Firm" },
  { to: "/p2p", icon: Repeat, label: "P2P" },
  { to: "/token", icon: Coins, label: "Token" },
  { to: "/sip", icon: CalendarClock, label: "SIP/SWP" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isTradePage = location.pathname === "/trade";
  const w = useWallet();
  const [walletOpen, setWalletOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferMode, setTransferMode] = useState<"deposit" | "withdraw">("deposit");

  const openTransfer = (m: "deposit" | "withdraw") => {
    if (!w.connected) { setWalletOpen(true); return; }
    setTransferMode(m);
    setTransferOpen(true);
  };

  const totalUsd = w.balances.reduce((sum, balance) => sum + balance.amount, 0);

  return (
    <div className="min-h-screen w-full flex flex-col">
      <header className="h-14 px-3 sm:px-4 flex items-center gap-1 sm:gap-2 glass-strong border-b border-glass-border z-30 sticky top-0 overflow-hidden">
        <Link to="/" className="flex items-center gap-1.5 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow-primary shrink-0">
            <Zap className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-base sm:text-lg tracking-tight">
            DEX<span className="gradient-text">.ai</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-0.5 ml-3 overflow-x-auto">
          {navItems.map(item => (
            <RouterNavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap",
                  "hover:bg-muted/50 hover:text-foreground",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/30 shadow-[0_0_12px_hsl(var(--primary)/0.2)]"
                    : "text-muted-foreground"
                )
              }
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </RouterNavLink>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="hidden xl:flex items-center gap-2 glass px-3 py-1.5 rounded-lg w-60">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search markets, traders..." className="h-6 border-0 bg-transparent p-0.5 text-sm focus-visible:ring-0" />
          {/* <kbd className="text-[10px] text-muted-foreground border border-border rounded px-1">?K</kbd> */}
        </div>

        <Button variant="ghost" size="icon" className="relative hidden sm:flex shrink-0">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        </Button>

        {w.connected && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" title="Wallet balance">
                <Wallet className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 glass-strong border-glass-border p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Total Balance</span>
                <span className="text-[10px] text-primary">{getWalletSourceLabel(w.walletId)}</span>
              </div>
              <div className="text-2xl font-bold font-mono mb-3">${totalUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {w.balances.map(b => (
                  <div key={b.asset} className="flex justify-between text-xs glass rounded px-2 py-1.5">
                    <span className="font-medium">{b.asset}</span>
                    <span className="font-mono">{b.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <Button size="sm" variant="outline" className="h-8 text-xs text-buy border-buy/40 hover:bg-buy/10 hover:text-buy" onClick={() => openTransfer("deposit")}>
                  <ArrowDownToLine className="h-3 w-3 mr-1" /> Deposit
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openTransfer("withdraw")}>
                  <ArrowUpFromLine className="h-3 w-3 mr-1" /> Withdraw
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        <Button variant="outline" className={cn("glass px-2.5 sm:px-4", w.connected ? "border-buy/40 text-buy hover:bg-buy/10 hover:text-buy" : "border-primary/40 text-primary hover:bg-primary/10 hover:text-primary")} onClick={() => setWalletOpen(true)}>
          <span className={cn("mr-1 sm:mr-1.5 h-1.5 w-1.5 rounded-full animate-pulse", w.connected ? "bg-buy" : "bg-primary")} />
          <span className="hidden sm:inline">{w.connected ? `${getWalletSourceLabel(w.walletId)} · ${shortAddress(w.address)}` : "Connect Wallet"}</span>
          <span className="sm:hidden">{w.connected ? shortAddress(w.address) : "Connect"}</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full border border-border/60" title="Profile">
              <User className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-strong border-glass-border w-64">
            <div className="px-2 py-2">
              <div className="text-sm font-semibold">{w.connected ? shortAddress(w.address) : "Anonymous Trader"}</div>
              <div className="text-[11px] text-muted-foreground">{w.connected ? getWalletSourceLabel(w.walletId) : "trader@dex.ai"}</div>
            </div>
            <DropdownMenuSeparator />
            <div className="px-2 py-2">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Theme</div>
              <ThemeSwitcher compact />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link to="/profile" className="cursor-pointer"><User className="h-3.5 w-3.5 mr-2 text-primary" /> My Profile</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to="/portfolio" className="cursor-pointer"><Wallet className="h-3.5 w-3.5 mr-2 text-primary" /> Portfolio</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to="/refer" className="cursor-pointer"><Gift className="h-3.5 w-3.5 mr-2 text-primary" /> Refer & Earn</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to="/affiliate" className="cursor-pointer"><Sparkles className="h-3.5 w-3.5 mr-2 text-primary" /> Affiliate</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to="/support" className="cursor-pointer"><CircleHelp className="h-3.5 w-3.5 mr-2 text-primary" /> Support</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to="/settings" className="cursor-pointer"><Settings className="h-3.5 w-3.5 mr-2 text-primary" /> Settings</Link></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <WalletDialog open={walletOpen} onOpenChange={setWalletOpen} />
      <TransferDialog open={transferOpen} onOpenChange={setTransferOpen} defaultMode={transferMode} />

      <nav className="lg:hidden flex items-center gap-1 px-2 py-2 glass-strong border-b border-glass-border overflow-x-auto scrollbar-none">
        {navItems.map(item => (
          <RouterNavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap", isActive ? "bg-primary/15 text-primary" : "text-muted-foreground")}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </RouterNavLink>
        ))}
      </nav>

      <main className={cn("flex-1", isTradePage ? "overflow-hidden" : "overflow-auto")}>
        {children}
      </main>
    </div>
  );
}
