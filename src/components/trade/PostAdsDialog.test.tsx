import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PostAdsDialog } from "./PostAdsDialog";

describe("PostAdsDialog BIUSD amount", () => {
  it("accepts up to six BIUSD decimal places", () => {
    render(
      <PostAdsDialog
        open
        onOpenChange={vi.fn()}
        side="SELL"
        username="rohit"
        price="100"
        onUsernameEstablished={vi.fn()}
        onCreated={vi.fn()}
      />,
    );

    const amount = screen.getByRole("textbox", { name: "BIUSD amount" });
    fireEvent.change(amount, { target: { value: "20.000001" } });
    expect(amount).toHaveValue("20.000001");
    fireEvent.change(amount, { target: { value: "20.0000001" } });
    expect(amount).toHaveValue("20.000001");

	const maximum = screen.getByRole("textbox", { name: "Maximum order limit" });
	fireEvent.change(maximum, { target: { value: "500.00" } });
	fireEvent.change(maximum, { target: { value: "500.001" } });
	expect(maximum).toHaveValue("500.00");
  });

  it("caps the maximum order limit at the total fiat value", () => {
    render(
      <PostAdsDialog
        open
        onOpenChange={vi.fn()}
        side="SELL"
        username="rohit"
        price="100"
        onUsernameEstablished={vi.fn()}
        onCreated={vi.fn()}
      />,
    );

    const amount = screen.getByRole("textbox", { name: "BIUSD amount" });
    fireEvent.change(amount, { target: { value: "5" } });
    fireEvent.blur(amount);
    expect(screen.getByRole("textbox", { name: "Maximum order limit" })).toHaveValue("500.00");

    const maximum = screen.getByRole("textbox", { name: "Maximum order limit" });
    fireEvent.change(maximum, { target: { value: "600.00" } });
    expect(screen.getByText("Maximum limit cannot exceed ₹500.00.")).toBeInTheDocument();
    fireEvent.blur(maximum);
    expect(maximum).toHaveValue("500.00");
  });
});
