import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  select: vi.fn(),
  upload: vi.fn(),
}));
vi.mock("@repo/db", () => ({
  db: { select: mocks.select },
  products: {},
  productImages: {},
  categories: {},
  brands: {},
  carModels: {},
  materials: {},
  installations: {},
  productCompatibility: {},
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
  asc: vi.fn(),
  ilike: vi.fn(),
  or: vi.fn(),
  count: vi.fn(),
  inArray: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  validateSession: mocks.session,
  hasRequiredRole: (admin: { role: string }, roles: string[]) =>
    roles.includes(admin.role),
  logAuditEvent: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));
vi.mock("@repo/lib/cloudinary", () => ({
  uploadImage: mocks.upload,
  deleteImage: vi.fn(),
  deleteMultipleImages: vi.fn(),
}));
vi.mock("@/lib/realtime-notifier", () => ({
  notifyStorefrontCatalogChange: vi.fn(),
}));
import {
  createProductAction,
  updateProductAction,
} from "./product.actions";
import type { ProductInput } from "@/lib/product-input";
const valid = {
  sku: "QA-VALID",
  name: "QA",
  price: "100.00",
  stockQuantity: 1,
  status: "draft",
  isFeatured: false,
  images: [],
  compatibility: [],
  features: [],
} satisfies ProductInput;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ id: "admin", role: "admin" });
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});
afterEach(() => vi.restoreAllMocks());
describe("Product action authorization and redaction", () => {
  it.each([null, { id: "staff", role: "staff" }])(
    "denies direct create and update before DB/provider use",
    async (actor) => {
      mocks.session.mockResolvedValue(actor);
      const expected = {
        success: false,
        code: actor ? "FORBIDDEN" : "UNAUTHENTICATED",
        message: actor ? "Request not permitted" : "Authentication required",
      };
      expect(await createProductAction(valid)).toEqual(expected);
      expect(
        await updateProductAction(
          "10000000-0000-4000-8000-000000000001",
          valid,
        ),
      ).toEqual(expected);
      expect(mocks.select).not.toHaveBeenCalled();
      expect(mocks.upload).not.toHaveBeenCalled();
    },
  );
  it("validates update ID and strict input before lookup", async () => {
    expect(await updateProductAction("bad", valid)).toMatchObject({
      code: "INVALID_INPUT",
    });
    expect(
      await createProductAction({
        ...valid,
        role: "super_admin",
      } as ProductInput),
    ).toMatchObject({ code: "INVALID_INPUT" });
    expect(mocks.select).not.toHaveBeenCalled();
  });
  it("redacts exceptions from lookups before the mutation transaction", async () => {
    mocks.select.mockImplementation(() => {
      throw new Error("PRIVATE_SQLSTATE_PROVIDER_SECRET");
    });
    for (const result of [
      await createProductAction(valid),
      await updateProductAction("10000000-0000-4000-8000-000000000001", valid),
    ]) {
      expect(result).toMatchObject({
        success: false,
        code: "INTERNAL_ERROR",
        message: "Unable to process request",
      });
      expect(result.requestId).toMatch(/^[a-f0-9-]{36}$/);
      expect(JSON.stringify(result)).not.toContain("PRIVATE_");
    }
    expect(
      JSON.stringify(vi.mocked(process.stderr.write).mock.calls),
    ).not.toContain("PRIVATE_");
  });
  it("maps nested unique conflicts without exposing database metadata", async () => {
    mocks.select.mockImplementation(() => {
      throw { cause: { code: "23505", constraint: "private_constraint" } };
    });
    expect(await createProductAction(valid)).toEqual({
      success: false,
      code: "CONFLICT",
      message: "Request conflicts with current state",
    });
  });
});
