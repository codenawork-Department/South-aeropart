import { sendEmail, getCarrierTrackingUrl } from "@repo/lib";
import {
  db,
  orders,
  orderItems,
  orderItemBundleParts,
  users,
  eq,
  type Order,
  type OrderItem,
  type OrderItemBundlePart,
} from "@repo/db";

export type OrderItemWithParts = OrderItem & {
  bundleParts?: OrderItemBundlePart[];
};

interface SendShipmentEmailParams {
  order: Order;
  items: OrderItemWithParts[];
  customerEmail: string;
  trackingNumber: string;
  shippingCarrier: string;
}

/**
 * Generate a responsive, dark luxury HTML email template for South Aero shipment notifications.
 */
function generateShipmentEmailHtml({
  order,
  items,
  customerEmail,
  trackingNumber,
  shippingCarrier,
}: SendShipmentEmailParams): string {
  const siteUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const orderUrl = `${siteUrl}/orders/${order.id}`;
  const carrierTrackingUrl = getCarrierTrackingUrl(shippingCarrier, trackingNumber) || orderUrl;

  const address = order.shippingAddress;
  const addressParts = [
    address.recipientName,
    address.phone ? `โทร: ${address.phone}` : null,
    address.line1,
    address.line2,
    `${address.subDistrict}, ${address.district}`,
    `${address.province} ${address.postalCode}`,
  ].filter(Boolean);
  const addressStr = addressParts.join("<br/>");

  const itemsRows = items
    .map((item) => {
      const partsHtml =
        item.bundleParts && item.bundleParts.length > 0
          ? `
            <div style="margin-top: 8px; padding: 8px 12px; background-color: #191919; border-left: 2px solid #D60000; border-radius: 4px;">
              <span style="font-size: 11px; color: #A3A3A3; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">
                ชิ้นส่วนในชุดแต่ง (Included Kit Parts):
              </span>
              <ul style="margin: 0; padding-left: 18px; font-size: 11px; color: #D4D4D4; line-height: 1.6;">
                ${item.bundleParts
                  .map(
                    (part) =>
                      `<li>${part.childProductNameSnapshot} &times; ${part.quantity} ชิ้น</li>`
                  )
                  .join("")}
              </ul>
            </div>
          `
          : "";

      return `
      <tr>
        <td style="padding: 14px 0; border-bottom: 1px solid #222222; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #FFFFFF; vertical-align: top;">
          <strong style="color: #FFFFFF; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">${item.productNameSnapshot}</strong>
          <div style="color: #888888; font-size: 12px; margin-top: 3px;">
            จำนวน: ${item.quantity} ชิ้น
          </div>
          ${partsHtml}
        </td>
      </tr>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>แจ้งจัดส่งสินค้าและหมายเลขพัสดุ #${order.orderNumber} - SOUTH AERO</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0A0A0A; color: #E5E5E5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0A0A0A; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #121212; border: 1px solid #262626; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
          
          <!-- Brand Header -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(180deg, #1C1C1C 0%, #121212 100%); border-bottom: 2px solid #D60000; text-align: center;">
              <div style="font-size: 22px; font-weight: 900; letter-spacing: 4px; color: #FFFFFF; text-transform: uppercase;">
                SOUTH <span style="color: #D60000;">AERO</span>
              </div>
              <div style="font-size: 10px; font-weight: 700; letter-spacing: 2px; color: #888888; text-transform: uppercase; margin-top: 4px;">
                HIGH-PERFORMANCE AERODYNAMICS
              </div>
            </td>
          </tr>

          <!-- Hero Dispatch Banner -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; text-align: center; background: radial-gradient(circle at top, rgba(214, 0, 0, 0.15) 0%, transparent 70%);">
              <div style="display: inline-block; padding: 6px 14px; background-color: rgba(34, 197, 94, 0.15); border: 1px solid #22c55e; border-radius: 20px; font-size: 11px; font-weight: bold; color: #4ade80; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">
                &#10003; DISPATCHED (จัดส่งสินค้าแล้ว)
              </div>
              <h1 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 800; color: #FFFFFF; text-transform: uppercase; letter-spacing: 1px;">
                สินค้าของคุณกำลังเดินทางถึงคุณ!
              </h1>
              <p style="margin: 0; font-size: 13px; color: #A3A3A3; line-height: 1.6;">
                ชิ้นงานแอโรพาร์ตคุณภาพพรีเมียมจากคำสั่งซื้อ <strong style="color: #FFFFFF;">#${order.orderNumber}</strong> ได้รับการตรวจสอบคุณภาพและบรรจุส่งมอบให้บริษัทขนส่งเรียบร้อยแล้ว
              </p>
            </td>
          </tr>

          <!-- Prominent Shipment Details Box -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #171717; border: 1px solid #333333; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px 24px; text-align: center;">
                    <div style="font-size: 11px; font-weight: bold; color: #888888; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">
                      บริษัทขนส่ง (SHIPPING CARRIER)
                    </div>
                    <div style="font-size: 16px; font-weight: 800; color: #FFFFFF; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px;">
                      ${shippingCarrier}
                    </div>

                    <div style="font-size: 11px; font-weight: bold; color: #D60000; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
                      หมายเลขติดตามพัสดุ (TRACKING NUMBER)
                    </div>
                    
                    <!-- Prominent Tracking Badge -->
                    <div style="background-color: #0A0A0A; border: 1px solid #D60000; border-radius: 8px; padding: 14px 20px; display: inline-block; margin-bottom: 18px; box-shadow: 0 0 15px rgba(214, 0, 0, 0.25);">
                      <span style="font-family: 'Courier New', Courier, monospace; font-size: 22px; font-weight: 800; letter-spacing: 3px; color: #FFFFFF;">
                        ${trackingNumber}
                      </span>
                    </div>

                    <div>
                      <a href="${carrierTrackingUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #D60000; color: #FFFFFF; text-decoration: none; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; padding: 12px 28px; border-radius: 6px; box-shadow: 0 4px 14px rgba(214, 0, 0, 0.4);">
                        คลิกเพื่อตรวจสอบสถานะพัสดุ (TRACK PACKAGE) &rarr;
                      </a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items List Section -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <div style="font-size: 12px; font-weight: bold; color: #888888; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px; border-bottom: 1px solid #222222; padding-bottom: 8px;">
                รายการสินค้าที่จัดส่ง (ITEMS IN SHIPMENT)
              </div>
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                ${itemsRows}
              </table>
            </td>
          </tr>

          <!-- Shipping Address -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #161616; border: 1px solid #262626; border-radius: 10px; padding: 16px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: bold; color: #888888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                      ที่อยู่ปลายทางสำหรับจัดส่ง (DESTINATION ADDRESS)
                    </div>
                    <div style="font-size: 12px; color: #D4D4D4; line-height: 1.6;">
                      ${addressStr}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Inspection Guidance Tip -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: rgba(214, 0, 0, 0.08); border-left: 3px solid #D60000; border-radius: 4px; padding: 12px 16px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: bold; color: #F87171; text-transform: uppercase; margin-bottom: 4px;">
                      &#9888; คำแนะนำในการตรวจรับชิ้นงานคาร์บอนไฟเบอร์
                    </div>
                    <div style="font-size: 11px; color: #A3A3A3; line-height: 1.5;">
                      กรุณาตรวจสอบสภาพกล่องพัสดุก่อนเซ็นรับ และแนะนำให้บันทึกวิดีโอขณะเปิดกล่องสินค้าอย่างต่อเนื่อง หากพบชิ้นงานชำรุดเสียหายจากการขนส่ง โปรดติดต่อเจ้าหน้าที่ South Aero ทันที
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- View Order CTA -->
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <a href="${orderUrl}" target="_blank" rel="noopener noreferrer" style="color: #A3A3A3; text-decoration: underline; font-size: 12px;">
                ดูรายละเอียดประวัติคำสั่งซื้อทั้งหมดบนเว็บไซต์ South Aero &rarr;
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0E0E0E; border-top: 1px solid #222222; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #666666;">
                อีเมลนี้ถูกส่งให้กับ <span style="color: #888888;">${customerEmail}</span> โดยอัตโนมัติจากการทำรายการจัดส่งสินค้า
              </p>
              <p style="margin: 0; font-size: 10px; color: #444444; text-transform: uppercase; letter-spacing: 1px;">
                &copy; ${new Date().getFullYear()} SOUTH AERO PERFORMANCE. ALL RIGHTS RESERVED.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Sends a shipment notification email to the customer with carrier & tracking details.
 */
export async function sendShipmentNotificationEmail(
  orderId: string,
  options?: {
    trackingNumber?: string;
    shippingCarrier?: string;
  }
) {
  try {
    // 1. Fetch order
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      console.warn(`[ShipmentEmail] Order not found: ${orderId}`);
      return { success: false, error: "ไม่พบข้อมูลคำสั่งซื้อ" };
    }

    const trackingNumber = options?.trackingNumber || order.trackingNumber;
    const shippingCarrier = options?.shippingCarrier || order.shippingCarrier || "South Aero Logistics";

    if (!trackingNumber) {
      console.warn(`[ShipmentEmail] Order ${order.orderNumber} has no tracking number. Skipping email.`);
      return { success: false, error: "ยังไม่มีหมายเลขพัสดุสำหรับคำสั่งซื้อนี้" };
    }

    // 2. Fetch order items and bundle parts
    const rawItems = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    const itemsWithParts: OrderItemWithParts[] = await Promise.all(
      rawItems.map(async (item) => {
        const bundleParts = await db
          .select()
          .from(orderItemBundleParts)
          .where(eq(orderItemBundleParts.orderItemId, item.id));

        return {
          ...item,
          bundleParts,
        };
      })
    );

    // 3. Determine recipient customer email
    let recipientEmail = order.shippingAddress?.email?.trim();

    if (!recipientEmail && order.userId) {
      const [user] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, order.userId))
        .limit(1);

      if (user?.email && !user.email.includes("@southaero.local")) {
        recipientEmail = user.email.trim();
      }
    }

    if (!recipientEmail) {
      console.warn(
        `[ShipmentEmail] No customer email found for order ${order.orderNumber}`
      );
      return {
        success: false,
        error: "ไม่พบที่อยู่อีเมลลูกค้าสำหรับส่งการแจ้งเตือนพัสดุ",
      };
    }

    // 4. Generate HTML email
    const emailHtml = generateShipmentEmailHtml({
      order,
      items: itemsWithParts,
      customerEmail: recipientEmail,
      trackingNumber,
      shippingCarrier,
    });

    // 5. Send email via Resend
    const subject = `[SOUTH AERO] แจ้งจัดส่งสินค้าและหมายเลขพัสดุ คำสั่งซื้อ #${order.orderNumber} (${shippingCarrier}: ${trackingNumber})`;
    const result = await sendEmail({
      to: recipientEmail,
      subject,
      html: emailHtml,
    });

    if (result.success) {
      console.log(
        `[ShipmentEmail] Sent shipment notification for ${order.orderNumber} to ${recipientEmail}`
      );
    } else if (result.isSimulated) {
      console.log(
        `[ShipmentEmail] [Simulated] Shipment notification for ${order.orderNumber} logged to ${recipientEmail}`
      );
    } else {
      console.warn(
        `[ShipmentEmail] Failed to send shipment email for ${order.orderNumber}:`,
        result.error
      );
    }

    return result;
  } catch (err) {
    console.error("[ShipmentEmail] Unexpected error during shipment email dispatch:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "เกิดข้อผิดพลาดในการประมวลผลการส่งอีเมลแจ้งจัดส่ง",
    };
  }
}
