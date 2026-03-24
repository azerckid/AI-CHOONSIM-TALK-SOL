/**
 * Phase 0-4: User.ctcLastBalance 컬럼 추가 마이그레이션
 * 사용: cd apps/web && npx tsx scripts/run-migration-0013.ts
 */
import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const connectionConfig = {
  url: process.env.TURSO_DATABASE_URL || "file:./dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
};

async function main() {
  const client = createClient(connectionConfig);
  const sqlPath = join(__dirname, "../drizzle/0013_add_ctc_last_balance.sql");
  const sql = readFileSync(sqlPath, "utf-8");
  const statements = sql
    .split(/;--> statement-breakpoint\n?/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    const stmt = statement.endsWith(";") ? statement : statement + ";";
    try {
      await client.execute(stmt);
      console.log("[OK]", stmt.slice(0, 60) + "...");
    } catch (e: any) {
      if (e?.message?.includes("duplicate column") || e?.message?.includes("already exists")) {
        console.log("[SKIP] Column already exists:", stmt.slice(0, 50) + "...");
      } else {
        throw e;
      }
    }
  }
  console.log("Migration 0013 done.");
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
