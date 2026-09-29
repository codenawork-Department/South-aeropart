import { z } from "zod";

export const MAX_ORDER_NOTE_BYTES = 2048;

export function orderNoteByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

/** Keep accepted text verbatim. Rendering surfaces must escape it, never interpret HTML. */
export const orderNoteSchema = z
  .string()
  .max(MAX_ORDER_NOTE_BYTES)
  .refine(
    (value) => orderNoteByteLength(value) <= MAX_ORDER_NOTE_BYTES,
    "Order note is too long",
  )
  .refine(
    (value) =>
      !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(
        value,
      ),
    "Order note contains unsupported characters",
  );
