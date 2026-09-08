// Custom blocklist patterns for profanity, spam, and abusive language (Thai & English)
const CUSTOM_BLOCKLIST_PATTERNS: RegExp[] = [
  /fuck/i,
  /shit/i,
  /bitch/i,
  /bastard/i,
  /asshole/i,
  /dick/i,
  /cunt/i,
  /scam/i,
  /ควย/i,
  /เหี้ย/i,
  /สัตว์นรก/i,
  /เย็ด/i,
  /จังไร/i,
  /ระยำ/i,
  /กวนส้น/i,
  /ชาติหมา/i,
  /หน้าตัวเมีย/i,
  /ส้นตีน/i,
  /หอกหัก/i,
];

/**
 * Check text content for profanity and inappropriate language.
 * Returns { clean: boolean, reason?: string }
 */
export async function moderateText(text: string): Promise<{
  clean: boolean;
  reason?: string;
}> {
  if (!text || typeof text !== "string") {
    return { clean: true };
  }

  // Check blocklist patterns
  for (const pattern of CUSTOM_BLOCKLIST_PATTERNS) {
    if (pattern.test(text)) {
      return {
        clean: false,
        reason: "ข้อความมีถ้อยคำที่ไม่สุภาพหรือไม่เหมาะสมตามนโยบายของระบบ (Detected Profanity/Abuse)",
      };
    }
  }

  return { clean: true };
}
