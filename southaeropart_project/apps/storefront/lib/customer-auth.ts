import { auth } from "@clerk/nextjs/server";
import { db, users, eq } from "@repo/db";

/** A disabled identity must never silently become a guest. */
export async function customerAuth(): ReturnType<typeof auth> {
  const session = await auth();
  if (session.userId) {
    const [account] = await db.select({ isBanned: users.isBanned }).from(users)
      .where(eq(users.id, session.userId)).limit(1);
    if (account?.isBanned) throw new Error("Account unavailable");
  }
  return session;
}
