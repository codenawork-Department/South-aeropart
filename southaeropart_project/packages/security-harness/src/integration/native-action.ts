import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type { NativeRuntime } from "./native-runtime";
import {
  armResourceWatchdog,
  jsonContainerDepth,
  type ResourceMeasurement,
} from "./resource-observer";

export type NativeApp = Awaited<ReturnType<NativeRuntime["launchApp"]>>;
const actionIds = new WeakMap<NativeApp, Map<string, string>>();

/** Use the real Next-generated client reference and replace only its observed JSON argument envelope. */
export async function invokeNativeAction(
  app: NativeApp,
  binding: string,
  args: unknown[],
  options: {
    rawFirstArgument?: string | Buffer;
    headers?: Record<string, string>;
    resourcePid?: number;
    timeoutMs?: number;
    exactBodyBytes?: { target: number; argumentIndex: number; field: string };
  } = {},
) {
  let intercepted = false;
  let requestBytes = 0;
  let requestSha256 = "";
  let transportError: unknown;
  let observed: { wireStatus: number | null; rawText: string } | undefined;
  let resources: ResourceMeasurement | undefined;
  let requestDepth: number | undefined;
  const routeHandler: Parameters<NativeApp["page"]["route"]>[1] = async (
    route,
  ) => {
    const request = route.request();
    if (request.method() !== "POST" || !request.headers()["next-action"])
      return route.continue();
    const ids = actionIds.get(app) ?? new Map<string, string>();
    actionIds.set(app, ids);
    const id = request.headers()["next-action"];
    if (ids.has(binding)) {
      if (id !== ids.get(binding)) return route.continue();
    } else {
      // The real layout may issue profile/session actions concurrently. Bind only
      // the action whose first observed arguments match this invocation.
      try {
        if (
          JSON.stringify(JSON.parse(request.postData() ?? "")) !==
          JSON.stringify(args)
        )
          return route.continue();
      } catch {
        return route.continue();
      }
      ids.set(binding, id);
    }
    try {
      assert(
        !intercepted,
        "One action invocation must produce exactly one native POST",
      );
      intercepted = true;
      const original = request.postDataBuffer();
      assert(original, "Native POST body missing");
      let body = original;
      if (options.rawFirstArgument !== undefined) {
        // Do not guess multipart/Flight encoding or round a large number through JSON.parse.
        assert.match(request.headers()["content-type"] ?? "", /^text\/plain/);
        const envelope: unknown = JSON.parse(original.toString("utf8"));
        assert(
          Array.isArray(envelope) && envelope.length === 1,
          "Only observed single-argument JSON envelopes are supported",
        );
        body = Buffer.concat([
          Buffer.from("["),
          Buffer.from(options.rawFirstArgument),
          Buffer.from("]"),
        ]);
      }
      if (options.exactBodyBytes) {
        assert.match(request.headers()["content-type"] ?? "", /^text\/plain/);
        const envelope = JSON.parse(body.toString("utf8")) as Array<
          Record<string, unknown>
        >;
        const { target, argumentIndex, field } = options.exactBodyBytes;
        assert(Array.isArray(envelope) && envelope[argumentIndex]);
        envelope[argumentIndex][field] = "";
        const padding =
          target - Buffer.byteLength(JSON.stringify(envelope), "utf8");
        assert(
          Number.isSafeInteger(padding) && padding >= 0 && target <= 4194305,
        );
        envelope[argumentIndex][field] = "A".repeat(padding);
        body = Buffer.from(JSON.stringify(envelope));
        assert.equal(body.length, target);
      }
      requestBytes = body.length;
      requestSha256 = createHash("sha256").update(body).digest("hex");
      if (options.resourcePid !== undefined)
        requestDepth = jsonContainerDepth(body);
      const watchdog =
        options.resourcePid === undefined
          ? undefined
          : await armResourceWatchdog(
              app.resourceDirectory,
              options.resourcePid,
            );
      // Capture the real response before handing it back to React, which may navigate
      // or refresh and make Chromium's response body unavailable to the runner.
      try {
        const response = await route.fetch({
          postData: body,
          headers: { ...request.headers(), ...options.headers },
          maxRedirects: 0,
          timeout: watchdog ? 6000 : (options.timeoutMs ?? 30000),
        });
        const responseBody = await response.body();
        if (watchdog) resources = await watchdog.finish();
        observed = {
          wireStatus: response.status(),
          rawText: responseBody.toString("utf8"),
        };
        await route.fulfill({ response, body: responseBody });
        await response.dispose();
      } finally {
        if (watchdog && !resources) resources = await watchdog.finish();
      }
    } catch (error) {
      transportError = error;
      await route.abort();
    }
  };
  await app.page.route(app.url, routeHandler);
  const started = performance.now();
  try {
    const value = await app.page.evaluate(
      async ({ binding, args }) => {
        const actions = (
          window as unknown as {
            securityActions: Record<
              string,
              (...args: unknown[]) => Promise<unknown>
            >;
          }
        ).securityActions;
        try {
          return await actions[binding](...args);
        } catch (error) {
          return {
            threw: true,
            message:
              error instanceof Error ? error.message : "Unknown exception",
          };
        }
      },
      { binding, args },
    );
    if (transportError && resources?.state !== "violated") throw transportError;
    if (resources?.state === "violated" && !observed)
      observed = { wireStatus: null, rawText: "" };
    assert(intercepted, "Native request was not observed");
    assert(observed, "Real server response missing");
    return {
      value,
      ...observed,
      requestBytes,
      requestSha256,
      requestDepth,
      resources,
      executionTimeMs: performance.now() - started,
    };
  } finally {
    await app.page.unroute(app.url, routeHandler);
  }
}
