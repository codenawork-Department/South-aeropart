import { NextResponse } from "next/server";
import { getVehicleSelectorData, getUserGarageVehicles } from "@/actions/vehicle.actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const [data, garageVehicles] = await Promise.all([
      getVehicleSelectorData(),
      getUserGarageVehicles(),
    ]);

    return NextResponse.json(
      { success: true, data, garageVehicles },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("[GET /api/vehicles] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load vehicle data", data: [] },
      { status: 500 }
    );
  }
}
