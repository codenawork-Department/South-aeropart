import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Audit #18: Factory function accepting explicit database URL
 */
export function createDbClient(databaseUrl?: string) {
  const conn = databaseUrl || process.env.DATABASE_URL;
  if (!conn) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const client = neon(conn);
  return {
    rawSql: client,
    neon,
    db: drizzle(client, { schema }),
  };
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV === "production") {
  throw new Error("DATABASE_URL environment variable is not set");
}

const sqlClient = neon(connectionString || "postgres://dummy:dummy@localhost/dummy");

export const rawSql = sqlClient;
export { neon };
export const db = drizzle(sqlClient, { schema });



