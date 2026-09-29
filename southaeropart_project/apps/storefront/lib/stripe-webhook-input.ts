import { z } from "zod";
import { parseBoundedJson } from "@repo/lib/bounded-json";

export const WEBHOOK_MAX_BYTES = 1048576;
const unixSeconds = z.number().int().min(0).max(4102444800);
const envelope = z
  .object({
    id: z
      .string()
      .regex(/^evt_[A-Za-z0-9_]+$/)
      .max(255),
    object: z.literal("event"),
    type: z.string().min(1).max(255),
    created: unixSeconds,
    livemode: z.boolean(),
    account: z.string().optional(),
    data: z.object({ object: z.record(z.unknown()) }).passthrough(),
  })
  .passthrough();
export const paymentIntentWebhookSchema = z
  .object({
    id: z
      .string()
      .regex(/^pi_[A-Za-z0-9_]+$/)
      .max(255),
    object: z.literal("payment_intent"),
    amount_received: z.number().int().nonnegative().safe(),
    currency: z.string().regex(/^[a-zA-Z]{3}$/),
    livemode: z.boolean(),
    metadata: z
      .object({
        orderId: z.string().uuid().optional(),
        orderNumber: z.string().max(255).optional(),
      })
      .passthrough(),
  })
  .passthrough();

/** Provider extensions remain accepted; dangerous keys and malformed shapes do not. */
export function parseStripeWebhook(raw: Buffer) {
  return envelope.parse(parseBoundedJson(raw, WEBHOOK_MAX_BYTES, 32));
}
export function validateSignatureTimestamp(signature: string, nowMs: number) {
  if (signature.length > 8192) throw new Error("Invalid request");
  const timestamps = signature
    .split(",")
    .filter((item) => item.startsWith("t="));
  if (timestamps.length !== 1 || !/^t=(0|[1-9]\d{0,9})$/.test(timestamps[0]))
    throw new Error("Invalid request");
  const seconds = Number(timestamps[0].slice(2));
  if (seconds > 4102444800 || seconds > Math.floor(nowMs / 1000) + 30)
    throw new Error("Invalid request");
}

export class WebhookBodyTooLarge extends Error {}
export async function readWebhookBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > WEBHOOK_MAX_BYTES) {
        await reader.cancel();
        throw new WebhookBodyTooLarge();
      }
      chunks.push(chunk.value);
    }
    return Buffer.concat(chunks, bytes);
  } finally {
    reader.releaseLock();
  }
}
