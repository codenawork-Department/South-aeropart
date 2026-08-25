"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  db,
  icons,
  eq,
  and,
  desc,
  asc,
  ilike,
  or,
} from "@repo/db";
import { validateSession, logAuditEvent } from "@/lib/auth";
import { uploadImage } from "@repo/lib";

// ─── Types & Schemas ──────────────────────────────────────────────────────────

const iconInputSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อไอคอน").max(100).trim(),
  slug: z.string().min(1, "กรุณากรอกรหัสไอคอน (Slug)").max(100).trim(),
  category: z
    .enum(["aerodynamics", "material", "performance", "trust", "services", "general"])
    .default("general"),
  type: z.enum(["lucide", "svg_code", "image_url"]).default("lucide"),
  svgContent: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  lucideName: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export type IconInput = z.infer<typeof iconInputSchema>;

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * ดึงรายการไอคอนทั้งหมด พร้อมระบบค้นหาและกรอง
 */
export async function getIconsAction(filter?: {
  search?: string;
  category?: string;
  type?: string;
  onlyActive?: boolean;
}): Promise<ActionResult<Array<typeof icons.$inferSelect>>> {
  try {
    const conditions = [];

    if (filter?.onlyActive) {
      conditions.push(eq(icons.isActive, true));
    }

    if (filter?.category && filter.category !== "all") {
      conditions.push(eq(icons.category, filter.category));
    }

    if (filter?.type && filter.type !== "all") {
      conditions.push(eq(icons.type, filter.type));
    }

    if (filter?.search?.trim()) {
      const q = `%${filter.search.trim()}%`;
      conditions.push(
        or(
          ilike(icons.name, q),
          ilike(icons.slug, q),
          ilike(icons.lucideName, q)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await db
      .select()
      .from(icons)
      .where(whereClause)
      .orderBy(asc(icons.category), asc(icons.name));

    return { success: true, data };
  } catch (error) {
    console.error("getIconsAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการดึงรายการไอคอน" };
  }
}

/**
 * สร้างไอคอนใหม่
 */
export async function createIconAction(
  rawInput: IconInput
): Promise<ActionResult<typeof icons.$inferSelect>> {
  const session = await validateSession();
  if (!session) {
    return { success: false, message: "กรุณาเข้าสู่ระบบก่อนทำรายการ" };
  }

  const parsed = iconInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message: "ข้อมูลไม่ถูกต้อง",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, category, type, svgContent, imageUrl, lucideName, isActive } = parsed.data;
  let slug = parsed.data.slug ? slugify(parsed.data.slug) : slugify(name);

  try {
    // Check slug collision
    const existing = await db
      .select({ id: icons.id })
      .from(icons)
      .where(eq(icons.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const [newIcon] = await db
      .insert(icons)
      .values({
        name,
        slug,
        category,
        type,
        svgContent: type === "svg_code" ? svgContent?.trim() || null : null,
        imageUrl: type === "image_url" ? imageUrl?.trim() || null : null,
        lucideName: type === "lucide" ? lucideName?.trim() || null : null,
        isActive,
      })
      .returning();

    await logAuditEvent({
      adminId: session.id,
      action: "create",
      entityType: "icon",
      entityId: newIcon.id,
      metadata: { name, slug, category, type },
    });

    revalidatePath("/catalog");
    revalidatePath("/products");

    return { success: true, message: `เพิ่มไอคอน "${name}" สำเร็จ`, data: newIcon };
  } catch (error) {
    console.error("createIconAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการบันทึกไอคอน" };
  }
}

/**
 * แก้ไขไอคอน
 */
export async function updateIconAction(
  id: string,
  rawInput: Partial<IconInput>
): Promise<ActionResult<typeof icons.$inferSelect>> {
  const session = await validateSession();
  if (!session) {
    return { success: false, message: "กรุณาเข้าสู่ระบบก่อนทำรายการ" };
  }

  try {
    const existing = await db
      .select()
      .from(icons)
      .where(eq(icons.id, id))
      .limit(1);

    if (!existing.length) {
      return { success: false, message: "ไม่พบไอคอนที่ต้องการแก้ไข" };
    }

    const current = existing[0];
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (rawInput.name !== undefined) updateData.name = rawInput.name.trim();
    if (rawInput.slug !== undefined) updateData.slug = slugify(rawInput.slug);
    if (rawInput.category !== undefined) updateData.category = rawInput.category;
    if (rawInput.type !== undefined) updateData.type = rawInput.type;
    if (rawInput.svgContent !== undefined) updateData.svgContent = rawInput.svgContent?.trim() || null;
    if (rawInput.imageUrl !== undefined) updateData.imageUrl = rawInput.imageUrl?.trim() || null;
    if (rawInput.lucideName !== undefined) updateData.lucideName = rawInput.lucideName?.trim() || null;
    if (rawInput.isActive !== undefined) updateData.isActive = rawInput.isActive;

    const [updatedIcon] = await db
      .update(icons)
      .set(updateData)
      .where(eq(icons.id, id))
      .returning();

    await logAuditEvent({
      adminId: session.id,
      action: "update",
      entityType: "icon",
      entityId: id,
      metadata: { before: current, after: updatedIcon },
    });

    revalidatePath("/catalog");
    revalidatePath("/products");

    return { success: true, message: `อัปเดตไอคอน "${updatedIcon.name}" สำเร็จ`, data: updatedIcon };
  } catch (error) {
    console.error("updateIconAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการอัปเดตไอคอน" };
  }
}

/**
 * ลบไอคอน
 */
export async function deleteIconAction(id: string): Promise<ActionResult> {
  const session = await validateSession();
  if (!session) {
    return { success: false, message: "กรุณาเข้าสู่ระบบก่อนทำรายการ" };
  }

  try {
    const existing = await db
      .select()
      .from(icons)
      .where(eq(icons.id, id))
      .limit(1);

    if (!existing.length) {
      return { success: false, message: "ไม่พบไอคอนที่ต้องการลบ" };
    }

    const iconToDelete = existing[0];
    await db.delete(icons).where(eq(icons.id, id));

    await logAuditEvent({
      adminId: session.id,
      action: "delete",
      entityType: "icon",
      entityId: id,
      metadata: { name: iconToDelete.name, slug: iconToDelete.slug },
    });

    revalidatePath("/catalog");
    revalidatePath("/products");

    return { success: true, message: `ลบไอคอน "${iconToDelete.name}" เรียบร้อยแล้ว` };
  } catch (error) {
    console.error("deleteIconAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการลบไอคอน" };
  }
}

/**
 * ชุดข้อมูลไอคอนเริ่มต้นสำหรับ South Aero (Seed Initial Curated Icons)
 */
export async function seedInitialIconsAction(): Promise<ActionResult<{ insertedCount: number }>> {
  const session = await validateSession();
  if (!session) {
    return { success: false, message: "กรุณาเข้าสู่ระบบก่อนทำรายการ" };
  }

  const INITIAL_ICONS: Array<{
    name: string;
    slug: string;
    category: "aerodynamics" | "material" | "performance" | "trust" | "services" | "general";
    type: "lucide";
    lucideName: string;
  }> = [
    // ── Aerodynamics ──
    {
      name: "Aerodynamic Wind / Airflow",
      slug: "aero-wind",
      category: "aerodynamics",
      type: "lucide",
      lucideName: "Wind",
    },
    {
      name: "High-Speed Downforce",
      slug: "aero-downforce",
      category: "aerodynamics",
      type: "lucide",
      lucideName: "Zap",
    },
    {
      name: "Vortex Management & Flow",
      slug: "aero-flow",
      category: "aerodynamics",
      type: "lucide",
      lucideName: "Layers",
    },
    {
      name: "High-Speed Stability",
      slug: "aero-stability",
      category: "aerodynamics",
      type: "lucide",
      lucideName: "Compass",
    },
    {
      name: "CFD & Wind Tunnel Tested",
      slug: "aero-cfd",
      category: "aerodynamics",
      type: "lucide",
      lucideName: "Activity",
    },

    // ── Material & Craftsmanship ──
    {
      name: "Pre-preg Carbon Fiber & Durability",
      slug: "material-carbon",
      category: "material",
      type: "lucide",
      lucideName: "Shield",
    },
    {
      name: "UV-Resistant Clear Coat",
      slug: "material-uv",
      category: "material",
      type: "lucide",
      lucideName: "Sun",
    },
    {
      name: "Show-Quality Mirror Gloss",
      slug: "material-gloss",
      category: "material",
      type: "lucide",
      lucideName: "Sparkles",
    },
    {
      name: "Impact & Heat Resistant ABS",
      slug: "material-abs",
      category: "material",
      type: "lucide",
      lucideName: "Flame",
    },

    // ── Precision & Fitment ──
    {
      name: "3D Laser Scan & CAD Fitment",
      slug: "fitment-cad",
      category: "performance",
      type: "lucide",
      lucideName: "Crosshair",
    },
    {
      name: "Adjustable Aerodynamic Attack",
      slug: "fitment-adjustable",
      category: "performance",
      type: "lucide",
      lucideName: "Sliders",
    },
    {
      name: "Direct Bolt-On OEM Gap",
      slug: "fitment-bolton",
      category: "performance",
      type: "lucide",
      lucideName: "CheckCircle2",
    },
    {
      name: "Flush Body Line Integration",
      slug: "fitment-flush",
      category: "performance",
      type: "lucide",
      lucideName: "Maximize2",
    },

    // ── Performance & Racing ──
    {
      name: "Reduced Drag & Lift Coefficient",
      slug: "perf-drag-reduction",
      category: "performance",
      type: "lucide",
      lucideName: "Gauge",
    },
    {
      name: "Track-Proven Motorsport Dynamics",
      slug: "perf-track",
      category: "performance",
      type: "lucide",
      lucideName: "Flag",
    },
    {
      name: "Calculated Pressure Gradient",
      slug: "perf-pressure",
      category: "performance",
      type: "lucide",
      lucideName: "Cpu",
    },

    // ── Installation, Trust & Service ──
    {
      name: "Professional Installation Hardware",
      slug: "install-hardware",
      category: "services",
      type: "lucide",
      lucideName: "Wrench",
    },
    {
      name: "Premium Quality Assurance",
      slug: "trust-quality",
      category: "trust",
      type: "lucide",
      lucideName: "Award",
    },
    {
      name: "Dedicated Engineering Support",
      slug: "support-expert",
      category: "trust",
      type: "lucide",
      lucideName: "Headphones",
    },
    {
      name: "Fast & Secure Tracked Delivery",
      slug: "shipping-secure",
      category: "services",
      type: "lucide",
      lucideName: "Truck",
    },
  ];

  try {
    let insertedCount = 0;

    for (const item of INITIAL_ICONS) {
      const existing = await db
        .select({ id: icons.id })
        .from(icons)
        .where(eq(icons.slug, item.slug))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(icons).values({
          name: item.name,
          slug: item.slug,
          category: item.category,
          type: item.type,
          lucideName: item.lucideName,
          isActive: true,
        });
        insertedCount++;
      }
    }

    await logAuditEvent({
      adminId: session.id,
      action: "seed",
      entityType: "icon",
      entityId: "seed-batch",
      metadata: { insertedCount, totalCurated: INITIAL_ICONS.length },
    });

    revalidatePath("/catalog");
    revalidatePath("/products");

    return {
      success: true,
      message: `นำเข้าไอคอนตั้งต้นสำเร็จ ${insertedCount} รายการ`,
      data: { insertedCount },
    };
  } catch (error) {
    console.error("seedInitialIconsAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการนำเข้าไอคอนตั้งต้น" };
  }
}

/**
 * อัปโหลดไฟล์รูปภาพไอคอนขึ้น Cloudinary ในโฟลเดอร์ south-aero/web-assets/icons
 */
export async function uploadIconImageAction(
  base64DataUrl: string,
  slug?: string
): Promise<ActionResult<{ secureUrl: string; publicId: string }>> {
  const session = await validateSession();
  if (!session) {
    return { success: false, message: "กรุณาเข้าสู่ระบบก่อนทำรายการ" };
  }

  if (!base64DataUrl || !base64DataUrl.startsWith("data:image/")) {
    return {
      success: false,
      message: "รูปแบบไฟล์รูปภาพไม่ถูกต้อง (ต้องเป็น Base64 Image)",
    };
  }

  try {
    const targetFolder = "south-aero/web-assets/icons";
    const customPublicId = slug
      ? `${targetFolder}/${slug.replace(/[^a-z0-9-_]/gi, "-")}`
      : undefined;

    const result = await uploadImage(base64DataUrl, {
      folder: targetFolder,
      publicId: customPublicId,
      tags: ["icon", "web-assets", "south-aero"],
    });

    return {
      success: true,
      data: {
        secureUrl: result.secureUrl,
        publicId: result.publicId,
      },
      message: "อัปโหลดภาพไอคอนเข้าสู่ Cloudinary (south-aero/web-assets/icons) สำเร็จ",
    };
  } catch (error) {
    console.error("uploadIconImageAction error:", error);
    return {
      success: false,
      message: "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพขึ้น Cloudinary",
    };
  }
}

