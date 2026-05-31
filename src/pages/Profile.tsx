import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWallet, shortAddress } from "@/lib/useWallet";
import { Mail, Calendar, Edit, FileDown, CreditCard, Smartphone, Plus, WalletCards, Landmark, ShieldCheck, X, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ReportRange = "7D" | "30D" | "90D" | "1Y";
type ReportType = "Account Summary" | "Trade History" | "Tax Statement" | "P2P Statement";
type PaymentMethodType = "UPI" | "IMPS" | "NEFT" | "RTGS" | "Bank Transfer";

type PaymentMethod = {
  id: number;
  type: PaymentMethodType;
  displayName: string;
  holderName: string;
  upiId?: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  mobile?: string;
  limit?: string;
};

const initialPaymentMethods: PaymentMethod[] = [
  {
    id: 1,
    type: "IMPS",
    displayName: "HDFC Bank ending 2048",
    holderName: "Trader One",
    bankName: "HDFC Bank",
    accountNumber: "XXXX2048",
    ifsc: "HDFC0001234",
    mobile: "+91 98765 43210",
    limit: "INR 2,00,000/day",
  },
  {
    id: 2,
    type: "UPI",
    displayName: "dexai@upi",
    holderName: "Trader One",
    upiId: "dexai@upi",
    mobile: "+91 98765 43210",
    limit: "INR 1,00,000/day",
  },
];

const paymentTypes: PaymentMethodType[] = ["UPI", "IMPS", "NEFT", "RTGS", "Bank Transfer"];

const emptyPaymentForm = {
  type: "UPI" as PaymentMethodType,
  holderName: "",
  upiId: "",
  bankName: "",
  accountNumber: "",
  ifsc: "",
  mobile: "",
  limit: "",
};

export default function Profile() {
  const w = useWallet();
  const memberSince = "Jan 2025";
  const [reportOpen, setReportOpen] = useState(false);
  const [reportRange, setReportRange] = useState<ReportRange>("30D");
  const [reportType, setReportType] = useState<ReportType>("Account Summary");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(initialPaymentMethods);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [methodToRemove, setMethodToRemove] = useState<PaymentMethod | null>(null);

  const downloadReport = () => {
    const today = new Date().toISOString().slice(0, 10);
    const rows = [
      ["Metric", "Value"],
      ["Wallet", w.connected ? shortAddress(w.address) : "Not connected"],
      ["Report Type", reportType],
      ["Report Range", reportRange],
      ["Member Since", memberSince],
      ["Generated On", today],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DEX_${reportType.replace(/\s+/g, "_")}_${reportRange}_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setReportOpen(false);
    toast.success(`${reportType} downloaded (${reportRange})`);
  };

  const requiresBankDetails = paymentForm.type !== "UPI";

  const openAddPayment = () => {
    setPaymentForm(emptyPaymentForm);
    setAddPaymentOpen(true);
  };

  const savePaymentMethod = () => {
    if (!paymentForm.holderName.trim()) {
      toast.error("Enter the account holder name");
      return;
    }

    if (paymentForm.type === "UPI" && !paymentForm.upiId.trim()) {
      toast.error("Enter a UPI ID");
      return;
    }

    if (requiresBankDetails && (!paymentForm.bankName.trim() || !paymentForm.accountNumber.trim() || !paymentForm.ifsc.trim())) {
      toast.error("Enter bank name, account number, and IFSC");
      return;
    }

    const savedMethod: PaymentMethod = {
      id: Date.now(),
      type: paymentForm.type,
      displayName:
        paymentForm.type === "UPI"
          ? paymentForm.upiId.trim()
          : `${paymentForm.bankName.trim()} ending ${paymentForm.accountNumber.trim().slice(-4)}`,
      holderName: paymentForm.holderName.trim(),
      upiId: paymentForm.upiId.trim() || undefined,
      bankName: paymentForm.bankName.trim() || undefined,
      accountNumber: paymentForm.accountNumber.trim() || undefined,
      ifsc: paymentForm.ifsc.trim().toUpperCase() || undefined,
      mobile: paymentForm.mobile.trim() || undefined,
      limit: paymentForm.limit.trim() || undefined,
    };

    setPaymentMethods((methods) => [savedMethod, ...methods]);
    setAddPaymentOpen(false);
    setPaymentOpen(true);
    toast.success(`${savedMethod.type} payment method added`);
  };

  const removePaymentMethod = () => {
    if (!methodToRemove) return;
    setPaymentMethods((methods) => methods.filter((method) => method.id !== methodToRemove.id));
    toast.success(`${methodToRemove.type} payment method removed`);
    setMethodToRemove(null);
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="glass-strong rounded-2xl p-6 border border-primary/20 flex flex-col md:flex-row gap-5 items-center md:items-start">
          <div className="h-20 w-20 rounded-full bg-gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground shadow-glow-primary">
            {w.connected ? w.address.slice(2, 4).toUpperCase() : "NX"}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-bold">{w.connected ? shortAddress(w.address) : "Anonymous Trader"}</h1>
            <div className="text-sm text-muted-foreground flex items-center gap-2 justify-center md:justify-start mt-1">
              <Mail className="h-3 w-3" /> trader@dex.ai
            </div>
            <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] bg-primary/15 text-primary border border-primary/30">
                <Calendar className="h-3 w-3" /> Member since {memberSince}
              </span>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto">
            <Button variant="outline" className="glass w-full md:w-auto"><Edit className="h-3.5 w-3.5 mr-1.5" /> Edit profile</Button>
            <Button variant="outline" className="glass w-full md:w-auto" onClick={() => setPaymentOpen(true)}>
              <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Payment Methods
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="glass rounded-xl p-5">
            <h3 className="font-bold mb-3">Account</h3>
            <Row k="Username" v="trader_one" />
            <Row k="Email" v="trader@dex.ai" />
            {/* <Row k="Member Since" v={memberSince} /> */}
            <Row k="2FA" v="Enabled" />
            <Row k="Wallet" v={w.connected ? shortAddress(w.address) : "Not connected"} />
          </div>
          <div className="glass rounded-xl p-5">
            <h3 className="font-bold mb-3">Preferences</h3>
            <Row k="Theme" v="Dark glass" />
            <Row k="Language" v="English" />
            <Row k="Currency" v="USD" />
            <Row k="UI mode" v="Advanced" />
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-bold">Payment Methods</h3>
              <p className="text-xs text-muted-foreground mt-1">Manage local payment options for P2P trades.</p>
            </div>
          </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {paymentMethods.map((method) => (
                <PaymentMethodCard key={method.id} method={method} />
              ))}
            </div>
          </div>

        <div className="glass-strong rounded-xl p-5 border border-primary/20">
          <h3 className="font-bold mb-4">Generate Report</h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <p className="text-sm text-muted-foreground flex-1">
              Choose report type and timeframe before downloading.
            </p>
            <Button onClick={() => setReportOpen(true)} className="sm:ml-auto bg-gradient-primary text-primary-foreground">
              <FileDown className="h-3.5 w-3.5 mr-1.5" /> Generate Report
            </Button>
          </div>
        </div>
      </div>
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Report Type</div>
              <div className="grid grid-cols-2 gap-2">
                {(["Account Summary", "Trade History", "Tax Statement", "P2P Statement"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setReportType(type)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      reportType === type
                        ? "bg-primary/20 text-primary border-primary/40"
                        : "border-border/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Time Frame</div>
              <div className="grid grid-cols-4 gap-2">
                {(["7D", "30D", "90D", "1Y"] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setReportRange(range)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      reportRange === range
                        ? "bg-primary/20 text-primary border-primary/40"
                        : "border-border/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={downloadReport} className="w-full bg-gradient-primary text-primary-foreground">
              <FileDown className="h-3.5 w-3.5 mr-1.5" /> Download {reportType}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-2xl overflow-hidden border border-border bg-card p-0 text-foreground shadow-2xl dark:border-primary/20 dark:bg-background/80 dark:backdrop-blur-2xl">
          <DialogHeader className="border-b border-border/60 px-6 py-5">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <WalletCards className="h-5 w-5 text-primary" /> Payment Methods
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold">Saved methods</h3>
                <p className="text-sm text-muted-foreground">
                  {paymentMethods.length > 0
                    ? `${paymentMethods.length} saved method${paymentMethods.length > 1 ? "s" : ""} available for P2P trades.`
                    : "No saved payment methods yet."}
                </p>
              </div>
              <Button onClick={openAddPayment} className="gap-2 bg-gradient-primary text-primary-foreground">
                <Plus className="h-4 w-4" /> Add Payment Method
              </Button>
            </div>

            {paymentMethods.length > 0 ? (
              <div className="grid gap-3">
                {paymentMethods.map((method) => (
                  <PaymentMethodCard
                    key={method.id}
                    method={method}
                    detailed
                    onRemove={() => setMethodToRemove(method)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div className="font-semibold">No payment method saved</div>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                  Add UPI or bank transfer details before creating or accepting P2P orders.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(methodToRemove)} onOpenChange={(open) => !open && setMethodToRemove(null)}>
        <DialogContent className="max-w-md border border-border bg-card text-foreground shadow-2xl dark:border-primary/20 dark:bg-background/85 dark:backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Remove payment method?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will remove {methodToRemove?.type}{" "}
              <span className="font-semibold text-foreground">{methodToRemove?.displayName}</span> from your saved P2P payment methods.
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setMethodToRemove(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={removePaymentMethod}>
                Remove Method
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addPaymentOpen} onOpenChange={setAddPaymentOpen}>
        <DialogContent className="max-w-2xl overflow-hidden border border-border bg-card p-0 text-foreground shadow-2xl dark:border-primary/20 dark:bg-background/80 dark:backdrop-blur-2xl">
          <DialogHeader className="border-b border-border/60 px-6 py-5">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Plus className="h-5 w-5 text-primary" /> Add Payment Method
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[72vh] space-y-5 overflow-y-auto p-6">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment Type</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {paymentTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setPaymentForm((form) => ({ ...form, type }))}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                      paymentForm.type === type
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-border/50 bg-muted/20 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
              <div className="mb-1 flex items-center gap-2 font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" /> Required information
              </div>
              Enter details exactly as registered with your bank or UPI app. These details are shown to counterparties during P2P settlement.
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Account Holder Name"
                value={paymentForm.holderName}
                placeholder="Name as per bank/UPI"
                onChange={(value) => setPaymentForm((form) => ({ ...form, holderName: value }))}
              />
              <Field
                label="Mobile Number"
                value={paymentForm.mobile}
                placeholder="+91 98765 43210"
                onChange={(value) => setPaymentForm((form) => ({ ...form, mobile: value }))}
              />

              {paymentForm.type === "UPI" ? (
                <Field
                  label="UPI ID"
                  value={paymentForm.upiId}
                  placeholder="name@upi"
                  onChange={(value) => setPaymentForm((form) => ({ ...form, upiId: value }))}
                  className="sm:col-span-2"
                />
              ) : (
                <>
                  <Field
                    label="Bank Name"
                    value={paymentForm.bankName}
                    placeholder="HDFC Bank"
                    onChange={(value) => setPaymentForm((form) => ({ ...form, bankName: value }))}
                  />
                  <Field
                    label="Account Number"
                    value={paymentForm.accountNumber}
                    placeholder="Enter account number"
                    onChange={(value) => setPaymentForm((form) => ({ ...form, accountNumber: value }))}
                  />
                  <Field
                    label="IFSC Code"
                    value={paymentForm.ifsc}
                    placeholder="HDFC0001234"
                    onChange={(value) => setPaymentForm((form) => ({ ...form, ifsc: value.toUpperCase() }))}
                  />
                </>
              )}

              <Field
                label="Daily Limit"
                value={paymentForm.limit}
                placeholder="INR 1,00,000/day"
                onChange={(value) => setPaymentForm((form) => ({ ...form, limit: value }))}
              />
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setAddPaymentOpen(false)}>
                Cancel
              </Button>
              <Button onClick={savePaymentMethod} className="bg-gradient-primary text-primary-foreground">
                Save Payment Method
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-sm py-2 border-b border-border/30 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

function PaymentMethodCard({
  method,
  detailed = false,
  onRemove,
}: {
  method: PaymentMethod;
  detailed?: boolean;
  onRemove?: () => void;
}) {
  const Icon = method.type === "UPI" ? Smartphone : Landmark;

  return (
    <div className="relative rounded-xl border border-border/50 bg-muted/20 p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5">
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${method.type} payment method`}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className={onRemove ? "min-w-0 flex-1 pr-8" : "min-w-0 flex-1"}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-bold">{method.type}</div>
            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
              Active
            </span>
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">{method.displayName}</div>
          {detailed && (
            <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <span>Holder: <b className="text-foreground">{method.holderName}</b></span>
              {method.bankName && <span>Bank: <b className="text-foreground">{method.bankName}</b></span>}
              {method.ifsc && <span>IFSC: <b className="text-foreground">{method.ifsc}</b></span>}
              {method.mobile && <span>Mobile: <b className="text-foreground">{method.mobile}</b></span>}
              {method.limit && <span>Limit: <b className="text-foreground">{method.limit}</b></span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-semibold text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}
