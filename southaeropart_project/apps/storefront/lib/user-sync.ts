import {
  db,
  users,
  userAddresses,
  userVehicles,
  userInterests,
  userLoginLogs,
  orders,
  reviews,
  newsletterSubscribers,
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
 * Robustly handles:
 * 1. User already exists by `users.id` -> updates profile fields.
 * 2. User exists by `email` under a guest ID or legacy ID ->
 *    Seamlessly migrates orders, addresses, vehicles, wishlist, and logs
 *    from old guest record to the authenticated Clerk `userId`, then deletes the old record.
 * 3. Fresh user -> inserts new record.
 */
export async function syncUserWithClerk(input: SyncUserInput) {
  const { userId, email, fullName, avatarUrl, phone } = input;
  const now = new Date();

  // 1. Direct match by primary key (Clerk userId)
  const [existingById] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (existingById) {
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

  // 2. Check if a user row with this email exists under a different ID (e.g. guest checkout)
  const [existingByEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existingByEmail) {
    const oldId = existingByEmail.id;

    // Displace old row's email temporarily to prevent unique constraint collision
    await db
      .update(users)
      .set({
        email: `migrated_${Date.now()}_${existingByEmail.email}`,
        updatedAt: now,
      })
      .where(eq(users.id, oldId));

    // Create the new authenticated user record
    const [created] = await db
      .insert(users)
      .values({
        id: userId,
        email,
        fullName: fullName || existingByEmail.fullName,
        avatarUrl: avatarUrl || existingByEmail.avatarUrl,
        phone: phone || existingByEmail.phone,
        createdAt: existingByEmail.createdAt || now,
        updatedAt: now,
      })
      .returning();

    // Migrate all associated child records to the new Clerk userId
    try {
      await db.update(orders).set({ userId }).where(eq(orders.userId, oldId));
      await db.update(userAddresses).set({ userId }).where(eq(userAddresses.userId, oldId));
      await db.update(userVehicles).set({ userId }).where(eq(userVehicles.userId, oldId));
      await db.update(userInterests).set({ userId }).where(eq(userInterests.userId, oldId));
      await db.update(userLoginLogs).set({ userId }).where(eq(userLoginLogs.userId, oldId));
      await db.update(reviews).set({ userId }).where(eq(reviews.userId, oldId));
      await db.update(newsletterSubscribers).set({ userId }).where(eq(newsletterSubscribers.userId, oldId));

      // Remove the migrated old user row
      await db.delete(users).where(eq(users.id, oldId));
    } catch (migrationErr) {
      console.error(`[UserSync] Warning during data migration from ${oldId} to ${userId}:`, migrationErr);
    }

    return created;
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
