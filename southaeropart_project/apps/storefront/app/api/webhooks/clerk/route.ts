import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { db, users, userLoginLogs, eq } from "@repo/db";
import { syncUserWithClerk } from "@/lib/user-sync";

/**
 * Clerk webhook handler — syncs Clerk users and login sessions into Neon.tech PostgreSQL.
 *
 * Events handled:
 * - user.created: Inserts or updates user in `users` table
 * - user.updated: Updates user profile in `users` table
 * - user.deleted: Soft-bans user (`is_banned = true`) in `users` table
 * - session.created: Records login event in `user_login_logs` and updates `users.last_login_at`
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  // Verify webhook secret configuration (Fail-closed to prevent unverified payload injection)
  if (!webhookSecret || webhookSecret.startsWith("whsec_xxx")) {
    console.error("[Clerk Webhook] CLERK_WEBHOOK_SECRET is not properly configured. Rejecting request to prevent unverified execution.");
    return NextResponse.json(
      { error: "Webhook signature secret is not configured" },
      { status: 500 }
    );
  }

  // Verify webhook signature via Svix
  const headerPayload = req.headers;
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "missing svix headers" }, { status: 400 });
  }

  const MAX_WEBHOOK_SIZE = 1024 * 1024; // 1MB payload limit
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_WEBHOOK_SIZE) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const body = await req.text();
  if (body.length > MAX_WEBHOOK_SIZE) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let payload: Record<string, unknown>;
  try {
    const wh = new Webhook(webhookSecret);
    payload = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as Record<string, unknown>;
  } catch (err) {
    console.error("Clerk webhook verification failed:", err);
    return NextResponse.json({ error: "verification failed" }, { status: 400 });
  }

  return handleEvent(payload);
}

async function handleEvent(payload: Record<string, unknown>) {
  try {
    const eventType = payload.type as string;
    const data = payload.data as Record<string, unknown>;
    const now = new Date();

    switch (eventType) {
      case "user.created": {
        const { id, email_addresses, first_name, last_name, image_url, phone_numbers } = data as {
          id: string;
          email_addresses?: { email_address: string }[];
          first_name?: string | null;
          last_name?: string | null;
          image_url?: string | null;
          phone_numbers?: { phone_number: string }[];
        };

        const email = email_addresses?.[0]?.email_address;
        if (!email) {
          console.warn(`Clerk webhook user.created ${id} has no email address`);
          break;
        }

        const fullName = [first_name, last_name].filter(Boolean).join(" ") || null;
        const phone = phone_numbers?.[0]?.phone_number || null;

        await syncUserWithClerk({
          userId: id,
          email,
          fullName,
          phone,
          avatarUrl: image_url || null,
        });
        break;
      }

      case "user.updated": {
        const { id, email_addresses, first_name, last_name, image_url, phone_numbers } = data as {
          id: string;
          email_addresses?: { email_address: string }[];
          first_name?: string | null;
          last_name?: string | null;
          image_url?: string | null;
          phone_numbers?: { phone_number: string }[];
        };

        const email = email_addresses?.[0]?.email_address;
        const fullName = [first_name, last_name].filter(Boolean).join(" ") || null;
        const phone = phone_numbers?.[0]?.phone_number || null;

        await db
          .update(users)
          .set({
            ...(email ? { email } : {}),
            ...(fullName !== undefined ? { fullName } : {}),
            ...(phone !== undefined ? { phone } : {}),
            ...(image_url !== undefined ? { avatarUrl: image_url } : {}),
            updatedAt: now,
          })
          .where(eq(users.id, id));
        break;
      }

      case "user.deleted": {
        const { id } = data as { id: string };

        // Soft-ban instead of hard-deleting to preserve order and audit history
        await db
          .update(users)
          .set({ isBanned: true, updatedAt: now })
          .where(eq(users.id, id));
        break;
      }

      case "session.created": {
        const { user_id, id: sessionId, client_id } = data as {
          user_id: string;
          id: string;
          client_id?: string;
        };

        if (user_id) {
          // 1. Update user last login
          await db
            .update(users)
            .set({
              lastLoginAt: now,
              updatedAt: now,
            })
            .where(eq(users.id, user_id));

          // 2. Insert login log into user_login_logs
          await db.insert(userLoginLogs).values({
            userId: user_id,
            loginMethod: "clerk_session",
            metadata: {
              sessionId,
              clientId: client_id,
              source: "clerk_webhook",
              timestamp: now.toISOString(),
            },
            createdAt: now,
          });
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Clerk webhook processing error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
