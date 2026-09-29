import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { NativeRuntime } from "./native-runtime";

class ClerkFixtureHttpError extends Error {
  constructor(
    readonly status: number,
    method: string,
    endpoint: string,
  ) {
    super(
      `Clerk test fixture ${method} ${endpoint.split("/")[1]} failed (HTTP ${status}); no provider body recorded`,
    );
  }
}

/** Clerk's documented development-session flow; no password/OTP/email delivery. */
export async function createClerkActors(runtime: NativeRuntime) {
  assert(runtime.env.CLERK_SECRET_KEY?.startsWith("sk_test_"));
  assert(runtime.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_"));
  const owned: Array<{ id: string; sessionId: string; email: string }> = [];
  let uncertainExternalId: string | undefined;
  const fixtureId = randomUUID().replaceAll("-", "");
  const evidencePath = path.join(
    runtime.directory,
    `clerk-fixtures-${fixtureId}.json`,
  );
  const record = (cleaned: boolean) =>
    fs.writeFileSync(
      evidencePath,
      JSON.stringify(
        {
          runId: runtime.runId,
          fixtureId,
          users: owned.map((actor) => actor.id),
          uncertainExternalId,
          cleaned,
        },
        null,
        2,
      ),
    );
  const call = async (
    method: string,
    endpoint: string,
    body?: unknown,
  ): Promise<Record<string, unknown>> => {
    const response = await fetch(`https://api.clerk.com/v1${endpoint}`, {
      method,
      headers: {
        authorization: `Bearer ${runtime.env.CLERK_SECRET_KEY}`,
        "content-type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new ClerkFixtureHttpError(response.status, method, endpoint);
    }
    return response.status === 204
      ? {}
      : ((await response.json()) as Record<string, unknown>);
  };
  const cleanup = async () => {
    let failures = 0;
    for (const actor of owned) {
      try {
        const deleted = await call(
          "DELETE",
          `/users/${encodeURIComponent(actor.id)}`,
        );
        assert(
          deleted.deleted === true && deleted.id === actor.id,
          "Provider deletion acknowledgement required",
        );
      } catch {
        failures++;
      }
    }
    record(failures === 0 && uncertainExternalId === undefined);
    if (failures || uncertainExternalId)
      throw new Error(
        "Run-owned Clerk users could not all be deleted; inspect clerk-fixtures-*.json before retrying",
      );
  };
  try {
    for (const label of ["a", "b"]) {
      const email = `qa-${fixtureId}-${label}+clerk_test@example.com`;
      uncertainExternalId = `${runtime.runId}_${fixtureId}_${label}`;
      record(false);
      let user: Record<string, unknown>;
      try {
        user = await call("POST", "/users", {
          email_address: [email],
          external_id: uncertainExternalId,
          skip_password_requirement: true,
        });
      } catch (error) {
        // Do not retry creation when its outcome is unknown. Keep the unique
        // external ID for reconciliation; a timeout does not prove no user exists.
        if (error instanceof ClerkFixtureHttpError && error.status < 500)
          uncertainExternalId = undefined;
        throw error;
      }
      assert(
        typeof user.id === "string" && /^user_[a-zA-Z0-9]+$/.test(user.id),
      );
      const actor = { id: user.id, sessionId: "", email };
      owned.push(actor);
      uncertainExternalId = undefined;
      record(false);
      const session = await call("POST", "/sessions", { user_id: actor.id });
      assert(
        typeof session.id === "string" &&
          /^sess_[a-zA-Z0-9]+$/.test(session.id),
      );
      actor.sessionId = session.id;
      await runtime.pool.query(
        "insert into users(id,email,full_name) values($1,$2,'Clerk fixture')",
        [actor.id, email],
      );
    }
    return {
      actors: owned,
      async headers(index: number) {
        const token = await call(
          "POST",
          `/sessions/${encodeURIComponent(owned[index].sessionId)}/tokens`,
        );
        assert(typeof token.jwt === "string");
        return { authorization: `Bearer ${token.jwt}` };
      },
      cleanup,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
