import { describe, expect, it } from "vitest";
import { orderNoteSchema } from "./order-note";
import { renderOrderNoteEmail } from "./order-note-email";

describe("customer order note", () => {
  it.each([
    "",
    "Please call\nbefore delivery\tthank you",
    "<img src=x onerror=globalThis.__qaXss=1>",
    "' OR 1=1 --",
    "A".repeat(2048),
    "ก".repeat(682) + "AB",
    "🚗".repeat(512),
  ])("preserves accepted text verbatim (%#)", (note) => {
    expect(orderNoteSchema.parse(note)).toBe(note);
  });
  it.each([
    null,
    {},
    [],
    123,
    "A".repeat(2049),
    "ก".repeat(683),
    "🚗".repeat(513),
    "NUL\0",
    "bad\uD800",
    "bad\uDC00",
    "bad\u0001",
  ])("rejects invalid types, encodings and oversized notes (%#)", (note) => {
    expect(orderNoteSchema.safeParse(note).success).toBe(false);
  });
  it("escapes user HTML and quotes in email while preserving line breaks", () => {
    const html = renderOrderNoteEmail(
      '<img src=x onerror="alert(1)">\n& hello',
    );
    expect(html).toContain(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;\n&amp; hello",
    );
    expect(html).not.toContain("<img");
    expect(renderOrderNoteEmail(null)).toBe("");
  });
});
