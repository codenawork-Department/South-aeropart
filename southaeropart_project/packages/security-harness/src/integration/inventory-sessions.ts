import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { NativeRuntime } from "./native-runtime";
import { invokeNativeAction, type NativeApp } from "./native-action";
import { detectErrorLeaks } from "../leak-detector";

/** Supplemental HTTP authorization checks; deliberately separate from corpus coverage. */
export async function checkInventorySessions(
  runtime: NativeRuntime,
  app: NativeApp,
) {
  const results: Array<{
    name: string;
    passed: boolean;
    wireStatus: number | null;
    semanticCode: string | null;
    stockAfter: number;
    auditRows: number;
  }> = [];
  const cases = [
    "anonymous",
    "staff",
    "expired",
    "revoked",
    "inactive",
    "idle",
    "wrong_hash",
    "invalid_signature",
    "role_changed",
    "admin",
    "super_admin",
  ] as const;
  for (const name of cases) {
    await app.context.clearCookies({ name: "admin_session" });
    let actor: Awaited<ReturnType<NativeRuntime["adminCookie"]>> | undefined;
    if (name !== "anonymous") {
      actor = await runtime.adminCookie(
        name === "staff"
          ? "staff"
          : name === "super_admin"
            ? "super_admin"
            : "admin",
        name,
      );
      if (name === "inactive")
        await runtime.pool.query(
          "update admin_users set is_active=false where id=$1",
          [actor.id],
        );
      if (name === "idle")
        await runtime.pool.query(
          "update admin_sessions set last_seen_at=now()-interval '31 minutes' where id=$1",
          [actor.sid],
        );
      if (name === "wrong_hash")
        await runtime.pool.query(
          "update admin_sessions set token_hash=$1 where id=$2",
          ["0".repeat(64), actor.sid],
        );
      if (name === "role_changed") {
        await app.context.addCookies([
          { name: "admin_session", value: actor.token, url: app.baseUrl },
        ]);
        // Prove this exact session worked before downgrading the DB role.
        const rejectedInput = await invokeNativeAction(app, "inventory", [{}]);
        assert.equal(
          (rejectedInput.value as { error?: { code: string } }).error?.code,
          "INVALID_INPUT",
        );
        await runtime.pool.query(
          "update admin_users set role='staff' where id=$1",
          [actor.id],
        );
      }
      let token = actor.token;
      if (name === "invalid_signature") {
        const parts = token.split(".");
        parts[2] = (parts[2][0] === "a" ? "b" : "a") + parts[2].slice(1);
        token = parts.join(".");
      }
      await app.context.addCookies([
        {
          name: "admin_session",
          value: token,
          url: app.baseUrl,
          httpOnly: true,
          sameSite: "Lax",
        },
      ]);
    }
    const id = randomUUID();
    await runtime.pool.query(
      "insert into products(id,sku,slug,name,price,stock_quantity,status) values($1,$2,$2,$3,'100.00',10,'active')",
      [id, id, "Session fixture"],
    );
    const emailBefore = runtime.emails.length;
    const wire = await invokeNativeAction(app, "inventory", [
      { productId: id, delta: -1 },
    ]);
    const response = wire.value as {
      success: boolean;
      error?: { code: string; message: string };
      data?: unknown;
    };
    const stock = (
      await runtime.pool.query(
        "select stock_quantity from products where id=$1",
        [id],
      )
    ).rows[0].stock_quantity;
    const audits = (
      await runtime.pool.query(
        "select admin_id,metadata from admin_audit_logs where entity_id=$1",
        [id],
      )
    ).rows;
    const accepted = name === "admin" || name === "super_admin";
    const forbidden = name === "staff" || name === "role_changed";
    const code = forbidden ? "FORBIDDEN" : "UNAUTHENTICATED";
    const expected = accepted
      ? {
          success: true,
          data: { productId: id, delta: -1, stockBefore: 10, stockAfter: 9 },
        }
      : {
          success: false,
          error: {
            code,
            message: forbidden
              ? "Request not permitted"
              : "Authentication required",
          },
        };
    const passed =
      wire.wireStatus === 200 &&
      JSON.stringify(response) === JSON.stringify(expected) &&
      stock === (accepted ? 9 : 10) &&
      audits.length === (accepted ? 1 : 0) &&
      (!accepted ||
        (audits[0].admin_id === actor!.id &&
          audits[0].metadata.stockAfter === 9)) &&
      runtime.emails.length === emailBefore &&
      !detectErrorLeaks(wire.rawText).hasLeaks;
    results.push({
      name,
      passed,
      wireStatus: wire.wireStatus,
      semanticCode: response.error?.code ?? null,
      stockAfter: stock,
      auditRows: audits.length,
    });
    console.log(`${passed ? "PASS" : "FAIL"} inventory.session.${name}`);
  }
  return results;
}
