import assert from "node:assert/strict";
import http from "node:http";
import { createHash } from "node:crypto";

/** Exact bytes on a real loopback socket, including observable chunked delivery. */
export async function postNativeHttp(
  url: string,
  body: Buffer,
  headers: Record<string, string> = {},
  chunked = false,
) {
  const target = new URL(url);
  assert(
    target.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(target.hostname),
  );
  return new Promise<{
    status: number;
    rawText: string;
    bytes: number;
    sha256: string;
    chunked: boolean;
  }>((resolve, reject) => {
    const request = http.request(
      target,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...headers,
          ...(chunked
            ? { "transfer-encoding": "chunked" }
            : { "content-length": String(body.length) }),
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("error", reject);
        response.on("end", () =>
          resolve({
            status: response.statusCode!,
            rawText: Buffer.concat(chunks).toString("utf8"),
            bytes: body.length,
            sha256: createHash("sha256").update(body).digest("hex"),
            chunked:
              request.hasHeader("transfer-encoding") &&
              !request.hasHeader("content-length"),
          }),
        );
      },
    );
    request.setTimeout(15000, () =>
      request.destroy(new Error("Native loopback request timed out")),
    );
    request.on("error", reject);
    if (chunked)
      for (let offset = 0; offset < body.length; offset += 16384)
        request.write(body.subarray(offset, offset + 16384));
    else request.write(body);
    request.end();
  });
}
