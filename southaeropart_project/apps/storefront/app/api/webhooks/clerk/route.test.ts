import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockSync = vi.hoisted(() => ({
  syncUserWithClerk: vi.fn().mockResolvedValue({ success: true }),
  svixVerify: vi.fn(),
}));

vi.mock("@/lib/user-sync", () => ({
  syncUserWithClerk: mockSync.syncUserWithClerk,
}));

vi.mock("svix", () => ({
  Webhook: vi.fn().mockImplementation(function () {
    return { verify: mockSync.svixVerify };
  }),
}));

vi.mock("@repo/db", () => ({
  db: {
    update: () => ({
      set: () => ({
        where: () => Promise.resolve(),
      }),
    }),
    insert: () => ({
      values: () => Promise.resolve(),
    }),
  },
  users: { _name: "users" },
  userLoginLogs: { _name: "userLoginLogs" },
  eq: () => ({}),
}));

import { POST } from "./route";

describe("Clerk Webhook Route Handler (CLAUDE.md §5.1, §5.3)", () => {
  const originalSecret = process.env.CLERK_WEBHOOK_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLERK_WEBHOOK_SECRET = "whsec_valid_test_secret_123456789";
  });

  afterEach(() => {
    process.env.CLERK_WEBHOOK_SECRET = originalSecret;
  });

  it("fails closed: returns 500 when CLERK_WEBHOOK_SECRET is not configured or placeholder", async () => {
    process.env.CLERK_WEBHOOK_SECRET = "whsec_xxx_placeholder";

    const req = new NextRequest("http://localhost:3000/api/webhooks/clerk", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data.error).toContain("Webhook signature secret is not configured");
  });

  it("returns 400 when Svix headers are missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/webhooks/clerk", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain("missing svix headers");
  });

  it("returns 413 when body exceeds 1MB limit", async () => {
    const hugeBody = "x".repeat(1024 * 1024 + 50);
    const req = new NextRequest("http://localhost:3000/api/webhooks/clerk", {
      method: "POST",
      headers: {
        "svix-id": "msg_test_id",
        "svix-timestamp": "123456789",
        "svix-signature": "v1,signature_test",
      },
      body: hugeBody,
    });

    const res = await POST(req);
    expect(res.status).toBe(413);

    const data = await res.json();
    expect(data.error).toContain("Payload too large");
  });

  it("returns 400 when Svix signature verification fails", async () => {
    mockSync.svixVerify.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const req = new NextRequest("http://localhost:3000/api/webhooks/clerk", {
      method: "POST",
      headers: {
        "svix-id": "msg_test_id",
        "svix-timestamp": "123456789",
        "svix-signature": "v1,bad_signature",
      },
      body: JSON.stringify({ type: "user.created" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain("verification failed");
  });

  it("processes user.created event and syncs customer with database", async () => {
    mockSync.svixVerify.mockReturnValue({
      type: "user.created",
      data: {
        id: "user_clerk_12345",
        email_addresses: [{ email_address: "customer@example.com" }],
        first_name: "Somchai",
        last_name: "Racer",
        image_url: "https://clerk.dev/avatar.jpg",
        phone_numbers: [{ phone_number: "0812345678" }],
      },
    });

    const req = new NextRequest("http://localhost:3000/api/webhooks/clerk", {
      method: "POST",
      headers: {
        "svix-id": "msg_test_id",
        "svix-timestamp": "123456789",
        "svix-signature": "v1,valid_signature",
      },
      body: JSON.stringify({ type: "user.created" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.received).toBe(true);

    expect(mockSync.syncUserWithClerk).toHaveBeenCalledWith({
      userId: "user_clerk_12345",
      email: "customer@example.com",
      fullName: "Somchai Racer",
      phone: "0812345678",
      avatarUrl: "https://clerk.dev/avatar.jpg",
    });
  });

  it("processes user.deleted event and soft-bans user", async () => {
    mockSync.svixVerify.mockReturnValue({
      type: "user.deleted",
      data: {
        id: "user_clerk_to_ban",
      },
    });

    const req = new NextRequest("http://localhost:3000/api/webhooks/clerk", {
      method: "POST",
      headers: {
        "svix-id": "msg_test_id",
        "svix-timestamp": "123456789",
        "svix-signature": "v1,valid_signature",
      },
      body: JSON.stringify({ type: "user.deleted" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.received).toBe(true);
  });
});
