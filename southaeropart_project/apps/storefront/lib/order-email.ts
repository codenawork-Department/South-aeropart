import { sendEmail } from "@repo/lib";
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

interface SendOrderEmailParams {
  order: Order;
  items: OrderItemWithParts[];
  customerEmail?: string | null;
}

/**
 * Generate a responsive, dark-mode premium HTML email template for South Aero order receipts.
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
    address.phone ? `โทร: ${address.phone}` : null,
    address.line1,
    address.line2,
    `${address.subDistrict}, ${address.district}`,
    `${address.province} ${address.postalCode}`,
  ].filter(Boolean);
  const addressStr = addressParts.join("<br/>");

  const totalNum = parseFloat(order.total);
  const vatAmount = (totalNum * 7) / 107; // 7% VAT included in price
  const subtotalNum = parseFloat(order.subtotal);
  const shippingNum = parseFloat(order.shippingFee);

  const paymentMethodLabel = order.stripePaymentIntentId
    ? "Stripe Payment Gateway (Card / PromptPay)"
    : order.paymentMethod === "credit_card"
      ? "บัตรเครดิต / เดบิต (Credit Card)"
      : "PromptPay QR Code";

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
            จำนวน: ${item.quantity} ชิ้น &times; ฿${parseFloat(item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })} THB
          </div>
          ${partsHtml}
        </td>
        <td style="padding: 14px 0; border-bottom: 1px solid #222222; text-align: right; vertical-align: top; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: bold; color: #FFFFFF;">
          ฿${parseFloat(item.lineTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
  <title>ใบเสร็จและยืนยันคำสั่งซื้อ #${order.orderNumber} - SOUTH AERO</title>
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
                HIGH-PERFORMANCE AERODYNAMICS &bull; OFFICIAL RECEIPT
              </div>
            </td>
          </tr>

          <!-- Success & Payment Banner -->
          <tr>
            <td style="padding: 32px 32px 18px 32px; text-align: center;">
              <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; border-radius: 50%; background-color: rgba(16, 185, 129, 0.15); border: 2px solid #10B981; color: #10B981; font-size: 28px; margin-bottom: 14px;">
                &#10003;
              </div>
              <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #FFFFFF;">
                การชำระเงินสำเร็จ (PAYMENT CONFIRMED)
              </h1>
              <p style="margin: 0; font-size: 13px; color: #9CA3AF; line-height: 1.5;">
                ขอบคุณสำหรับการสั่งซื้อชิ้นส่วนแอโรพาร์ทกับ South Aero เราได้รับยอดเงินและกำลังเตรียมจัดส่งสินค้าให้ท่าน
              </p>
            </td>
          </tr>

          <!-- Receipt Destination Banner -->
          ${customerEmail ? `
          <tr>
            <td style="padding: 0 32px 16px 32px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #161616; border: 1px solid #282828; border-radius: 10px; padding: 12px 16px;">
                <tr>
                  <td style="font-size: 12px; color: #888888;">
                    ใบเสร็จรับเงินและเอกสารยืนยันถูกส่งไปยัง: 
                    <span style="color: #FFFFFF; font-weight: bold; font-family: monospace;">${customerEmail}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ""}

          <!-- Order Meta Card -->
          <tr>
            <td style="padding: 0 32px 20px 32px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #181818; border: 1px solid #2A2A2A; border-radius: 12px; padding: 18px 20px;">
                <tr>
                  <td width="50%" style="font-size: 11px; color: #737373; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">
                    หมายเลขคำสั่งซื้อ (ORDER NO):
                    <div style="font-size: 15px; color: #D60000; font-family: monospace; font-weight: bold; margin-top: 4px;">
                      ${order.orderNumber}
                    </div>
                  </td>
                  <td width="50%" align="right" style="font-size: 11px; color: #737373; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">
                    วันที่และเวลาทำรายการ:
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
                รายการชิ้นส่วนแอโรพาร์ทที่สั่งซื้อ (${items.length} รายการ)
              </div>
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                ${itemsRows}
              </table>
            </td>
          </tr>

          <!-- Totals Summary & Tax Invoice Details -->
          <tr>
            <td style="padding: 10px 32px 24px 32px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 2px solid #262626; padding-top: 14px;">
                <tr>
                  <td style="padding: 5px 0; font-size: 13px; color: #9CA3AF;">ยอดรวมสินค้า (Subtotal):</td>
                  <td align="right" style="padding: 5px 0; font-size: 13px; color: #E5E5E5; font-family: monospace;">฿${subtotalNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; font-size: 13px; color: #9CA3AF;">ค่าจัดส่ง (${order.shippingCarrier || "South Aero Standard Logistics"}):</td>
                  <td align="right" style="padding: 5px 0; font-size: 13px; color: #E5E5E5; font-family: monospace;">
                    ${shippingNum > 0 ? `฿${shippingNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "<span style='color:#10B981;'>ฟรี (FREE)</span>"}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; font-size: 12px; color: #737373;">ภาษีมูลค่าเพิ่ม (VAT 7% - รวมในราคาสินค้า):</td>
                  <td align="right" style="padding: 5px 0; font-size: 12px; color: #888888; font-family: monospace;">
                    ฿${vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; font-size: 12px; color: #737373;">วิธีการชำระเงิน (Payment Method):</td>
                  <td align="right" style="padding: 5px 0; font-size: 12px; color: #D4D4D4;">
                    ${paymentMethodLabel}
                  </td>
                </tr>
                ${order.stripePaymentIntentId ? `
                <tr>
                  <td style="padding: 4px 0; font-size: 11px; color: #666666;">รหัสอ้างอิงธุรกรรม Stripe (Ref ID):</td>
                  <td align="right" style="padding: 4px 0; font-size: 11px; color: #888888; font-family: monospace;">
                    ${order.stripePaymentIntentId}
                  </td>
                </tr>
                ` : ""}
                <tr>
                  <td style="padding: 14px 0 0 0; font-size: 15px; font-weight: bold; color: #FFFFFF; text-transform: uppercase;">ยอดชำระสุทธิ (Total Amount):</td>
                  <td align="right" style="padding: 14px 0 0 0; font-size: 20px; font-weight: 800; color: #FFFFFF; font-family: monospace;">
                    ฿${totalNum.toLocaleString(undefined, { minimumFractionDigits: 2 })} THB
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
                      ข้อมูลและที่อยู่สำหรับการจัดส่งพัสดุ
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
              อีเมลฉบับนี้เป็นการแจ้งข้อมูลใบเสร็จรับเงินโดยอัตโนมัติ หากมีข้อสงสัยกรุณาติดต่อฝ่ายบริการลูกค้า
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
 * Sends order confirmation email and receipt to the customer using Resend.
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

    // 2. Fetch order items with their bundle parts snapshot
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

    // 3. Determine recipient email: prioritize shippingAddress.email, fallback to user account email
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
        `[OrderEmail] No valid customer email found for order ${order.orderNumber}`
      );
      return {
        success: false,
        error: "ไม่พบที่อยู่อีเมลสำหรับจัดส่งการยืนยันคำสั่งซื้อ",
      };
    }

    // 4. Generate HTML receipt content
    const emailHtml = generateOrderEmailHtml({
      order,
      items: itemsWithParts,
      customerEmail: recipientEmail,
    });

    // 5. Send via Resend
    const result = await sendEmail({
      to: recipientEmail,
      subject: `[SOUTH AERO] ใบเสร็จและยืนยันการชำระเงิน #${order.orderNumber}`,
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
