import { sendEmail } from "@repo/lib";
import {
  db,
  orders,
  orderItems,
  users,
  eq,
  type Order,
  type OrderItem,
} from "@repo/db";

interface SendOrderEmailParams {
  order: Order;
  items: OrderItem[];
  customerEmail?: string | null;
}

/**
 * Generate a responsive, dark-mode premium HTML email template for South Aero orders.
 */
function generateOrderEmailHtml({
  order,
  items,
  customerEmail,
}: SendOrderEmailParams): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const trackingUrl = `${siteUrl}/orders/${order.id}`;
  const orderDate = new Date(order.createdAt).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const address = order.shippingAddress;
  const addressParts = [
    address.recipientName,
    address.phone,
    address.line1,
    address.line2,
    `${address.subDistrict}, ${address.district}`,
    `${address.province} ${address.postalCode}`,
  ].filter(Boolean);
  const addressStr = addressParts.join("<br/>");

  const itemsRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #222222; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #FFFFFF;">
          <strong style="color: #FFFFFF; font-size: 14px; text-transform: uppercase;">${item.productNameSnapshot}</strong>
          <div style="color: #888888; font-size: 12px; margin-top: 2px;">จำนวน: ${item.quantity} ชิ้น &times; ฿${parseFloat(item.unitPrice).toLocaleString()} THB</div>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #222222; text-align: right; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: bold; color: #FFFFFF;">
          ฿${parseFloat(item.lineTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </td>
      </tr>
    `
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ยืนยันคำสั่งซื้อ #${order.orderNumber} - SOUTH AERO</title>
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
              <div style="font-size: 10px; letter-spacing: 2px; color: #888888; text-transform: uppercase; margin-top: 4px;">
                HIGH-PERFORMANCE AERODYNAMICS
              </div>
            </td>
          </tr>

          <!-- Success Banner -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: center;">
              <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; border-radius: 50%; background-color: rgba(16, 185, 129, 0.15); border: 2px solid #10B981; color: #10B981; font-size: 28px; margin-bottom: 16px;">
                &#10003;
              </div>
              <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #FFFFFF;">
                การชำระเงินสำเร็จ
              </h1>
              <p style="margin: 0; font-size: 14px; color: #9CA3AF; line-height: 1.5;">
                ขอบคุณสำหรับการสั่งซื้อชิ้นส่วนแอโรพาร์ทกับ South Aero เราได้รับยอดเงินและกำลังเตรียมจัดส่งสินค้าให้ท่าน
              </p>
            </td>
          </tr>

          <!-- Order Meta Card -->
          <tr>
            <td style="padding: 0 32px 20px 32px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #181818; border: 1px solid #2A2A2A; border-radius: 12px; padding: 18px 20px;">
                <tr>
                  <td width="50%" style="font-size: 12px; color: #737373; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">
                    หมายเลขคำสั่งซื้อ:
                    <div style="font-size: 15px; color: #D60000; font-family: monospace; font-weight: bold; margin-top: 4px;">
                      ${order.orderNumber}
                    </div>
                  </td>
                  <td width="50%" align="right" style="font-size: 12px; color: #737373; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">
                    วันที่ทำรายการ:
                    <div style="font-size: 13px; color: #E5E5E5; margin-top: 4px;">
                      ${orderDate}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding: 10px 32px 20px 32px;">
              <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #737373; margin-bottom: 12px;">
                รายการสินค้าที่สั่งซื้อ (${items.length} รายการ)
              </div>
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                ${itemsRows}
              </table>
            </td>
          </tr>

          <!-- Totals Summary -->
          <tr>
            <td style="padding: 10px 32px 24px 32px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 2px solid #262626; padding-top: 14px;">
                <tr>
                  <td style="padding: 4px 0; font-size: 13px; color: #9CA3AF;">ยอดรวมสินค้า (Subtotal):</td>
                  <td align="right" style="padding: 4px 0; font-size: 13px; color: #E5E5E5; font-family: monospace;">฿${parseFloat(order.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 13px; color: #9CA3AF;">ค่าจัดส่ง (${order.shippingCarrier || "Standard"}):</td>
                  <td align="right" style="padding: 4px 0; font-size: 13px; color: #E5E5E5; font-family: monospace;">
                    ${parseFloat(order.shippingFee) > 0 ? `฿${parseFloat(order.shippingFee).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "<span style='color:#10B981;'>ฟรี (FREE)</span>"}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0 0 0; font-size: 15px; font-weight: bold; color: #FFFFFF; text-transform: uppercase;">ยอดชำระสุทธิ (Total):</td>
                  <td align="right" style="padding: 12px 0 0 0; font-size: 20px; font-weight: 800; color: #FFFFFF; font-family: monospace;">
                    ฿${parseFloat(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })} THB
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Shipping Address -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #181818; border: 1px solid #262626; border-radius: 12px; padding: 18px 20px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #737373; letter-spacing: 1px; margin-bottom: 6px;">
                      ที่อยู่สำหรับจัดส่งพัสดุ
                    </div>
                    <div style="font-size: 13px; color: #D4D4D4; line-height: 1.6;">
                      ${addressStr}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 32px 36px 32px; text-align: center;">
              <a href="${trackingUrl}" target="_blank" style="display: inline-block; background-color: #D60000; color: #FFFFFF; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 14px rgba(214, 0, 0, 0.4);">
                ตรวจสอบสถานะคำสั่งซื้อ &rarr;
              </a>
              <div style="font-size: 11px; color: #666666; margin-top: 14px;">
                ท่านสามารถติดตามสถานะการเตรียมชิ้นงานและเลขพัสดุได้จากหน้าคำสั่งซื้อตลอด 24 ชั่วโมง
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0E0E0E; border-top: 1px solid #1F1F1F; text-align: center; font-size: 11px; color: #555555; line-height: 1.5;">
              &copy; ${new Date().getFullYear()} SOUTH AERO PARTS CO., LTD. ALL RIGHTS RESERVED.<br/>
              อีเมลฉบับนี้เป็นการแจ้งข้อมูลโดยอัตโนมัติ กรุณาอย่าตอบกลับอีเมลนี้โดยตรง
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Sends order confirmation email to the customer using Resend.
 * Gracefully logs and returns isSimulated if RESEND_API_KEY is not configured.
 */
export async function sendOrderConfirmationEmail(orderId: string) {
  try {
    // 1. Fetch order details from DB
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // 2. Fetch order items
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    // 3. Determine recipient email
    let recipientEmail = order.shippingAddress?.email;

    if (!recipientEmail && order.userId) {
      const [user] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, order.userId))
        .limit(1);

      if (user?.email && !user.email.includes("@southaero.local")) {
        recipientEmail = user.email;
      }
    }

    if (!recipientEmail) {
      console.warn(
        `[OrderEmail] No valid customer email found for order ${order.orderNumber}`
      );
      return {
        success: false,
        error: "ไม่พบที่อยู่อีเมลสำหรับจัดส่งการยืนยันคำสั่งซื้อ",
      };
    }

    // 4. Generate HTML content
    const emailHtml = generateOrderEmailHtml({
      order,
      items,
      customerEmail: recipientEmail,
    });

    // 5. Send via Resend
    const result = await sendEmail({
      to: recipientEmail,
      subject: `[SOUTH AERO] ยืนยันคำสั่งซื้อและการชำระเงิน #${order.orderNumber}`,
      html: emailHtml,
    });

    if (result.success) {
      console.log(
        `[OrderEmail] Successfully sent order confirmation for ${order.orderNumber} to ${recipientEmail}`
      );
    } else if (result.isSimulated) {
      console.log(
        `[OrderEmail] [Simulated] Order confirmation for ${order.orderNumber} logged to ${recipientEmail}`
      );
    } else {
      console.warn(
        `[OrderEmail] Failed to send email for ${order.orderNumber}:`,
        result.error
      );
    }

    return result;
  } catch (err) {
    console.error("[OrderEmail] Unexpected error during email dispatch:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "เกิดข้อผิดพลาดในการประมวลผลการส่งอีเมล",
    };
  }
}
