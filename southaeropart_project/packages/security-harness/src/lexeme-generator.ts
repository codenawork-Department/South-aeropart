/**
 * Safe numeric lexemes and raw JSON token generator (Requirement 3).
 *
 * Ensures values exceeding Number.MAX_SAFE_INTEGER never pass through `Number(...)`
 * before serialization. Produces raw byte buffers preserving non-standard tokens
 * like `NaN`, `Infinity`, `-Infinity`, and 64-bit integers.
 */

import { setJsonPointer } from "./json-pointer";

export const MAX_SAFE_INT = BigInt(Number.MAX_SAFE_INTEGER); // 9007199254740991n
export const MIN_SAFE_INT = BigInt(Number.MIN_SAFE_INTEGER); // -9007199254740991n

export function isSafeIntegerLexeme(lexeme: string): boolean {
  try {
    const val = BigInt(lexeme);
    return val >= MIN_SAFE_INT && val <= MAX_SAFE_INT;
  } catch {
    return false;
  }
}

/**
 * Injects a raw unquoted token (such as 18446744073709551615 or NaN) into a JSON structure,
 * producing an exact UTF-8 Buffer without JSON.stringify mangling or coercion.
 */
export function injectRawJsonLexeme(
  baseObj: Record<string, unknown>,
  targetPath: string,
  rawLexeme: string,
): { rawText: string; rawBytes: Buffer } {
  // Deterministic marker, checked against every existing key/value before insertion.
  const original = JSON.stringify(baseObj);
  let sentinel = "__SECURITY_RAW_TOKEN__";
  while (original.includes(sentinel)) sentinel += "_";

  // Clone object safely
  const clone = JSON.parse(JSON.stringify(baseObj));

  // Navigate path and set sentinel
  setJsonPointer(clone, targetPath, sentinel);

  // Serialize to JSON
  const serialized = JSON.stringify(clone);

  // Replace quoted sentinel with exact unquoted raw lexeme
  // e.g. "path": "__SENTINEL...__" => "path": 18446744073709551615
  const rawText = serialized.replace(`"${sentinel}"`, () => rawLexeme);
  const rawBytes = Buffer.from(rawText, "utf8");

  return { rawText, rawBytes };
}

/**
 * Returns native nonfinite values for unit test seams.
 * Must NOT be run through JSON.stringify (which converts them to null).
 */
export function getNativeNonfinite(
  name: "NaN" | "Infinity" | "-Infinity",
): number {
  switch (name) {
    case "NaN":
      return NaN;
    case "Infinity":
      return Infinity;
    case "-Infinity":
      return -Infinity;
    default:
      throw new Error(`Unsupported native nonfinite name: ${name}`);
  }
}
