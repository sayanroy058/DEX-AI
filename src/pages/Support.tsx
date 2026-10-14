import { useState } from "react";
import {
  BookOpen,
  Bot,
  ChevronDown,
  CircleHelp,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { cn } from "@/lib/utils";

const TOPICS = [
  { title: "Account & Security", description: "Profile, verification, login, and account protection.", icon: ShieldCheck },
  { title: "Wallet & Payments", description: "Deposits, withdrawals, transfers, and payment methods.", icon: Wallet },
  { title: "Trading Help", description: "Orders, positions, fees, leverage, and liquidation.", icon: BookOpen },
  { title: "Bots & AI Agent", description: "Automation setup, bot orders, and AI Agent flows.", icon: Bot },
] as const;

const FAQS = [
  // Account & Security
  {
    topic: "Account & Security",
    question: "How do I secure my account?",
    answer: "Enable two-factor authentication, use a hardware wallet when available, and maintain a withdrawal-address whitelist. Never share your wallet seed phrase or private keys with anyone.",
  },
  {
    topic: "Account & Security",
    question: "How do I sign in to BitDx?",
    answer: "Connect your wallet (for example MetaMask) from the top-right of the app and approve the signature request. The signature only proves wallet ownership; it does not move any funds or cost gas.",
  },
  {
    topic: "Account & Security",
    question: "What should I do if I suspect unauthorized access?",
    answer: "Disconnect your wallet from BitDx, revoke any suspicious token approvals from your wallet, and move your funds to a new wallet if your keys may be exposed. Then contact support with the time and details of what you noticed.",
  },
  {
    topic: "Account & Security",
    question: "Will BitDx ever ask for my seed phrase or password?",
    answer: "No. BitDx staff and support will never ask for your seed phrase, private keys, or wallet password. Treat any message asking for them as a scam.",
  },
  // Wallet & Payments
  {
    topic: "Wallet & Payments",
    question: "How long do withdrawals take?",
    answer: "Most withdrawals are reviewed immediately. Network confirmation time depends on the selected blockchain and current congestion.",
  },
  {
    topic: "Wallet & Payments",
    question: "How do I deposit funds?",
    answer: "Open Portfolio, choose Deposit, select the asset and network, and send funds to the address shown. Always match the network exactly; funds sent on the wrong network may be lost.",
  },
  {
    topic: "Wallet & Payments",
    question: "What is BI2XUSD and how do I get it?",
    answer: "BI2XUSD is the platform stablecoin pegged to $1 and used as the quote currency for trading. You can obtain it by swapping USDT or USDC using the Swap button in the top bar.",
  },
  {
    topic: "Wallet & Payments",
    question: "Are there fees for swaps and withdrawals?",
    answer: "Swaps between BI2XUSD and USDT/USDC and withdrawals can carry a small fee plus network costs. The exact amount is shown in the confirmation step before you approve anything.",
  },
  {
    topic: "Wallet & Payments",
    question: "My deposit hasn't arrived yet. What should I do?",
    answer: "Deposits are credited after the required network confirmations, which can take longer during congestion. If it still hasn't appeared after that, check the transaction hash on a block explorer to confirm the network and address, then contact support with the hash.",
  },
  // Trading Help
  {
    topic: "Trading Help",
    question: "Where can I review my open orders?",
    answer: "Open orders appear in the lower trading panel. P2P orders also have a dedicated order page.",
  },
  {
    topic: "Trading Help",
    question: "What is the difference between Market and Limit orders?",
    answer: "A Market order fills immediately at the best available price. A Limit order only fills at your chosen price or better, and stays open in the order book until it fills or you cancel it.",
  },
  {
    topic: "Trading Help",
    question: "Why is the Spot tab disabled for some assets?",
    answer: "Spot trading is only available for markets that have a live spot order book. Other assets are traded through Futures. Select a Spot-enabled market to use the Spot tab.",
  },
  {
    topic: "Trading Help",
    question: "How does leverage and liquidation work?",
    answer: "Leverage lets you open a larger position with less margin, but it magnifies losses as well as gains. If your margin can no longer cover losses, the position is liquidated. Use stop-loss orders and the Calculator to size positions and see your liquidation price before trading.",
  },
  {
    topic: "Trading Help",
    question: "How do I set Take Profit and Stop Loss?",
    answer: "In the order panel, expand the optional TP/SL section and enter your trigger prices before placing the order. They close the position automatically when the market reaches those levels.",
  },
  {
    topic: "Trading Help",
    question: "Can support modify or place trades?",
    answer: "No. Support can investigate platform issues, but it cannot place, cancel, or modify trades on your behalf.",
  },
  // Bots & AI Agent
  {
    topic: "Bots & AI Agent",
    question: "How do I create a trading bot?",
    answer: "Click Bot in the trade header or open Trading Bots from the menu, choose a strategy, set your market, investment amount and parameters, then start it. You can pause or stop a bot at any time.",
  },
  {
    topic: "Bots & AI Agent",
    question: "Where can I see what my bots are doing?",
    answer: "Bot orders and activity appear under the Bot / AI Agent tab in the trading panel, and in the Trading Bots page. Filled bot trades also show up in your trade history.",
  },
  {
    topic: "Bots & AI Agent",
    question: "What happens to my open positions if I stop a bot?",
    answer: "Stopping a bot prevents it from placing new orders. Review your open orders and positions afterwards and close or cancel anything you no longer want.",
  },
  {
    topic: "Bots & AI Agent",
    question: "When will the AI Agent be available?",
    answer: "The AI Agent is coming soon. Until then, you can automate your trading with the available bot strategies.",
  },
  {
    topic: "Bots & AI Agent",
    question: "Are bots guaranteed to be profitable?",
    answer: "No. Bots execute a strategy automatically and can lose money in unfavorable markets. Start with a small amount, review the parameters carefully, and monitor performance.",
  },
] as const;

export default function Support() {
  const [query, setQuery] = useState("");
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleTopics = TOPICS.filter((topic) => (
    !normalizedQuery
    || topic.title.toLowerCase().includes(normalizedQuery)
    || topic.description.toLowerCase().includes(normalizedQuery)
  ));
  const visibleFaqs = FAQS.map((faq, index) => ({ ...faq, index })).filter((faq) => (
    (!activeTopic || faq.topic === activeTopic)
    && (!normalizedQuery
    || faq.question.toLowerCase().includes(normalizedQuery)
    || faq.answer.toLowerCase().includes(normalizedQuery))
  ));

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <section className="glass-strong relative overflow-hidden rounded-2xl border border-primary/20 p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
              <CircleHelp className="h-4 w-4" />
              BitDx Support
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">How can we help?</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Search common questions and browse help topics.
            </p>
            <div className="mt-6 flex h-12 items-center rounded-xl border border-border bg-background/60 px-4 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
              <Search className="mr-3 h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search support topics..."
                className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </section>

        <div className="grid gap-6">
          <div className="space-y-6">
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">Help Topics</h2>
                <span className="text-xs text-muted-foreground">{visibleTopics.length} topics</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {visibleTopics.map((topic) => (
                  <button
                    key={topic.title}
                    type="button"
                    onClick={() => {
                      setActiveTopic((current) => current === topic.title ? null : topic.title);
                      setOpenFaq(null);
                    }}
                    aria-pressed={activeTopic === topic.title}
                    className={cn("glass rounded-xl p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/5", activeTopic === topic.title && "border-primary/60 bg-primary/10")}
                  >
                    <topic.icon className="mb-4 h-5 w-5 text-primary" />
                    <div className="font-bold">{topic.title}</div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{topic.description}</p>
                  </button>
                ))}
                {visibleTopics.length === 0 && (
                  <div className="glass col-span-full rounded-xl p-6 text-center text-sm text-muted-foreground">
                    No help topics match your search.
                  </div>
                )}
              </div>
            </section>

            <section className="glass overflow-hidden rounded-xl">
              <div className="border-b border-border/50 px-5 py-4">
                <h2 className="text-xl font-bold">Frequently Asked Questions{activeTopic ? ` · ${activeTopic}` : ""}</h2>
              </div>
              {visibleFaqs.map((faq) => (
                <div key={faq.question} className="border-b border-border/40 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setOpenFaq((current) => current === faq.index ? null : faq.index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold transition-colors hover:bg-muted/25"
                    aria-expanded={openFaq === faq.index}
                  >
                    {faq.question}
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", openFaq === faq.index && "rotate-180")} />
                  </button>
                  {openFaq === faq.index && (
                    <p className="px-5 pb-4 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
                  )}
                </div>
              ))}
              {visibleFaqs.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">No FAQs match your search.</div>
              )}
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
