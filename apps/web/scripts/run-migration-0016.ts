import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.development" });

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  try {
    await client.execute(`ALTER TABLE "User" ADD COLUMN "solanaWallet" TEXT`);
    console.log("✅ solanaWallet column added to User table");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("duplicate column name") || msg.includes("already exists")) {
      console.log("ℹ️  Column already exists, skipping");
    } else {
      throw err;
    }
  }

  client.close();
}

main().catch(console.error);
