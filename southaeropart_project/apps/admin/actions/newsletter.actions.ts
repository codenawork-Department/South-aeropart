"use server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  db,
  newsletterSubscribers,
  newsletterCampaigns,
  users,
  eq,
  desc,
  and,
  ilike,
  or,
  sql,
  NewsletterSubscriber,
  NewsletterCampaign,
  EmailCanvasDesignState,
} from "@repo/db";
import { uploadImage, sendEmail, sendBatchEmails } from "@repo/lib";
import { validateSession, logAuditEvent } from "@/lib/auth";

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

/**
 * Upload canvas image directly to Cloudinary folder: south-aero/admin/canvas
 */
export async function uploadCanvasImageAction(dataUrl: string): Promise<ActionResult<{ url: string; publicId: string }>> {
  const admin = await validateSession();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    if (!dataUrl || !dataUrl.startsWith("data:")) {
      return { success: false, error: "รูปแบบไฟล์รูปภาพไม่ถูกต้อง" };
    }

    const result = await uploadImage(dataUrl, {
      folder: "south-aero/admin/canvas",
      tags: ["admin", "canvas", "newsletter"],
    });

    return {
      success: true,
      data: {
        url: result.secureUrl,
        publicId: result.publicId,
      },
    };
  } catch (error: any) {
    console.error("[uploadCanvasImageAction] Error:", error);
    return { success: false, error: error?.message || "อัปโหลดรูปภาพไม่สำเร็จ" };
  }
}

/**
 * Get dashboard stats for newsletter & subscribers
 */
export async function getNewsletterStatsAction() {
  const admin = await validateSession();
  if (!admin) {
    return {
      totalSubscribers: 0,
      activeSubscribers: 0,
      guestSubscribers: 0,
      memberSubscribers: 0,
      totalCampaigns: 0,
      sentCampaigns: 0,
    };
  }

  try {
    const [subStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(case when is_subscribed = true then 1 end)::int`,
        guest: sql<number>`count(case when user_id is null and is_subscribed = true then 1 end)::int`,
        member: sql<number>`count(case when user_id is not null and is_subscribed = true then 1 end)::int`,
      })
      .from(newsletterSubscribers);

    const [campStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        sent: sql<number>`count(case when status = 'sent' then 1 end)::int`,
      })
      .from(newsletterCampaigns);

    return {
      totalSubscribers: subStats?.total || 0,
      activeSubscribers: subStats?.active || 0,
      guestSubscribers: subStats?.guest || 0,
      memberSubscribers: subStats?.member || 0,
      totalCampaigns: campStats?.total || 0,
      sentCampaigns: campStats?.sent || 0,
    };
  } catch (err) {
    console.error("[getNewsletterStatsAction] Error:", err);
    return {
      totalSubscribers: 0,
      activeSubscribers: 0,
      guestSubscribers: 0,
      memberSubscribers: 0,
      totalCampaigns: 0,
      sentCampaigns: 0,
    };
  }
}

/**
 * Get list of subscribers with search & filters
 */
export async function getSubscribersListAction(params?: {
  search?: string;
  source?: string;
  status?: string;
}) {
  const admin = await validateSession();
  if (!admin) {
    return { success: false, subscribers: [], total: 0 };
  }

  try {
    const search = params?.search?.trim();
    const source = params?.source;
    const status = params?.status;

    const conditions = [];

    if (search) {
      // Escape SQL LIKE wildcards to prevent pattern injection
      const escapedSearch = search.replace(/[%_\\]/g, "\\$&");
      conditions.push(ilike(newsletterSubscribers.email, `%${escapedSearch}%`));
    }

    if (source && source !== "all") {
      conditions.push(eq(newsletterSubscribers.source, source));
    }

    if (status === "active") {
      conditions.push(eq(newsletterSubscribers.isSubscribed, true));
    } else if (status === "unsubscribed") {
      conditions.push(eq(newsletterSubscribers.isSubscribed, false));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: newsletterSubscribers.id,
        email: newsletterSubscribers.email,
        userId: newsletterSubscribers.userId,
        isSubscribed: newsletterSubscribers.isSubscribed,
        source: newsletterSubscribers.source,
        subscribedAt: newsletterSubscribers.subscribedAt,
        unsubscribedAt: newsletterSubscribers.unsubscribedAt,
        userName: users.fullName,
      })
      .from(newsletterSubscribers)
      .leftJoin(users, eq(newsletterSubscribers.userId, users.id))
      .where(whereClause)
      .orderBy(desc(newsletterSubscribers.subscribedAt))
      .limit(200);

    return {
      success: true,
      subscribers: rows,
      total: rows.length,
    };
  } catch (error) {
    console.error("[getSubscribersListAction] Error:", error);
    return { success: false, subscribers: [], total: 0 };
  }
}

/**
 * Export subscribers as CSV string
 */
export async function exportSubscribersCsvAction(): Promise<ActionResult<string>> {
  const admin = await validateSession();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const rows = await db
      .select({
        email: newsletterSubscribers.email,
        status: newsletterSubscribers.isSubscribed,
        source: newsletterSubscribers.source,
        userName: users.fullName,
        subscribedAt: newsletterSubscribers.subscribedAt,
      })
      .from(newsletterSubscribers)
      .leftJoin(users, eq(newsletterSubscribers.userId, users.id))
      .orderBy(desc(newsletterSubscribers.subscribedAt));

    const csvHeader = "Email,Status,Source,Customer Name,Subscribed Date\n";
    const csvRows = rows.map((r) => {
      const email = sanitizeCsvField(r.email);
      const status = r.status ? "Subscribed" : "Unsubscribed";
      const source = sanitizeCsvField(r.source);
      const name = sanitizeCsvField(r.userName || "Guest");
      const date = sanitizeCsvField(new Date(r.subscribedAt).toISOString().split("T")[0]);
      return `${email},${status},${source},${name},${date}`;
    });

    const csvContent = csvHeader + csvRows.join("\n");
    return { success: true, data: csvContent };
  } catch (error) {
    console.error("[exportSubscribersCsvAction] Error:", error);
    return { success: false, error: "ไม่สามารถส่งออกข้อมูลได้" };
  }
}

/**
 * Get all newsletter campaigns
 */
export async function getCampaignsListAction() {
  const admin = await validateSession();
  if (!admin) {
    return { success: false, campaigns: [] };
  }

  try {
    const rows = await db
      .select()
      .from(newsletterCampaigns)
      .orderBy(desc(newsletterCampaigns.createdAt));

    return { success: true, campaigns: rows };
  } catch (error) {
    console.error("[getCampaignsListAction] Error:", error);
    return { success: false, campaigns: [] };
  }
}

/**
 * Get single campaign detail
 */
export async function getCampaignDetailAction(id: string) {
  const admin = await validateSession();
  if (!admin) {
    return { success: false, campaign: null };
  }

  if (!id || !UUID_REGEX.test(id)) {
    return { success: false, campaign: null };
  }

  try {
    const [campaign] = await db
      .select()
      .from(newsletterCampaigns)
      .where(eq(newsletterCampaigns.id, id))
      .limit(1);

    return { success: true, campaign: campaign || null };
  } catch (error) {
    console.error("[getCampaignDetailAction] Error:", error);
    return { success: false, campaign: null };
  }
}

/**
 * Save / update campaign draft designed with the Canva-inspired visual builder
 */
export async function saveCampaignDraftAction(data: {
  id?: string;
  subject: string;
  title: string;
  previewText?: string;
  bannerImageUrl?: string;
  designJson: EmailCanvasDesignState;
  contentHtml: string;
}): Promise<ActionResult<NewsletterCampaign>> {
  const admin = await validateSession();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    if (!data.subject?.trim()) {
      return { success: false, error: "กรุณาระบุหัวข้ออีเมล (Subject Line)" };
    }
    if (!data.title?.trim()) {
      return { success: false, error: "กรุณาระบุชื่อแคมเปญ / ข่าวสาร" };
    }

    if (data.id) {
      if (!UUID_REGEX.test(data.id)) {
        return { success: false, error: "รหัสแคมเปญไม่ถูกต้อง" };
      }
      // Update existing
      const [updated] = await db
        .update(newsletterCampaigns)
        .set({
          subject: data.subject.trim(),
          title: data.title.trim(),
          previewText: data.previewText?.trim() || null,
          bannerImageUrl: data.bannerImageUrl || null,
          designJson: data.designJson,
          contentHtml: data.contentHtml,
          updatedAt: new Date(),
        })
        .where(eq(newsletterCampaigns.id, data.id))
        .returning();

      revalidatePath("/newsletters");
      return { success: true, message: "บันทึกแบบร่างสำเร็จ", data: updated };
    } else {
      // Create new
      const [created] = await db
        .insert(newsletterCampaigns)
        .values({
          subject: data.subject.trim(),
          title: data.title.trim(),
          previewText: data.previewText?.trim() || null,
          bannerImageUrl: data.bannerImageUrl || null,
          designJson: data.designJson,
          contentHtml: data.contentHtml,
          status: "draft",
          createdByAdminId: admin.id,
        })
        .returning();

      revalidatePath("/newsletters");
      return { success: true, message: "สร้างแคมเปญข่าวสารใหม่สำเร็จ", data: created };
    }
  } catch (error) {
    console.error("[saveCampaignDraftAction] Error:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการบันทึก" };
  }
}

/**
 * Send campaign broadcast to all active subscribers (or single test email)
 */
export async function sendCampaignBroadcastAction(data: {
  id?: string;
  subject: string;
  title: string;
  previewText?: string;
  bannerImageUrl?: string;
  designJson?: EmailCanvasDesignState;
  contentHtml: string;
  testEmail?: string;
}): Promise<ActionResult<{ recipientCount: number }>> {
  const admin = await validateSession();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    if (data.id && !UUID_REGEX.test(data.id)) {
      return { success: false, error: "รหัสแคมเปญไม่ถูกต้อง" };
    }

    const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3000";

    // 1. If Test Email mode
    if (data.testEmail) {
      const testEmail = data.testEmail.trim().toLowerCase();
      // Validate test email format
      const emailCheck = z.string().email().safeParse(testEmail);
      if (!emailCheck.success) {
        return { success: false, error: "รูปแบบอีเมลทดสอบไม่ถูกต้อง" };
      }
      const testHtml = data.contentHtml.replace(/\{\{UNSUBSCRIBE_URL\}\}/g, `${storefrontUrl}/profile`);

      const sendResult = await sendEmail({
        to: testEmail,
        subject: `[TEST] ${data.subject}`,
        html: testHtml,
      });

      if (!sendResult.success) {
        if (sendResult.isSimulated) {
          return {
            success: true,
            message: `[จำลอง] บันทึกการส่งทดสอบไปยัง ${testEmail} สำเร็จ (เพิ่ม RESEND_API_KEY ใน .env เพื่อส่งออกจริง)`,
            data: { recipientCount: 1 },
          };
        }
        return { success: false, error: sendResult.error || "ส่งทดสอบไม่สำเร็จ" };
      }

      return {
        success: true,
        message: `ส่งอีเมลทดสอบผ่าน Resend ไปยัง ${testEmail} สำเร็จเรียบร้อย`,
        data: { recipientCount: 1 },
      };
    }

    // 2. Broadcast Mode: Get all active subscribers
    const activeSubscribers = await db
      .select({ email: newsletterSubscribers.email, token: newsletterSubscribers.unsubscribeToken })
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.isSubscribed, true));

    const totalRecipients = activeSubscribers.length;
    if (totalRecipients === 0) {
      return { success: false, error: "ไม่พบผู้ติดตามที่อยู่ในสถานะรับข่าวสารในระบบ" };
    }

    // 3. Prepare personalized emails with 1-click unsubscribe links
    const emailPayloads = activeSubscribers.map((sub) => {
      const unsubscribeUrl = `${storefrontUrl}/api/newsletter/unsubscribe?token=${sub.token}`;
      const personalizedHtml = data.contentHtml.replace(/\{\{UNSUBSCRIBE_URL\}\}/g, unsubscribeUrl);
      return {
        to: sub.email,
        subject: data.subject,
        html: personalizedHtml,
      };
    });

    // 4. Dispatch batch emails via Resend
    const batchResult = await sendBatchEmails(emailPayloads);

    // 5. Save or update campaign as 'sent'
    let campaignId = data.id;
    if (campaignId) {
      await db
        .update(newsletterCampaigns)
        .set({
          subject: data.subject,
          title: data.title,
          previewText: data.previewText,
          bannerImageUrl: data.bannerImageUrl,
          designJson: data.designJson,
          contentHtml: data.contentHtml,
          status: "sent",
          recipientCount: totalRecipients,
          sentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(newsletterCampaigns.id, campaignId));
    } else {
      const [created] = await db
        .insert(newsletterCampaigns)
        .values({
          subject: data.subject,
          title: data.title,
          previewText: data.previewText,
          bannerImageUrl: data.bannerImageUrl,
          designJson: data.designJson,
          contentHtml: data.contentHtml,
          status: "sent",
          recipientCount: totalRecipients,
          sentAt: new Date(),
          createdByAdminId: admin.id,
        })
        .returning();
      campaignId = created.id;
    }

    // Log admin audit
    await logAuditEvent({
      adminId: admin.id,
      action: "broadcast_newsletter",
      entityType: "newsletter_campaigns",
      entityId: campaignId,
      metadata: {
        subject: data.subject,
        recipientCount: totalRecipients,
        successCount: batchResult.successCount,
        failedCount: batchResult.failedCount,
      },
    });

    revalidatePath("/newsletters");

    if (batchResult.failedCount > 0 && batchResult.successCount > 0) {
      return {
        success: true,
        message: `ส่งสำเร็จ ${batchResult.successCount} ท่าน (ติดเงื่อนไข Free Tier ส่งไม่ได้ ${batchResult.failedCount} ท่าน เนื่องจากยังไม่ได้ผูก Custom Domain)`,
        data: { recipientCount: batchResult.successCount },
      };
    }

    if (batchResult.failedCount > 0 && batchResult.successCount === 0) {
      return {
        success: false,
        error: `ส่งไม่สำเร็จ: ${batchResult.errors[0] || "ติดเงื่อนไข Resend Free Tier (สามารถส่งได้เฉพาะอีเมลที่ใช้สมัครบัญชี Resend)"}`,
      };
    }

    return {
      success: true,
      message: `ส่งกระจายข่าวสารผ่าน Resend ไปยังผู้ติดตามทั้งหมด ${totalRecipients} ท่าน เรียบร้อยแล้ว`,
      data: { recipientCount: totalRecipients },
    };
  } catch (error) {
    console.error("[sendCampaignBroadcastAction] Error:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการส่งกระจายข่าวสาร" };
  }
}

/**
 * Delete a campaign
 */
export async function deleteCampaignAction(id: string): Promise<ActionResult> {
  const admin = await validateSession();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  if (!id || !UUID_REGEX.test(id)) {
    return { success: false, error: "รหัสแคมเปญไม่ถูกต้อง" };
  }

  try {
    await db.delete(newsletterCampaigns).where(eq(newsletterCampaigns.id, id));
    revalidatePath("/newsletters");
    return { success: true, message: "ลบแคมเปญเรียบร้อยแล้ว" };
  } catch (error) {
    console.error("[deleteCampaignAction] Error:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการลบ" };
  }
}

/**
 * Sanitize a string field for CSV export to prevent formula injection.
 * Prefixes dangerous characters with a single quote so spreadsheet apps
 * treat the cell as plain text instead of evaluating it as a formula.
 */
function sanitizeCsvField(value: string): string {
  let safe = value.replace(/"/g, '""'); // escape inner quotes
  // Prefix formula-triggering characters to neutralize them
  if (/^[=+\-@\t\r]/.test(safe)) {
    safe = "'" + safe;
  }
  return `"${safe}"`;
}
