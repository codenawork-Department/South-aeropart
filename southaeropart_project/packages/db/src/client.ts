import { neon, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

/**
 * Audit #18: Factory function accepting explicit database URL
 */
export function createDbClient(databaseUrl?: string) {
  const conn = databaseUrl || process.env.DATABASE_URL;
  if (!conn) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const pool = new Pool({ connectionString: conn });
  return {
    rawSql: neon(conn),
    pool,
    neon,
    Pool,
    db: drizzle(pool, { schema }),
  };
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV === "production") {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({ connectionString: connectionString || "postgres://dummy:dummy@localhost/dummy" });
const sqlClient = neon(connectionString || "postgres://dummy:dummy@localhost/dummy");

export const rawSql = sqlClient;
export { neon, Pool };
export const db = drizzle(pool, { schema });



