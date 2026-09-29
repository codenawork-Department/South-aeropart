import crypto from "crypto";
import { setJsonPointer } from "./json-pointer";
import { injectRawJsonLexeme, getNativeNonfinite } from "./lexeme-generator";
import {
  buildStringOfLength,
  buildUtf8BytesString,
  spliceRawBytesIntoJsonString,
} from "./unicode-helpers";
import {
  generateStripeTestSignature,
  mutateBytesAfterSignature,
} from "./stripe-test-signer";
import {
  DEFAULT_FROZEN_SECONDS,
  GUEST_TOKEN_TTL_SECONDS,
} from "./clock-controller";

export interface RecipeResultVariant {
  variantKey: string;
  payload: unknown;
  rawPayload?: string | Buffer;
  headers?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export type RecipeHandler = (
  args: Record<string, unknown>,
  baselineFixture: any,
  currentTarget?: string,
) => RecipeResultVariant[];

/**
 * Explicit recipe dispatcher without eval or new Function (Requirement: explicit dispatcher).
 */
export const recipeHandlers: Record<string, RecipeHandler> = {
  integerLexemes(args, baselineFixture, currentTarget) {
    const lexemes = (args.lexemes as string[]) || [];
    const paths = (args.paths as Record<string, string>) || {};
    const variants: RecipeResultVariant[] = [];

    const encodings = (args.encodings as string[]) || ["numeric_token"];
    const relevant = currentTarget
      ? Object.entries(paths).filter(([key]) => key === currentTarget)
      : Object.entries(paths);
    for (const lexeme of lexemes) {
      for (const [targetKey, targetPath] of relevant) {
        for (const encoding of encodings) {
          const token =
            encoding === "numeric_string" ? JSON.stringify(lexeme) : lexeme;
          const { rawText, rawBytes } = injectRawJsonLexeme(
            baselineFixture.input || baselineFixture,
            targetPath,
            token,
          );
          const unrepresentable =
            encoding === "numeric_token" &&
            (BigInt(lexeme) > BigInt(Number.MAX_SAFE_INTEGER) ||
              BigInt(lexeme) < BigInt(Number.MIN_SAFE_INTEGER));
          variants.push({
            variantKey: `${targetKey}:${encoding}:${lexeme}`,
            payload: unrepresentable ? null : JSON.parse(rawText),
            rawPayload: rawBytes,
            metadata: {
              targetKey,
              targetPath,
              lexeme,
              encoding,
              unrepresentable,
            },
          });
        }
      }
    }
    return variants;
  },

  fieldValuesByTarget(args, baselineFixture, currentTarget) {
    const values = (args.values as unknown[]) || [];
    const paths = (args.paths as Record<string, string>) || {};
    const variants: RecipeResultVariant[] = [];

    // If currentTarget is specified and has a defined path, only generate for that target
    const relevantEntries = currentTarget
      ? Object.entries(paths).filter(([key]) => key === currentTarget)
      : Object.entries(paths);

    for (let idx = 0; idx < values.length; idx++) {
      const val = values[idx];
      for (const [targetKey, targetPath] of relevantEntries) {
        const clone = JSON.parse(
          JSON.stringify(baselineFixture.input || baselineFixture),
        );
        setJsonPointer(clone, targetPath, val);

        variants.push({
          variantKey: `${targetKey}:val_${idx}`,
          payload: clone,
          metadata: { targetKey, targetPath, value: val },
        });
      }
    }
    return variants;
  },

  nativeValues(args, baselineFixture) {
    const names = (args.names as Array<"NaN" | "Infinity" | "-Infinity">) || [];
    const targetPath = (args.path as string) || "/amountSatang";
    const variants: RecipeResultVariant[] = [];

    for (const name of names) {
      const nativeVal = getNativeNonfinite(name);
      const clone = JSON.parse(
        JSON.stringify(baselineFixture.input || baselineFixture),
      );
      setJsonPointer(clone, targetPath, nativeVal);

      variants.push({
        variantKey: `native_${name}`,
        payload: clone,
        metadata: { name, nativeVal, targetPath },
      });
    }
    return variants;
  },

  stockArithmetic(args, baselineFixture) {
    const items =
      (args.variants as Array<{ stockBefore: number; delta: number }>) || [];
    return items.map((v, i) => ({
      variantKey: `stock_before_${v.stockBefore}_delta_${v.delta}`,
      payload: { ...baselineFixture.input, delta: v.delta },
      metadata: { stockBefore: v.stockBefore, delta: v.delta },
    }));
  },

  decimalConversion(args) {
    const items =
      (args.variants as Array<{ input: string; expectedSatang: string }>) || [];
    return items.map((v) => ({
      variantKey: `convert_${v.input}`,
      payload: { amount: v.input },
      metadata: { input: v.input, expectedSatang: v.expectedSatang },
    }));
  },

  clientPriceTamper(args, baselineFixture) {
    const unitPrices = (args.unitPrices as string[]) || [];
    const productNames = (args.productNames as string[]) || ["Changed title"];
    const variants: RecipeResultVariant[] = [];

    for (const unitPrice of unitPrices) {
      for (const name of productNames) {
        const clone = JSON.parse(
          JSON.stringify(baselineFixture.input || baselineFixture),
        );
        if (clone.items && clone.items[0]) {
          clone.items[0].unitPrice = unitPrice;
          clone.items[0].productName = name;
        }
        variants.push({
          variantKey: `tamper_price_${unitPrice}_name_${name}`,
          payload: clone,
          metadata: { unitPrice, productName: name },
        });
      }
    }
    return variants;
  },

  duplicateLineDemand(args, baselineFixture) {
    const lines = (args.lines as Array<{ quantity: number }>) || [];
    const clone = JSON.parse(
      JSON.stringify(baselineFixture.input || baselineFixture),
    );
    const baseItem = clone.items?.[0] || {
      productId: "10000000-0000-4000-8000-000000000001",
      productName: "QA Product",
      unitPrice: "100.00",
    };

    clone.items = lines.map((line) => ({
      ...baseItem,
      quantity: line.quantity,
    }));

    return [
      {
        variantKey: `duplicate_lines_${lines.map((l) => l.quantity).join("_")}`,
        payload: clone,
        metadata: { lines, stockBefore: args.stockBefore },
      },
    ];
  },

  moneyArithmetic(args) {
    const items = (args.variants as Array<Record<string, unknown>>) || [];
    return items.map((v, i) => ({
      variantKey: `money_arith_${i}`,
      payload: v,
      metadata: v,
    }));
  },

  checkoutItems(args, baselineFixture) {
    const variantsList = (args.variants as string[]) || [];
    const results: RecipeResultVariant[] = [];

    for (const v of variantsList) {
      const clone = JSON.parse(
        JSON.stringify(baselineFixture.input || baselineFixture),
      );
      if (v === "null") clone.items = null;
      else if (v === "object") clone.items = { invalid: true };
      else if (v === "string") clone.items = "invalid_string";
      else if (v === "empty_array") clone.items = [];
      else if (v === "array_with_null") clone.items = [null];
      else if (v === "array_with_scalar") clone.items = [123];
      else if (v === "101_valid_items") {
        clone.items = Array.from({ length: 101 }, (_, i) => ({
          productId: `10000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
          productName: `Item ${i}`,
          quantity: 1,
          unitPrice: "10.00",
        }));
      } else if (v === "100_valid_distinct_items") {
        clone.items = Array.from({ length: 100 }, (_, i) => ({
          productId: `10000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
          productName: `Item ${i}`,
          quantity: 1,
          unitPrice: "10.00",
        }));
      }

      results.push({
        variantKey: `items_${v}`,
        payload: clone,
        metadata: { itemVariant: v },
      });
    }
    return results;
  },

  deleteRequired(args, baselineFixture, currentTarget) {
    const fields = (args.fields as Record<string, string[]>) || {};
    const results: RecipeResultVariant[] = [];

    for (const [targetKey, fieldList] of Object.entries(fields)) {
      if (currentTarget && targetKey !== currentTarget) continue;
      for (const field of fieldList) {
        const clone = JSON.parse(
          JSON.stringify(baselineFixture.input || baselineFixture),
        );
        delete clone[field];
        results.push({
          variantKey: `${targetKey}:delete_${field}`,
          payload: clone,
          metadata: { targetKey, deletedField: field },
        });
      }
    }
    return results;
  },

  mergeUnknown(args, baselineFixture) {
    const objects = (args.objects as Array<Record<string, unknown>>) || [];
    return objects.map((extra, idx) => {
      const clone = JSON.parse(
        JSON.stringify(baselineFixture.input || baselineFixture),
      );
      // Preserve dangerous keys as own data properties without invoking setters.
      for (const [k, v] of Object.entries(extra)) {
        Object.defineProperty(clone, k, {
          value: v,
          enumerable: true,
          writable: true,
          configurable: true,
        });
      }
      return {
        variantKey: `unknown_${idx}_${Object.keys(extra).join("_")}`,
        payload: clone,
        metadata: { extra },
      };
    });
  },

  prototypeNested(args, baselineFixture) {
    const rawObjects = (args.rawObjects as string[]) || [];
    const targetPath = (args.path as string) || "/description";
    return rawObjects.map((rawObj, idx) => {
      const clone = JSON.parse(
        JSON.stringify(baselineFixture.input || baselineFixture),
      );
      const nested = JSON.parse(rawObj);
      setJsonPointer(clone, targetPath, nested);
      return {
        variantKey: `proto_nested_${idx}`,
        payload: clone,
        rawPayload: Buffer.from(JSON.stringify(clone), "utf8"),
        metadata: { rawObj, targetPath },
      };
    });
  },

  nestedJson(args) {
    const depths = (args.depths as number[]) || [33, 100];
    return depths.map((depth) => {
      let current = "1";
      for (let i = 0; i < depth; i++) {
        current = `{"x":${current}}`;
      }
      return {
        variantKey: `depth_${depth}`,
        payload: { depth },
        rawPayload: Buffer.from(current, "utf8"),
        metadata: { depth, rootDepth: args.rootDepth },
      };
    });
  },

  bodyBytes(args, baselineFixture, currentTarget) {
    const offsets = (args.offsets as number[]) || [1];
    const encodings = (args.encodings as string[]) || ["ascii"];
    const deliveries = (args.delivery as string[]) || ["normal"];
    const results: RecipeResultVariant[] = [];
    for (const offset of offsets)
      for (const encoding of encodings)
        for (const delivery of deliveries) {
          const targetSize = 1048576 + offset;
          const clone = JSON.parse(
            JSON.stringify(baselineFixture.input || baselineFixture),
          );
          const paddingContainer =
            currentTarget === "stripe.webhook" ? clone.data.object : clone;
          paddingContainer.metadata = {
            ...paddingContainer.metadata,
            qa_padding: "",
          };
          const overhead = Buffer.byteLength(JSON.stringify(clone), "utf8");
          const fill =
            encoding === "thai" ? "ก" : encoding === "emoji" ? "🚗" : "A";
          paddingContainer.metadata.qa_padding = buildUtf8BytesString(
            fill,
            targetSize - overhead,
          );
          const rawPayload = Buffer.from(JSON.stringify(clone), "utf8");
          if (rawPayload.length !== targetSize)
            throw new Error("Exact body byte construction failed");
          const headers: Record<string, string> =
            delivery === "normal"
              ? { "content-length": String(rawPayload.length) }
              : {};
          if (currentTarget === "stripe.webhook")
            headers["stripe-signature"] = generateStripeTestSignature({
              payload: rawPayload,
            });
          results.push({
            variantKey: "bytes_" + offset + "_" + encoding + "_" + delivery,
            payload: clone,
            rawPayload,
            headers,
            metadata: {
              targetSize,
              actualSize: rawPayload.length,
              offset,
              encoding,
              delivery,
            },
          });
        }
    return results;
  },

  actionBodyBytes(args, baselineFixture) {
    const bytesTarget = (args.bytes as number) || 4194305;
    const field = (args.field as string) || "description";
    const clone = JSON.parse(
      JSON.stringify(baselineFixture.input || baselineFixture),
    );

    // Multipart/RSC serialization overhead is framework-specific. The native
    // transport must measure and pad its request; a JSON estimate is not evidence.
    return [
      {
        variantKey: `action_body_${bytesTarget}`,
        payload: clone,
        metadata: { bytesTarget, field, requiresNativeSerialization: true },
      },
    ];
  },

  headers(args) {
    const variants = (args.variants as Array<Record<string, string>>) || [];
    const bodyStr = (args.body as string) || '{"quantity":1,"label":"QA"}';
    return variants.map((hdr, idx) => ({
      variantKey: `hdr_${idx}_${hdr["content-type"] || "unknown"}`,
      payload: bodyStr,
      rawPayload: Buffer.from(bodyStr, "utf8"),
      headers: hdr,
      metadata: { headers: hdr },
    }));
  },

  rawBytes(args, baselineFixture) {
    const hexList = (args.hex as string[]) || [];
    const baseJson = JSON.stringify(baselineFixture.input || baselineFixture);
    return hexList.map((hex) => {
      const splicedBuffer = spliceRawBytesIntoJsonString(
        baseJson,
        "label",
        hex,
      );
      return {
        variantKey: `raw_hex_${hex}`,
        payload: { hex },
        rawPayload: splicedBuffer,
        metadata: { hex, splicedLength: splicedBuffer.length },
      };
    });
  },

  stringLength(args, baselineFixture) {
    const lengths = (args.lengths as number[]) || [];
    const fill = (args.fill as string) || "A";
    const extra = (args.extra as string[]) || [];
    const unit = (args.unit as "unicode_code_points" | "ascii") || "ascii";
    const targetPath = (args.path as string) || "/sku";
    const results: RecipeResultVariant[] = [];

    for (const len of lengths) {
      const strVal = buildStringOfLength(fill, len, unit);
      const clone = JSON.parse(
        JSON.stringify(baselineFixture.input || baselineFixture),
      );
      setJsonPointer(clone, targetPath, strVal);

      results.push({
        variantKey: `len_${len}_fill_${fill.slice(0, 2)}`,
        payload: clone,
        metadata: { len, fill, unit, targetPath },
      });
    }

    for (const ext of extra) {
      const clone = JSON.parse(
        JSON.stringify(baselineFixture.input || baselineFixture),
      );
      setJsonPointer(clone, targetPath, ext);
      results.push({
        variantKey: `extra_${Buffer.from(ext).toString("hex")}`,
        payload: clone,
        metadata: { extra: ext, targetPath },
      });
    }

    return results;
  },

  utf8FieldBytes(args, baselineFixture) {
    const sizes = (args.sizes as number[]) || [];
    const fill = (args.fill as string) || "A";
    const targetPath = (args.path as string) || "/description";

    return sizes.map((size) => {
      const generated = buildUtf8BytesString(fill, size);
      const clone = JSON.parse(
        JSON.stringify(baselineFixture.input || baselineFixture),
      );
      setJsonPointer(clone, targetPath, generated);

      return {
        variantKey: `utf8_bytes_${size}`,
        payload: clone,
        metadata: {
          targetBytes: size,
          actualBytes: Buffer.byteLength(generated, "utf8"),
        },
      };
    });
  },

  escapedUnicode(args, baselineFixture) {
    const tokens = (args.jsonStringTokens as string[]) || [];
    const targetPath = (args.path as string) || "/name";

    return tokens.map((token, idx) => {
      const baseObj = baselineFixture.input || baselineFixture;
      const { rawText, rawBytes } = injectRawJsonLexeme(
        baseObj,
        targetPath,
        token,
      );
      return {
        variantKey: `token_${idx}`,
        payload: JSON.parse(rawText),
        rawPayload: rawBytes,
        metadata: { token, targetPath },
      };
    });
  },

  noteContract(args) {
    const variantsList = (args.variants as Array<any>) || [];
    return variantsList.map((v, idx) => {
      let noteValue = "";
      if (v.kind === "length") {
        noteValue = "A".repeat(v.bytes);
      } else if (v.kind === "value") {
        noteValue = v.value;
      }
      return {
        variantKey: `note_${idx}_${v.kind}`,
        payload: { note: noteValue },
        metadata: v,
      };
    });
  },

  duplicateSku(args, baselineFixture) {
    const existing = (args.existing as string) || "QA-SKU-001";
    const candidate = (args.candidate as string) || "QA-SKU-001";
    const clone = JSON.parse(
      JSON.stringify(baselineFixture.input || baselineFixture),
    );
    clone.sku = candidate;

    return [
      {
        variantKey: `dup_sku_${candidate}`,
        payload: clone,
        metadata: { existing, candidate },
      },
    ];
  },

  guestToken(args, baselineFixture) {
    const variantsList = (args.variants as string[]) || [];
    const secret = "ORDER_TOKEN_SECRET_FOR_QA_TESTING_EXACT_32_BYTES";
    const orderId =
      baselineFixture.input?.orderId || "20000000-0000-4000-8000-000000000002";
    const userId = baselineFixture.userId || "guest_qa";
    const createdAt = baselineFixture.createdAt || "2026-09-24T00:00:00.000Z";

    const validToken = crypto
      .createHmac("sha256", secret)
      .update(`guest_order:${orderId}:${userId}:${createdAt}`)
      .digest("hex");

    return variantsList.map((v) => {
      let token: any = validToken;
      let cookieOnly = false;

      if (v === "missing") token = undefined;
      else if (v === "null") token = null;
      else if (v === "array") token = [validToken];
      else if (v === "object") token = { token: validToken };
      else if (v === "empty") token = "";
      else if (v === "length_63") token = validToken.slice(0, 63);
      else if (v === "length_65") token = validToken + "a";
      else if (v === "non_hex_64") token = validToken.slice(0, 63) + "z";
      else if (v === "uppercase_valid") token = validToken.toUpperCase();
      else if (v === "one_char_changed")
        token = (validToken[0] === "a" ? "b" : "a") + validToken.slice(1);
      else if (v === "leading_space") token = " " + validToken;
      else if (v === "trailing_newline") token = validToken + "\n";
      else if (v === "embedded_nul")
        token = validToken.slice(0, 32) + "\0" + validToken.slice(33);
      else if (v === "base64_instead_of_hex")
        token = Buffer.from(validToken, "hex").toString("base64");
      else if (v === "jwt_instead_of_hmac")
        token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ID";
      else if (v === "valid_parameter") token = validToken;
      else if (v === "valid_cookie_only") {
        token = undefined;
        cookieOnly = true;
      }

      const headers: Record<string, string> = {};
      if (cookieOnly) {
        headers["cookie"] = `guest_order_${orderId}=${validToken}`;
      }

      return {
        variantKey: `token_${v}`,
        payload: { orderId, guestToken: token },
        headers,
        metadata: { tokenVariant: v, validToken, isCookieOnly: cookieOnly },
      };
    });
  },

  guestOwnership(args, baselineFixture) {
    const variantsList = (args.variants as string[]) || [];
    const validToken =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    return variantsList.map((v) => ({
      variantKey: `ownership_${v}`,
      payload: {
        orderId: v.includes("nonexistent")
          ? "20000000-0000-4000-8000-999999999999"
          : baselineFixture.input?.orderId,
        guestToken: validToken,
      },
      metadata: { ownershipVariant: v },
    }));
  },

  guestClock(args, baselineFixture) {
    const ageSeconds = (args.ageSeconds as number[]) || [];
    const creationValues = (args.creationValues as string[]) || [];
    const results: RecipeResultVariant[] = [];
    const secret = "ORDER_TOKEN_SECRET_FOR_QA_TESTING_EXACT_32_BYTES";
    const orderId =
      baselineFixture.input?.orderId || "20000000-0000-4000-8000-000000000002";
    const userId = baselineFixture.userId || "guest_qa";
    const baseEpochSeconds = DEFAULT_FROZEN_SECONDS;

    for (const age of ageSeconds) {
      const orderCreatedAt = new Date(
        (baseEpochSeconds - age) * 1000,
      ).toISOString();
      const token = crypto
        .createHmac("sha256", secret)
        .update(`guest_order:${orderId}:${userId}:${orderCreatedAt}`)
        .digest("hex");

      results.push({
        variantKey: `age_${age}s`,
        payload: { orderId, guestToken: token },
        metadata: {
          ageSeconds: age,
          isExpired: age >= GUEST_TOKEN_TTL_SECONDS,
          orderCreatedAt,
          userId,
        },
      });
    }

    for (const cv of creationValues) {
      const orderCreatedAt =
        cv === "future"
          ? new Date((baseEpochSeconds + 3600) * 1000).toISOString()
          : cv === "past"
            ? new Date((baseEpochSeconds - 86400 * 30) * 1000).toISOString()
            : cv;

      const token = crypto
        .createHmac("sha256", secret)
        .update(`guest_order:${orderId}:${userId}:${orderCreatedAt}`)
        .digest("hex");

      results.push({
        variantKey: `creation_val_${cv}`,
        payload: { orderId, guestToken: token },
        metadata: { creationValue: cv, orderCreatedAt, userId },
      });
    }

    return results;
  },

  stripeSignature(args, baselineFixture) {
    const variantsList = (args.variants as string[]) || [];
    const rawBody = JSON.stringify(baselineFixture.input || baselineFixture);
    return variantsList.map((v) => {
      let finalBody = rawBody;
      let signature = "";

      if (v.includes("after_sign")) {
        // Sign first, then mutate bytes
        signature = generateStripeTestSignature({ payload: rawBody });
        finalBody = mutateBytesAfterSignature(rawBody, v as any);
      } else {
        const scheme = (v === "missing" ? undefined : v) as any;
        signature =
          v === "missing" || v === "empty"
            ? ""
            : generateStripeTestSignature({
                payload: rawBody,
                scheme,
                secret:
                  v === "wrong_secret"
                    ? "whsec_intentionally_wrong_fixture_secret"
                    : undefined,
              });
      }

      const headers: Record<string, string> = {};
      if (signature || v === "empty") {
        headers["stripe-signature"] = signature;
      }

      return {
        variantKey: `sig_${v}`,
        payload: finalBody,
        rawPayload: Buffer.from(finalBody, "utf8"),
        headers,
        metadata: { signatureVariant: v, signature },
      };
    });
  },

  stripeTime(args, baselineFixture) {
    const offsets = (args.headerOffsetsSeconds as number[]) || [];
    const eventOffset = (args.eventCreatedOffsetSeconds as number) || 0;
    const rawObj = JSON.parse(
      JSON.stringify(baselineFixture.input || baselineFixture),
    );
    rawObj.created = DEFAULT_FROZEN_SECONDS + eventOffset;
    const rawBody = JSON.stringify(rawObj);

    return offsets.map((off) => {
      const headerTimestamp = DEFAULT_FROZEN_SECONDS + off;
      const signature = generateStripeTestSignature({
        payload: rawBody,
        timestamp: headerTimestamp,
      });

      return {
        variantKey: `time_off_${off}s`,
        payload: rawObj,
        rawPayload: Buffer.from(rawBody, "utf8"),
        headers: { "stripe-signature": signature },
        metadata: {
          headerOffset: off,
          eventCreatedOffset: eventOffset,
          headerTimestamp,
          freezeSeconds: DEFAULT_FROZEN_SECONDS,
        },
      };
    });
  },

  stripeHeaderLexemes(args, baselineFixture) {
    const timestamps = (args.timestamps as string[]) || [];
    const rawBody = JSON.stringify(baselineFixture.input || baselineFixture);

    return timestamps.map((tsLexeme) => {
      // Direct HMAC over timestamp lexeme + "." + rawBody
      const signedPayload = `${tsLexeme}.${rawBody}`;
      const digest = crypto
        .createHmac(
          "sha256",
          "whsec_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        )
        .update(signedPayload)
        .digest("hex");
      const signature = `t=${tsLexeme},v1=${digest}`;

      return {
        variantKey: `ts_lexeme_${tsLexeme}`,
        payload: rawBody,
        rawPayload: Buffer.from(rawBody, "utf8"),
        headers: { "stripe-signature": signature },
        metadata: { tsLexeme, signature },
      };
    });
  },

  stripeMalformed(args, baselineFixture) {
    const variantsList = (args.variants as string[]) || [];
    return variantsList.map((v) => {
      let malformedBody = "";
      if (v === "invalid_json") malformedBody = "{invalid_json:";
      else if (v === "null_root") malformedBody = "null";
      else if (v === "array_root") malformedBody = "[]";
      else {
        const clone = JSON.parse(
          JSON.stringify(baselineFixture.input || baselineFixture),
        );
        if (v === "missing_data") delete clone.data;
        else if (v === "data_null") clone.data = null;
        else if (v === "object_array") clone.data.object = [];
        else if (v === "missing_type") delete clone.type;
        else if (v === "type_array") clone.type = [];
        else if (v === "missing_id") delete clone.id;
        else if (v === "id_object") clone.id = {};
        malformedBody = JSON.stringify(clone);
      }

      const signature = generateStripeTestSignature({ payload: malformedBody });
      return {
        variantKey: `malformed_${v}`,
        payload: malformedBody,
        rawPayload: Buffer.from(malformedBody, "utf8"),
        headers: { "stripe-signature": signature },
        metadata: { malformedVariant: v },
      };
    });
  },

  stripeEventCreated(args, baselineFixture) {
    const values = (args.values as unknown[]) || [];
    return values.map((val, idx) => {
      const clone = JSON.parse(
        JSON.stringify(baselineFixture.input || baselineFixture),
      );
      clone.created = val;
      const rawBody = JSON.stringify(clone);
      const signature = generateStripeTestSignature({ payload: rawBody });
      return {
        variantKey: `created_val_${idx}`,
        payload: clone,
        rawPayload: Buffer.from(rawBody, "utf8"),
        headers: { "stripe-signature": signature },
        metadata: { createdValue: val },
      };
    });
  },

  stripeBinding(args, baselineFixture) {
    const variantsList = (args.variants as string[]) || [];
    return variantsList.map((v) => {
      const clone = JSON.parse(
        JSON.stringify(baselineFixture.input || baselineFixture),
      );
      if (v === "other_payment_intent")
        clone.data.object.id = "pi_other_unbound_999";
      else if (v === "other_order_metadata")
        clone.data.object.metadata.orderId =
          "20000000-0000-4000-8000-999999999999";
      else if (v === "event_livemode_true") clone.livemode = true;
      else if (v === "intent_livemode_true") clone.data.object.livemode = true;
      else if (v === "foreign_account") clone.account = "acct_foreign_123";
      else if (v === "invalid_order_uuid")
        clone.data.object.metadata.orderId = "not-a-uuid";

      const rawBody = JSON.stringify(clone);
      const signature = generateStripeTestSignature({ payload: rawBody });
      return {
        variantKey: `binding_${v}`,
        payload: clone,
        rawPayload: Buffer.from(rawBody, "utf8"),
        headers: { "stripe-signature": signature },
        metadata: { bindingVariant: v },
      };
    });
  },

  stripeDuplicates(args, baselineFixture) {
    const variantsList = (args.variants as string[]) || [];
    const concurrency = (args.concurrency as number) || 1;
    const rawBody = JSON.stringify(baselineFixture.input || baselineFixture);
    const signature = generateStripeTestSignature({ payload: rawBody });

    return variantsList.map((v) => ({
      variantKey: `dup_${v}_conc_${concurrency}`,
      payload: rawBody,
      rawPayload: Buffer.from(rawBody, "utf8"),
      headers: { "stripe-signature": signature },
      metadata: { duplicateVariant: v, concurrency, barrier: args.barrier },
    }));
  },

  stripeSequence(args, baselineFixture) {
    const events = (args.events as string[]) || [];
    return [
      {
        variantKey: `sequence_${events.join("_then_")}`,
        payload: { events },
        metadata: { events, freshSignatureEach: args.freshSignatureEach },
      },
    ];
  },

  stripeExtensions(args, baselineFixture) {
    const variantsList = (args.variants as string[]) || [];
    return variantsList.map((v) => {
      const clone = JSON.parse(
        JSON.stringify(baselineFixture.input || baselineFixture),
      );
      if (v === "unhandled_type") clone.type = "customer.subscription.created";
      else if (v === "additional_event_field")
        clone.custom_extension = "custom_value";
      else if (v === "additional_payment_intent_field")
        clone.data.object.custom_intent_field = 12345;

      const rawBody = JSON.stringify(clone);
      const signature = generateStripeTestSignature({ payload: rawBody });
      return {
        variantKey: `ext_${v}`,
        payload: clone,
        rawPayload: Buffer.from(rawBody, "utf8"),
        headers: { "stripe-signature": signature },
        metadata: { extensionVariant: v },
      };
    });
  },

  stripePrototype(args, baselineFixture) {
    const rawExtension =
      (args.rawExtension as string) || '"__proto__":{"isAdmin":true}';
    const baseJson = JSON.stringify(baselineFixture.input || baselineFixture);
    // Insert rawExtension as own key in JSON
    const insertPoint = baseJson.lastIndexOf("}");
    const rawBody = baseJson.slice(0, insertPoint) + `,${rawExtension}}`;
    const signature = generateStripeTestSignature({ payload: rawBody });

    return [
      {
        variantKey: "stripe_proto_pollution",
        payload: rawBody,
        rawPayload: Buffer.from(rawBody, "utf8"),
        headers: { "stripe-signature": signature },
        metadata: { rawExtension },
      },
    ];
  },

  fault(args, baselineFixture) {
    const at = (args.at as string) || "product_write";
    const sentinel = (args.sentinel as string) || "QA_FAULT_SENTINEL";
    return [
      {
        variantKey: `fault_at_${at}`,
        payload: baselineFixture.input || baselineFixture,
        metadata: { at, sentinel, recoverThenRetry: args.recoverThenRetry },
      },
    ];
  },

  stripeLatePayment(args, baselineFixture) {
    const states = (args.states as string[]) || ["canceled"];
    return states.map((st) => ({
      variantKey: `late_pay_${st}`,
      payload: baselineFixture.input || baselineFixture,
      metadata: { state: st, resolution: args.resolution },
    }));
  },

  auth(args, baselineFixture) {
    const identities = (args.identities as string[]) || [];
    return identities.map((id) => ({
      variantKey: `auth_identity_${id}`,
      payload: baselineFixture.input || baselineFixture,
      metadata: { identity: id, overrides: args.overrides },
    }));
  },

  origin(args, baselineFixture) {
    const variantsList = (args.variants as string[]) || [];
    return variantsList.map((v) => {
      const headers: Record<string, string> = {};
      if (v === "untrusted_origin") {
        headers["origin"] = "https://evil-attacker.example";
      } else {
        headers["x-forwarded-host"] = "forged.example";
      }

      return {
        variantKey: `origin_${v}`,
        payload: baselineFixture.input || baselineFixture,
        headers,
        metadata: { originVariant: v },
      };
    });
  },

  rateLimit(args, baselineFixture) {
    return [
      {
        variantKey: "rate_limit_probe",
        payload: baselineFixture.input || baselineFixture,
        metadata: {
          limitFixture: args.limitFixture,
          extraRequests: args.extraRequests,
        },
      },
    ];
  },

  checkoutRace(args, baselineFixture) {
    return [
      {
        variantKey: "checkout_stock_race",
        payload: baselineFixture.input || baselineFixture,
        metadata: {
          stockBefore: args.stockBefore,
          quantityEach: args.quantityEach,
          requests: args.requests,
          barrier: args.barrier,
          expectedStatuses: args.expectedStatuses,
        },
      },
    ];
  },
};

/**
 * Dispatches a recipe name and arguments, returning expanded variants without eval.
 */
export function dispatchRecipe(
  name: string,
  args: Record<string, unknown>,
  baselineFixture: unknown,
  currentTarget?: string,
): RecipeResultVariant[] {
  const handler = recipeHandlers[name];
  if (!handler) {
    throw new Error(`Unrecognized recipe name in corpus: "${name}"`);
  }
  return handler(args, baselineFixture, currentTarget);
}
