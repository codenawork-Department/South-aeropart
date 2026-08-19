import {
    pgTable, uuid, text, pgEnum, timestamp, boolean, integer, jsonb,
} from "drizzle-orm/pg-core";

/**
 * Admin / back-office accounts. Fully separate from the customer `users`
 * table: different auth strategy (email + password, run from a local
 * admin app), and much stricter security requirements (MFA, lockout,
 * session revocation, audit trail).
 */
export const adminRoleEnum = pgEnum("admin_role", [
    "staff", "admin", "super_admin",
]);

export const adminUsers = pgTable("admin_users", {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(), // argon2id / bcrypt, never plaintext
    fullName: text("full_name").notNull(),
    role: adminRoleEnum("role").notNull().default("staff"),
    isActive: boolean("is_active").notNull().default(true),

    // MFA (TOTP recommended). Store only the encrypted secret / hashed codes.
    mfaEnabled: boolean("mfa_enabled").notNull().default(false),
    mfaSecretEncrypted: text("mfa_secret_encrypted"),
    mfaRecoveryCodesHash: jsonb("mfa_recovery_codes_hash").$type<string[]>(),

    // Brute-force protection.
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),

    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    lastLoginIp: text("last_login_ip"),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Server-side session records so admin sessions can be listed / revoked
 * individually ("log out of all devices", kill a stolen session),
 * instead of relying only on a stateless JWT that can't be revoked.
 */
export const adminSessions = pgTable("admin_sessions", {
    id: uuid("id").defaultRandom().primaryKey(),
    adminId: uuid("admin_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(), // hash of the session/refresh token, never the raw token
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Immutable audit trail of sensitive admin actions (product edits, order
 * refunds, review moderation, login attempts...). Keep this table
 * append-only — never update or delete rows from application code.
 */
export const adminAuditLogs = pgTable("admin_audit_logs", {
    id: uuid("id").defaultRandom().primaryKey(),
    adminId: uuid("admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
    action: text("action").notNull(), // e.g. "product.update", "order.refund", "admin.login_failed"
    entityType: text("entity_type"), // e.g. "product", "order"
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;
export type AdminSession = typeof adminSessions.$inferSelect;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;