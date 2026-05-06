import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
import Prediction from "./pages/Prediction.tsx";
import P2P from "./pages/P2P.tsx";
import Token from "./pages/Token.tsx";
import Refer from "./pages/Refer.tsx";
import SIP from "./pages/SIP.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider delayDuration={200}>
      <Toaster />
      <Sonner theme="dark" position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/trade" element={<Index />} />
          <Route path="/markets" element={<Markets />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/copy" element={<CopyTrade />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/prop" element={<PropFirm />} />
          <Route path="/prediction" element={<Prediction />} />
          <Route path="/p2p" element={<P2P />} />
          <Route path="/token" element={<Token />} />
          <Route path="/refer" element={<Refer />} />
          <Route path="/sip" element={<SIP />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
