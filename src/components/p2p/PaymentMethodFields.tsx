import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countryForMethod, methodDef, validateField, type P2PCountry } from "@/lib/p2pCatalog";

type Props = {
	countries: P2PCountry[];
	method: string;
	onMethodChange: (method: string) => void;
	values: Record<string, string>;
	onValuesChange: (values: Record<string, string>) => void;
	// Show per-field validation messages (set once the user tried to submit).
	showErrors?: boolean;
	className?: string;
};

// Country -> payment method -> that method's fields. Rendered entirely from the
// backend catalog, so adding a country or method needs no frontend change.
export function PaymentMethodFields({ countries, method, onMethodChange, values, onValuesChange, showErrors = false, className = "" }: Props) {
	const country = useMemo(() => countryForMethod(countries, method) ?? countries[0], [countries, method]);
	const def = methodDef(countries, method);

	function changeCountry(code: string) {
		const next = countries.find(c => c.code === code);
		if (!next || next.code === country?.code) return;
		onMethodChange(next.methods[0].id);
		onValuesChange({});
	}
	function changeMethod(id: string) {
		if (id === method) return;
		onMethodChange(id);
		onValuesChange({});
	}
	const setValue = (key: string, value: string) => onValuesChange({ ...values, [key]: value });

	if (countries.length === 0) return <p className="text-sm text-muted-foreground">Loading payment methods…</p>;

	return <div className={`space-y-3 ${className}`}>
		<div className="grid gap-3 sm:grid-cols-2">
			<div>
				<label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Country</label>
				<Select value={country?.code} onValueChange={changeCountry}>
					<SelectTrigger aria-label="Country"><SelectValue /></SelectTrigger>
					<SelectContent>{countries.map(c => <SelectItem key={c.code} value={c.code}>{c.name} — {c.currency} ({c.symbol})</SelectItem>)}</SelectContent>
				</Select>
			</div>
			<div>
				<label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment method</label>
				<Select value={method} onValueChange={changeMethod}>
					<SelectTrigger aria-label="Payment method"><SelectValue /></SelectTrigger>
					<SelectContent>{country?.methods.map(m => <SelectItem key={m.id} value={m.id}>{m.id}</SelectItem>)}</SelectContent>
				</Select>
			</div>
		</div>
		<div className="grid gap-3 sm:grid-cols-2">
			{def?.fields.map(field => {
				const value = values[field.key] ?? "";
				const error = showErrors ? validateField(field, value) : "";
				return <div key={`${method}:${field.key}`} className={field.key === "accountName" || field.key === "identifier" ? "sm:col-span-2" : ""}>
					<label className="mb-1.5 block text-xs font-semibold text-muted-foreground">{field.label}{field.required && <span className="text-destructive"> *</span>}</label>
					{field.options
						? <Select value={value || undefined} onValueChange={v => setValue(field.key, v)}>
							<SelectTrigger aria-label={field.label}><SelectValue placeholder={`Select ${field.label.toLowerCase()}`} /></SelectTrigger>
							<SelectContent>{field.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
						</Select>
						: <Input aria-label={field.label} value={value} maxLength={field.maxLen ?? (field.key === "identifier" ? 200 : 100)} placeholder={field.placeholder} onChange={event => setValue(field.key, field.upper ? event.target.value.toUpperCase() : event.target.value)} />}
					{error && <p className="mt-1 text-xs text-destructive">{error}</p>}
				</div>;
			})}
		</div>
	</div>;
}
