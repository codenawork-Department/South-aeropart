import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { loadCorpus } from "../src/schema-validator";
import { expandCaseVariants } from "../src/execution-engine";
import {
  guestArguments,
  guestCreationTime,
} from "../src/integration/guest-fixture";

const fixture = {
  orderId: "10000000-0000-4000-8000-000000000001",
  otherOrderId: "10000000-0000-4000-8000-000000000002",
  nonexistentOrderId: "10000000-0000-4000-8000-000000000003",
  userId: "guest_new_run",
  createdAt: "2026-09-27T00:00:00.000Z",
  nowMs: Date.parse("2026-09-27T00:01:00Z"),
  secret: "run-secret-not-the-offline-fixture-secret",
};
const corpus = loadCorpus();
const variants = corpus.cases
  .filter((c) => c.targets.includes("guest.track"))
  .flatMap((c) => expandCaseVariants(c, corpus));
const find = (key: string) => variants.find((v) => v.variantKey === key)!;

describe("Native Guest fixture fidelity", () => {
  it("retains every injected member at the real object boundary", () => {
    for (const variant of variants.filter((v) => v.caseId === "G-09")) {
      const { args, token } = guestArguments(variant, fixture);
      expect(args).toEqual([
        {
          ...(variant.payload as object),
          orderId: fixture.orderId,
          guestToken: token,
        },
      ]);
      expect(Object.keys(args[0] as object)).toHaveLength(3);
    }
  });
  it("uses the run's signature and preserves a one-character tamper", () => {
    const valid = createHmac("sha256", fixture.secret)
      .update(
        `guest_order:${fixture.orderId}:${fixture.userId}:${fixture.createdAt}`,
      )
      .digest("hex");
    expect(guestArguments(find("token_valid_parameter"), fixture).args).toEqual(
      [fixture.orderId, valid],
    );
    const wrong = guestArguments(find("token_one_char_changed"), fixture)
      .args[1] as string;
    expect(
      [...wrong].filter((char, index) => char !== valid[index]),
    ).toHaveLength(1);
    expect(wrong.slice(1)).toBe(valid.slice(1));
  });
  it("distinguishes an omitted argument, null, and cookie-only access", () => {
    expect(guestArguments(find("token_missing"), fixture).args).toEqual([
      fixture.orderId,
    ]);
    expect(guestArguments(find("token_null"), fixture).args).toEqual([
      fixture.orderId,
      null,
    ]);
    expect(
      guestArguments(find("token_valid_cookie_only"), fixture).cookieOnly,
    ).toBe(true);
  });
  it("keeps the exact invalid UUID/type payload instead of seeding over it", () => {
    for (const variant of variants.filter((v) => v.caseId === "G-01"))
      expect(guestArguments(variant, fixture).args[0]).toEqual(
        (variant.payload as { orderId: unknown }).orderId,
      );
  });
  it("tests token A against order B without signing a valid B token", () => {
    const wrong = guestArguments(find("ownership_token_A_order_B"), fixture);
    expect(wrong.args[0]).toBe(fixture.otherOrderId);
    expect(wrong.args[1]).toBe(
      guestArguments(find("token_valid_parameter"), fixture).token,
    );
  });
  it.each([604799, 604800, 604801])(
    "preserves exact server expiry age %i",
    (age) => {
      expect(
        Date.parse(guestCreationTime(find(`age_${age}s`), fixture.nowMs)),
      ).toBe(fixture.nowMs - age * 1000);
    },
  );
  it("maps timestamp mistakes to actual PostgreSQL values", () => {
    expect(
      Date.parse(
        guestCreationTime(
          find("creation_val_now_plus_1_second"),
          fixture.nowMs,
        ),
      ),
    ).toBe(fixture.nowMs + 1000);
    expect(
      Date.parse(
        guestCreationTime(
          find("creation_val_unix_seconds_as_milliseconds"),
          fixture.nowMs,
        ),
      ),
    ).toBe(Math.floor(fixture.nowMs / 1000));
    expect(
      guestCreationTime(find("creation_val_invalid_date"), fixture.nowMs),
    ).toBe("infinity");
    expect(
      guestCreationTime(find("creation_val_out_of_date_range"), fixture.nowMs),
    ).toBe("290000-01-01 00:00:00+00");
  });
});
