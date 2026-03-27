import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.development" });

async function check(label: string, url: string, authToken?: string) {
  const client = createClient({ url, authToken });
  try {
    const r = await client.execute(`PRAGMA table_info("Payment")`);
    console.log(`\n[${label}] Payment columns:`, r.rows.map((c: any) => c.name));
  } catch (e) {
    console.log(`[${label}] Error:`, (e as Error).message);
  }
  client.close();
}

async function main() {
  // 로컬 dev.db
  await check("LOCAL dev.db", "file:./dev.db");
  // Turso
  await check("TURSO", process.env.TURSO_DATABASE_URL!, process.env.TURSO_AUTH_TOKEN);
}

main().catch(console.error);
