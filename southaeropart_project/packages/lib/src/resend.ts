import { Resend } from "resend";

/**
 * Get Resend client instance safely with API key validation
 */
export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

export interface SendEmailOptions {
  from?: string;
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  data?: unknown;
  error?: string;
  isSimulated?: boolean;
}

/**
 * Send an email via Resend API (with graceful fallback if API Key is missing)
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const resend = getResendClient();
  let from = options.from || process.env.RESEND_FROM_EMAIL || "South Aero Performance <onboarding@resend.dev>";
  if (from.includes("yourdomain.com") || from.includes("example.com")) {
    from = "South Aero Performance <onboarding@resend.dev>";
  }

  if (!resend) {
    console.warn("[RESEND] RESEND_API_KEY is not set in .env. Email dispatch simulated.");
    return {
      success: false,
      isSimulated: true,
      error: "ยังไม่ได้ระบุ RESEND_API_KEY ในไฟล์ .env",
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
    });

    if (error) {
      console.error("[RESEND] Error response:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("[RESEND] Exception during dispatch:", err);
    return { success: false, error: err?.message || "เกิดข้อผิดพลาดในการส่งอีเมลผ่าน Resend" };
  }
}

/**
 * Batch send broadcast emails in chunks of 50 to comply with rate limits
 */
export async function sendBatchEmails(
  recipients: Array<{ to: string; subject: string; html: string }>,
  fromAddress?: string
): Promise<{ successCount: number; failedCount: number; errors: string[] }> {
  const resend = getResendClient();
  let from = fromAddress || process.env.RESEND_FROM_EMAIL || "South Aero Performance <onboarding@resend.dev>";
  if (from.includes("yourdomain.com") || from.includes("example.com")) {
    from = "South Aero Performance <onboarding@resend.dev>";
  }

  if (!resend) {
    console.warn("[RESEND] RESEND_API_KEY is missing. Batch send simulated.");
    return {
      successCount: 0,
      failedCount: recipients.length,
      errors: ["RESEND_API_KEY is not configured in .env (Simulated — no emails were actually sent)"],
    };
  }

  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  // Batch in chunks of 50
  const CHUNK_SIZE = 50;
  for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
    const chunk = recipients.slice(i, i + CHUNK_SIZE);
    try {
      const batchPayload = chunk.map((item) => ({
        from,
        to: item.to,
        subject: item.subject,
        html: item.html,
      }));

      const { data, error } = await resend.batch.send(batchPayload);

      if (error) {
        // Fallback to individual sends so verified accounts still receive the email
        for (const item of chunk) {
          try {
            const singleRes = await resend.emails.send({
              from,
              to: item.to,
              subject: item.subject,
              html: item.html,
            });
            if (singleRes.error) {
              failedCount++;
              errors.push(`${item.to}: ${singleRes.error.message}`);
            } else {
              successCount++;
            }
          } catch (singleErr: any) {
            failedCount++;
            errors.push(`${item.to}: ${singleErr?.message || "Error"}`);
          }
        }
      } else {
        successCount += chunk.length;
      }
    } catch (err: any) {
      // Fallback to individual send
      for (const item of chunk) {
        try {
          const singleRes = await resend.emails.send({
            from,
            to: item.to,
            subject: item.subject,
            html: item.html,
          });
          if (singleRes.error) {
            failedCount++;
            errors.push(`${item.to}: ${singleRes.error.message}`);
          } else {
            successCount++;
          }
        } catch (singleErr: any) {
          failedCount++;
          errors.push(`${item.to}: ${singleErr?.message || "Error"}`);
        }
      }
    }
  }

  return { successCount, failedCount, errors };
}
