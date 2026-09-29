import { createHmac, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import {
  generateStripeTestSignature,
  mutateBytesAfterSignature,
} from "../stripe-test-signer";
import { buildUtf8BytesString } from "../unicode-helpers";
import type { CorpusData, ExpandedVariant } from "../types";

export function webhookFixture(
  variant: ExpandedVariant,
  corpus: CorpusData,
  fixture: { orderId: string; intentId: string; eventId: string },
  secret: string,
  nowSeconds: number,
) {
  const base = (corpus.fixtures.stripe as { input: object }).input;
  let raw =
    variant.recipe === "stripeSequence"
      ? JSON.stringify(base)
      : variant.rawPayload !== undefined
        ? Buffer.from(variant.rawPayload).toString("utf8")
        : JSON.stringify(variant.payload);
  // Keep intentionally wrong/missing fields; remap only the valid baseline IDs.
  raw = raw
    .replaceAll('"evt_qa_unique"', JSON.stringify(fixture.eventId))
    .replaceAll('"pi_qa_bound"', JSON.stringify(fixture.intentId))
    .replaceAll(
      '"20000000-0000-4000-8000-000000000002"',
      JSON.stringify(fixture.orderId),
    );
  const meta = variant.metadata ?? {};
  if (
    variant.recipe === "stripeSignature" &&
    String(meta.signatureVariant).includes("after_sign")
  ) {
    const obj = structuredClone(base) as Record<string, any>;
    obj.id = fixture.eventId;
    obj.data.object.id = fixture.intentId;
    obj.data.object.metadata.orderId = fixture.orderId;
    raw = JSON.stringify(obj);
  }
  try {
    const obj = JSON.parse(raw);
    if (obj && !Array.isArray(obj) && typeof obj === "object") {
      if (variant.recipe !== "stripeEventCreated")
        obj.created = nowSeconds + Number(meta.eventCreatedOffset ?? 0);
      if (variant.recipe === "bodyBytes") {
        obj.data.object.metadata.qa_padding = "";
        const target = Number(meta.targetSize);
        const fill =
          meta.encoding === "thai"
            ? "ก"
            : meta.encoding === "emoji"
              ? "🚗"
              : "A";
        obj.data.object.metadata.qa_padding = buildUtf8BytesString(
          fill,
          target - Buffer.byteLength(JSON.stringify(obj)),
        );
      }
      raw = JSON.stringify(obj);
    }
  } catch {
    /* malformed JSON must reach the signed route unchanged */
  }
  const timestamp = nowSeconds + Number(meta.headerOffset ?? 0);
  const sign = (
    bytes: Buffer,
    signatureVariant?: string,
  ): Record<string, string> => {
    if (signatureVariant === "missing") return {};
    if (signatureVariant === "empty") return { "stripe-signature": "" };
    if (meta.tsLexeme !== undefined) {
      const lexeme = String(meta.tsLexeme);
      return {
        "stripe-signature": `t=${lexeme},v1=${createHmac("sha256", secret)
          .update(Buffer.concat([Buffer.from(`${lexeme}.`), bytes]))
          .digest("hex")}`,
      };
    }
    return {
      "stripe-signature": generateStripeTestSignature({
        payload: bytes,
        secret:
          signatureVariant === "wrong_secret" ? "whsec_wrong_secret" : secret,
        timestamp,
        scheme: signatureVariant as Parameters<
          typeof generateStripeTestSignature
        >[0]["scheme"],
      }),
    };
  };
  const headers = sign(
    Buffer.from(raw),
    meta.signatureVariant as string | undefined,
  );
  if (String(meta.signatureVariant).includes("after_sign"))
    raw = mutateBytesAfterSignature(
      raw,
      meta.signatureVariant as Parameters<typeof mutateBytesAfterSignature>[1],
    );
  const body = Buffer.from(raw);
  if (variant.recipe === "bodyBytes")
    assert.equal(body.length, meta.targetSize);
  return {
    body,
    headers,
    next(type?: string, distinctId = false) {
      const obj = JSON.parse(raw);
      if (type) obj.type = type;
      if (distinctId) obj.id = `evt_${randomUUID().replaceAll("-", "")}`;
      const nextBody = Buffer.from(JSON.stringify(obj));
      return { body: nextBody, headers: sign(nextBody) };
    },
  };
}
