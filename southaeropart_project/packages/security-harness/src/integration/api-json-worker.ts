import http from "node:http";
import { ApiJsonAdapter } from "../adapters/unbound-contracts.adapter";
import type { ExpandedVariant } from "../types";

// This is the corpus's isolated abstract API contract, not a deployed application route.
const adapter = new ApiJsonAdapter();
const baseline = Object.getOwnPropertyDescriptors(Object.prototype);
const pristine = () => {
  const current = Object.getOwnPropertyDescriptors(Object.prototype);
  return (
    Reflect.ownKeys(current).length === Reflect.ownKeys(baseline).length &&
    Reflect.ownKeys(baseline).every((key) => {
      const a = baseline[key as string],
        b = current[key as string];
      return (
        b &&
        a.value === b.value &&
        a.get === b.get &&
        a.set === b.set &&
        a.writable === b.writable &&
        a.configurable === b.configurable &&
        a.enumerable === b.enumerable
      );
    })
  );
};
const server = http.createServer(async (request, response) => {
  if (request.method !== "POST") {
    response.writeHead(405).end();
    return;
  }
  const before = pristine();
  const chunks: Buffer[] = [];
  let received = 0;
  for await (const chunk of request) {
    received += chunk.length;
    if (received <= 1048576) chunks.push(chunk);
    // Consume the socket without retaining the over-limit body.
  }
  const observed =
    received > 1048576
      ? {
          success: false,
          semanticStatus: 413,
          errorCode: "PAYLOAD_TOO_LARGE",
          errorMessage: "Request too large",
          invariantsChecked: { NO_LEAK: true, REJECT_NO_EFFECT: true },
          leaks: [],
          hasErrorCodeField: true,
        }
      : await adapter.invoke({
          rawPayload: Buffer.concat(chunks),
          recipe:
            request.headers["x-parser-only"] === "true"
              ? "nestedJson"
              : undefined,
        } as ExpandedVariant);
  response
    .writeHead(observed.semanticStatus!, { "content-type": "application/json" })
    .end(
      JSON.stringify({
        ...observed,
        receivedBytes: received,
        prototypeUnchanged: before && pristine(),
        pid: process.pid,
      }),
    );
});
server.requestTimeout = 10000;
server.listen(0, "127.0.0.1", () => {
  const address = server.address() as { port: number };
  process.send?.({ port: address.port, pid: process.pid });
});
