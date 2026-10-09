import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const host = url.split("@")[1]?.split("/")[0] || "unknown";
  console.log(`Connecting to database at ${host}...`);

  const sql = neon(url);
  const db = drizzle(sql);
  const migrationsFolder = path.resolve(__dirname, "../packages/db/drizzle");

  console.log(`Applying migrations from ${migrationsFolder}...`);
  await migrate(db, { migrationsFolder });
  console.log("✅ All migrations applied successfully!");
}

run().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
