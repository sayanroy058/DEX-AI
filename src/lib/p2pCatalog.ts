import { useEffect, useState } from "react";
import { getP2PCatalogRaw } from "@/lib/p2pApi";

// P2P countries, their fiat currency and payment methods, plus the form
// fields each method needs. The backend (repo/p2p_catalog.go) is the single
// source of truth and validates every save against the same definitions.
export type P2PField = {
	key: string; label: string; required: boolean;
	placeholder?: string; pattern?: string; hint?: string; options?: string[];
	upper?: boolean; stripSpaces?: boolean; maxLen?: number;
};
export type P2PMethodDef = { id: string; fields: P2PField[] };
export type P2PCountry = { code: string; name: string; currency: string; symbol: string; methods: P2PMethodDef[] };

const STORAGE_KEY = "p2pCatalog:v1";
let cached: P2PCountry[] | null = null;
let inflight: Promise<P2PCountry[]> | null = null;

const isCatalog = (value: unknown): value is P2PCountry[] =>
	Array.isArray(value) && value.every(c => c && typeof c.code === "string" && typeof c.currency === "string" && Array.isArray(c.methods));

function readStored(): P2PCountry[] | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as unknown;
		return isCatalog(parsed) ? parsed : null;
	} catch { return null; }
}

// Loads the catalog once per page load. A copy is kept in localStorage so the
// country/method pickers render immediately on later visits while a fresh copy
// is fetched; a failed fetch falls back to that copy (or an empty list).
export function loadP2PCatalog(): Promise<P2PCountry[]> {
	if (cached) return Promise.resolve(cached);
	if (!inflight) {
		inflight = getP2PCatalogRaw()
			.then(({ countries }) => {
				const list = isCatalog(countries) ? countries : [];
				if (list.length > 0) {
					cached = list;
					try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* storage blocked */ }
				}
				return list;
			})
			.catch(() => [] as P2PCountry[])
			.finally(() => { inflight = null; });
	}
	return inflight;
}

export function useP2PCatalog(): { countries: P2PCountry[]; loading: boolean } {
	const [countries, setCountries] = useState<P2PCountry[]>(() => cached ?? readStored() ?? []);
	const [loading, setLoading] = useState(countries.length === 0);
	useEffect(() => {
		let live = true;
		void loadP2PCatalog().then(list => {
			if (!live) return;
			if (list.length > 0) setCountries(list);
			setLoading(false);
		});
		return () => { live = false; };
	}, []);
	return { countries, loading };
}

export const countryByCode = (countries: P2PCountry[], code: string) => countries.find(c => c.code === code);
export const countryByCurrency = (countries: P2PCountry[], currency: string) => countries.find(c => c.currency === currency);
export const countryForMethod = (countries: P2PCountry[], methodId: string) => countries.find(c => c.methods.some(m => m.id === methodId));
export const methodDef = (countries: P2PCountry[], methodId: string) => countryForMethod(countries, methodId)?.methods.find(m => m.id === methodId);

// Applies the same normalization the backend does before validating a value.
export function normalizeFieldValue(field: P2PField, value: string): string {
	let out = value.trim();
	if (field.stripSpaces) out = out.replace(/[ -]/g, "");
	if (field.upper) out = out.toUpperCase();
	return out;
}

// Returns an error message for the field's current value, or "" when it is
// acceptable (empty optional fields are fine). Mirrors the backend's rules so
// users see problems before they submit; the backend remains authoritative.
export function validateField(field: P2PField, value: string): string {
	const v = normalizeFieldValue(field, value);
	if (!v) return field.required ? `${field.label} is required` : "";
	if (field.options && !field.options.includes(v)) return `${field.label} must be one of: ${field.options.join(", ")}`;
	if (field.pattern) {
		try { if (!new RegExp(field.pattern).test(v)) return field.hint || `${field.label} is invalid`; } catch { /* ignore bad pattern */ }
	}
	return "";
}

export const FIELD_LABELS: Record<string, string> = { accountName: "Account holder name", identifier: "Payment identifier", bankName: "Bank name", ifsc: "IFSC code" };

// The label for a method's primary identifier field (e.g. "UPI ID / VPA",
// "IBAN", "Account number"), falling back to a generic label.
export function identifierLabel(countries: P2PCountry[], methodId: string): string {
	return methodDef(countries, methodId)?.fields.find(f => f.key === "identifier")?.label ?? "Payment identifier";
}

// Labelled rows for everything a saved account / order snapshot holds beyond
// holder name and identifier (bank name, IFSC, sort code, routing number, ...),
// in the order the method's form lists them. Works with a not-yet-loaded
// catalog by falling back to the raw keys.
export function detailRows(
	countries: P2PCountry[],
	methodId: string,
	source: { bankName?: string; ifscCode?: string; details?: Record<string, string> },
): { label: string; value: string }[] {
	const valueFor = (key: string) => key === "bankName" ? source.bankName : key === "ifsc" ? source.ifscCode : source.details?.[key];
	const def = methodDef(countries, methodId);
	const rows: { label: string; value: string }[] = [];
	const used = new Set<string>();
	for (const field of def?.fields ?? []) {
		if (field.key === "accountName" || field.key === "identifier") continue;
		used.add(field.key);
		const value = valueFor(field.key);
		if (value) rows.push({ label: field.label, value });
	}
	if (source.bankName && !used.has("bankName")) rows.push({ label: FIELD_LABELS.bankName, value: source.bankName });
	if (source.ifscCode && !used.has("ifsc")) rows.push({ label: FIELD_LABELS.ifsc, value: source.ifscCode });
	for (const [key, value] of Object.entries(source.details ?? {})) {
		if (value && !used.has(key)) rows.push({ label: key, value });
	}
	return rows;
}

// First problem with a payment-method form, or "" when it is ready to submit.
export function paymentFormError(def: P2PMethodDef | undefined, values: Record<string, string>): string {
	if (!def) return "Select a payment method";
	for (const field of def.fields) {
		const message = validateField(field, values[field.key] ?? "");
		if (message) return message;
	}
	return "";
}
