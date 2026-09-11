/**
 * Converts numeric Baht values to legal Thai Baht text representation.
 * Compliant with Thai Revenue Department standards (e.g. "หนึ่งหมื่นบาทถ้วน").
 */

const THAI_DIGITS = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const THAI_POSITIONS = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

function convertSegment(numStr: string): string {
  let result = "";
  const len = numStr.length;

  for (let i = 0; i < len; i++) {
    const digit = parseInt(numStr[i], 10);
    const position = len - i - 1;

    if (digit === 0) continue;

    if (position === 1) {
      if (digit === 1) {
        result += "สิบ";
      } else if (digit === 2) {
        result += "ยี่สิบ";
      } else {
        result += THAI_DIGITS[digit] + "สิบ";
      }
    } else if (position === 0) {
      if (digit === 1 && len > 1 && parseInt(numStr[len - 2], 10) !== 0) {
        result += "เอ็ด";
      } else {
        result += THAI_DIGITS[digit];
      }
    } else {
      result += THAI_DIGITS[digit] + THAI_POSITIONS[position];
    }
  }

  return result;
}

/**
 * Converts a positive currency amount (numeric or string) into Thai Baht text.
 * Example: 22999.00 -> "สองหมื่นสองพันเก้าร้อยเก้าสิบเก้าบาทถ้วน"
 * Example: 107268.50 -> "หนึ่งแสนเจ็ดพันสองร้อยหกสิบแปดบาทห้าสิบสตางค์"
 */
export function thaiBahtText(amount: number | string): string {
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(numericAmount) || numericAmount === 0) {
    return "ศูนย์บาทถ้วน";
  }

  const isNegative = numericAmount < 0;
  const absAmount = Math.abs(numericAmount);

  // Format to 2 decimal places to avoid floating point issues
  const fixedStr = absAmount.toFixed(2);
  const [bahtPart, satangPart] = fixedStr.split(".");

  let textResult = "";

  // Process integer baht part in chunks of 6 digits (million groups)
  const segments: string[] = [];
  let remaining = bahtPart;
  while (remaining.length > 6) {
    segments.unshift(remaining.slice(-6));
    remaining = remaining.slice(0, -6);
  }
  if (remaining.length > 0) {
    segments.unshift(remaining);
  }

  for (let idx = 0; idx < segments.length; idx++) {
    const segText = convertSegment(segments[idx]);
    if (segText) {
      textResult += segText;
      const millionCount = segments.length - idx - 1;
      for (let m = 0; m < millionCount; m++) {
        textResult += "ล้าน";
      }
    }
  }

  if (!textResult) {
    textResult = "ศูนย์";
  }

  textResult += "บาท";

  const satangVal = parseInt(satangPart, 10);
  if (satangVal === 0) {
    textResult += "ถ้วน";
  } else {
    textResult += convertSegment(satangPart) + "สตางค์";
  }

  return isNegative ? `ลบ${textResult}` : textResult;
}
