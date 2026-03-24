/**
 * Phase 1-1 검증: Shop 8종 아이템 존재 확인
 * 사용: cd apps/web && npx tsx scripts/verify-shop-items.ts
 */
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.development" });

const REQUIRED_IDS = [
  "memory_ticket",
  "voice_ticket",
  "secret_episode",
  "memory_album",
  "ticket_msg_10",
  "ticket_msg_50",
  "presend_ticket",
  "heart",
];

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL || "file:./dev.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const { rows } = await client.execute({
    sql: `SELECT id, name, priceChoco, isActive FROM Item WHERE id IN (${REQUIRED_IDS.map(() => "?").join(",")})`,
    args: REQUIRED_IDS,
  });

  const found = new Set((rows as unknown as { id?: string }[]).map((r) => r.id));
  const missing = REQUIRED_IDS.filter((id) => !found.has(id));

  if (missing.length > 0) {
    console.error("[FAIL] Missing items:", missing.join(", "));
    console.error("Run: npx tsx scripts/seed-shop-items.ts");
    process.exit(1);
  }

  console.log("[OK] 8 shop items verified:");
  for (const r of rows as unknown as { id: string; name: string; priceChoco: number; isActive: number }[]) {
    console.log(`  ${r.id} — ${r.name} (${r.priceChoco} CHOCO, isActive=${r.isActive})`);
  }
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
