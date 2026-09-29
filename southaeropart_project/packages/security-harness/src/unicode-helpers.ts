/**
 * Unicode and UTF-8 precision helpers (Requirement 7).
 *
 * Distinguishes Unicode code points, UTF-16 code units (JS length),
 * UTF-8 byte counts, and lone surrogates.
 */

export function countCodePoints(str: string): number {
  return Array.from(str).length;
}

export function getUtf8ByteLength(str: string): number {
  return Buffer.byteLength(str, "utf8");
}

export function containsLoneSurrogate(str: string): boolean {
  // Regex to detect lone high surrogate or lone low surrogate
  const loneSurrogateRegex =
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
  return loneSurrogateRegex.test(str);
}

export function buildStringOfLength(
  fill: string,
  targetLength: number,
  unit: "unicode_code_points" | "ascii" = "ascii",
): string {
  if (targetLength <= 0) return "";
  if (unit === "ascii" || fill.length === 1) {
    return fill.repeat(targetLength);
  }
  // For multi-char or multi-code-point fill like 🚗
  const codePoints: string[] = [];
  const fillCodePoints = Array.from(fill);
  let i = 0;
  while (codePoints.length < targetLength) {
    codePoints.push(fillCodePoints[i % fillCodePoints.length]);
    i++;
  }
  return codePoints.join("");
}

export function buildUtf8BytesString(
  fill: string,
  targetBytes: number,
): string {
  if (targetBytes <= 0) return "";
  const fillBytes = Buffer.from(fill, "utf8");
  if (fillBytes.length === 0) return "";

  const fullRepeats = Math.floor(targetBytes / fillBytes.length);
  const remainderBytes = targetBytes % fillBytes.length;

  let result = fill.repeat(fullRepeats);
  if (remainderBytes > 0) {
    // Fill remainder with ASCII 'A' (1 byte each) to hit the exact byte count
    result += "A".repeat(remainderBytes);
  }
  return result;
}

export function spliceRawBytesIntoJsonString(
  baseJson: string,
  targetKey: string,
  hexBytes: string,
): Buffer {
  const insertBuffer = Buffer.from(hexBytes, "hex");
  // Find key pattern `"label":"` or `"targetKey":"`
  const searchPattern = `"${targetKey}":"`;
  const idx = baseJson.indexOf(searchPattern);
  if (idx === -1) {
    throw new Error(`Target key ${targetKey} not found in baseJson`);
  }
  const insertPoint = idx + searchPattern.length;
  const part1 = Buffer.from(baseJson.slice(0, insertPoint), "utf8");
  const part2 = Buffer.from(baseJson.slice(insertPoint), "utf8");

  return Buffer.concat([part1, insertBuffer, part2]);
}
