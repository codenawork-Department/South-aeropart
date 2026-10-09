import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  validateSession: vi.fn(),
  isAccountLocked: vi.fn(),
  verifyPassword: vi.fn(),
  logAuditEvent: vi.fn(),
  stripeRefundCreate: vi.fn(),
  releaseOrderStock: vi.fn(),
  revalidatePath: vi.fn(),
  txUpdate: vi.fn(),
  txInsert: vi.fn(),
  dbSelect: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  validateSession: mocks.validateSession,
  isAccountLocked: mocks.isAccountLocked,
  hasRequiredRole: (admin: any, roles: string[]) => Boolean(admin && roles.includes(admin.role)),
  verifyPassword: mocks.verifyPassword,
  logAuditEvent: mocks.logAuditEvent,
}));

vi.mock("@repo/lib/stripe", () => ({
  getStripe: () => ({
    refunds: {
      create: mocks.stripeRefundCreate,
    },
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

// Build fluent mock for Drizzle queries
const mockJob = {
  paymentIntentId: "pi_test_reconcile_12345",
  orderId: "10000000-0000-4000-8000-000000000001",
  reason: "confirmed_payment_without_active_reservation",
  state: "pending_review",
  createdAt: new Date(),
  resolvedAt: null,
  resolvedBy: null,
  resolutionNote: null,
  stripeRefundId: null,
  alertedAt: null,
};

const mockOrder = {
  id: "10000000-0000-4000-8000-000000000001",
  orderNumber: "SA-20261008-001",
  status: "pending",
  paymentStatus: "failed",
  inventoryState: "reserved",
  stripePaymentIntentId: "pi_test_reconcile_12345",
};

let queryQueue: any[] = [];

vi.mock("@repo/db", () => {
  const fakeQuery = () => ({
    from: () => fakeQuery(),
    leftJoin: () => fakeQuery(),
    where: () => fakeQuery(),
    orderBy: () => fakeQuery(),
    limit: () => ({
      offset: () => {
        const next = queryQueue.shift();
        return Promise.resolve(next ?? []);
      },
      then: (resolve: any) => {
        const next = queryQueue.shift();
        return Promise.resolve(resolve(next ?? []));
      },
    }),
    offset: () => {
      const next = queryQueue.shift();
      return Promise.resolve(next ?? []);
    },
    then: (resolve: any) => {
      const next = queryQueue.shift();
      return Promise.resolve(resolve(next ?? []));
    },
  });

  return {
    db: {
      select: () => fakeQuery(),
      transaction: async (callback: any) => {
        const tx = {
          update: () => ({
            set: () => ({
              where: () => ({
                returning: () => {
                  mocks.txUpdate();
                  return Promise.resolve([{ id: "success" }]);
                },
              }),
            }),
          }),
          insert: () => ({
            values: () => {
              mocks.txInsert();
              return Promise.resolve();
            },
          }),
        };
        return callback(tx);
      },
    },
    orders: { id: "id" },
    adminUsers: { id: "id" },
    paymentReconciliationJobs: {
      paymentIntentId: "payment_intent_id",
      orderId: "order_id",
      state: "state",
      createdAt: "created_at",
      reason: "reason",
      resolutionNote: "resolution_note",
    },
    orderStatusHistory: {},
    releaseOrderStock: mocks.releaseOrderStock,
    eq: vi.fn(),
    desc: vi.fn(),
    and: vi.fn(),
    or: vi.fn(),
    ilike: vi.fn(),
    sql: vi.fn(),
  };
});

import {
  listReconciliationJobsAction,
  resolveReconciliationJobAction,
} from "./reconciliation.actions";

describe("Payment Reconciliation Server Actions", () => {
  const adminActor = {
    id: "admin-uuid-001",
    fullName: "Super Admin",
    email: "superadmin@southaero.com",
    role: "super_admin",
    passwordHash: "$2b$12$fakeHashValueForAdmin123456",
  };

  const staffActor = {
    id: "staff-uuid-002",
    fullName: "Staff Member",
    email: "staff@southaero.com",
    role: "staff",
    passwordHash: "$2b$12$fakeHashValueForStaff123456",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryQueue = [];
    mocks.isAccountLocked.mockReturnValue(false);
    mocks.releaseOrderStock.mockResolvedValue(true);
    mocks.stripeRefundCreate.mockResolvedValue({ id: "re_test_987654321" });
  });

  describe("RBAC & Security Guards", () => {
    it("denies unauthenticated requests", async () => {
      mocks.validateSession.mockResolvedValue(null);

      const result = await resolveReconciliationJobAction({
        paymentIntentId: "pi_test_reconcile_12345",
        action: "refund",
        resolutionNote: "Valid explanation note here",
        adminPassword: "password123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
      expect(mocks.stripeRefundCreate).not.toHaveBeenCalled();
    });

    it("denies resolution by staff role (strict RBAC)", async () => {
      mocks.validateSession.mockResolvedValue(staffActor);

      const result = await resolveReconciliationJobAction({
        paymentIntentId: "pi_test_reconcile_12345",
        action: "refund",
        resolutionNote: "Valid explanation note here",
        adminPassword: "password123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("สิทธิ์การใช้งานไม่เพียงพอ");
      expect(mocks.stripeRefundCreate).not.toHaveBeenCalled();
    });

    it("rejects resolution if account is locked", async () => {
      mocks.validateSession.mockResolvedValue(adminActor);
      mocks.isAccountLocked.mockReturnValue(true);

      const result = await resolveReconciliationJobAction({
        paymentIntentId: "pi_test_reconcile_12345",
        action: "refund",
        resolutionNote: "Valid explanation note here",
        adminPassword: "password123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("บัญชีถูกระงับ");
    });
  });

  describe("Input Validation & Re-authentication", () => {
    beforeEach(() => {
      mocks.validateSession.mockResolvedValue(adminActor);
    });

    it("rejects note shorter than 5 characters", async () => {
      const result = await resolveReconciliationJobAction({
        paymentIntentId: "pi_test_reconcile_12345",
        action: "dismiss",
        resolutionNote: "bad",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("อย่างน้อย 5 ตัวอักษร");
    });

    it("requires password when action is refund", async () => {
      // Mock db queries: first job check
      queryQueue.push([mockJob]);
      queryQueue.push([mockOrder]);

      const result = await resolveReconciliationJobAction({
        paymentIntentId: "pi_test_reconcile_12345",
        action: "refund",
        resolutionNote: "Valid note here for refund",
        adminPassword: "",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("รหัสผ่านแอดมิน");
      expect(mocks.stripeRefundCreate).not.toHaveBeenCalled();
    });

    it("rejects refund if admin password is incorrect", async () => {
      queryQueue.push([mockJob]);
      queryQueue.push([mockOrder]);
      mocks.verifyPassword.mockResolvedValue(false);

      const result = await resolveReconciliationJobAction({
        paymentIntentId: "pi_test_reconcile_12345",
        action: "refund",
        resolutionNote: "Valid note here for refund",
        adminPassword: "WrongPassword@123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("รหัสผ่านแอดมินไม่ถูกต้อง");
      expect(mocks.stripeRefundCreate).not.toHaveBeenCalled();
    });
  });

  describe("Resolution Workflows", () => {
    beforeEach(() => {
      mocks.validateSession.mockResolvedValue(adminActor);
      mocks.verifyPassword.mockResolvedValue(true);
    });

    it("successfully refunds via Stripe with idempotency key, releases stock, and logs audit", async () => {
      queryQueue.push([mockJob]);
      queryQueue.push([mockOrder]);

      const result = await resolveReconciliationJobAction({
        paymentIntentId: "pi_test_reconcile_12345",
        action: "refund",
        resolutionNote: "Refunded due to stock reservation timeout",
        adminPassword: "CorrectPassword@123",
      });

      expect(result.success).toBe(true);
      expect(result.refundId).toBe("re_test_987654321");
      expect(mocks.stripeRefundCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_intent: "pi_test_reconcile_12345",
        }),
        expect.objectContaining({
          idempotencyKey: "reconcile_refund_pi_test_reconcile_12345",
        })
      );
      expect(mocks.releaseOrderStock).toHaveBeenCalled();
      expect(mocks.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "reconciliation.refunded",
          entityId: "pi_test_reconcile_12345",
        }),
        expect.anything()
      );
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/orders/reconciliation");
    });

    it("successfully fulfills manually without Stripe call", async () => {
      queryQueue.push([mockJob]);
      queryQueue.push([mockOrder]);

      const result = await resolveReconciliationJobAction({
        paymentIntentId: "pi_test_reconcile_12345",
        action: "fulfill_manually",
        resolutionNote: "Warehouse confirmed stock available to ship",
      });

      expect(result.success).toBe(true);
      expect(mocks.stripeRefundCreate).not.toHaveBeenCalled();
      expect(mocks.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "reconciliation.fulfilled_manually",
          entityId: "pi_test_reconcile_12345",
        }),
        expect.anything()
      );
    });

    it("successfully dismisses job without modifying order", async () => {
      queryQueue.push([mockJob]);
      queryQueue.push([mockOrder]);

      const result = await resolveReconciliationJobAction({
        paymentIntentId: "pi_test_reconcile_12345",
        action: "dismiss",
        resolutionNote: "False alarm webhook in dev environment",
      });

      expect(result.success).toBe(true);
      expect(mocks.stripeRefundCreate).not.toHaveBeenCalled();
      expect(mocks.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "reconciliation.dismissed",
          entityId: "pi_test_reconcile_12345",
        }),
        expect.anything()
      );
    });

    it("prevents double-resolving if job is already resolved", async () => {
      const alreadyResolvedJob = {
        ...mockJob,
        state: "refunded",
      };
      queryQueue.push([alreadyResolvedJob]);

      const result = await resolveReconciliationJobAction({
        paymentIntentId: "pi_test_reconcile_12345",
        action: "refund",
        resolutionNote: "Attempting to resolve again",
        adminPassword: "CorrectPassword@123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("ได้รับการจัดการแล้ว");
      expect(mocks.stripeRefundCreate).not.toHaveBeenCalled();
    });
  });

  describe("Listing Reconciliation Jobs", () => {
    it("returns paginated jobs and aggregate state counts", async () => {
      mocks.validateSession.mockResolvedValue(adminActor);

      // 1. countsResult, 2. countRow (total), 3. rows (items)
      queryQueue.push([
        {
          all: 3,
          pendingReview: 1,
          refunded: 1,
          fulfilledManually: 1,
          dismissed: 0,
        },
      ]);
      queryQueue.push([{ count: 1 }]);
      queryQueue.push([mockJob]);

      const result = await listReconciliationJobsAction({
        page: 1,
        limit: 20,
        state: "pending_review",
      });

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(1);
      expect(result.data?.counts.pendingReview).toBe(1);
      expect(result.data?.counts.refunded).toBe(1);
    });
  });
});
