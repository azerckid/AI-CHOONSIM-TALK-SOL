import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.development" });

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  try {
    await client.execute(`ALTER TABLE "UserMission" ADD COLUMN "txSignature" TEXT`);
    console.log("✅ txSignature column added to UserMission table");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("duplicate column name") || msg.includes("already exists")) {
      console.log("ℹ️  Column already exists, skipping");
    } else {
      throw err;
    }
  }

  // Verify
  const result = await client.execute(`PRAGMA table_info("UserMission")`);
  const cols = result.rows.map((r) => r.name);
  console.log("\nUserMission columns:", cols);

  client.close();
}

main().catch(console.error);
