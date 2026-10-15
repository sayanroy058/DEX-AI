import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminP2PPrices from "./AdminP2PPrices";

const row = (asset: string, fiatCurrency: string, price: string) => ({ asset, fiatCurrency, price, priceDate: "2026-10-10", createdAt: "2026-10-10T00:00:00Z" });

describe("AdminP2PPrices", () => {
  let posts: { url: string; body: unknown }[];

  beforeEach(() => {
    posts = [];
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const json = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }));
      if (url.includes("/admin/p2p/prices")) {
        if (init?.method === "POST") { posts.push({ url, body: JSON.parse(String(init.body)) }); return json({ prices: [] }); }
        if (url.includes("asset=")) return json({ history: [row("BI2XUSD", "PKR", "280.00000000")] });
        return json({
          assets: ["BI2XUSD", "USDT", "USDC"], currencies: ["INR", "PKR"],
          prices: ["BI2XUSD", "USDT", "USDC"].flatMap(a => [row(a, "INR", "100.00000000"), row(a, "PKR", "280.00000000")]),
        });
      }
      return json({ countries: [] });
    }));
  });

  it("lists the price in force per currency and asset with its effective date", async () => {
    render(<MemoryRouter><AdminP2PPrices /></MemoryRouter>);
    expect(await screen.findAllByText("2026-10-10")).toHaveLength(2);
    expect(screen.getAllByText(/PKR\s?280\.00/)).toHaveLength(3);
    expect(screen.getAllByText("₹100.00")).toHaveLength(3);
  });

  it("sets a new price for all assets of a currency", async () => {
    render(<MemoryRouter><AdminP2PPrices /></MemoryRouter>);
    const input = await screen.findByLabelText("New PKR price");
    fireEvent.change(input, { target: { value: "285.5" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Set price" })[1]);
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0].body).toEqual({ fiatCurrency: "PKR", price: "285.5" });
    expect(await screen.findByText(/PKR price set to/)).toBeInTheDocument();
  });

  it("asks before applying a price change of more than 20% and does nothing if declined", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<MemoryRouter><AdminP2PPrices /></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText("New PKR price"), { target: { value: "28" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Set price" })[1]);
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(posts).toHaveLength(0);
    confirm.mockRestore();
  });

  it("rejects a non-numeric price without calling the server", async () => {
    render(<MemoryRouter><AdminP2PPrices /></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText("New INR price"), { target: { value: "abc" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Set price" })[0]);
    expect(await screen.findByText(/Enter a positive price for INR/)).toBeInTheDocument();
    expect(posts).toHaveLength(0);
  });
});
