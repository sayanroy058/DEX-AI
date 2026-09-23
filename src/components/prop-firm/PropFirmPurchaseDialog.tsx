import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatAccountSize,
  formatPropFirmProgram,
  formatUsd,
  getPropFirmPrice,
  propFirmPrograms,
  propFirmRuleSummary,
  propFirmSizes,
  propFirmUrl,
  type PropFirmProgram,
  type PropFirmSize,
} from "@/lib/propFirmPlans";
import { purchasePropFirmAccount, type PropFirmPurchaseResult } from "@/lib/propFirmApi";

type PurchaseStep = "configure" | "review" | "payment" | "ready";

type PropFirmPurchaseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialProgram: PropFirmProgram;
  initialSize: PropFirmSize;
};

const stepOrder: PurchaseStep[] = ["configure", "review", "payment", "ready"];
const stepLabels = ["Plan", "Review", "Payment", "Account"];

export function PropFirmPurchaseDialog({
  open,
  onOpenChange,
  initialProgram,
  initialSize,
}: PropFirmPurchaseDialogProps) {
  const [step, setStep] = useState<PurchaseStep>("configure");
  const [program, setProgram] = useState<PropFirmProgram>(initialProgram);
  const [size, setSize] = useState<PropFirmSize>(initialSize);
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState<"login" | "password" | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [result, setResult] = useState<PropFirmPurchaseResult | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep("configure");
    setProgram(initialProgram);
    setSize(initialSize);
    setProcessing(false);
    setCopied(null);
    setPurchaseError(null);
    setResult(null);
  }, [open, initialProgram, initialSize]);

  const price = useMemo(() => getPropFirmPrice(program, size), [program, size]);
  const stepIndex = stepOrder.indexOf(step);

  function copyCredential(kind: "login" | "password", value: string) {
    void navigator.clipboard?.writeText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1800);
  }

  async function confirmPurchase() {
    setProcessing(true);
    setPurchaseError(null);
    try {
      const purchaseResult = await purchasePropFirmAccount(program, size);
      setResult(purchaseResult);
      setStep("ready");
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setProcessing(false);
    }
  }

  function goBack() {
    if (step === "review") setStep("configure");
    if (step === "payment") setStep("review");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto border-primary/30 bg-background/95 p-0 shadow-glow-primary backdrop-blur-2xl">
        <DialogHeader className="border-b border-border px-6 pb-5 pt-6 pr-12">
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <ShieldCheck className="h-4 w-4" /> PropFirm account checkout
          </div>
          <DialogTitle className="text-2xl">
            {step === "configure" && "Choose your account"}
            {step === "review" && "Review your purchase"}
            {step === "payment" && "Secure payment"}
            {step === "ready" && "Your demo account is ready"}
          </DialogTitle>
          <DialogDescription>
            {step === "configure" && "Select a program and account size. You can review everything before checkout."}
            {step === "review" && "Confirm the selection below before continuing to the payment provider."}
            {step === "payment" && "Confirming will debit your BI2XUSD wallet and provision a real PropFirm account."}
            {step === "ready" && "Save these credentials now — the password is shown only once."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 border-b border-border bg-muted/20 px-4 sm:px-6">
          {stepLabels.map((label, index) => (
            <div key={label} className={`relative flex items-center justify-center gap-2 py-3 text-[10px] font-semibold sm:text-xs ${index <= stepIndex ? "text-primary" : "text-muted-foreground"}`}>
              <span className={`grid h-5 w-5 place-items-center rounded-full border text-[9px] ${index < stepIndex ? "border-primary bg-primary text-primary-foreground" : index === stepIndex ? "border-primary bg-primary/15" : "border-border"}`}>
                {index < stepIndex ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
              {index < stepLabels.length - 1 && <span className={`absolute right-0 h-px w-3 sm:w-7 ${index < stepIndex ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <div className="p-5 sm:p-6">
          {step === "configure" && (
            <div className="space-y-6">
              <div>
                <div className="mb-3 text-sm font-semibold">1. Account type</div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {propFirmPrograms.map((item) => (
                    <button key={item} type="button" onClick={() => setProgram(item)} className={`rounded-xl border p-4 text-left transition-all ${program === item ? "border-primary bg-primary/10 shadow-glow-primary" : "border-border bg-card hover:border-primary/40"}`}>
                      <span className="block text-sm font-bold">{formatPropFirmProgram(item)}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {item === "One-Step"
                          ? "Complete 1 evaluation challenge before becoming funded"
                          : item === "Two-Step"
                            ? "Complete 2 evaluation challenges before becoming funded"
                            : "No evaluation challenge (subject to final business confirmation)"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 text-sm font-semibold">2. Account size</div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {propFirmSizes.map((item) => (
                    <button key={item} type="button" onClick={() => setSize(item)} className={`rounded-xl border px-3 py-3 text-center transition-all ${size === item ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:border-primary/40"}`}>
                      <span className="block text-sm font-bold">{formatAccountSize(item)}</span>
                      <span className="mt-1 block text-[10px] text-muted-foreground">{formatUsd(getPropFirmPrice(program, item))}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Selected account</div>
                  <div className="mt-1 text-lg font-bold">{formatPropFirmProgram(program)} · {formatAccountSize(size)}</div>
                  <ul className="mt-3 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
                    {propFirmRuleSummary[program].map((rule) => <li key={rule} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />{rule}</li>)}
                  </ul>
                </div>
                <div className="sm:text-right"><div className="text-xs text-muted-foreground">One-time fee</div><div className="text-3xl font-extrabold gradient-text">{formatUsd(price)}</div></div>
              </div>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div><span className="text-xs text-muted-foreground">Program</span><strong className="mt-1 block">{formatPropFirmProgram(program)}</strong></div>
                  <div><span className="text-xs text-muted-foreground">Account size</span><strong className="mt-1 block">{formatAccountSize(size)}</strong></div>
                  <div><span className="text-xs text-muted-foreground">Amount due</span><strong className="mt-1 block text-xl text-primary">{formatUsd(price)}</strong></div>
                </div>
              </div>
              <div className="space-y-3 rounded-xl border border-border p-4">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Maximum leverage</span><strong>5x</strong></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Account access</span><strong>Separate PropFirm login</strong></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Payment confirmation</span><strong>Verified by backend</strong></div>
              </div>
              <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-xs leading-relaxed text-muted-foreground">
                Rules not yet confirmed—such as profit targets, trading days, and exact drawdown formulas—will not be silently added to the purchase.
              </div>
            </div>
          )}

          {step === "payment" && (
            <div className="space-y-5">
              <div className="grid gap-3">
                <div className="flex gap-3 rounded-xl border border-border bg-card p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><CreditCard className="h-4 w-4" /></span><span><strong className="block text-sm">Wallet debit</strong><small className="text-muted-foreground">{formatUsd(price)} in BI2XUSD is debited from your exchange wallet.</small></span></div>
                <div className="flex gap-3 rounded-xl border border-border bg-card p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><ShieldCheck className="h-4 w-4" /></span><span><strong className="block text-sm">Purchase recorded</strong><small className="text-muted-foreground">The exchange keeps a durable record of this purchase before provisioning.</small></span></div>
                <div className="flex gap-3 rounded-xl border border-border bg-card p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><LockKeyhole className="h-4 w-4" /></span><span><strong className="block text-sm">Account provisioning</strong><small className="text-muted-foreground">A real BitDX Prop Firm account and one-time credentials are created.</small></span></div>
              </div>
              {purchaseError && (
                <div className="rounded-xl border border-sell/30 bg-sell/10 p-4 text-xs text-sell">{purchaseError}</div>
              )}
            </div>
          )}

          {step === "ready" && result && (
            <div className="space-y-5 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-buy/30 bg-buy/10 text-buy"><CheckCircle2 className="h-8 w-8" /></div>
              <div><h3 className="text-xl font-bold">PropFirm account created</h3><p className="mt-1 text-sm text-muted-foreground">{formatPropFirmProgram(program)} · {formatAccountSize(size)}</p></div>
              <div className="mx-auto max-w-md space-y-3 text-left">
                <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3"><span><small className="block text-[10px] uppercase tracking-wider text-muted-foreground">Login ID</small><strong className="font-mono text-sm">{result.username}</strong></span><Button variant="ghost" size="icon" onClick={() => copyCredential("login", result.username)} aria-label="Copy login ID">{copied === "login" ? <Check className="h-4 w-4 text-buy" /> : <Copy className="h-4 w-4" />}</Button></div>
                <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3"><span><small className="block text-[10px] uppercase tracking-wider text-muted-foreground">Password</small><strong className="font-mono text-sm">{result.password}</strong></span><Button variant="ghost" size="icon" onClick={() => copyCredential("password", result.password)} aria-label="Copy password">{copied === "password" ? <Check className="h-4 w-4 text-buy" /> : <Copy className="h-4 w-4" />}</Button></div>
              </div>
              <p className="text-xs text-muted-foreground">This password will not be shown again — store it now.</p>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-border bg-muted/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            {(step === "review" || step === "payment") && <Button variant="ghost" onClick={goBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>}
          </div>
          {step === "configure" && <Button className="bg-gradient-primary text-primary-foreground" onClick={() => setStep("review")}>Review purchase <ArrowRight className="ml-2 h-4 w-4" /></Button>}
          {step === "review" && <Button className="bg-gradient-primary text-primary-foreground" onClick={() => setStep("payment")}>Continue to payment <ArrowRight className="ml-2 h-4 w-4" /></Button>}
          {step === "payment" && <Button className="bg-gradient-primary text-primary-foreground" onClick={confirmPurchase} disabled={processing}>{processing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…</> : <>Confirm purchase <ArrowRight className="ml-2 h-4 w-4" /></>}</Button>}
          {step === "ready" && <Button className="bg-gradient-primary text-primary-foreground" asChild><a href={propFirmUrl} target="_blank" rel="noreferrer">Open PropFirm <ExternalLink className="ml-2 h-4 w-4" /></a></Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
