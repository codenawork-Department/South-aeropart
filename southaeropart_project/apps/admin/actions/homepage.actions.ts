"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  db,
  homepageHeroCards,
  brands,
  carModels,
  eq,
  asc,
} from "@repo/db";
import { uploadImage } from "@repo/lib";
import { validateSession, logAuditEvent } from "@/lib/auth";

const heroCardSchema = z.object({
  title: z.string().min(1, "กรุณากรอกหัวข้อของการ์ด").max(120),
  tag: z.string().min(1, "กรุณากรอกแท็ก / คำบรรยาย").max(100),
  brandId: z.string().uuid().optional().nullable().or(z.literal("")),
  carModelId: z.string().uuid().optional().nullable().or(z.literal("")),
  imageUrl: z.string().min(1, "กรุณาระบุ URL หรืออัปโหลดรูปภาพ"),
  cloudinaryPublicId: z.string().optional().nullable(),
  href: z.string().min(1, "กรุณาระบุเส้นทาง URL ปลายทาง"),
  isActive: z.boolean().default(true),
});

export type HeroCardInput = z.infer<typeof heroCardSchema>;

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

/**
 * ดึงข้อมูล Hero Cards ทั้งหมด พร้อมข้อมูลแบรนด์และรุ่นรถยนต์สำหรับแสดงผลในหน้า Admin
 */
export async function getHeroCardsAdminAction() {
  try {
    const [cardRows, brandRows, modelRows] = await Promise.all([
      db
        .select({
          id: homepageHeroCards.id,
          position: homepageHeroCards.position,
          title: homepageHeroCards.title,
          tag: homepageHeroCards.tag,
          brandId: homepageHeroCards.brandId,
          carModelId: homepageHeroCards.carModelId,
          imageUrl: homepageHeroCards.imageUrl,
          cloudinaryPublicId: homepageHeroCards.cloudinaryPublicId,
          href: homepageHeroCards.href,
          isActive: homepageHeroCards.isActive,
          createdAt: homepageHeroCards.createdAt,
          updatedAt: homepageHeroCards.updatedAt,
        })
        .from(homepageHeroCards)
        .orderBy(asc(homepageHeroCards.position)),

      db
        .select({
          id: brands.id,
          name: brands.name,
          slug: brands.slug,
        })
        .from(brands)
        .where(eq(brands.isActive, true))
        .orderBy(asc(brands.name)),

      db
        .select({
          id: carModels.id,
          brandId: carModels.brandId,
          name: carModels.name,
          slug: carModels.slug,
          generation: carModels.generation,
        })
        .from(carModels)
        .where(eq(carModels.isActive, true))
        .orderBy(asc(carModels.name)),
    ]);

    return {
      success: true,
      cards: cardRows,
      brands: brandRows,
      models: modelRows,
    };
  } catch (error) {
    console.error("[getHeroCardsAdminAction] Error:", error);
    return {
      success: false,
      cards: [],
      brands: [],
      models: [],
    };
  }
}

/**
 * อัปโหลดรูปภาพใหม่เข้า Cloudinary ในโฟลเดอร์ south-aero/web-assets/frontend-images/homepage
 */
export async function uploadHeroCardImageAction(fileBase64: string): Promise<ActionResult<{ secureUrl: string; publicId: string }>> {
  const admin = await validateSession();
  if (!admin) return { success: false, message: "Unauthorized: กรุณาเข้าสู่ระบบก่อน" };

  try {
    const uploadRes = await uploadImage(fileBase64, {
      folder: "south-aero/web-assets/frontend-images/homepage",
      tags: ["homepage", "hero-card", "showcase"],
    });

    return {
      success: true,
      message: "อัปโหลดรูปภาพขึ้น Cloudinary สำเร็จ",
      data: {
        secureUrl: uploadRes.secureUrl,
        publicId: uploadRes.publicId,
      },
    };
  } catch (error) {
    console.error("[uploadHeroCardImageAction] Error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ",
    };
  }
}

/**
 * อัปเดตข้อมูล Hero Card รายการที่ระบุ
 */
export async function updateHeroCardAction(
  id: string,
  input: HeroCardInput
): Promise<ActionResult> {
  const admin = await validateSession();
  if (!admin) return { success: false, message: "Unauthorized: กรุณาเข้าสู่ระบบก่อน" };

  const parsed = heroCardSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบ",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const {
    title,
    tag,
    brandId,
    carModelId,
    imageUrl,
    cloudinaryPublicId,
    href,
    isActive,
  } = parsed.data;

  try {
    const [existing] = await db
      .select()
      .from(homepageHeroCards)
      .where(eq(homepageHeroCards.id, id))
      .limit(1);

    if (!existing) {
      return { success: false, message: "ไม่พบการ์ดที่ต้องการแก้ไขในระบบ" };
    }

    await db
      .update(homepageHeroCards)
      .set({
        title,
        tag,
        brandId: brandId || null,
        carModelId: carModelId || null,
        imageUrl,
        cloudinaryPublicId: cloudinaryPublicId || null,
        href,
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(homepageHeroCards.id, id));

    await logAuditEvent({
      adminId: admin.id,
      action: "homepage.hero_card.updated",
      entityType: "homepage_hero_card",
      entityId: id,
      metadata: { position: existing.position, title, href },
    });

    revalidatePath("/homepage");
    revalidatePath("/");
    return { success: true, message: `บันทึกการ์ดที่ ${existing.position} สำเร็จ` };
  } catch (error) {
    console.error("[updateHeroCardAction] Error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
    };
  }
}
