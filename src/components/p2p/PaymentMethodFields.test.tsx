import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PaymentMethodFields } from "./PaymentMethodFields";
import type { P2PCountry } from "@/lib/p2pCatalog";

const countries: P2PCountry[] = [
	{ code: "IN", name: "India", currency: "INR", symbol: "₹", methods: [
		{ id: "UPI", fields: [
			{ key: "accountName", label: "Account holder name", required: true },
			{ key: "identifier", label: "UPI ID / VPA", required: true, pattern: "^[^\\s@]{2,}@[^\\s@]{2,}$", hint: "Enter a valid UPI ID" },
		] },
	] },
	{ code: "US", name: "United States", currency: "USD", symbol: "$", methods: [
		{ id: "ACH", fields: [
			{ key: "accountName", label: "Account holder name", required: true },
			{ key: "routingNumber", label: "Routing number", required: true },
			{ key: "accountType", label: "Account type", required: true, options: ["Checking", "Savings"] },
		] },
	] },
];

function Harness({ method: initial = "UPI", showErrors = false }: { method?: string; showErrors?: boolean }) {
	const [method, setMethod] = useState(initial);
	const [values, setValues] = useState<Record<string, string>>({});
	return <div>
		<PaymentMethodFields countries={countries} method={method} onMethodChange={setMethod} values={values} onValuesChange={setValues} showErrors={showErrors} />
		<output data-testid="state">{JSON.stringify({ method, values })}</output>
	</div>;
}

describe("PaymentMethodFields", () => {
	it("renders the selected method's fields from the catalog", () => {
		render(<Harness method="ACH" />);
		expect(screen.getByLabelText("Routing number")).toBeInTheDocument();
		expect(screen.getByLabelText("Account holder name")).toBeInTheDocument();
		expect(screen.queryByLabelText("UPI ID / VPA")).not.toBeInTheDocument();
	});

	it("stores typed values under the field's key", () => {
		render(<Harness />);
		fireEvent.change(screen.getByLabelText("UPI ID / VPA"), { target: { value: "me@bank" } });
		expect(JSON.parse(screen.getByTestId("state").textContent!).values).toEqual({ identifier: "me@bank" });
	});

	it("hides validation messages until errors are enabled", () => {
		render(<Harness />);
		fireEvent.change(screen.getByLabelText("UPI ID / VPA"), { target: { value: "nobank" } });
		expect(screen.queryByText("Enter a valid UPI ID")).not.toBeInTheDocument();
	});

	it("shows required-field errors when showErrors is set", () => {
		render(<Harness showErrors />);
		expect(screen.getByText("Account holder name is required")).toBeInTheDocument();
		expect(screen.getByText("UPI ID / VPA is required")).toBeInTheDocument();
	});

	it("says it is loading while the catalog is empty", () => {
		render(<PaymentMethodFields countries={[]} method="UPI" onMethodChange={() => {}} values={{}} onValuesChange={() => {}} />);
		expect(screen.getByText(/Loading payment methods/)).toBeInTheDocument();
	});
});
