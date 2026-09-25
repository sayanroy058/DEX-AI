import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  BarChart3, LogOut, User, Zap, Waves, Wallet, LineChart, Scale, Radio,
  Percent, Users, Layers, Coins, ArrowLeftRight, Menu, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { clearSession, getSession } from "@/lib/Auth";
import { cn } from "@/lib/utils";

// Grouped rather than one flat list — a dozen destinations in a single
// column reads just as cluttered as the old horizontal nav did, only
// vertically. Grouping by what an admin is actually doing (running the
// market-making desks, controlling money/fees, moderating the community,
// their own account) gives the sidebar visual rhythm and makes a given
// page findable by category instead of by memorizing its exact position
// in a long list.
const NAV_GROUPS: { label: string; items: { to: string; label: string; icon: LucideIcon; end?: boolean }[] }[] = [
  {
    label: "Overview",
    items: [{ to: "/admin", label: "Dashboard", icon: BarChart3, end: true }],
  },
  {
    label: "Market Making",
    items: [
      { to: "/admin/market-makers", label: "Market Makers", icon: Waves },
      { to: "/admin/market-makers/pnl", label: "MM P/L", icon: LineChart },
      { to: "/admin/market-makers/spread", label: "Spread Control", icon: Radio },
    ],
  },
  {
    label: "Money & Fees",
    items: [
      { to: "/admin/fees", label: "Fee Control", icon: Percent },
      { to: "/admin/fee-revenue", label: "Fee Revenue", icon: Layers },
      { to: "/admin/swap-pool", label: "Swap Pool", icon: ArrowLeftRight },
      { to: "/admin/bi2x-token", label: "BI2X Token", icon: Coins },
      { to: "/admin/test-balances", label: "Test Balances", icon: Wallet },
    ],
  },
  {
    label: "Community",
    items: [
      { to: "/admin/affiliate-links", label: "Affiliate Links", icon: Users },
      { to: "/admin/p2p-appeals", label: "P2P Appeals", icon: Scale },
    ],
  },
];

const SIDEBAR_WIDTH = "w-60";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const session = getSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const logout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen w-full flex">
      <AdminSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 px-3 sm:px-5 flex items-center gap-3 glass-strong border-b border-glass-border sticky top-0 z-20">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden -ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            aria-label="Open admin menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full border border-border/60" title="Admin menu">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-strong border-glass-border w-64">
              <div className="px-2 py-2">
                <div className="text-sm font-semibold">{session?.user.name ?? "DEX Admin"}</div>
                <div className="text-[11px] text-muted-foreground">{session?.user.email ?? "admin@bitdx.ai"}</div>
              </div>
              <DropdownMenuSeparator />
              <div className="px-2 py-2">
                <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Theme</div>
                <ThemeSwitcher compact />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/admin/profile" className="cursor-pointer">
                  <User className="h-3.5 w-3.5 mr-2 text-primary" /> Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-sell focus:text-sell">
                <LogOut className="h-3.5 w-3.5 mr-2" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function AdminSidebar({ mobileOpen, onCloseMobile }: { mobileOpen: boolean; onCloseMobile: () => void }) {
  return (
    <>
      {/* Desktop: a permanent column, sticky so the nav stays visible while
          a long admin page (e.g. a big table) scrolls underneath it. */}
      <aside className={cn("hidden lg:flex flex-col shrink-0 h-screen sticky top-0 glass-strong border-r border-glass-border", SIDEBAR_WIDTH)}>
        <SidebarBrand />
        <SidebarNav onNavigate={undefined} />
      </aside>

      {/* Mobile/tablet: an overlay drawer, same content, dismissed by the
          backdrop, the close button, or picking a destination. */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={onCloseMobile} aria-hidden="true" />
          <aside className={cn("absolute inset-y-0 left-0 flex flex-col glass-strong border-r border-glass-border", SIDEBAR_WIDTH)}>
            <div className="flex items-center justify-between px-1">
              <SidebarBrand />
              <button
                type="button"
                onClick={onCloseMobile}
                className="mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                aria-label="Close admin menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarNav onNavigate={onCloseMobile} />
          </aside>
        </div>
      )}
    </>
  );
}

function SidebarBrand() {
  return (
    <Link to="/admin" className="flex items-center gap-2 h-14 px-4 shrink-0 border-b border-glass-border">
      <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow-primary">
        <Zap className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
      </div>
      <div className="leading-tight">
        <div className="font-bold text-base tracking-tight text-foreground">BitDx</div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Admin</div>
      </div>
    </Link>
  );
}

function SidebarNav({ onNavigate }: { onNavigate: (() => void) | undefined }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <div className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            {group.label}
          </div>
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <AdminNavLink key={item.to} {...item} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function AdminNavLink({
  to, label, icon: Icon, end, onNavigate,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  onNavigate: (() => void) | undefined;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all",
          isActive
            ? "bg-primary/10 text-primary border border-primary/30"
            : "text-muted-foreground border border-transparent hover:bg-muted/50 hover:text-foreground"
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}
