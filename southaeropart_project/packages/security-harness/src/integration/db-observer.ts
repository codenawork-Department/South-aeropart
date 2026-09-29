import assert from "node:assert/strict";
import type { NativeRuntime } from "./native-runtime";

/** Hash rows inside PostgreSQL so snapshots never copy PII/secrets into artifacts. */
export async function createBusinessObserver(runtime: NativeRuntime) {
  const result = await runtime.pool.query(
    "select tablename from pg_tables where schemaname=current_schema() order by tablename",
  );
  const tables: string[] = result.rows
    .map((row) => row.tablename)
    .filter(
      (name) =>
        ![
          "admin_sessions",
          "admin_audit_logs",
          "security_rate_limits",
          // Corpus explicitly permits bounded security counters, not business changes.
          "abuse_buckets",
        ].includes(name),
    );
  assert(tables.length > 0);
  for (const table of tables) assert.match(table, /^[a-z_][a-z0-9_]*$/);
  const sql = tables
    .map(
      (table) => `select '${table}' as name, count(*)::int as rows,
    md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) as digest from "${table}" t`,
    )
    .join(" union all ");
  return async () => {
    const snapshot = await runtime.pool.query(sql);
    return new Map<string, string>(
      snapshot.rows.map((row) => [row.name, `${row.rows}:${row.digest}`]),
    );
  };
}
