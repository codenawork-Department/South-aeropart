import { describe, it, expect, vi, beforeEach } from "vitest";
import type { InventoryAdjustmentTransaction } from "@repo/lib/inventory-adjustment";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  transaction: vi.fn(),
  invalidate: vi.fn(),
  notify: vi.fn(),
  audit: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ validateSession: mocks.authorize }));
vi.mock("@/lib/inventory-repository", () => ({
  runInventoryTransaction: mocks.transaction,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.invalidate }));
vi.mock("@/lib/realtime-notifier", () => ({
  notifyStorefrontCatalogChange: mocks.notify,
}));
import { adjustInventoryAction } from "./inventory.actions";

const productId = "10000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.authorize.mockResolvedValue({ id: "verified-admin", role: "admin" });
  mocks.transaction.mockImplementation(
    async (work: (tx: InventoryAdjustmentTransaction) => Promise<unknown>) =>
      work({
        lockProduct: async () => ({
          id: productId,
          productType: "single",
          stockQuantity: 10,
        }),
        setStock: async () => true,
        appendAudit: mocks.audit,
      }),
  );
});
describe("Admin inventory Server Action wiring (mocked repository/session)", () => {
  it.each([null, { id: "staff", role: "staff" }])(
    "denies unauthenticated/staff direct calls",
    async (actor) => {
      mocks.authorize.mockResolvedValue(actor);
      expect(
        await adjustInventoryAction({ productId, delta: 1 }),
      ).toMatchObject({
        success: false,
        error: { code: actor ? "FORBIDDEN" : "UNAUTHENTICATED" },
      });
      expect(mocks.transaction).not.toHaveBeenCalled();
      expect(mocks.invalidate).not.toHaveBeenCalled();
      expect(mocks.notify).not.toHaveBeenCalled();
    },
  );
  it("commits through the repository using the session actor before refreshing views", async () => {
    const result = await adjustInventoryAction({ productId, delta: -1 });
    expect(result).toEqual({
      success: true,
      data: { productId, delta: -1, stockBefore: 10, stockAfter: 9 },
    });
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: "verified-admin",
        action: "inventory.adjusted",
      }),
    );
    expect(mocks.invalidate).toHaveBeenCalledWith("/products");
    expect(mocks.notify).toHaveBeenCalledWith("product.updated", {
      id: productId,
    });
    expect(mocks.audit.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.invalidate.mock.invocationCallOrder[0],
    );
  });
  it("returns a generic error on repository failure and does not notify", async () => {
    mocks.transaction.mockRejectedValue(
      new Error("SQLSTATE 23505 internal_table secret"),
    );
    expect(await adjustInventoryAction({ productId, delta: 1 })).toEqual({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Unable to process request" },
    });
    expect(mocks.notify).not.toHaveBeenCalled();
  });
  it("keeps a committed mutation successful when cache or notification fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      mocks.invalidate.mockImplementation(() => {
        throw new Error("cache unavailable");
      });
      mocks.notify.mockRejectedValue(new Error("notification unavailable"));
      expect(
        await adjustInventoryAction({ productId, delta: 1 }),
      ).toMatchObject({ success: true, data: { stockAfter: 11 } });
      expect(mocks.transaction).toHaveBeenCalledTimes(1);
      expect(mocks.audit).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });
});
