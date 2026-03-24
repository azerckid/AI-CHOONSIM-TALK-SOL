/**
 * Phase D-3: ExchangeLog.fromChain "NEAR" -> "LEGACY" 일괄 변경 (DB에서 NEAR 문자열 제거)
 * 선택 실행. 사용: cd apps/web && npx tsx scripts/migrate-exchange-log-near-to-legacy.ts
 */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../app/db/schema";
import * as dotenv from "dotenv";
import { eq } from "drizzle-orm";

dotenv.config({ path: ".env.development" });

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const db = drizzle(client, { schema });

  await db
    .update(schema.exchangeLog)
    .set({ fromChain: "LEGACY" })
    .where(eq(schema.exchangeLog.fromChain, "NEAR"));

  console.log("ExchangeLog fromChain NEAR -> LEGACY update done.");
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
