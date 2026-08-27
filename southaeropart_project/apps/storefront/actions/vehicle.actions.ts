"use server";

import { db, brands, carModels, eq, asc } from "@repo/db";

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
