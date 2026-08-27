import { Link, NavLink, useNavigate } from "react-router-dom";
import { BarChart3, LogOut, User, Zap, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { clearSession, getSession } from "@/lib/Auth";
import { cn } from "@/lib/utils";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const session = getSession();

  const logout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen w-full flex flex-col">
      <header className="h-14 px-3 sm:px-5 flex items-center gap-3 glass-strong border-b border-glass-border sticky top-0 z-30">
        <Link to="/admin" className="flex items-center gap-2 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow-primary">
            <Zap className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-base tracking-tight">DEX<span className="gradient-text">.ai</span></div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Admin</div>
          </div>
        </Link>

        <nav className="hidden sm:flex items-center gap-1 ml-3">
          <AdminNavLink to="/admin" label="Dashboard" icon={BarChart3} end />
          <AdminNavLink to="/admin/market-makers" label="Market Makers" icon={Waves} />
          <AdminNavLink to="/admin/profile" label="Profile" icon={User} />
        </nav>

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
              <div className="text-[11px] text-muted-foreground">{session?.user.email ?? "admin@dex.ai"}</div>
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
  );
}

function AdminNavLink({ to, label, icon: Icon, end }: { to: string; label: string; icon: any; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
          isActive ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        )
      }
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </NavLink>
  );
}
