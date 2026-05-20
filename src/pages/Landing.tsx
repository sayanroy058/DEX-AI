import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight, TrendingUp, Layers, Bot, Shield, Globe, QrCode, Star, Download, Monitor, Laptop, Apple } from "lucide-react";
import { WalletDialog } from "@/components/wallet/WalletDialog";
import appStoreImg from "@/assets/app-store.png";
import playStoreImg from "@/assets/play-store.png";

export default function Landing() {
  const navigate = useNavigate();
  const [walletOpen, setWalletOpen] = useState(false);
  const sponsors = [
    { name: "Binance", logo: "https://logo.clearbit.com/binance.com" },
    { name: "Coinbase", logo: "https://logo.clearbit.com/coinbase.com" },
    { name: "Bybit", logo: "https://logo.clearbit.com/bybit.com" },
    { name: "OKX", logo: "https://logo.clearbit.com/okx.com" },
    { name: "Kraken", logo: "https://logo.clearbit.com/kraken.com" },
    { name: "Bitget", logo: "https://logo.clearbit.com/bitget.com" },
    { name: "MetaMask", logo: "https://logo.clearbit.com/metamask.io" },
    { name: "Chainlink", logo: "https://logo.clearbit.com/chain.link" },
  ];

  const goTrade = () => navigate("/trade");

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0e27]">
      {/* Navigation */}
      <header className="px-6 lg:px-10 h-16 flex items-center justify-between border-b border-glass-border glass-strong sticky top-0 z-30">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg">
            <Zap className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">DEX<span className="text-cyan-400">.ai</span></span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-slate-400">
          <Link to="/trade" className="hover:text-white transition-colors">Trade</Link>
          <Link to="/markets" className="hover:text-white transition-colors">Market</Link>
          <Link to="/copy" className="hover:text-white transition-colors">Copy</Link>
          <Link to="/prop" className="hover:text-white transition-colors">Prop Firm</Link>
          <Link to="/prediction" className="hover:text-white transition-colors">Prediction</Link>
          <Link to="/p2p" className="hover:text-white transition-colors">P2P</Link>
          <Link to="/token" className="hover:text-white transition-colors">Token</Link>
          <Link to="/sip" className="hover:text-white transition-colors">SIP/SWP</Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setWalletOpen(true)}
            className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 hover:from-cyan-300 hover:via-blue-400 hover:to-purple-500 text-white font-semibold px-6 h-10 rounded-lg shadow-lg shadow-blue-500/20"
          >
            Connect
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative min-h-[calc(100svh-4rem)] flex items-center justify-center px-6 py-12 md:py-16 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(56,189,248,0.2),transparent_38%),radial-gradient(circle_at_82%_22%,rgba(124,58,237,0.16),transparent_34%),linear-gradient(180deg,rgba(6,11,42,0.35)_0%,rgba(6,11,42,0)_60%)]" />
        {/* Animated floating orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-[12%] left-[8%] w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl animate-[pulse_6s_ease-in-out_infinite]" />
          <div className="absolute top-[20%] right-[6%] w-64 h-64 rounded-full bg-purple-600/10 blur-3xl animate-[pulse_8s_ease-in-out_2s_infinite]" />
          <div className="absolute bottom-[18%] left-[18%] w-48 h-48 rounded-full bg-blue-500/10 blur-2xl animate-[pulse_7s_ease-in-out_1s_infinite]" />
          <div className="absolute bottom-[10%] right-[15%] w-56 h-56 rounded-full bg-cyan-400/8 blur-3xl animate-[pulse_9s_ease-in-out_3s_infinite]" />
          {/* Floating particles */}
          {[...Array(18)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-cyan-400/30"
              style={{
                width: `${2 + (i % 3)}px`,
                height: `${2 + (i % 3)}px`,
                left: `${5 + (i * 5.3) % 90}%`,
                top: `${10 + (i * 7.1) % 80}%`,
                animation: `float-particle ${4 + (i % 5)}s ease-in-out ${(i * 0.4) % 3}s infinite`,
                opacity: 0.4 + (i % 4) * 0.1,
              }}
            />
          ))}
          {/* Grid lines shimmer */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: 'linear-gradient(rgba(56,189,248,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.8) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }} />
          {/* Orbiting ring */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-cyan-500/5" style={{ animation: 'spin-slow 30s linear infinite' }}>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cyan-400/50 blur-[2px]" />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-purple-500/5" style={{ animation: 'spin-slow 45s linear reverse infinite' }}>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-purple-400/50 blur-[2px]" />
          </div>
        </div>
        <style>{`
          @keyframes float-particle {
            0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.3; }
            33% { transform: translateY(-18px) translateX(8px); opacity: 0.7; }
            66% { transform: translateY(-8px) translateX(-10px); opacity: 0.5; }
          }
          @keyframes spin-slow {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to   { transform: translate(-50%, -50%) rotate(360deg); }
          }
          @keyframes shooting-star {
            0%   { left: -15%; opacity: 0; }
            5%   { opacity: 1; }
            60%  { opacity: 0.6; }
            100% { left: 110%; opacity: 0; }
          }
        `}</style>
        <div className="relative max-w-3xl w-full text-center space-y-8">
          {/* Badge */}
          <div className="mx-auto max-w-full">
            <span className="inline-block max-w-[92vw] sm:max-w-none text-center whitespace-normal break-words leading-snug text-base font-semibold text-slate-300 px-4 py-2 rounded-full border border-slate-700 bg-slate-800/50">
              ⚡ AI-Powered Multi-Asset Trading Platform
            </span>
          </div>

          {/* Main Heading */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl lg:text-[64px] font-black tracking-tight leading-[1.02]">
              <span className="block text-white mb-2">ALL IN ONE</span>
              <span className="block bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                AI-POWERED DEX
              </span>
            </h1>
          </div>

          {/* Description */}
          <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed tracking-wide">
            Trade Crypto, Forex, Stocks & Commodities with institutional-grade Al intelligence.
            <br />
            One platform. Every market. Zero limits.
            
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              onClick={goTrade}
              className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 hover:from-cyan-300 hover:via-blue-400 hover:to-purple-500 text-white font-bold px-8 h-12 rounded-lg text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
            >
              Start Trading <ArrowRight className="h-5 w-5" />
            </Button>
            <Button 
              onClick={() => navigate("/markets")}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 font-bold px-8 h-12 rounded-lg text-base bg-transparent"
            >
              Explore Markets
            </Button>
          </div>
        </div>
      </div>

      {/* Stats + Asset Section */}
      <section className="relative overflow-hidden px-6 py-16 lg:px-10 bg-[#040d1c] border-y border-cyan-900/30">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(22,175,255,0.12),transparent_35%),radial-gradient(circle_at_85%_12%,rgba(90,92,255,0.1),transparent_35%)]" />
        <div className="relative max-w-7xl mx-auto space-y-14">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { value: "$184B+", label: "Volume Traded" },
              { value: "1.2M+", label: "Active Traders" },
              { value: "350+", label: "Markets" },
              { value: "90+", label: "Blockchains" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-cyan-700/40 bg-[#0a1328]/90 px-5 py-6 text-center shadow-[0_0_20px_rgba(34,211,238,0.08)]">
                <p className="text-3xl md:text-4xl font-black bg-gradient-to-r from-cyan-300 to-indigo-300 bg-clip-text text-transparent">{item.value}</p>
                <p className="text-slate-400 text-sm mt-1">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="text-center space-y-3">
            <p className="text-cyan-400 text-xs md:text-sm font-semibold tracking-[0.22em] uppercase">Everything In One Place</p>
            <h2 className="text-3xl md:text-5xl font-black text-white">Trade Any Asset Class</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Crypto", sub: "Spot, Futures & Options", icon: TrendingUp, color: "text-cyan-400 bg-cyan-500/15 border-cyan-500/35" },
              { title: "Forex", sub: "150+ Currency Pairs", icon: Globe, color: "text-violet-300 bg-violet-500/15 border-violet-500/35" },
              { title: "Commodities", sub: "Gold, Oil, Gas & More", icon: Layers, color: "text-emerald-300 bg-emerald-500/15 border-emerald-500/35" },
              { title: "Stocks", sub: "US & Global Equities", icon: TrendingUp, color: "text-amber-300 bg-amber-500/15 border-amber-500/35" },
              { title: "SIP", sub: "Systematic Investment Plan", icon: Shield, color: "text-cyan-300 bg-cyan-500/15 border-cyan-500/35" },
              { title: "SWP", sub: "Systematic Withdrawal Plan", icon: Zap, color: "text-violet-300 bg-violet-500/15 border-violet-500/35" },
              { title: "Algo Trading", sub: "Automated Strategies", icon: Bot, color: "text-emerald-300 bg-emerald-500/15 border-emerald-500/35" },
              { title: "Bot Trading", sub: "AI-Powered Bots", icon: Bot, color: "text-amber-300 bg-amber-500/15 border-amber-500/35" },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-cyan-800/35 bg-[#071127]/90 p-5 md:p-6">
                <div className={`h-10 w-10 rounded-xl border flex items-center justify-center mb-4 ${item.color}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="text-white text-2xl font-semibold mb-1">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 lg:px-10 bg-[#0a0e27]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black text-white">Built for serious traders</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              FROM FIRST TRADE TO FULL TIME PRO ---- ALL TOOLS INCLUDED
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Pro Charting */}
            <div className="group border border-slate-700/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 backdrop-blur rounded-2xl p-6 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 transition-all">
              <div className="h-12 w-12 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-4 group-hover:shadow-lg group-hover:shadow-cyan-500/50 transition-all">
                <TrendingUp className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Pro Charting</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Lightning-fast charts with 50+ indicators & drawing tools.</p>
            </div>

            {/* Spot · Futures · Options */}
            <div className="group border border-slate-700/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 backdrop-blur rounded-2xl p-6 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 transition-all">
              <div className="h-12 w-12 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-4 group-hover:shadow-lg group-hover:shadow-cyan-500/50 transition-all">
                <Layers className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Spot · Futures · Options</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Trade every market type from one unified terminal.</p>
            </div>

            {/* AI Agents & Bots */}
            <div className="group border border-slate-700/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 backdrop-blur rounded-2xl p-6 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 transition-all">
              <div className="h-12 w-12 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-4 group-hover:shadow-lg group-hover:shadow-cyan-500/50 transition-all">
                <Bot className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">AI Agents & Bots</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Automate strategies with AI-powered trading assistants.</p>
            </div>

            {/* Self-Custody */}
            <div className="group border border-slate-700/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 backdrop-blur rounded-2xl p-6 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 transition-all">
              <div className="h-12 w-12 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-4 group-hover:shadow-lg group-hover:shadow-cyan-500/50 transition-all">
                <Shield className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Self-Custody</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Connect MetaMask, Coinbase, Trust, Binance, Bitget.</p>
            </div>

            {/* Multi-Asset */}
            <div className="group border border-slate-700/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 backdrop-blur rounded-2xl p-6 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 transition-all">
              <div className="h-12 w-12 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-4 group-hover:shadow-lg group-hover:shadow-cyan-500/50 transition-all">
                <Globe className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Multi-Asset</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Crypto, Forex, Commodities and Stocks in one place.</p>
            </div>

            {/* Up to 100× Leverage */}
            <div className="group border border-slate-700/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 backdrop-blur rounded-2xl p-6 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 transition-all">
              <div className="h-12 w-12 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-4 group-hover:shadow-lg group-hover:shadow-cyan-500/50 transition-all">
                <Zap className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Up to 100× Leverage</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Deep liquidity and ultra-low fees on every fill.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile App Download Section */}
      <section className="relative overflow-hidden py-20 px-6 lg:px-10 bg-[#030821]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_40%,rgba(9,184,255,0.16),transparent_36%),radial-gradient(circle_at_88%_38%,rgba(0,115,255,0.12),transparent_32%)]" />
        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-[1fr_auto_1fr] gap-10 items-center">
          {/* Left Side - Content */}
          <div className="space-y-7">
            <div className="flex items-start gap-4 md:gap-6">
              <div className="text-cyan-400/95 text-[64px] md:text-[84px] font-black tracking-tight leading-[0.8] [writing-mode:vertical-rl] rotate-180">
                Trade
              </div>
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-black leading-[0.88] tracking-tight">
                <span className="block text-white">Anytime</span>
                <span className="block text-cyan-400">Anywhere</span>
                <span className="block text-white">Any Device</span>
              </h2>
            </div>

            <p className="text-lg text-slate-400 max-w-xl">
              Native apps for mobile and desktop with the same lightning-fast experience.
            </p>

            <div className="flex flex-col sm:flex-row gap-3.5 pt-1">
              <button className="sm:w-[300px] border border-slate-700/80 bg-slate-900/55 hover:border-cyan-500/60 hover:bg-slate-900/80 transition-all rounded-2xl px-5 py-2.5 flex items-center gap-4 group">
                <div className="h-12 w-12 rounded-lg bg-black/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <img src={appStoreImg} alt="App Store" className="w-8 h-8 object-contain" />
                </div>
                <div className="text-left flex-1">
                  <div className="text-[9px] text-slate-400 group-hover:text-slate-300 transition-colors">Download on the</div>
                  <div className="text-[22px] leading-none font-extrabold text-white">App Store</div>
                </div>
              </button>

              <button className="sm:w-[300px] border border-slate-700/80 bg-slate-900/55 hover:border-cyan-500/60 hover:bg-slate-900/80 transition-all rounded-2xl px-5 py-2.5 flex items-center gap-4 group">
                <div className="h-12 w-12 rounded-lg bg-black/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <img src={playStoreImg} alt="Google Play" className="w-8 h-8 object-contain" />
                </div>
                <div className="text-left flex-1">
                  <div className="text-[9px] text-slate-400 group-hover:text-slate-300 transition-colors">GET IT ON</div>
                  <div className="text-[22px] leading-none font-extrabold text-white">Google Play</div>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "App Store", icon: Apple },
                { label: "Google Play", icon: Download },
                { label: "Windows", icon: Monitor },
                { label: "Mac", icon: Apple },
                { label: "Linux", icon: Laptop },
                { label: "APK", icon: Download },
              ].map((item) => (
                <button
                  key={item.label}
                  className="h-12 rounded-2xl border border-cyan-800/30 bg-gradient-to-r from-[#0b1430] via-[#111a39] to-[#152347] hover:border-cyan-500/50 text-slate-200 px-4 flex items-center gap-2 text-sm"
                >
                  <item.icon className="h-3.5 w-3.5 text-cyan-400" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Center - QR Code */}
          <div className="flex flex-col items-center justify-center gap-5">
            <div className="w-56 h-56 md:w-60 md:h-60 rounded-[2rem] bg-white p-5 flex items-center justify-center shadow-[0_0_40px_rgba(18,197,255,0.35)]">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg"
                alt="QR Code"
                className="w-full h-full"
              />
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <QrCode className="h-[18px] w-[18px] text-cyan-400" />
              </div>
              <p className="text-base md:text-lg text-slate-400 text-center">Scan to download on your mobile</p>
            </div>
          </div>

          {/* Right Side - Mobile Mockup */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              {/* Phone frame */}
              <div className="w-72 rounded-[2.8rem] bg-gradient-to-b from-slate-700 to-slate-900 p-2 shadow-[0_0_50px_rgba(7,153,255,0.3)] border border-cyan-500/40">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-black rounded-b-3xl z-20" />
                
                {/* Screen */}
                <div className="relative w-full rounded-[2.3rem] bg-gradient-to-b from-blue-900 to-slate-950 overflow-hidden">
                  {/* Content */}
                  <div className="p-6 pt-10 flex flex-col h-[580px]">
                    {/* Status bar area */}
                    <div className="flex justify-between items-center mb-6 px-2">
                      <span className="text-white text-sm font-semibold">9:41</span>
                      <div className="flex gap-1">
                        <div className="w-0.5 h-3 bg-white rounded-full opacity-70" />
                        <div className="w-0.5 h-3 bg-white rounded-full opacity-70" />
                      </div>
                    </div>

                    {/* Asset Selector */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-lg">BTC-PERP</span>
                        <span className="text-slate-400 text-xs">▼</span>
                      </div>
                      <Star className="h-5 w-5 text-slate-400" />
                    </div>

                    {/* Price */}
                    <div className="mb-4">
                      <div className="text-4xl font-bold text-white">$67,454.42</div>
                      <div className="text-sm text-emerald-400 mt-1">+2.34% (+1,542.81)</div>
                    </div>

                    {/* Time buttons */}
                    <div className="flex gap-2 mb-4 text-xs">
                      <button className="bg-blue-600 text-white px-3 py-1.5 rounded font-semibold">1H</button>
                      <button className="text-slate-300 px-3 py-1.5">1D</button>
                      <button className="text-slate-300 px-3 py-1.5">1W</button>
                      <button className="text-slate-300 px-3 py-1.5">1M</button>
                      <button className="text-slate-300 px-3 py-1.5">1Y</button>
                    </div>

                    {/* Chart */}
                    <div className="flex-1 mb-4 relative">
                      <svg className="w-full h-full" viewBox="0 0 240 80" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{stopColor: 'rgba(34,197,94,0.3)', stopOpacity: 1}} />
                            <stop offset="100%" style={{stopColor: 'rgba(34,197,94,0)', stopOpacity: 1}} />
                          </linearGradient>
                        </defs>
                        <polyline points="0,70 15,65 30,58 45,52 60,48 75,42 90,38 105,35 120,32 135,30 150,28 165,26 180,24 195,23 210,22 225,20 240,18" 
                                  fill="none" stroke="#22c55e" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
                        <polygon points="0,70 15,65 30,58 45,52 60,48 75,42 90,38 105,35 120,32 135,30 150,28 165,26 180,24 195,23 210,22 225,20 240,18 240,80 0,80" 
                                 fill="url(#chartGradient)"/>
                      </svg>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-6 mb-4 text-sm border-b border-slate-700 pb-3">
                      <button className="text-cyan-400 font-bold">Positions</button>
                      <button className="text-slate-400">Orders</button>
                    </div>

                    {/* Position Details */}
                    <div className="mb-4 text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-300">BTC-PERP</span>
                        <span className="text-emerald-400 font-semibold">Long</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">2.50 BTC</span>
                        <span className="text-emerald-400 font-semibold">+1,542.81</span>
                      </div>
                      <div className="text-xs text-slate-500">$168,635.50</div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mb-4">
                      <button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-lg font-bold text-sm transition-colors">↑ Long</button>
                      <button className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg font-bold text-sm transition-colors">↓ Short</button>
                    </div>

                    {/* Bottom Option Bar */}
                    <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-700 text-[10px]">
                      <button className="h-8 rounded-md bg-slate-900/70 text-cyan-300 border border-cyan-700/40">Spot</button>
                      <button className="h-8 rounded-md bg-slate-900/70 text-slate-300 border border-slate-700">Futures</button>
                      <button className="h-8 rounded-md bg-slate-900/70 text-slate-300 border border-slate-700">Margin</button>
                      <button className="h-8 rounded-md bg-slate-900/70 text-slate-300 border border-slate-700">More</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sponsor Marquee
      <section className="relative overflow-hidden px-6 py-10 lg:px-10 bg-[#030821] border-t border-slate-800/40 border-b border-slate-800/40">
        <style>{`
          @keyframes sponsorMarquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="text-center">
            <p className="text-sm font-semibold tracking-[0.2em] uppercase text-slate-400">
              Trusted By Sponsors
            </p>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-[#030821] to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-[#030821] to-transparent" />

            <div className="overflow-hidden">
              <div
                className="flex w-max gap-4 md:gap-6"
                style={{ animation: "sponsorMarquee 24s linear infinite" }}
              >
                {[...sponsors, ...sponsors].map((sponsor, idx) => (
                  <div
                    key={`${sponsor.name}-${idx}`}
                    className="min-w-[180px] md:min-w-[220px] rounded-2xl border border-slate-700/70 bg-slate-900/50 px-5 py-4 flex items-center gap-3"
                  >
                    <div className="h-9 w-9 rounded-full bg-white/95 p-1.5 flex items-center justify-center overflow-hidden">
                      <img
                        src={sponsor.logo}
                        alt={`${sponsor.name} logo`}
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <span className="text-sm md:text-base font-semibold text-slate-200">{sponsor.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section> */}

      <footer className="border-t border-slate-800/70 bg-[#070b20] px-6 py-10 lg:px-10">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Zap className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-xl tracking-tight text-white">DEX<span className="text-cyan-400">.ai</span></span>
            </Link>
            <p className="max-w-sm text-sm leading-6 text-slate-400">
              Multi-asset trading, wallet connectivity, copy strategies, prediction markets, and AI tools in one exchange experience.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold text-white">Trade</h3>
            <div className="space-y-3 text-sm text-slate-400">
              <Link to="/trade" className="block hover:text-cyan-300 transition-colors">Trading Terminal</Link>
              <Link to="/markets" className="block hover:text-cyan-300 transition-colors">Markets</Link>
              <Link to="/copy" className="block hover:text-cyan-300 transition-colors">Copy Trading</Link>
              <Link to="/prop" className="block hover:text-cyan-300 transition-colors">Prop Firm</Link>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold text-white">Products</h3>
            <div className="space-y-3 text-sm text-slate-400">
              <Link to="/prediction" className="block hover:text-cyan-300 transition-colors">Prediction</Link>
              <Link to="/p2p" className="block hover:text-cyan-300 transition-colors">P2P</Link>
              <Link to="/token" className="block hover:text-cyan-300 transition-colors">Token</Link>
              <Link to="/sip" className="block hover:text-cyan-300 transition-colors">DYP/SWAP</Link>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold text-white">Company</h3>
            <div className="space-y-3 text-sm text-slate-400">
              <Link to="/profile" className="block hover:text-cyan-300 transition-colors">Profile</Link>
              <Link to="/refer" className="block hover:text-cyan-300 transition-colors">Refer</Link>
              <Link to="/settings" className="block hover:text-cyan-300 transition-colors">Settings</Link>
              <button onClick={() => setWalletOpen(true)} className="block text-left hover:text-cyan-300 transition-colors">Connect Wallet</button>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-6xl flex-col gap-4 border-t border-slate-800/70 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 DEX.ai. All rights reserved.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <a href="#" className="hover:text-cyan-300 transition-colors">Terms</a>
            <a href="#" className="hover:text-cyan-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-cyan-300 transition-colors">Risk Disclosure</a>
          </div>
        </div>
      </footer>

      <WalletDialog open={walletOpen} onOpenChange={setWalletOpen} />
    </div>
  );
}
