import { describe, it, expect } from "vitest";
import {
  MoneyConvertAdapter,
  exactSatang,
} from "../src/adapters/money-convert.adapter";
import {
  AmountValidateAdapter,
  ApiJsonAdapter,
  NoteContractAdapter,
} from "../src/adapters/unbound-contracts.adapter";
import { loadCorpus } from "../src/schema-validator";
import { expandCaseVariants, evaluateVariant } from "../src/execution-engine";
import { parseBoundedJson } from "../src/json-parser";
const corpus = loadCorpus();
const variant = (id: string) =>
  expandCaseVariants(
    corpus.cases.find((c) => c.id === id)!,
    corpus,
  )[0];
describe("Offline contract adapters", () => {
  it("checks exact satang using an independent decimal oracle", async () => {
    expect(exactSatang("9999999999.99")).toBe(999999999999n);
    expect(exactSatang("0.001")).toBeNull();
    expect(exactSatang(" 10 ")).toBeNull();
    const res = await new MoneyConvertAdapter().invoke(variant("N-22"));
    expect(res.rawResponse).toMatchObject({ satangResult: 10 });
    expect(res.invariantsChecked.INTEGER_EXACT).toBe(true);
  });
  it("rejecting fractions preserves the integer invariant", async () => {
    const v = {
      ...variant("N-09"),
      payload: { amountSatang: 0.30000000000000004, currency: "thb" },
    };
    const res = await new AmountValidateAdapter().invoke(v);
    expect(res.success).toBe(false);
    expect(res.invariantsChecked.INTEGER_EXACT).toBe(true);
    expect(res.wireStatus).toBeNull();
  });
  it("does not claim a note validator proved rendering safety", async () => {
    const res = await new NoteContractAdapter().invoke({
      ...variant("T-16"),
      payload: { note: "<script>marker</script>" },
    });
    expect(res.success).toBe(true);
    expect(res.invariantsChecked.PLAIN_TEXT).toBeUndefined();
    expect(
      evaluateVariant(
        variant("T-16"),
        corpus.cases.find((c) => c.id === "T-16")!,
        res,
      ).result,
    ).toBe("BLOCKED");
  });
  it("note rejects wrong types, NUL, lone surrogate and over-limit UTF8", async () => {
    for (const note of [[], {}, null, "x\0y", "\ud800", "ก".repeat(683)]) {
      const res = await new NoteContractAdapter().invoke({
        ...variant("T-15"),
        payload: { note },
      });
      expect(res.semanticStatus).toBe(422);
    }
  });
  it("valid JSON still requires the API field schema", async () => {
    const api = new ApiJsonAdapter();
    for (const raw of [
      "null",
      "[]",
      '{"quantity":"010","label":"QA"}',
      '{"quantity":1,"label":"QA","extra":1}',
    ]) {
      const res = await api.invoke({ ...variant("S-10"), rawPayload: raw });
      expect(res.semanticStatus).toBe(422);
      expect(res.wireStatus).toBeNull();
    }
    expect(
      (
        await api.invoke({
          ...variant("S-10"),
          rawPayload: '{"quantity":1e0,"label":"QA"}',
        })
      ).success,
    ).toBe(true);
  });
});
describe("Bounded JSON parser", () => {
  it("detects decoded duplicate keys in the same object", () => {
    for (const raw of ['{"a":1,"\\u0061":2}', '{"x":{"a":1,"a":2}}']) {
      expect(() => parseBoundedJson(Buffer.from(raw))).toThrow();
    }
    expect(parseBoundedJson(Buffer.from('{"x":{"a":1},"y":{"a":2}}'))).toEqual({
      x: { a: 1 },
      y: { a: 2 },
    });
  });
  it("ignores brackets and key-like text inside strings", () => {
    expect(
      parseBoundedJson(Buffer.from(JSON.stringify({ label: "{".repeat(100) }))),
    ).toEqual({ label: "{".repeat(100) });
  });
  it("has exact container-depth boundaries", () => {
    const body = (depth: number) =>
      Buffer.from('{"x":'.repeat(depth) + "1" + "}".repeat(depth));
    expect(() => parseBoundedJson(body(32))).not.toThrow();
    expect(() => parseBoundedJson(body(33))).toThrow();
  });
  it("distinguishes raw NUL, invalid UTF8, escaped NUL, and malformed numbers", () => {
    for (const raw of [
      Buffer.from('{"a":NaN}'),
      Buffer.from([0xc3, 0x28]),
      Buffer.from('{"a":"\0"}'),
    ])
      expect(() => parseBoundedJson(raw)).toThrow();
    expect(parseBoundedJson(Buffer.from('{"a":"\\u0000"}'))).toEqual({
      a: "\0",
    });
  });
  it("rejects escaped prototype keys and numeric overflow", () => {
    for (const raw of [
      '{"\\u005f_proto__":{}}',
      '{"constructor":{"prototype":{}}}',
      '{"quantity":1e309}',
      '{"quantity":18446744073709551615}',
    ])
      expect(() => parseBoundedJson(Buffer.from(raw))).toThrow();
  });
  it("enforces actual bytes, not Content-Length or character count", () => {
    const raw = Buffer.from(JSON.stringify({ x: "ก".repeat(400000) }));
    expect(() => parseBoundedJson(raw)).toThrow();
  });
});
