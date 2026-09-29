import { describe, it, expect } from "vitest";
import { dispatchRecipe } from "../src/recipe-dispatcher";
import { loadCorpus } from "../src/schema-validator";
import { setJsonPointer } from "../src/json-pointer";
import { injectRawJsonLexeme } from "../src/lexeme-generator";

describe("Recipe Dispatcher (Requirement: explicit dispatcher without eval)", () => {
  const corpus = loadCorpus();

  it("deletes only required fields belonging to the requested target", () => {
    const variants = dispatchRecipe(
      "deleteRequired",
      {
        fields: {
          "cart.add": ["quantity"],
          "admin.product": ["sku", "price"],
        },
      },
      corpus.fixtures.cart,
      "cart.add",
    );
    expect(variants).toHaveLength(1);
    expect(variants[0].payload).not.toHaveProperty("quantity");
    expect(variants[0].metadata?.targetKey).toBe("cart.add");
  });

  it("generates replayable signature bytes independent of the system clock", () => {
    const args = { variants: ["valid", "wrong_secret"] };
    const first = dispatchRecipe(
      "stripeSignature",
      args,
      corpus.fixtures.stripe,
    );
    expect(
      dispatchRecipe("stripeSignature", args, corpus.fixtures.stripe),
    ).toEqual(first);
  });

  it("expands only the requested target across every numeric encoding", () => {
    const variants = dispatchRecipe(
      "integerLexemes",
      {
        paths: { "cart.add": "/quantity", "admin.product": "/stock" },
        encodings: ["numeric_token", "numeric_string"],
        lexemes: ["18446744073709551615"],
      },
      corpus.fixtures.cart,
      "cart.add",
    );
    expect(variants).toHaveLength(2);
    expect(variants[0].metadata?.unrepresentable).toBe(true);
    expect(variants[0].payload).toBeNull();
    expect(variants[1].payload).toHaveProperty(
      "quantity",
      "18446744073709551615",
    );
    expect(variants.every((v) => v.metadata?.targetPath === "/quantity")).toBe(
      true,
    );
  });

  it("constructs exact whole-body byte sizes for encodings and delivery modes", () => {
    const variants = dispatchRecipe(
      "bodyBytes",
      {
        offsets: [-1, 0, 1],
        encodings: ["ascii", "thai", "emoji"],
        delivery: ["normal", "chunked", "missingContentLength"],
      },
      corpus.fixtures.generic,
      "api.json",
    );
    expect(variants).toHaveLength(27);
    for (const v of variants) {
      expect(Buffer.byteLength(v.rawPayload!)).toBe(
        1048576 + Number(v.metadata?.offset),
      );
      expect(v.headers?.["content-length"]).toBe(
        v.metadata?.delivery === "normal"
          ? String(v.metadata?.actualSize)
          : undefined,
      );
    }
  });

  it("keeps prototype payloads as own data without mutating the harness prototype", () => {
    const object = {};
    setJsonPointer(object, "/__proto__/isAdmin", true);
    expect(Object.getPrototypeOf(object)).toBe(Object.prototype);
    expect(Object.hasOwn(object, "__proto__")).toBe(true);
    expect(({} as { isAdmin?: boolean }).isAdmin).toBeUndefined();
    const injected = injectRawJsonLexeme(
      {},
      "/constructor/prototype/isAdmin",
      "true",
    );
    expect(JSON.parse(injected.rawText).constructor.prototype.isAdmin).toBe(
      true,
    );
    expect(({} as { isAdmin?: boolean }).isAdmin).toBeUndefined();
  });

  it("preserves escaped JSON pointer keys and literal replacement metacharacters", () => {
    const result = injectRawJsonLexeme({}, "/a~1b/~0token", '"$&"');
    expect(JSON.parse(result.rawText)).toEqual({ "a/b": { "~token": "$&" } });
    expect(() => setJsonPointer({}, "/bad~2escape", 1)).toThrow();
  });

  it("leaves native Server Action body sizing to the actual serializer", () => {
    const [v] = dispatchRecipe(
      "actionBodyBytes",
      { bytes: 4194305 },
      corpus.fixtures.product,
    );
    expect(v.rawPayload).toBeUndefined();
    expect(v.metadata?.requiresNativeSerialization).toBe(true);
  });

  it("handles integerLexemes preserving 64-bit numbers without Number() coercion", () => {
    const baseline = corpus.fixtures["cart"];
    const variants = dispatchRecipe(
      "integerLexemes",
      {
        paths: { "cart.add": "/quantity" },
        lexemes: [
          "18446744073709551615",
          "9223372036854775807",
          "-9223372036854775808",
        ],
      },
      baseline,
    );

    expect(variants).toHaveLength(3);
    const rawUint64 = variants[0].rawPayload?.toString("utf8");
    expect(rawUint64).toContain("18446744073709551615");
    // Ensure it didn't round to 18446744073709552000
    expect(rawUint64).not.toContain("18446744073709552000");
  });

  it("handles nativeValues distinct from null", () => {
    const baseline = corpus.fixtures["amount"];
    const variants = dispatchRecipe(
      "nativeValues",
      {
        path: "/amountSatang",
        names: ["NaN", "Infinity", "-Infinity"],
      },
      baseline,
    );

    expect(variants).toHaveLength(3);
    expect(Number.isNaN((variants[0].payload as any).amountSatang)).toBe(true);
    expect((variants[1].payload as any).amountSatang).toBe(Infinity);
    expect((variants[2].payload as any).amountSatang).toBe(-Infinity);
  });

  it("handles decimalConversion with exact expectedSatang strings", () => {
    const variants = dispatchRecipe(
      "decimalConversion",
      {
        variants: [
          { input: "0.10", expectedSatang: "10" },
          { input: "9999999999.99", expectedSatang: "999999999999" },
        ],
      },
      {},
    );

    expect(variants).toHaveLength(2);
    expect(variants[0].metadata?.expectedSatang).toBe("10");
    expect(variants[1].metadata?.expectedSatang).toBe("999999999999");
  });

  it("handles nestedJson depth calculation accurately", () => {
    const variants = dispatchRecipe(
      "nestedJson",
      {
        depths: [33, 100],
        rootDepth: 1,
      },
      {},
    );

    expect(variants).toHaveLength(2);
    const depth33 = variants[0]?.rawPayload?.toString("utf8");
    expect((depth33?.split('{"x":').length ?? 1) - 1).toBe(33);
  });

  it("handles stringLength with code-point vs ASCII units", () => {
    const baseline = corpus.fixtures["product"];
    const variants = dispatchRecipe(
      "stringLength",
      {
        lengths: [10],
        fill: "🚗",
        unit: "unicode_code_points",
        path: "/name",
      },
      baseline,
    );

    expect(variants).toHaveLength(1);
    const nameVal = (variants[0].payload as any).name;
    expect(Array.from(nameVal)).toHaveLength(10);
    // 10 emoji code points = 20 UTF-16 units and 40 UTF-8 bytes
    expect(nameVal.length).toBe(20);
    expect(Buffer.byteLength(nameVal, "utf8")).toBe(40);
  });

  it("handles stripeSignature with after_sign byte mutation without re-signing", () => {
    const baseline = corpus.fixtures["stripe"];
    const variants = dispatchRecipe(
      "stripeSignature",
      {
        variants: ["valid", "space_after_sign", "newline_after_sign"],
      },
      baseline,
    );

    expect(variants).toHaveLength(3);
    expect(variants[0].headers?.["stripe-signature"]).toBeDefined();
    expect(variants[1].rawPayload?.toString("utf8").endsWith(" ")).toBe(true);
    expect(variants[2].rawPayload?.toString("utf8").endsWith("\n")).toBe(true);
  });

  it("handles guestToken minting and cookie-only variant", () => {
    const baseline = corpus.fixtures["guest"];
    const variants = dispatchRecipe(
      "guestToken",
      {
        variants: [
          "valid_parameter",
          "valid_cookie_only",
          "length_63",
          "missing",
        ],
      },
      baseline,
    );

    expect(variants).toHaveLength(4);
    expect((variants[0].payload as any).guestToken).toHaveLength(64);
    expect((variants[1].payload as any).guestToken).toBeUndefined();
    expect(variants[1].headers?.cookie).toContain("guest_order_");
    expect((variants[2].payload as any).guestToken).toHaveLength(63);
    expect((variants[3].payload as any).guestToken).toBeUndefined();
  });
});
