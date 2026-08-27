import { useLayoutEffect, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { setAuthExpiredHandler } from "@/lib/apiClient";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "./pages/Landing.tsx";
import Index from "./pages/Index.tsx";
import Markets from "./pages/Markets.tsx";
import Portfolio from "./pages/Portfolio.tsx";
import Leaderboard from "./pages/Leaderboard.tsx";
import CopyTrade from "./pages/CopyTrade.tsx";
import Settings from "./pages/Settings.tsx";
import Profile from "./pages/Profile.tsx";
import PropFirm from "./pages/PropFirm.tsx";
import TradingBots from "./pages/TradingBots.tsx";
import AIAgent from "./pages/AIAgent.tsx";
import P2P from "./pages/P2P.tsx";
import P2POrders from "./pages/P2POrders.tsx";
import P2PAdvertiser from "./pages/P2PAdvertiser.tsx";
import Token from "./pages/Token.tsx";
import Refer from "./pages/Refer.tsx";
import SIP from "./pages/SIP.tsx";
import Affiliate from "./pages/Affiliate.tsx";
import Support from "./pages/Support.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminLogin from "./pages/AdminLogin.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import AdminProfile from "./pages/AdminProfile.tsx";
import AdminMarketMakers from "./pages/AdminMarketMakers.tsx";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.querySelector("main")?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

/** Surfaces a session-expiry notice when any API call gets a 401/403. The
 *  stale token is already cleared inside apiClient; here we just tell the user. */
function AuthExpiryWatcher() {
  useEffect(() => {
    // The API client still clears expired sessions, but expiry is handled
    // silently instead of showing a notification on every failed request.
    setAuthExpiredHandler(() => {});
    return () => setAuthExpiredHandler(null);
  }, []);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider delayDuration={200}>
      <Toaster />
      <Sonner theme="dark" position="top-right" />
      <BrowserRouter>
        <ScrollToTop />
        <AuthExpiryWatcher />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/trade" element={<Index />} />
          <Route path="/trading-bots" element={<TradingBots />} />
          <Route path="/ai-agent" element={<AIAgent />} />
          <Route path="/markets" element={<Markets />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/copy" element={<CopyTrade />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/prop" element={<PropFirm />} />
          <Route path="/p2p" element={<P2P />} />
          <Route path="/p2p/orders" element={<P2POrders />} />
          <Route path="/p2p/advertiser" element={<P2PAdvertiser />} />
          <Route path="/token" element={<Token />} />
          <Route path="/refer" element={<Refer />} />
          <Route path="/affiliate" element={<Affiliate />} />
          <Route path="/support" element={<Support />} />
          <Route path="/sip" element={<SIP />} />
          <Route path="/login" element={<AdminLogin />} />
          <Route element={<AdminProtectedRoute />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/market-makers" element={<AdminMarketMakers />} />
            <Route path="/admin/profile" element={<AdminProfile />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
