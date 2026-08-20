import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  Building2,
  Cpu,
  Compass,
  Sparkles,
  Code2,
  Bot,
  Layers,
  Coins,
  ShieldCheck,
} from "lucide-react";
import { WalletDialog } from "@/components/wallet/WalletDialog";

export default function About() {
  const navigate = useNavigate();
  const [walletOpen, setWalletOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0e27]">
      {/* Navigation */}
      <header className="px-6 lg:px-10 h-16 flex items-center justify-between border-b border-glass-border glass-strong sticky top-0 z-30">
        <Link to="/" className="flex items-center">
          <img src="/Logo.png" alt="BitDx" className="h-9 w-auto" />
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
            className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 hover:from-cyan-300 hover:via-blue-400 hover:to-purple-500 text-white font-semibold px-4 sm:px-6 h-10 rounded-lg shadow-lg shadow-blue-500/20 text-xs sm:text-sm"
          >
            Connect
          </Button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 bg-[#0a0e27]/95 backdrop-blur-lg border-b border-glass-border z-40 py-6 px-6 flex flex-col gap-4">
          <Link to="/trade" className="text-slate-300 hover:text-white font-medium py-2 border-b border-slate-800/50" onClick={() => setMobileMenuOpen(false)}>Trade</Link>
          <Link to="/markets" className="text-slate-300 hover:text-white font-medium py-2 border-b border-slate-800/50" onClick={() => setMobileMenuOpen(false)}>Market</Link>
          <Link to="/copy" className="text-slate-300 hover:text-white font-medium py-2 border-b border-slate-800/50" onClick={() => setMobileMenuOpen(false)}>Copy</Link>
          <Link to="/prop" className="text-slate-300 hover:text-white font-medium py-2 border-b border-slate-800/50" onClick={() => setMobileMenuOpen(false)}>Prop Firm</Link>
          <Link to="/prediction" className="text-slate-300 hover:text-white font-medium py-2 border-b border-slate-800/50" onClick={() => setMobileMenuOpen(false)}>Prediction</Link>
          <Link to="/p2p" className="text-slate-300 hover:text-white font-medium py-2 border-b border-slate-800/50" onClick={() => setMobileMenuOpen(false)}>P2P</Link>
          <Link to="/token" className="text-slate-300 hover:text-white font-medium py-2 border-b border-slate-800/50" onClick={() => setMobileMenuOpen(false)}>Token</Link>
          <Link to="/sip" className="text-slate-300 hover:text-white font-medium py-2" onClick={() => setMobileMenuOpen(false)}>SIP/SWP</Link>
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-20 lg:px-10 lg:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(56,189,248,0.2),transparent_38%),radial-gradient(circle_at_82%_22%,rgba(124,58,237,0.16),transparent_34%),linear-gradient(180deg,rgba(6,11,42,0.35)_0%,rgba(6,11,42,0)_60%)]" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-[10%] left-[10%] w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl animate-[pulse_6s_ease-in-out_infinite]" />
          <div className="absolute top-[15%] right-[8%] w-64 h-64 rounded-full bg-purple-600/10 blur-3xl animate-[pulse_8s_ease-in-out_2s_infinite]" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/5 px-4 py-1.5 text-xs font-medium text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" />
            About BITDX
          </div>
          <h1 className="mt-6 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            An AI-Powered<br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              Multi-Asset Trading Ecosystem
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
            BITDX is a highly curated digital trading initiative of{" "}
            <span className="font-semibold" style={{ color: "#4A9ED1" }}>IBACK</span>{" "}
            <span className="font-semibold" style={{ color: "#F4791A" }}>DIGITAL MEDIA</span>{" "}
            LLC, a registered digital technology company based in Sharjah, United Arab Emirates.
          </p>
        </div>
      </section>

      {/* Overview */}
      <section className="px-6 py-16 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/30 p-8 backdrop-blur-sm lg:p-10">
            <p className="text-base leading-8 text-slate-300">
              BITDX brings together modern trading technology, digital assets, automation, and
              Web3 experiences within a unified ecosystem. The platform is designed to provide
              access to a broad range of digital-market products and tools, including
              cryptocurrency, forex, stocks, commodities, derivatives, AI-assisted trading,
              automated trading bots, copy trading, prediction markets, P2P crypto trading and
              systematic investment tools.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {[
              { icon: Coins, label: "Cryptocurrency" },
              { icon: Layers, label: "Forex & Stocks" },
              { icon: Bot, label: "AI Trading Bots" },
              { icon: ShieldCheck, label: "Prop Firm" },
              { icon: Compass, label: "Prediction Markets" },
              { icon: Code2, label: "P2P Trading" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-full border border-slate-800/70 bg-slate-900/40 px-4 py-2 text-sm text-slate-300"
              >
                <Icon className="h-4 w-4 text-cyan-400" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built by IBACK */}
      <section className="px-6 py-16 lg:px-10">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-400/5 px-4 py-1.5 text-xs font-medium text-orange-300">
              <Building2 className="h-3.5 w-3.5" />
              Built by IBACK DIGITAL MEDIA LLC
            </div>
            <h2 className="mt-5 text-3xl font-bold text-white sm:text-4xl">
              Part of a larger{" "}
              <span style={{ color: "#4A9ED1" }}>digital</span>{" "}
              <span style={{ color: "#F4791A" }}>technology</span> ecosystem
            </h2>
          </div>

          <div className="space-y-5 text-slate-400">
            <p className="leading-7">
              BITDX is developed and operated as a significant initiative within the IBACK
              DIGITAL MEDIA LLC ecosystem.
            </p>
            <p className="leading-7">
              IBACK Digital Media focuses on digital technology and product development,
              including software and web development, AI and SaaS solutions, blockchain
              technology, digital infrastructure, hosting, domains, branding and digital
              marketing.
            </p>
            <p className="leading-7">
              BITDX represents the company's vision of bringing these technologies together to
              create a modern, connected digital trading experience.
            </p>
            <p className="rounded-xl border border-slate-800/70 bg-slate-900/30 px-5 py-4 text-sm leading-6 text-slate-500">
              BITDX is a digital initiative of IBACK DIGITAL MEDIA LLC and is not a separate
              corporate entity.
            </p>
          </div>
        </div>
      </section>

      {/* Technology Meets Modern Trading */}
      <section className="px-6 py-16 lg:px-10">
        <div className="mx-auto max-w-5xl rounded-2xl border border-slate-800/70 bg-gradient-to-br from-slate-900/50 to-slate-900/20 p-8 backdrop-blur-sm lg:p-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10">
              <Cpu className="h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Technology Meets Modern Trading
            </h2>
          </div>
          <p className="mt-5 leading-7 text-slate-400">
            BITDX is designed to combine AI, automation, blockchain technology, and multi-asset
            market access in one platform.
          </p>
          <p className="mt-4 leading-7 text-slate-400">
            Users can explore advanced trading interfaces, technical analysis tools, automated
            strategies, trading bots, copy trading and other digital-market features. The
            platform is designed to serve both experienced traders seeking advanced tools and
            users looking for more accessible, technology-assisted ways to explore digital
            markets.
          </p>
        </div>
      </section>

      {/* Our Vision */}
      <section className="px-6 py-16 lg:px-10">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/20 to-purple-500/20">
            <Compass className="h-6 w-6 text-cyan-300" />
          </div>
          <h2 className="mt-5 text-3xl font-bold text-white sm:text-4xl">Our Vision</h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            Our vision is to build a modern digital ecosystem where trading, automation,
            artificial intelligence and Web3 technology work together through a single,
            intuitive platform.
          </p>
          <p className="mx-auto mt-4 max-w-3xl leading-7 text-slate-400">
            We believe technology can make complex digital-market experiences more accessible,
            connected and user-focused.
          </p>
          <p className="mx-auto mt-4 max-w-3xl leading-7 text-slate-500">
            BITDX is continuously evolving as part of{" "}
            <span className="font-semibold" style={{ color: "#4A9ED1" }}>IBACK</span>{" "}
            <span className="font-semibold" style={{ color: "#F4791A" }}>DIGITAL MEDIA</span>{" "}
            LLC's broader commitment to developing innovative technology-driven digital products
            and experiences.
          </p>

          <div className="mt-10">
            <Button
              onClick={() => navigate("/trade")}
              className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 hover:from-cyan-300 hover:via-blue-400 hover:to-purple-500 text-white font-semibold px-8 h-11 rounded-lg shadow-lg shadow-blue-500/20"
            >
              Explore the Platform
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/70 bg-[#070b20] px-6 py-10 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-sm text-slate-500">
          <p>© 2026 BitDx. All rights reserved.</p>
          <p>
            <span style={{ color: "#4A9ED1" }} className="font-semibold">IBACK</span>{" "}
            <span style={{ color: "#F4791A" }} className="font-semibold">Digital Media</span>{" "}
            LLC · Sharjah, United Arab Emirates
          </p>
        </div>
      </footer>

      <WalletDialog open={walletOpen} onOpenChange={setWalletOpen} />
    </div>
  );
}
