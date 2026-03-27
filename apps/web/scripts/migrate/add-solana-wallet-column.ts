import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.development" });

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  try {
    await client.execute("ALTER TABLE User ADD COLUMN solanaWallet TEXT");
    console.log("✅ solanaWallet column added to User table");
  } catch (err: any) {
    if (err.message?.includes("duplicate column")) {
      console.log("ℹ️  Column already exists, skipping");
    } else {
      throw err;
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
