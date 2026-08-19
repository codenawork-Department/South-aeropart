// Custom blocklist patterns (supplement thai-bad-words)
const CUSTOM_BLOCKLIST_PATTERNS: RegExp[] = [
  // Add custom patterns as needed
];

/**
 * Check text content for profanity and inappropriate language.
 * Uses thai-bad-words for Thai language and custom regex patterns.
 * Returns { clean: boolean, reason?: string }
 */
export async function moderateText(text: string): Promise<{
  clean: boolean;
  reason?: string;
}> {
  // Check custom patterns first
  for (const pattern of CUSTOM_BLOCKLIST_PATTERNS) {
    if (pattern.test(text)) {
      return {
        clean: false,
        reason: "Text contains inappropriate content (custom filter)",
      };
    }
  }

  // Thai bad words check (dynamic import for ESM compatibility)
  try {
    const thaiBadWords = await import("thai-bad-words");
    const checker = thaiBadWords.default || thaiBadWords;

    if (typeof checker.isProfane === "function" && checker.isProfane(text)) {
      return {
        clean: false,
        reason: "Text contains inappropriate Thai language",
      };
    }
  } catch {
    // thai-bad-words not installed — skip this check
    console.warn("thai-bad-words not available, skipping Thai profanity check");
  }

  return { clean: true };
}
