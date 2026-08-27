"use server";

import { db, homepageHeroCards, eq, asc } from "@repo/db";

export interface HeroCardData {
  id: string;
  position: number;
  title: string;
  tag: string;
  imageUrl: string;
  href: string;
  isActive: boolean;
}

/**
 * ดึงข้อมูล Hero Cards 3 ตำแหน่งใต้โมเดล 3D ที่เปิดใช้งานจากฐานข้อมูล
 */
export async function getHomepageHeroCards(): Promise<HeroCardData[]> {
  try {
    const rows = await db
      .select({
        id: homepageHeroCards.id,
        position: homepageHeroCards.position,
        title: homepageHeroCards.title,
        tag: homepageHeroCards.tag,
        imageUrl: homepageHeroCards.imageUrl,
        href: homepageHeroCards.href,
        isActive: homepageHeroCards.isActive,
      })
      .from(homepageHeroCards)
      .where(eq(homepageHeroCards.isActive, true))
      .orderBy(asc(homepageHeroCards.position));

    if (rows && rows.length > 0) {
      return rows;
    }
  } catch (error) {
    console.error("[getHomepageHeroCards] Error fetching from DB:", error);
  }

  // Cloudinary fallback data if DB is temporarily empty
  return [
    {
      id: "card-1",
      position: 1,
      title: "ACCORD G9 REAR",
      tag: "DUCKTAIL & DIFFUSER",
      imageUrl:
        "https://res.cloudinary.com/eorcwggk/image/upload/v1787852339/south-aero/web-assets/frontend-images/homepage/accord-g9r-front.png",
      href: "/products?make=honda&model=accord",
      isActive: true,
    },
    {
      id: "card-2",
      position: 2,
      title: "CIVIC FD TRACK",
      tag: "AERO PACKAGE",
      imageUrl:
        "https://res.cloudinary.com/eorcwggk/image/upload/v1787852341/south-aero/web-assets/frontend-images/homepage/civic-fd-track.png",
      href: "/products?make=honda&model=civic-fd",
      isActive: true,
    },
    {
      id: "card-3",
      position: 3,
      title: "CIVIC FE STREET",
      tag: "MODERN STANCE",
      imageUrl:
        "https://res.cloudinary.com/eorcwggk/image/upload/v1787852342/south-aero/web-assets/frontend-images/homepage/civic-fe-street.png",
      href: "/products?make=honda&model=civic-fe",
      isActive: true,
    },
  ];
}
