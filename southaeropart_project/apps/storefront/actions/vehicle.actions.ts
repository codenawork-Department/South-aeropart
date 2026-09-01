"use server";

import { unstable_noStore as noStore } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { db, brands, carModels, userVehicles, eq, asc, desc } from "@repo/db";

export interface VehicleModelData {
  id: string;
  brandId: string;
  name: string;
  slug: string;
  generation: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  displayName: string;
  yearRange: string;
}

export interface VehicleBrandData {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  models: VehicleModelData[];
}

export interface UserGarageVehicle {
  id: string;
  brandId: string;
  brandName: string;
  brandSlug: string;
  carModelId: string;
  carModelName: string;
  carModelSlug: string;
  carModelGen: string | null;
  year: number | null;
  subModel: string | null;
  isDefault: boolean;
}

function formatModelDisplay(model: {
  name: string;
  generation?: string | null;
  yearFrom?: number | null;
  yearTo?: number | null;
}) {
  let displayName = model.name;
  if (model.generation && !model.name.toLowerCase().includes(model.generation.toLowerCase())) {
    displayName = `${model.name} (${model.generation})`;
  }

  let yearRange = "";
  if (model.yearFrom) {
    if (model.yearTo && model.yearTo !== model.yearFrom) {
      yearRange = `${model.yearFrom}-${model.yearTo}`;
    } else if (model.yearTo === model.yearFrom) {
      yearRange = `${model.yearFrom}`;
    } else {
      yearRange = `${model.yearFrom}-Present`;
    }
  }

  return { displayName, yearRange };
}

/**
 * ดึงข้อมูลแบรนด์และรุ่นรถยนต์ที่เปิดใช้งาน (isActive = true) ทั้งหมดจากฐานข้อมูล
 */
export async function getVehicleSelectorData(): Promise<VehicleBrandData[]> {
  noStore();
  try {
    const [brandRows, modelRows] = await Promise.all([
      db
        .select({
          id: brands.id,
          name: brands.name,
          slug: brands.slug,
          logoUrl: brands.logoUrl,
          isActive: brands.isActive,
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
          yearFrom: carModels.yearFrom,
          yearTo: carModels.yearTo,
          isActive: carModels.isActive,
        })
        .from(carModels)
        .where(eq(carModels.isActive, true))
        .orderBy(asc(carModels.name)),
    ]);

    // Group models by brandId
    const modelsByBrandId = new Map<string, VehicleModelData[]>();
    for (const m of modelRows) {
      const { displayName, yearRange } = formatModelDisplay(m);
      const modelData: VehicleModelData = {
        id: m.id,
        brandId: m.brandId,
        name: m.name,
        slug: m.slug,
        generation: m.generation,
        yearFrom: m.yearFrom,
        yearTo: m.yearTo,
        displayName,
        yearRange,
      };

      if (!modelsByBrandId.has(m.brandId)) {
        modelsByBrandId.set(m.brandId, []);
      }
      modelsByBrandId.get(m.brandId)!.push(modelData);
    }

    // Combine brands with their respective models
    const result: VehicleBrandData[] = brandRows.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      logoUrl: b.logoUrl,
      models: modelsByBrandId.get(b.id) || [],
    }));

    return result;
  } catch (error) {
    console.error("[getVehicleSelectorData] Failed to fetch vehicle data:", error);
    return [];
  }
}

/**
 * ดึงข้อมูลรถยนต์ที่บันทึกไว้ในโรงรถ (My Garage) ของผู้ใช้งานปัจจุบัน
 */
export async function getUserGarageVehicles(): Promise<UserGarageVehicle[]> {
  noStore();
  try {
    const { userId } = auth();
    if (!userId) {
      return [];
    }

    const rows = await db
      .select({
        id: userVehicles.id,
        brandId: userVehicles.brandId,
        carModelId: userVehicles.carModelId,
        year: userVehicles.year,
        subModel: userVehicles.subModel,
        isDefault: userVehicles.isDefault,
        brandName: brands.name,
        brandSlug: brands.slug,
        carModelName: carModels.name,
        carModelSlug: carModels.slug,
        carModelGen: carModels.generation,
      })
      .from(userVehicles)
      .innerJoin(brands, eq(userVehicles.brandId, brands.id))
      .innerJoin(carModels, eq(userVehicles.carModelId, carModels.id))
      .where(eq(userVehicles.userId, userId))
      .orderBy(desc(userVehicles.isDefault), desc(userVehicles.createdAt));

    return rows;
  } catch (error) {
    console.error("[getUserGarageVehicles] Error fetching user garage vehicles:", error);
    return [];
  }
}
