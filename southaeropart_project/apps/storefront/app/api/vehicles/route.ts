import { NextResponse } from "next/server";
import { getVehicleSelectorData } from "@/actions/vehicle.actions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getVehicleSelectorData();
    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
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
