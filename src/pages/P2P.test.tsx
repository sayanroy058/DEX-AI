import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import P2P from "./P2P";

describe("P2P page", () => {
  let listings: object[];

  beforeEach(() => {
    Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
    listings = [];
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      const body = url.includes("/p2p/price")
        ? { price: { asset: "BI2XUSD", fiatCurrency: "INR", price: "100.00000000", priceDate: "2026-07-16", createdAt: new Date().toISOString() } }
        : { listings };
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }));
    }));
  });

  it("renders the BI2XUSD marketplace without a Post Ad action", async () => {
    render(<MemoryRouter><P2P /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Buy BI2XUSD" })).toBeInTheDocument();
    expect(await screen.findByText("No matching BI2XUSD ads found.")).toBeInTheDocument();
    expect(screen.getByText(/Database price for/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Post Ad/i })).not.toBeInTheDocument();
  });

  it("links the buyer's INR payment and net BI2XUSD receipt fields", async () => {
    listings = [{
      id: "listing-1", creatorId: "seller-1", username: "SellerOne", side: "SELL", asset: "BI2XUSD",
      amountRaw: "5000000", remainingRaw: "5000000", price: "100.00", fiatCurrency: "INR",
      minOrderFiat: "100.00", maxOrderFiat: "350.00", paymentMethods: ["UPI"], status: "ACTIVE",
      completedOrders: 0, completedAmountRaw: "0", completedOrders30d: 0, completionRate30d: "0.00",
      ratedOrders30d: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }];
    render(<MemoryRouter><P2P /></MemoryRouter>);
    expect(await screen.findByText("SellerOne")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "BUY BI2XUSD" }).at(-1)!);

    const payInput=screen.getByRole("textbox", { name: "You pay in INR" }) as HTMLInputElement;
    const receiveInput=screen.getByRole("textbox", { name: "You receive in BI2XUSD" }) as HTMLInputElement;
    expect(payInput.value).toBe("100.00");
    expect(receiveInput.value).toBe("0.99");

    fireEvent.change(receiveInput,{target:{value:"1.00"}});
    expect(payInput.value).toBe("101.01");
    fireEvent.change(payInput,{target:{value:"250.00"}});
    expect(receiveInput.value).toBe("2.475");
  });

  it("accepts an INR amount in Quick Trade and opens the matching buy offer", async () => {
    listings = [{
      id: "listing-quick", creatorId: "seller-1", username: "QuickSeller", side: "SELL", asset: "BI2XUSD",
      amountRaw: "5000000", remainingRaw: "5000000", price: "100.00", fiatCurrency: "INR",
      minOrderFiat: "100.00", maxOrderFiat: "350.00", paymentMethods: ["UPI"], status: "ACTIVE",
      completedOrders: 0, completedAmountRaw: "0", completedOrders30d: 0, completionRate30d: "0.00",
      ratedOrders30d: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }];
    render(<MemoryRouter><P2P /></MemoryRouter>);
    expect(await screen.findByText("QuickSeller")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "Quick trade INR amount" }), { target: { value: "250" } });
    expect(screen.getByRole("textbox", { name: "Quick trade BI2XUSD amount" })).toHaveValue("2.5");
    const proceed=screen.getByRole("button", { name: /Proceed to Buy/ });
    expect(proceed).toBeEnabled();
    fireEvent.click(proceed);

    expect(screen.getByRole("textbox", { name: "You pay in INR" })).toHaveValue("250.00");
    expect(screen.getByRole("textbox", { name: "You receive in BI2XUSD" })).toHaveValue("2.475");
  });

  it("links the seller's INR receipt and BI2XUSD amount and explains an unusable remainder", async () => {
    listings = [{
      id: "listing-2", creatorId: "buyer-1", username: "DexUser215", side: "BUY", asset: "BI2XUSD",
      amountRaw: "6050000", remainingRaw: "6050000", price: "100.00", fiatCurrency: "INR",
      minOrderFiat: "500.00", maxOrderFiat: "605.00", paymentMethods: ["UPI"], status: "ACTIVE",
      completedOrders: 0, completedAmountRaw: "0", completedOrders30d: 0, completionRate30d: "0.00",
      ratedOrders30d: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }];
    render(<MemoryRouter><P2P /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Sell BI2XUSD" }));
    expect(await screen.findByText("DexUser215")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Quick trade BI2XUSD amount" }), { target: { value: "6.05" } });
    expect(screen.getByRole("textbox", { name: "Quick trade INR amount" })).toHaveValue("605.00");
    const proceed=screen.getByRole("button", { name: /Proceed to Sell/ });
    expect(proceed).toBeEnabled();
    fireEvent.click(proceed);

    const receiveInput=screen.getByRole("textbox", { name: "You receive in INR" }) as HTMLInputElement;
    const sellInput=screen.getByRole("textbox", { name: "You sell in BI2XUSD" }) as HTMLInputElement;
    expect(receiveInput.value).toBe("605.00");
    expect(sellInput.value).toBe("6.05");

    fireEvent.change(sellInput,{target:{value:"5.05"}});
    expect(receiveInput.value).toBe("505.00");
    expect(screen.getByText(/below the ad minimum/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sell 5.05 BI2XUSD" })).toBeDisabled();

    fireEvent.change(receiveInput,{target:{value:"605"}});
    expect(sellInput.value).toBe("6.05");
    expect(screen.getByRole("button", { name: "Sell 6.05 BI2XUSD" })).toBeEnabled();
  });
});
