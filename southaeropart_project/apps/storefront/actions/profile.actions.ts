"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  db,
  users,
  userAddresses,
  userVehicles,
  brands,
  carModels,
  eq,
  and,
  desc,
  UserMetadata,
  userLoginLogs,
  orders,
} from "@repo/db";

/* =========================================================================
   ZOD SCHEMAS & TYPES
   ========================================================================= */

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(100).optional(),
  phone: z.string().trim().max(30).optional().nullable(),
  language: z.enum(["th", "en"]).optional(),
  currency: z.enum(["THB", "USD", "EUR", "JPY", "SGD"]).optional(),
});

const privacyConsentsSchema = z.object({
  marketingEmail: z.boolean().default(false),
  marketingSms: z.boolean().default(false),
  analytics: z.boolean().default(false),
});

const saveAddressSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum(["shipping", "billing"]).default("shipping"),
  recipientName: z.string().trim().min(1, "Recipient name is required").max(100),
  phoneCountryCode: z.string().trim().min(1).max(10).default("+66"),
  phone: z.string().trim().min(4, "Valid phone number is required").max(25),
  country: z.string().trim().min(2).max(10).default("TH"),
  line1: z.string().trim().min(1, "Address Line 1 is required").max(255),
  line2: z.string().trim().max(255).optional().nullable(),
  subDistrict: z.string().trim().max(100).optional().nullable(),
  district: z.string().trim().max(100).optional().nullable(),
  province: z.string().trim().max(100).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  stateOrProvince: z.string().trim().max(100).optional().nullable(),
  postalCode: z.string().trim().min(2, "Postal code is required").max(20),
  companyName: z.string().trim().max(150).optional().nullable(),
  taxId: z.string().trim().max(50).optional().nullable(),
  branch: z.string().trim().max(50).optional().nullable(),
  isDefault: z.boolean().default(false),
});

const saveVehicleSchema = z.object({
  id: z.string().uuid().optional(),
  brandId: z.string().uuid("Invalid brand"),
  carModelId: z.string().uuid("Invalid car model"),
  year: z.number().int().min(1970).max(new Date().getFullYear() + 2).optional().nullable(),
  subModel: z.string().trim().max(100).optional().nullable(),
  isDefault: z.boolean().default(false),
});

export type SaveAddressInput = z.infer<typeof saveAddressSchema>;
export type SaveVehicleInput = z.infer<typeof saveVehicleSchema>;

/* =========================================================================
   PROFILE ACTIONS
   ========================================================================= */

/**
 * Fetch full profile data for authenticated user: user row, saved addresses, and garage vehicles.
 */
export async function getUserProfile() {
  const { userId } = auth();
  if (!userId) {
    return { success: false, error: "Unauthorized", data: null };
  }

  try {
    let [userRow] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    // If user record does not exist yet (e.g. sync delay), auto-create from Clerk
    if (!userRow) {
      const clerkUser = await currentUser();
      if (clerkUser) {
        const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
        const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;
        const [created] = await db
          .insert(users)
          .values({
            id: userId,
            email,
            fullName,
            avatarUrl: clerkUser.imageUrl || null,
          })
          .onConflictDoUpdate({
            target: users.id,
            set: {
              fullName: fullName || undefined,
              avatarUrl: clerkUser.imageUrl || undefined,
              updatedAt: new Date(),
            },
          })
          .returning();
        userRow = created;
      }
    }

    if (!userRow) {
      return { success: false, error: "User not found", data: null };
    }

    // Fetch saved addresses
    const addresses = await db
      .select()
      .from(userAddresses)
      .where(eq(userAddresses.userId, userId))
      .orderBy(desc(userAddresses.isDefault), desc(userAddresses.createdAt));

    // Fetch garage vehicles with brand and model details
    const vehicles = await db
      .select({
        id: userVehicles.id,
        userId: userVehicles.userId,
        brandId: userVehicles.brandId,
        carModelId: userVehicles.carModelId,
        year: userVehicles.year,
        subModel: userVehicles.subModel,
        isDefault: userVehicles.isDefault,
        createdAt: userVehicles.createdAt,
        brandName: brands.name,
        brandLogoUrl: brands.logoUrl,
        brandSlug: brands.slug,
        modelName: carModels.name,
        modelSlug: carModels.slug,
        generation: carModels.generation,
      })
      .from(userVehicles)
      .innerJoin(brands, eq(userVehicles.brandId, brands.id))
      .innerJoin(carModels, eq(userVehicles.carModelId, carModels.id))
      .where(eq(userVehicles.userId, userId))
      .orderBy(desc(userVehicles.isDefault), desc(userVehicles.createdAt));

    return {
      success: true,
      error: null,
      data: {
        user: userRow,
        addresses,
        vehicles,
      },
    };
  } catch (error) {
    console.error("[getUserProfile] Error:", error);
    return { success: false, error: "Failed to load profile", data: null };
  }
}

/**
 * Update basic personal info and preferences (Language, Display Currency, Steering Default).
 */
export async function updateUserProfile(input: z.infer<typeof updateProfileSchema>) {
  const { userId } = auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const [currentUserRow] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const existingMetadata: UserMetadata = currentUserRow?.metadata || {};
    const existingPreferences = existingMetadata.preferences || {};

    const updatedMetadata: UserMetadata = {
      ...existingMetadata,
      preferences: {
        ...existingPreferences,
        ...(parsed.data.language ? { language: parsed.data.language } : {}),
        ...(parsed.data.currency ? { currency: parsed.data.currency } : {}),
      },
    };

    await db
      .update(users)
      .set({
        ...(parsed.data.fullName ? { fullName: parsed.data.fullName } : {}),
        ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
        metadata: updatedMetadata,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    revalidatePath("/profile");
    return { success: true, error: null };
  } catch (error) {
    console.error("[updateUserProfile] Error:", error);
    return { success: false, error: "Failed to update profile" };
  }
}

/**
 * Update PDPA / GDPR Privacy Consents.
 */
export async function updatePrivacyConsents(input: z.infer<typeof privacyConsentsSchema>) {
  const { userId } = auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = privacyConsentsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid consent data" };
  }

  try {
    const [currentUserRow] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const existingMetadata: UserMetadata = currentUserRow?.metadata || {};

    const updatedMetadata: UserMetadata = {
      ...existingMetadata,
      privacyConsents: {
        marketingEmail: parsed.data.marketingEmail,
        marketingSms: parsed.data.marketingSms,
        analytics: parsed.data.analytics,
        consentTimestamp: new Date().toISOString(),
      },
    };

    await db
      .update(users)
      .set({
        metadata: updatedMetadata,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    revalidatePath("/profile");
    return { success: true, error: null };
  } catch (error) {
    console.error("[updatePrivacyConsents] Error:", error);
    return { success: false, error: "Failed to update privacy settings" };
  }
}

/* =========================================================================
   ADDRESS BOOK ACTIONS
   ========================================================================= */

/**
 * Create or update a customer shipping/billing address.
 */
export async function saveUserAddress(input: SaveAddressInput) {
  const { userId } = auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = saveAddressSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid address data" };
  }

  try {
    const data = parsed.data;

    // If marked as default, clear any existing default address of the same type
    if (data.isDefault) {
      await db
        .update(userAddresses)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(userAddresses.userId, userId),
            eq(userAddresses.type, data.type)
          )
        );
    }

    if (data.id) {
      // Update existing address
      await db
        .update(userAddresses)
        .set({
          type: data.type,
          recipientName: data.recipientName,
          phoneCountryCode: data.phoneCountryCode,
          phone: data.phone,
          country: data.country,
          line1: data.line1,
          line2: data.line2 ?? null,
          subDistrict: data.subDistrict ?? null,
          district: data.district ?? null,
          province: data.province ?? null,
          city: data.city ?? null,
          stateOrProvince: data.stateOrProvince ?? null,
          postalCode: data.postalCode,
          companyName: data.companyName ?? null,
          taxId: data.taxId ?? null,
          branch: data.branch ?? null,
          isDefault: data.isDefault,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userAddresses.id, data.id),
            eq(userAddresses.userId, userId)
          )
        );
    } else {
      // Insert new address
      await db.insert(userAddresses).values({
        userId,
        type: data.type,
        recipientName: data.recipientName,
        phoneCountryCode: data.phoneCountryCode,
        phone: data.phone,
        country: data.country,
        line1: data.line1,
        line2: data.line2 ?? null,
        subDistrict: data.subDistrict ?? null,
        district: data.district ?? null,
        province: data.province ?? null,
        city: data.city ?? null,
        stateOrProvince: data.stateOrProvince ?? null,
        postalCode: data.postalCode,
        companyName: data.companyName ?? null,
        taxId: data.taxId ?? null,
        branch: data.branch ?? null,
        isDefault: data.isDefault,
      });
    }

    revalidatePath("/profile");
    return { success: true, error: null };
  } catch (error) {
    console.error("[saveUserAddress] Error:", error);
    return { success: false, error: "Failed to save address" };
  }
}

/**
 * Delete address.
 */
export async function deleteUserAddress(addressId: string) {
  const { userId } = auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await db
      .delete(userAddresses)
      .where(
        and(
          eq(userAddresses.id, addressId),
          eq(userAddresses.userId, userId)
        )
      );

    revalidatePath("/profile");
    return { success: true, error: null };
  } catch (error) {
    console.error("[deleteUserAddress] Error:", error);
    return { success: false, error: "Failed to delete address" };
  }
}

/**
 * Set an address as default.
 */
export async function setDefaultAddress(addressId: string, type: "shipping" | "billing") {
  const { userId } = auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Unset current default
    await db
      .update(userAddresses)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(
          eq(userAddresses.userId, userId),
          eq(userAddresses.type, type)
        )
      );

    // Set new default
    await db
      .update(userAddresses)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(
        and(
          eq(userAddresses.id, addressId),
          eq(userAddresses.userId, userId)
        )
      );

    revalidatePath("/profile");
    return { success: true, error: null };
  } catch (error) {
    console.error("[setDefaultAddress] Error:", error);
    return { success: false, error: "Failed to update default address" };
  }
}

/* =========================================================================
   MY GARAGE (VEHICLE) ACTIONS
   ========================================================================= */

/**
 * Add or update vehicle in user's garage.
 */
export async function saveUserVehicle(input: SaveVehicleInput) {
  const { userId } = auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = saveVehicleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid vehicle data" };
  }

  try {
    const data = parsed.data;

    // If set as default vehicle, unset other defaults
    if (data.isDefault) {
      await db
        .update(userVehicles)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(userVehicles.userId, userId));
    }

    if (data.id) {
      // Update
      await db
        .update(userVehicles)
        .set({
          brandId: data.brandId,
          carModelId: data.carModelId,
          year: data.year ?? null,
          subModel: data.subModel ?? null,
          isDefault: data.isDefault,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userVehicles.id, data.id),
            eq(userVehicles.userId, userId)
          )
        );
    } else {
      // Insert
      await db.insert(userVehicles).values({
        userId,
        brandId: data.brandId,
        carModelId: data.carModelId,
        year: data.year ?? null,
        subModel: data.subModel ?? null,
        isDefault: data.isDefault,
      });
    }

    revalidatePath("/profile");
    return { success: true, error: null };
  } catch (error) {
    console.error("[saveUserVehicle] Error:", error);
    return { success: false, error: "Failed to save vehicle" };
  }
}

/**
 * Delete vehicle from garage.
 */
export async function deleteUserVehicle(vehicleId: string) {
  const { userId } = auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await db
      .delete(userVehicles)
      .where(
        and(
          eq(userVehicles.id, vehicleId),
          eq(userVehicles.userId, userId)
        )
      );

    revalidatePath("/profile");
    return { success: true, error: null };
  } catch (error) {
    console.error("[deleteUserVehicle] Error:", error);
    return { success: false, error: "Failed to remove vehicle" };
  }
}

/**
 * Set a vehicle as default in garage.
 */
export async function setDefaultVehicle(vehicleId: string) {
  const { userId } = auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await db
      .update(userVehicles)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(userVehicles.userId, userId));

    await db
      .update(userVehicles)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(
        and(
          eq(userVehicles.id, vehicleId),
          eq(userVehicles.userId, userId)
        )
      );

    revalidatePath("/profile");
    return { success: true, error: null };
  } catch (error) {
    console.error("[setDefaultVehicle] Error:", error);
    return { success: false, error: "Failed to set default vehicle" };
  }
}

/* =========================================================================
   PDPA / GDPR DATA EXPORT (Right to Data Portability)
   ========================================================================= */

/**
 * Export all customer personal data in clean JSON format for PDPA / GDPR compliance.
 */
export async function exportUserData() {
  const { userId } = auth();
  if (!userId) {
    return { success: false, error: "Unauthorized", data: null };
  }

  try {
    const [userRow] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!userRow) {
      return { success: false, error: "User not found", data: null };
    }

    const [addressesList, vehiclesList, ordersList, loginLogsList] = await Promise.all([
      db.select().from(userAddresses).where(eq(userAddresses.userId, userId)),
      db
        .select({
          id: userVehicles.id,
          year: userVehicles.year,
          subModel: userVehicles.subModel,
          isDefault: userVehicles.isDefault,
          brandName: brands.name,
          modelName: carModels.name,
        })
        .from(userVehicles)
        .innerJoin(brands, eq(userVehicles.brandId, brands.id))
        .innerJoin(carModels, eq(userVehicles.carModelId, carModels.id))
        .where(eq(userVehicles.userId, userId)),
      db
        .select({
          orderNumber: orders.orderNumber,
          status: orders.status,
          paymentMethod: orders.paymentMethod,
          total: orders.total,
          currency: orders.currency,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(eq(orders.userId, userId)),
      db
        .select({
          loginMethod: userLoginLogs.loginMethod,
          ipAddress: userLoginLogs.ipAddress,
          createdAt: userLoginLogs.createdAt,
        })
        .from(userLoginLogs)
        .where(eq(userLoginLogs.userId, userId))
        .limit(20),
    ]);

    const exportPayload = {
      exportMetadata: {
        platform: "South Aeropart Storefront",
        generatedAt: new Date().toISOString(),
        pdpaCompliance: "Data Subject Right to Access and Portability",
      },
      account: {
        id: userRow.id,
        email: userRow.email,
        fullName: userRow.fullName,
        phone: userRow.phone,
        createdAt: userRow.createdAt,
        lastLoginAt: userRow.lastLoginAt,
        preferences: userRow.metadata?.preferences ?? {},
        privacyConsents: userRow.metadata?.privacyConsents ?? {},
      },
      savedAddresses: addressesList,
      garageVehicles: vehiclesList,
      orderHistory: ordersList,
      recentLoginAudit: loginLogsList,
    };

    return {
      success: true,
      error: null,
      data: exportPayload,
    };
  } catch (error) {
    console.error("[exportUserData] Error:", error);
    return { success: false, error: "Failed to generate data export", data: null };
  }
}
