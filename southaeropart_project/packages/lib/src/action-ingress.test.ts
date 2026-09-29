import { describe, expect, it } from "vitest";
import {
  isActionOriginAllowed,
  inspectActionBody,
  ACTION_JSON_MAX_BYTES,
  ACTION_MULTIPART_MAX_BYTES,
} from "./action-ingress";
describe("Server Action origin boundary", () => {
  it.each([
    ["https://store.example", undefined, true],
    ["https://attacker.example", undefined, false],
    ["https://store.example", "forged.example", false],
    ["https://store.example", "store.example", true],
    ["null", undefined, false],
    ["https://store.example/path", undefined, false],
    [undefined, undefined, true],
  ])(
    "checks origin %s and forwarded host %s",
    (origin, forwarded, expected) => {
      const headers = new Headers({ host: "store.example" });
      if (typeof origin === "string") headers.set("origin", origin);
      if (typeof forwarded === "string")
        headers.set("x-forwarded-host", forwarded);
      expect(
        isActionOriginAllowed(headers, "https://store.example/products"),
      ).toBe(expected);
    },
  );
});

describe("Server Action body boundary", () => {
  function request(body: BodyInit, headers: Record<string, string> = {}) {
    return new Request("https://store.example/action", {
      method: "POST",
      body,
      duplex: "half",
      headers: {
        "next-action": "test-action",
        "content-type": "text/plain;charset=UTF-8",
        ...headers,
      },
    } as RequestInit);
  }
  it("preserves the exact allowed body for the framework", async () => {
    const original = request("A".repeat(ACTION_JSON_MAX_BYTES));
    expect(await inspectActionBody(original)).toBeNull();
    expect((await original.text()).length).toBe(ACTION_JSON_MAX_BYTES);
  });
  it("rejects oversized bytes even with a forged small Content-Length", async () => {
    const result = await inspectActionBody(
      request("A".repeat(ACTION_JSON_MAX_BYTES + 1), { "content-length": "1" }),
    );
    expect(result).toEqual({
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
      message: "Request too large",
    });
  });
  it.each(["ก", "😀"])(
    "counts UTF-8 bytes for %s rather than string units",
    async (value) => {
      const body = value.repeat(
        Math.ceil(
          ACTION_JSON_MAX_BYTES / new TextEncoder().encode(value).length,
        ),
      );
      expect((await inspectActionBody(request(body + value)))?.status).toBe(
        413,
      );
    },
  );
  it("enforces the cap across streamed chunks without Content-Length", async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(600_000));
        controller.enqueue(new Uint8Array(400_001));
        controller.close();
      },
    });
    expect((await inspectActionBody(request(body)))?.status).toBe(413);
  });
  it("keeps the existing multipart 4 MiB cap", async () => {
    expect(
      await inspectActionBody(
        request("A".repeat(ACTION_MULTIPART_MAX_BYTES), {
          "content-type": "multipart/form-data; boundary=x",
        }),
      ),
    ).toBeNull();
    expect(
      (
        await inspectActionBody(
          request("A".repeat(ACTION_MULTIPART_MAX_BYTES + 1), {
            "content-type": "multipart/form-data; boundary=x",
          }),
        )
      )?.status,
    ).toBe(413);
  });
  it("does not consume unrelated POST bodies", async () => {
    const original = new Request("https://store.example/webhook", {
      method: "POST",
      body: "exact signed raw body",
    });
    expect(await inspectActionBody(original)).toBeNull();
    expect(await original.text()).toBe("exact signed raw body");
  });
});
