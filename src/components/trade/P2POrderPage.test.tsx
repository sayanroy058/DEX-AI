import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { P2POrderPage, type Merchant } from "./P2POrderPage";

const merchant: Merchant = {
  id: 1,
  name: "CryptoKing_India",
  avatar: "CK",
  trades: 1240,
  completion: 99.8,
  price: 91.24,
  payment: "Bank Transfer",
  rating: 4.9,
};

describe("P2POrderPage appeals", () => {
  it("returns to the first order step and shows the appeal ID in chat", () => {
    const onStatusChange = vi.fn();

    render(
      <P2POrderPage
        orderId="P2P-17008437"
        mode="buy"
        merchant={merchant}
        amountINR={678}
        grossQty={7.43}
        feeQty={0.0743}
        netQty={7.3557}
        initialStatus="pending_payment"
        onStatusChange={onStatusChange}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Raise Appeal" }));
    fireEvent.change(screen.getByPlaceholderText("Explain the issue in detail..."), {
      target: { value: "Payment was sent but not confirmed." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit Appeal" }));

    expect(onStatusChange).toHaveBeenCalledWith("appeal");
    expect(screen.getByText("Order Chat")).toBeInTheDocument();
    expect(screen.getByText("Order Placed")).toHaveClass("text-primary");
    expect(screen.getByText("Payment Instructions")).toBeInTheDocument();
    expect(screen.getByText("Account / UPI")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Appeal Under Review" })).toBeDisabled();
    expect(
      screen.getByText(
        /Appeal submitted\. Appeal ID: APL-\d{8}\. Reason: "Payment was sent but not confirmed\."/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Appeal Submitted Successfully")).not.toBeInTheDocument();
  });
});
