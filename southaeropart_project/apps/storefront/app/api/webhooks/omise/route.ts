import { NextRequest, NextResponse } from "next/server";
import { db, orders, orderStatusHistory, eq } from "@repo/db";
import { fulfillOrderPayment } from "@/actions/checkout.actions";

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  // Validate webhook secret
  if (!process.env.OMISE_WEBHOOK_SECRET || token !== process.env.OMISE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const event = await req.json();

    if (event.key === "charge.complete") {
      const charge = event.data;
      const chargeId = charge.id;
      const orderIdFromMeta = charge.metadata?.orderId;

      let targetOrderId = orderIdFromMeta;
      if (!targetOrderId) {
        const [foundOrder] = await db
          .select({ id: orders.id })
          .from(orders)
          .where(eq(orders.omiseChargeId, chargeId))
          .limit(1);
        targetOrderId = foundOrder?.id;
      }

      if (targetOrderId) {
        if (charge.status === "successful") {
          await fulfillOrderPayment(targetOrderId, {
            method: "promptpay",
            chargeId,
            note: `ชำระเงินสำเร็จผ่าน Omise (Charge ID: ${chargeId})`,
          });
        } else {
          await db
            .update(orders)
            .set({
              paymentStatus: "failed",
              updatedAt: new Date(),
            })
            .where(eq(orders.id, targetOrderId));

          await db.insert(orderStatusHistory).values({
            orderId: targetOrderId,
            status: "pending",
            note: `การชำระเงินผ่าน Omise ไม่สำเร็จ (Charge ID: ${chargeId}, Status: ${charge.status})`,
          });
        }
      }

      console.log(`Omise webhook: charge ${chargeId} status=${charge.status} for order ${targetOrderId || "unknown"}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Omise webhook error:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
