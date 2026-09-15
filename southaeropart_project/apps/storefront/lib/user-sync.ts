import {
  db,
  users,
  eq,
} from "@repo/db";

export interface SyncUserInput {
  userId: string;
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
}

/**
 * Synchronizes Clerk user profile into Neon DB `users` table.
 *
 * Matches the immutable Clerk ID. Email equality never transfers ownership.
 */
export async function syncUserWithClerk(input: SyncUserInput) {
  const { userId, email, fullName, avatarUrl, phone } = input;
  const now = new Date();

  // 1. Direct match by primary key (Clerk userId)
  const [existingById] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (existingById) {
    if (existingById.isBanned) throw new Error("Account unavailable");
    const [updated] = await db
      .update(users)
      .set({
        email,
        ...(fullName ? { fullName } : {}),
        ...(avatarUrl ? { avatarUrl } : {}),
        ...(phone ? { phone } : {}),
        updatedAt: now,
      })
      .where(eq(users.id, userId))
      .returning();
    return updated || existingById;
  }

  // Never transfer ownership based on email equality. Guest orders are accessed
  // using their cryptographic token; account linking requires a separate proof.
  const [existingByEmail] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existingByEmail && existingByEmail.id !== userId) {
    throw new Error("Identity conflict requires verified account recovery");
  }

  // 3. Completely new user
  const [created] = await db
    .insert(users)
    .values({
      id: userId,
      email,
      fullName: fullName || null,
      avatarUrl: avatarUrl || null,
      phone: phone || null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email,
        ...(fullName ? { fullName } : {}),
        ...(avatarUrl ? { avatarUrl } : {}),
        ...(phone ? { phone } : {}),
        updatedAt: now,
      },
    })
    .returning();

  return created;
}
