import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createBot, type BotTemplate, type CreateBotRequest, type BotMarket } from "@/lib/botsApi";

// CreateBotModal renders a template's configurable params and POSTs a new bot.
// `symbol` and `investment` params map to the top-level CreateBotRequest fields;
// every other param is stored in the bot's config map (matching the Go API).
export function CreateBotModal({
  template,
  onClose,
  onCreated,
}: {
  template: BotTemplate | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!template) return;
    const defaults: Record<string, string> = {};
    for (const p of template.params) defaults[p.key] = p.default ?? "";
    setValues(defaults);
    setName(template.title);
    setError(null);
  }, [template]);

  if (!template) return null;

  const market: BotMarket = template.category === "Spot" ? "SPOT" : "FUTURES";

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const config: Record<string, string> = {};
      let symbol = "";
      let investment = "";
      for (const p of template.params) {
        const v = values[p.key] ?? "";
        if (p.key === "symbol") symbol = v.toUpperCase();
        else if (p.key === "investment") investment = v;
        else config[p.key] = v;
      }
      if (!name.trim()) throw new Error("Name is required");
      if (!symbol) throw new Error("Trading pair is required");
      if (!investment) investment = "0";
      const body: CreateBotRequest = {
        name: name.trim(),
        strategy: template.key,
        market,
        symbol,
        investment,
        config,
        isPublic: false,
      };
      await createBot(body);
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create bot");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={Boolean(template)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg border border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">Create {template.title}</DialogTitle>
          <p className="text-sm text-muted-foreground">{template.desc}</p>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Bot Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            {template.params.map((p) => (
              <Field key={p.key} label={p.label} help={p.help} required={p.required}>
                {p.type === "select" && p.options ? (
                  <select
                    value={values[p.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [p.key]: e.target.value }))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {p.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={values[p.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [p.key]: e.target.value }))}
                    placeholder={p.default}
                    inputMode={p.type === "number" || p.type === "interval" ? "decimal" : "text"}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                )}
              </Field>
            ))}
          </div>

          {error && <div className="rounded-md border border-sell/40 bg-sell/10 px-3 py-2 text-sm text-sell">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {submitting ? "Creating…" : "Create Bot"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  help,
  required,
  children,
}: {
  label: string;
  help?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-primary">*</span>}
      </span>
      {children}
      {help && <span className={cn("block text-[11px] text-muted-foreground/70")}>{help}</span>}
    </label>
  );
}
