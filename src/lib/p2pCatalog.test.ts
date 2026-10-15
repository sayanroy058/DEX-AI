import { describe, expect, it } from "vitest";
import { detailRows, identifierLabel, methodDef, normalizeFieldValue, paymentFormError, validateField, type P2PCountry } from "./p2pCatalog";
import { formatFiat, formatFiatPrice } from "./p2pApi";

const countries: P2PCountry[] = [
	{ code: "IN", name: "India", currency: "INR", symbol: "₹", methods: [
		{ id: "UPI", fields: [
			{ key: "accountName", label: "Account holder name", required: true },
			{ key: "identifier", label: "UPI ID / VPA", required: true, pattern: "^[^\\s@]{2,}@[^\\s@]{2,}$", hint: "Enter a valid UPI ID" },
		] },
		{ id: "IMPS", fields: [
			{ key: "accountName", label: "Account holder name", required: true },
			{ key: "bankName", label: "Bank name", required: true },
			{ key: "identifier", label: "Account number", required: true },
			{ key: "ifsc", label: "IFSC code", required: true, pattern: "^[A-Z]{4}0[A-Z0-9]{6}$", upper: true, stripSpaces: true },
		] },
	] },
	{ code: "GB", name: "United Kingdom", currency: "GBP", symbol: "£", methods: [
		{ id: "Faster Payments", fields: [
			{ key: "accountName", label: "Account holder name", required: true },
			{ key: "sortCode", label: "Sort code", required: true, pattern: "^\\d{6}$", stripSpaces: true },
			{ key: "identifier", label: "Account number", required: true },
		] },
	] },
];

describe("p2pCatalog helpers", () => {
	it("normalizes values the same way the backend does", () => {
		const ifsc = countries[0].methods[1].fields[3];
		expect(normalizeFieldValue(ifsc, " hdfc 0001234 ")).toBe("HDFC0001234");
		expect(normalizeFieldValue(countries[1].methods[0].fields[1], "12-34-56")).toBe("123456");
	});

	it("validates required, pattern and optional fields", () => {
		const upi = countries[0].methods[0].fields[1];
		expect(validateField(upi, "")).toBe("UPI ID / VPA is required");
		expect(validateField(upi, "nobank")).toBe("Enter a valid UPI ID");
		expect(validateField(upi, "me@bank")).toBe("");
		expect(validateField({ key: "x", label: "Optional", required: false }, "")).toBe("");
	});

	it("reports the first problem for a whole form", () => {
		const def = methodDef(countries, "IMPS");
		expect(paymentFormError(def, { accountName: "A B", bankName: "HDFC", identifier: "123456", ifsc: "BAD" })).toMatch(/IFSC/);
		expect(paymentFormError(def, { accountName: "A B", bankName: "HDFC", identifier: "123456", ifsc: "hdfc0001234" })).toBe("");
		expect(paymentFormError(undefined, {})).toBe("Select a payment method");
	});

	it("labels the identifier and lists extra detail rows in form order", () => {
		expect(identifierLabel(countries, "UPI")).toBe("UPI ID / VPA");
		expect(identifierLabel(countries, "Unknown")).toBe("Payment identifier");
		expect(detailRows(countries, "IMPS", { bankName: "HDFC", ifscCode: "HDFC0001234" })).toEqual([
			{ label: "Bank name", value: "HDFC" }, { label: "IFSC code", value: "HDFC0001234" },
		]);
		expect(detailRows(countries, "Faster Payments", { details: { sortCode: "123456" } })).toEqual([{ label: "Sort code", value: "123456" }]);
		// Catalog not loaded yet: still shows what it has, using raw keys.
		expect(detailRows([], "Raast", { bankName: "HBL", details: { iban: "PK36" } })).toEqual([
			{ label: "Bank name", value: "HBL" }, { label: "iban", value: "PK36" },
		]);
	});
});

describe("formatFiat", () => {
	it("formats INR with Indian grouping and other currencies by code", () => {
		expect(formatFiat(1234567.5, "INR")).toBe("₹12,34,567.50");
		expect(formatFiat(280, "PKR")).toMatch(/PKR\s?280\.00/);
		expect(formatFiat(1, "USD")).toBe("$1.00");
	});
	it("shows unit prices with up to four decimals but amounts with two", () => {
		expect(formatFiatPrice("0.79510000", "GBP")).toBe("£0.7951");
		expect(formatFiatPrice("100.00000000", "INR")).toBe("₹100.00");
		expect(formatFiat("0.7951", "GBP")).toBe("£0.80");
	});
	it("falls back for an invalid currency code instead of throwing", () => {
		expect(formatFiat(5, "??")).toBe("?? 5.00");
	});
});
