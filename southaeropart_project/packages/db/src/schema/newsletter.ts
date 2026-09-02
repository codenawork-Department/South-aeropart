import { pgTable, text, timestamp, boolean, uuid, integer, jsonb, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { adminUsers } from "./admin";

/**
 * Newsletter Block definition for the Canva-inspired Visual Email Builder
 */
export interface EmailCanvasBlock {
  id: string;
  type: "header" | "heading" | "text" | "image" | "product_card" | "button" | "divider" | "spacer" | "footer";
  content?: string;
  props?: {
    // Typography
    fontFamily?: "Oswald" | "Inter" | "Montserrat" | "Playfair Display" | "Courier New" | string;
    fontSize?: number;
    fontWeight?: "400" | "500" | "600" | "700" | "900" | string;
    color?: string;
    textAlign?: "left" | "center" | "right";
    lineHeight?: number;
    
    // Image & Media (Stored in Cloudinary: south-aero/admin/canvas)
    imageUrl?: string;
    imageAlt?: string;
    imageWidth?: number | string;
    imageLinkUrl?: string;
    cloudinaryPublicId?: string;

    // Button CTA
    buttonText?: string;
    buttonUrl?: string;
    buttonBgColor?: string;
    buttonTextColor?: string;
    buttonBorderRadius?: number;

    // Product Card (2 Columns)
    productTitle?: string;
    productDescription?: string;
    productImageUrl?: string;
    productBadge?: string;
    productSpecs?: string[];
    productLinkUrl?: string;

    // Layout & Spacing
    paddingTop?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
    backgroundColor?: string;
    dividerColor?: string;
    spacerHeight?: number;
  };
}

export interface EmailCanvasDesignState {
  version: string;
  backgroundColor: string;
  containerWidth: number;
  blocks: EmailCanvasBlock[];
}

/**
 * Newsletter Subscribers
 * Holds all audience emails from Guests, User Sign-Up opt-ins, and Profile toggles.
 */
export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  isSubscribed: boolean("is_subscribed").notNull().default(true),
  source: text("source").notNull().default("footer"), // "footer" | "homepage_banner" | "signup" | "profile"
  subscribedAt: timestamp("subscribed_at", { withTimezone: true }).notNull().defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  unsubscribeToken: text("unsubscribe_token")
    .notNull()
    .$defaultFn(() => crypto.randomUUID()),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  emailIdx: index("newsletter_subscribers_email_idx").on(table.email),
  userIdx: index("newsletter_subscribers_user_idx").on(table.userId),
  isSubscribedIdx: index("newsletter_subscribers_is_subscribed_idx").on(table.isSubscribed),
}));

/**
 * Newsletter Campaigns & Announcements
 * Stores designed campaigns created by admins using the Canva-inspired builder.
 */
export const newsletterCampaigns = pgTable("newsletter_campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  subject: text("subject").notNull(),
  title: text("title").notNull(),
  previewText: text("preview_text"),
  bannerImageUrl: text("banner_image_url"),
  designJson: jsonb("design_json").$type<EmailCanvasDesignState>(),
  contentHtml: text("content_html").notNull(),
  status: text("status").notNull().default("draft"), // "draft" | "sending" | "sent" | "cancelled"
  recipientCount: integer("recipient_count").default(0),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdByAdminId: uuid("created_by_admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  statusIdx: index("newsletter_campaigns_status_idx").on(table.status),
  createdByIdx: index("newsletter_campaigns_created_by_idx").on(table.createdByAdminId),
}));

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type NewNewsletterSubscriber = typeof newsletterSubscribers.$inferInsert;
export type NewsletterCampaign = typeof newsletterCampaigns.$inferSelect;
export type NewNewsletterCampaign = typeof newsletterCampaigns.$inferInsert;
