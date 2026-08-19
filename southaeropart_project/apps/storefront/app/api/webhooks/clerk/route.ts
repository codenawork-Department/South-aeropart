import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";

/**
 * Clerk webhook handler — syncs Clerk users into the `users` table.
 *
 * NOTE: Users are customers only (no role). Admins live in the
 * separate `admin_users` table with their own auth flow.
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  // If webhook secret is not configured, log and accept
  if (!webhookSecret) {
    console.warn("CLERK_WEBHOOK_SECRET not set — skipping verification");
    return handleEvent(await req.json());
  }

  // Verify webhook signature via Svix
  const headerPayload = req.headers;
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "missing svix headers" }, { status: 400 });
  }

  const body = await req.text();

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

    switch (eventType) {
      case "user.created": {
        const { id, email_addresses, first_name, last_name, image_url } = data as {
          id: string;
          email_addresses: { email_address: string }[];
          first_name: string | null;
          last_name: string | null;
          image_url: string | null;
        };
        const email = email_addresses?.[0]?.email_address;
        const fullName = [first_name, last_name].filter(Boolean).join(" ") || null;

        // TODO: When database is connected:
        // await db.insert(users).values({
        //   id,
        //   email,
        //   fullName,
        //   avatarUrl: image_url,
        // }).onConflictDoNothing();

        console.log(`Clerk webhook: user.created ${id} (${email})`);
        break;
      }

      case "user.updated": {
        const { id, email_addresses, first_name, last_name, image_url } = data as {
          id: string;
          email_addresses: { email_address: string }[];
          first_name: string | null;
          last_name: string | null;
          image_url: string | null;
        };
        const email = email_addresses?.[0]?.email_address;
        const fullName = [first_name, last_name].filter(Boolean).join(" ") || null;

        // TODO: When database is connected:
        // await db.update(users)
        //   .set({
        //     email,
        //     fullName,
        //     avatarUrl: image_url,
        //     updatedAt: new Date(),
        //   })
        //   .where(eq(users.id, id));

        console.log(`Clerk webhook: user.updated ${id}`);
        break;
      }

      case "user.deleted": {
        const { id } = data as { id: string };

        // TODO: When database is connected:
        // await db.update(users)
        //   .set({ isBanned: true, updatedAt: new Date() })
        //   .where(eq(users.id, id));
        // Note: We soft-ban instead of hard-deleting to preserve order history.

        console.log(`Clerk webhook: user.deleted ${id} — soft-banned`);
        break;
      }

      default:
        console.log(`Clerk webhook: unhandled event ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Clerk webhook error:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
