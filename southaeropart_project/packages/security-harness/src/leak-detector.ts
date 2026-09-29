/**
 * NO_LEAK assertion and error surface leak detector (Requirement 5 & NO_LEAK invariant).
 *
 * Recursively scans raw error responses, JSON structures, RSC frames, and HTML
 * for internal state leakage: SQLSTATE, table/constraint names, stack traces,
 * file paths, secrets, database connection strings, and injected test sentinels.
 */

const LEAK_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  {
    name: "SQLSTATE code",
    pattern: /\b(23505|42P01|42601|42703|08006|28P01|22003|22P02)\b/i,
  },
  {
    name: "PostgreSQL syntax/internal",
    pattern:
      /\b(syntax error at or near|relation ".*" does not exist|duplicate key value violates unique constraint)\b/i,
  },
  {
    name: "Real Table / Constraint Name",
    pattern:
      /\b(products_sku_key|products_sku_unique|products_pkey|orders_pkey|order_items|order_stock_reservations|product_bundle_items)\b/i,
  },
  {
    name: "Stack Trace / File Path",
    pattern:
      /(at\s+[A-Za-z0-9_$.]+\s+\(|[\\/](apps|packages|node_modules)[\\/][A-Za-z0-9_.-]+:[0-9]+)/i,
  },
  {
    name: "Windows / POSIX absolute file path",
    pattern:
      /([A-Za-z]:[\\/][A-Za-z0-9_.\-\\ ]+|[\\/](home|var|tmp|Users)[\\/][A-Za-z0-9_.-]+)/i,
  },
  { name: "Database Connection URL", pattern: /postgres(ql)?:\/\/[^\s"'<>]+/i },
  {
    name: "Secret or Key Leak",
    pattern:
      /\b(sk_live_[0-9a-zA-Z]{24,}|sk_test_[0-9a-zA-Z]{24,}|whsec_[0-9a-zA-Z]{32,}|re_[0-9a-zA-Z]{24,})\b/i,
  },
  {
    name: "Internal Framework / Zod leak",
    pattern: /\b(ZodError|invalid_type|unrecognized_keys)\b/i,
  },
];

export interface LeakScanResult {
  hasLeaks: boolean;
  leaks: string[];
}

export function detectErrorLeaks(
  target: unknown,
  customSentinels: string[] = [],
): LeakScanResult {
  const leaks: string[] = [];
  const textAccumulator: string[] = [];

  function walk(val: unknown): void {
    if (val === null || val === undefined) return;
    if (typeof val === "string") {
      textAccumulator.push(val);
      return;
    }
    if (typeof val === "number" || typeof val === "boolean") {
      textAccumulator.push(String(val));
      return;
    }
    if (Array.isArray(val)) {
      for (const item of val) walk(item);
      return;
    }
    if (typeof val === "object") {
      for (const [k, v] of Object.entries(val)) {
        textAccumulator.push(k);
        walk(v);
      }
    }
  }

  walk(target);
  const fullText = textAccumulator.join(" \n ");

  // 1. Check custom sentinels injected by test cases
  for (const sentinel of customSentinels) {
    if (sentinel && fullText.includes(sentinel)) {
      leaks.push(`Injected sentinel leaked in response: "${sentinel}"`);
    }
  }

  // 2. Check built-in sensitive patterns
  for (const { name, pattern } of LEAK_PATTERNS) {
    const match = fullText.match(pattern);
    if (match) {
      leaks.push(`${name} leaked: "${match[0]}"`);
    }
  }

  return {
    hasLeaks: leaks.length > 0,
    leaks,
  };
}
