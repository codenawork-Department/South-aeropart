import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const sqlClient = neon(connectionString);
export const rawSql = sqlClient;
export { neon };
export const db = drizzle(sqlClient, { schema });


