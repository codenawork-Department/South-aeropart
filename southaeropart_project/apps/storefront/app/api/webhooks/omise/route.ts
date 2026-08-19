import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  // Validate webhook secret
  if (token !== process.env.OMISE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const event = await req.json();

    if (event.key === "charge.complete") {
      const charge = event.data;
      const _status = charge.status === "successful" ? "paid" : "failed";

      // TODO: When database is connected:
      // 1. Check idempotency (webhook_events table)
      // 2. Update orders.paymentStatus and orders.status in transaction
      // await db.transaction(async (tx) => {
      //   await tx.update(orders)
      //     .set({ paymentStatus: status, updatedAt: new Date() })
      //     .where(eq(orders.omiseChargeId, charge.id));
      // });

      console.log(`Omise webhook: charge ${charge.id} status=${charge.status}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Omise webhook error:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
