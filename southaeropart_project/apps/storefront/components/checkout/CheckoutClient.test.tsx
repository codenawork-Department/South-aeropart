import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { th } from "@/i18n/dictionaries/th";
import { en } from "@/i18n/dictionaries/en";

const state = vi.hoisted(() => ({ language: "th", createOrder: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push }) }));
vi.mock("@/components/providers/LanguageProvider", () => ({ useLanguage: () => ({ lang: state.language, t: state.language === "th" ? th : en }) }));
vi.mock("@/components/providers/CurrencyProvider", () => ({ useCurrency: () => ({ currency: "THB", formatPrice: (value: unknown) => String(value) }) }));
vi.mock("@/components/providers/CartProvider", () => ({ useCart: () => ({
  items: [{ id: "fixture", product: { id: "10000000-0000-4000-8000-000000000001", name: "Fixture", price: "100.00", images: [] }, quantity: 1 }],
  itemCount: 1, subtotal: "100.00", clearCart: vi.fn(), isHydrated: true,
}) }));
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    isSignedIn: true,
    isLoaded: true,
    user: {
      id: "user-123",
      fullName: "Customer",
      primaryEmailAddress: { emailAddress: "fixture@example.invalid" },
    },
  }),
}));
vi.mock("@/actions/shipping.actions", () => ({
  previewShipping: vi.fn().mockResolvedValue({
    success: true,
    data: {
      standard: "150.00",
      express: "450.00",
      subtotal: "100.00",
      requiresQuote: false,
      key: "mock-preview-key",
    },
  }),
  requestShippingQuote: vi.fn(),
}));
vi.mock("@/actions/checkout.actions", () => ({ createOrder: state.createOrder, getSavedCheckoutAddresses: async () => ({
  success: true, userProfile: { email: "fixture@example.invalid" }, addresses: [{ id: "address", isDefault: true, recipientName: "Customer", phone: "0800000000", line1: "Fixture", subDistrict: "Fixture", district: "Fixture", province: "Bangkok", postalCode: "10110" }],
}) }));
import { CheckoutClient } from "./CheckoutClient";

afterEach(cleanup);
beforeEach(() => { state.language = "th"; state.createOrder.mockReset(); state.push.mockReset(); });

describe("checkout order-note interaction", () => {
  it.each(["th", "en"])("sends the note verbatim and preserves it for retry in %s", async (language) => {
    state.language = language;
    const copy = language === "th" ? th : en;
    state.createOrder.mockResolvedValueOnce({ success: false, error: "Please retry" }).mockResolvedValueOnce({ success: true, orderId: "owned-order" });
    const { container } = render(<CheckoutClient />);
    await screen.findByDisplayValue("Customer");
    await screen.findByText(copy.checkout.standardShipping);
    const note = screen.getByLabelText(copy.checkout.customerNote);
    const text = "กรุณาโทรก่อนจัดส่ง\n  Please call <before> delivery";
    fireEvent.change(note, { target: { value: text } });
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(state.createOrder).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(container.querySelector("#place-order-btn")).not.toBeDisabled());
    expect(state.createOrder.mock.calls[0][0].customerNote).toBe(text);
    expect(note).toHaveValue(text);
    expect(state.push).not.toHaveBeenCalled();
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(state.push).toHaveBeenCalledWith("/checkout/payment/owned-order"));
    expect(state.createOrder.mock.calls[1][0].customerNote).toBe(text);
  });
  it("focuses an oversized note and blocks submission until the user edits it", async () => {
    const { container } = render(<CheckoutClient />);
    const note = screen.getByLabelText(th.checkout.customerNote);
    fireEvent.change(note, { target: { value: "ก".repeat(683) } });
    expect(note).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(th.checkout.noteInvalid);
    fireEvent.submit(container.querySelector("form")!);
    expect(state.createOrder).not.toHaveBeenCalled();
    expect(note).toHaveFocus();
    fireEvent.change(note, { target: { value: "กรุณาโทรก่อนจัดส่ง" } });
    expect(note).toHaveAttribute("aria-invalid", "false");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
