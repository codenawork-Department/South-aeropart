import { z } from "zod";

export type OrderReadInput = { orderId: string; guestToken?: string };

const schema = z
  .object({
    orderId: z.string().uuid(),
    // Token shape errors remain indistinguishable from missing/inaccessible orders.
    guestToken: z.unknown().optional(),
  })
  .strict();

export function parseOrderReadInput(input: unknown, positionalToken?: unknown) {
  if (typeof input !== "string" && positionalToken !== undefined) return null;
  const parsed = schema.safeParse(
    typeof input === "string"
      ? { orderId: input, guestToken: positionalToken }
      : input,
  );
  return parsed.success ? parsed.data : null;
}
