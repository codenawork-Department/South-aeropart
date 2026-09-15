import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), account: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@repo/db", () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ limit: mocks.account }) }) }) },
  users: { id: "id", isBanned: "is_banned" }, eq: vi.fn(),
}));
import { customerAuth } from "./customer-auth";
describe("customer session boundary", () => {
  beforeEach(() => vi.resetAllMocks());
  it("rejects a banned Clerk identity instead of treating it as a guest", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_banned" });
    mocks.account.mockResolvedValue([{ isBanned: true }]);
    await expect(customerAuth()).rejects.toThrow("Account unavailable");
  });
  it("propagates authentication failures without guest fallback", async () => {
    mocks.auth.mockRejectedValue(new Error("auth unavailable"));
    await expect(customerAuth()).rejects.toThrow("auth unavailable");
    expect(mocks.account).not.toHaveBeenCalled();
  });
  it("permits an actual guest without creating or looking up a customer", async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    expect((await customerAuth()).userId).toBeNull();
    expect(mocks.account).not.toHaveBeenCalled();
  });
});
