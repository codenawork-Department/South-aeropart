import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClerkActors } from "../src/integration/clerk-actors";
import type { NativeRuntime } from "../src/integration/native-runtime";

const directories: string[] = [];
function runtime() {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "south-aero-clerk-unit-"),
  );
  directories.push(directory);
  return {
    directory,
    runId: "security_test_0123456789abcdef0123456789abcdef",
    env: {
      CLERK_SECRET_KEY: "sk_test_not_a_real_key",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_fixture",
    },
    pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  } as unknown as NativeRuntime;
}
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
const evidenceFile = (run: NativeRuntime) =>
  path.join(
    run.directory,
    fs
      .readdirSync(run.directory)
      .find((name) => name.startsWith("clerk-fixtures-"))!,
  );
afterEach(() => {
  vi.unstubAllGlobals();
  for (const directory of directories.splice(0)) {
    if (
      path.dirname(path.resolve(directory)) !== path.resolve(os.tmpdir()) ||
      !path.basename(directory).startsWith("south-aero-clerk-unit-")
    )
      throw new Error("Unsafe test cleanup path");
    fs.rmSync(directory, { recursive: true });
  }
});

describe("Run-owned Clerk fixture cleanup", () => {
  it("keeps actors and cleanup records distinct across target suites in one run", async () => {
    const run = runtime();
    let count = 0;
    const transport = vi.fn(async (url: string, init: RequestInit) => {
      if (init.method === "DELETE")
        return reply({ id: url.split("/").at(-1), deleted: true });
      return reply({
        id: url.endsWith("/users") ? `user_${++count}` : `sess_${count}`,
      });
    });
    vi.stubGlobal("fetch", transport);
    const first = await createClerkActors(run);
    await first.cleanup();
    const second = await createClerkActors(run);
    await second.cleanup();
    const emails = [...first.actors, ...second.actors].map(
      (actor) => actor.email,
    );
    expect(new Set(emails).size).toBe(4);
    expect(emails.every((email) => email.split("@")[0].length <= 64)).toBe(
      true,
    );
    const records = fs
      .readdirSync(run.directory)
      .filter((name) => name.startsWith("clerk-fixtures-"));
    expect(records).toHaveLength(2);
    expect(
      records.every(
        (name) =>
          JSON.parse(fs.readFileSync(path.join(run.directory, name), "utf8"))
            .cleaned === true,
      ),
    ).toBe(true);
  });
  it("deletes only owned users, confirms acknowledgement, and never records a JWT", async () => {
    const run = runtime();
    const transport = vi
      .fn()
      .mockResolvedValueOnce(reply({ id: "user_A" }))
      .mockResolvedValueOnce(reply({ id: "sess_A" }))
      .mockResolvedValueOnce(reply({ id: "user_B" }))
      .mockResolvedValueOnce(reply({ id: "sess_B" }))
      .mockResolvedValueOnce(reply({ jwt: "PRIVATE_SESSION_TOKEN" }))
      .mockResolvedValueOnce(reply({ id: "user_A", deleted: true }))
      .mockResolvedValueOnce(reply({ id: "user_B", deleted: true }));
    vi.stubGlobal("fetch", transport);
    const actors = await createClerkActors(run);
    expect(await actors.headers(0)).toEqual({
      authorization: "Bearer PRIVATE_SESSION_TOKEN",
    });
    await actors.cleanup();
    const evidence = fs.readFileSync(evidenceFile(run), "utf8");
    expect(JSON.parse(evidence).cleaned).toBe(true);
    expect(evidence).not.toContain("PRIVATE_SESSION_TOKEN");
    expect(transport.mock.calls.slice(-2).map((call) => call[0])).toEqual([
      "https://api.clerk.com/v1/users/user_A",
      "https://api.clerk.com/v1/users/user_B",
    ]);
  });
  it("cleans an already-created user if session setup fails and redacts the provider body", async () => {
    const run = runtime();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(reply({ id: "user_A" }))
        .mockResolvedValueOnce(reply({ secret: "PRIVATE_PROVIDER_BODY" }, 403))
        .mockResolvedValueOnce(reply({ id: "user_A", deleted: true })),
    );
    await expect(createClerkActors(run)).rejects.toThrow("HTTP 403");
    const evidence = fs.readFileSync(evidenceFile(run), "utf8");
    expect(JSON.parse(evidence).cleaned).toBe(true);
    expect(evidence).not.toContain("PRIVATE_PROVIDER_BODY");
  });
  it("does not report cleanup success or retry an uncertain create", async () => {
    const run = runtime(),
      transport = vi.fn().mockRejectedValue(new Error("network lost"));
    vi.stubGlobal("fetch", transport);
    await expect(createClerkActors(run)).rejects.toThrow(
      "could not all be deleted",
    );
    expect(transport).toHaveBeenCalledTimes(1);
    const evidence = JSON.parse(fs.readFileSync(evidenceFile(run), "utf8"));
    expect(evidence.cleaned).toBe(false);
    expect(evidence.uncertainExternalId).toBe(
      `${run.runId}_${evidence.fixtureId}_a`,
    );
  });
  it("fails closed before transport when given a live instance", async () => {
    const run = runtime(),
      transport = vi.fn();
    run.env.CLERK_SECRET_KEY = "sk_live_not_allowed";
    vi.stubGlobal("fetch", transport);
    await expect(createClerkActors(run)).rejects.toThrow();
    expect(transport).not.toHaveBeenCalled();
    expect(run.pool.query).not.toHaveBeenCalled();
  });
});
