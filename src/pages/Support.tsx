import { useState } from "react";
import {
  BookOpen,
  Bot,
  ChevronDown,
  CircleCheck,
  CircleHelp,
  Clock3,
  Mail,
  MessageSquare,
  Search,
  Send,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const TOPICS = [
  { title: "Account & Security", description: "Profile, verification, login, and account protection.", icon: ShieldCheck },
  { title: "Wallet & Payments", description: "Deposits, withdrawals, transfers, and payment methods.", icon: Wallet },
  { title: "Trading Help", description: "Orders, positions, fees, leverage, and liquidation.", icon: BookOpen },
  { title: "Bots & AI Agent", description: "Automation setup, bot orders, and AI Agent flows.", icon: Bot },
] as const;

const FAQS = [
  {
    question: "How long do withdrawals take?",
    answer: "Most withdrawals are reviewed immediately. Network confirmation time depends on the selected blockchain and current congestion.",
  },
  {
    question: "Where can I review my open orders?",
    answer: "Open orders appear in the lower trading panel. P2P orders also have a dedicated order page.",
  },
  {
    question: "How do I secure my account?",
    answer: "Enable two-factor authentication, use a hardware wallet when available, and maintain a withdrawal-address whitelist.",
  },
  {
    question: "Can support modify or place trades?",
    answer: "No. Support can investigate platform issues, but it cannot place, cancel, or modify trades on your behalf.",
  },
] as const;

export default function Support() {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleTopics = TOPICS.filter((topic) => (
    !normalizedQuery
    || topic.title.toLowerCase().includes(normalizedQuery)
    || topic.description.toLowerCase().includes(normalizedQuery)
  ));
  const visibleFaqs = FAQS.map((faq, index) => ({ ...faq, index })).filter((faq) => (
    !normalizedQuery
    || faq.question.toLowerCase().includes(normalizedQuery)
    || faq.answer.toLowerCase().includes(normalizedQuery)
  ));

  const submitRequest = () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Add a subject and describe the issue");
      return;
    }

    toast.success("Support request submitted", {
      description: "A support specialist will reply to trader@dex.ai.",
    });
    setSubject("");
    setMessage("");
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <section className="glass-strong relative overflow-hidden rounded-2xl border border-primary/20 p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
              <CircleHelp className="h-4 w-4" />
              DEX.ai Support
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">How can we help?</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Search common questions or send our support team a detailed request.
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

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
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
                    onClick={() => setQuery(topic.title)}
                    className="glass rounded-xl p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
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
                <h2 className="text-xl font-bold">Frequently Asked Questions</h2>
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

          <div className="space-y-4">
            <section className="glass-strong rounded-2xl border border-primary/20 p-5">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">Contact Support</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Include order IDs or transaction hashes when relevant.</p>
                </div>
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="support-subject" className="mb-1.5 block text-xs font-semibold text-muted-foreground">Subject</label>
                  <Input
                    id="support-subject"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="What do you need help with?"
                    className="bg-background/50"
                  />
                </div>
                <div>
                  <label htmlFor="support-message" className="mb-1.5 block text-xs font-semibold text-muted-foreground">Message</label>
                  <Textarea
                    id="support-message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Describe the issue and the steps that led to it..."
                    className="min-h-36 resize-none bg-background/50"
                  />
                </div>
                <Button onClick={submitRequest} className="h-11 w-full bg-gradient-primary font-bold text-primary-foreground">
                  <Send className="mr-2 h-4 w-4" />
                  Submit Request
                </Button>
              </div>
            </section>

            <section className="glass rounded-xl p-5">
              <div className="mb-4 flex items-center gap-2">
                <CircleCheck className="h-5 w-5 text-buy" />
                <h3 className="font-bold">All systems operational</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground"><Clock3 className="h-4 w-4" /> Average response</span>
                  <span className="font-semibold">Under 2 hours</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" /> Email</span>
                  <span className="font-semibold">support@dex.ai</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
