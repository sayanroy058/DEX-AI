import { useLayoutEffect, useEffect, useState, lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { setAuthExpiredHandler } from "@/lib/apiClient";
import { stashPendingReferralCode } from "@/lib/useWallet";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { readTheme, type ThemeMode } from "@/lib/theme";

// Every route is loaded lazily (React.lazy + Suspense below) rather than
// eagerly imported here — see PERFORMANCE-CODE-REVIEW-FINDINGS.md frontend
// item #1. App.tsx used to eagerly import all 30+ pages (incl. every admin
// page), producing a single ~1.72 MB JS bundle downloaded and parsed before
// first paint regardless of which route the visitor actually landed on.
// Splitting per route means a visitor only pays for the page they open;
// React Router's own code-splitting guide recommends exactly this pattern.
const Landing = lazy(() => import("./pages/Landing.tsx"));
const Index = lazy(() => import("./pages/Index.tsx"));
const Markets = lazy(() => import("./pages/Markets.tsx"));
const Portfolio = lazy(() => import("./pages/Portfolio.tsx"));
const Leaderboard = lazy(() => import("./pages/Leaderboard.tsx"));
// const CopyTrade = lazy(() => import("./pages/CopyTrade.tsx")); // Copy Trading hidden
const Settings = lazy(() => import("./pages/Settings.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const PropFirm = lazy(() => import("./pages/PropFirm.tsx"));
const TradingBots = lazy(() => import("./pages/TradingBots.tsx"));
// const AIAgent = lazy(() => import("./pages/AIAgent.tsx")); // AI Agent bot creation disabled (frontend-only, no real bot backed it)
const P2P = lazy(() => import("./pages/P2P.tsx"));
const P2POrders = lazy(() => import("./pages/P2POrders.tsx"));
const P2POrderDetail = lazy(() => import("./pages/P2POrderDetail.tsx"));
const P2PAdvertiser = lazy(() => import("./pages/P2PAdvertiser.tsx"));
const P2PWallet = lazy(() => import("./pages/P2PWallet.tsx"));
const Token = lazy(() => import("./pages/Token.tsx"));
const Staking = lazy(() => import("./pages/Staking.tsx"));
const Refer = lazy(() => import("./pages/Refer.tsx"));
const SIP = lazy(() => import("./pages/SIP.tsx"));
const FeeTierSubscription = lazy(() => import("./pages/FeeTierSubscription.tsx"));
const Prediction = lazy(() => import("./pages/Prediction.tsx"));
const PredictionMarketDetail = lazy(() => import("./pages/PredictionMarketDetail.tsx"));
const PredictionOrders = lazy(() => import("./pages/PredictionOrders.tsx"));
const Affiliate = lazy(() => import("./pages/Affiliate.tsx"));
const Support = lazy(() => import("./pages/Support.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const AdminLogin = lazy(() => import("./pages/AdminLogin.tsx"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.tsx"));
const AdminProfile = lazy(() => import("./pages/AdminProfile.tsx"));
const AdminMarketMakers = lazy(() => import("./pages/AdminMarketMakers.tsx"));
const AdminMarketMakerPnl = lazy(() => import("./pages/AdminMarketMakerPnl.tsx"));
const AdminSpreadControl = lazy(() => import("./pages/AdminSpreadControl.tsx"));
const AdminFeeControl = lazy(() => import("./pages/AdminFeeControl.tsx"));
const AdminSwapPool = lazy(() => import("./pages/AdminSwapPool.tsx"));
const AdminAffiliateLinks = lazy(() => import("./pages/AdminAffiliateLinks.tsx"));
const AdminFeeRevenue = lazy(() => import("./pages/AdminFeeRevenue.tsx"));
const AdminTestBalances = lazy(() => import("./pages/AdminTestBalances.tsx"));
const AdminP2PAppeals = lazy(() => import("./pages/AdminP2PAppeals.tsx"));
const AdminBI2XTokenDetails = lazy(() => import("./pages/AdminBI2XTokenDetails.tsx"));
// AdminProtectedRoute is a small layout/guard component, not a page — kept
// eager since every /admin/* route needs it immediately and it adds
// negligible weight to the main bundle.
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

/** Captures a "?ref=CODE" referral/affiliate signup code from the URL on
 *  first load and stashes it for the next wallet login to consume — see
 *  stashPendingReferralCode/consumePendingReferralCode in useWallet.ts. Only
 *  meaningful for a brand-new user's first login; harmless if the visitor
 *  already has an account (the backend never re-links a returning user). */
function ReferralCodeCapture() {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("ref");
    if (code) stashPendingReferralCode(code.trim());
  }, []);
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

function ThemeAwareSonner() {
  const [theme, setTheme] = useState<ThemeMode>(readTheme);

  useEffect(() => {
    const onThemeChange = (event: Event) => {
      setTheme((event as CustomEvent<ThemeMode>).detail);
    };

    window.addEventListener("dex-theme-change", onThemeChange);
    return () => window.removeEventListener("dex-theme-change", onThemeChange);
  }, []);

  return <Sonner theme={theme === "light" ? "light" : "dark"} position="top-right" />;
}

/** Minimal full-viewport loading state shown only while a lazy route chunk
 *  is actually being fetched/parsed (React only renders this fallback for
 *  chunks not already cached by the browser/module loader) — deliberately
 *  unstyled/near-invisible rather than a branded spinner, since it's on
 *  screen for a very short time on a fast connection and must not itself
 *  cause layout shift against whatever the page below renders. */
function RouteFallback() {
  return <div className="min-h-screen" aria-hidden="true" />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider delayDuration={200}>
      <Toaster />
      <ThemeAwareSonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthExpiryWatcher />
        <ReferralCodeCapture />
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/trade" element={<Index />} />
          <Route path="/trading-bots" element={<TradingBots />} />
          {/* <Route path="/ai-agent" element={<AIAgent />} /> */}{/* AI Agent bot creation disabled */}
          <Route path="/markets" element={<Markets />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          {/* <Route path="/copy" element={<CopyTrade />} /> Copy Trading hidden */}
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/prop" element={<PropFirm />} />
          <Route path="/p2p" element={<P2P />} />
          <Route path="/p2p/orders" element={<P2POrders />} />
          <Route path="/p2p/orders/:orderId" element={<P2POrderDetail />} />
          <Route path="/p2p/advertiser" element={<P2PAdvertiser />} />
          <Route path="/p2p/wallet" element={<P2PWallet />} />
          <Route path="/token" element={<Token />} />
          <Route path="/staking" element={<Staking />} />
          <Route path="/refer" element={<Refer />} />
          <Route path="/affiliate" element={<Affiliate />} />
          <Route path="/support" element={<Support />} />
          <Route path="/sip" element={<SIP />} />
          <Route path="/fee-tiers" element={<FeeTierSubscription />} />
          <Route path="/prediction" element={<Prediction />} />
          <Route path="/prediction/orders" element={<PredictionOrders />} />
          <Route path="/prediction/:marketId" element={<PredictionMarketDetail />} />
          <Route path="/login" element={<AdminLogin />} />
          <Route element={<AdminProtectedRoute />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/market-makers" element={<AdminMarketMakers />} />
            <Route path="/admin/market-makers/pnl" element={<AdminMarketMakerPnl />} />
            <Route path="/admin/market-makers/spread" element={<AdminSpreadControl />} />
            <Route path="/admin/fees" element={<AdminFeeControl />} />
            <Route path="/admin/swap-pool" element={<AdminSwapPool />} />
            <Route path="/admin/affiliate-links" element={<AdminAffiliateLinks />} />
            <Route path="/admin/fee-revenue" element={<AdminFeeRevenue />} />
            <Route path="/admin/test-balances" element={<AdminTestBalances />} />
            <Route path="/admin/p2p-appeals" element={<AdminP2PAppeals />} />
            <Route path="/admin/bi2x-token" element={<AdminBI2XTokenDetails />} />
            <Route path="/admin/profile" element={<AdminProfile />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
