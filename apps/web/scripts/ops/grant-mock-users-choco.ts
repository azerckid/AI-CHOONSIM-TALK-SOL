/**
 * Mock 유저 50명 일일 초코 지급 — 30일 테스트 기간 동안 매일 실행
 *
 * 사용: cd apps/web && npx tsx scripts/grant-mock-users-choco.ts
 *      CHOCO_PER_USER=3000 npx tsx scripts/grant-mock-users-choco.ts  (기본 3000)
 */
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.development" });

const DEFAULT_CHOCO_PER_USER = 3000;

async function main() {
  const chocoPerUser = Number(process.env.CHOCO_PER_USER) || DEFAULT_CHOCO_PER_USER;
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL || "file:./dev.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const { rows } = await client.execute({
    sql: `SELECT id, chocoBalance FROM User WHERE email LIKE 'mock-%@test.local'`,
    args: [],
  });

  const users = rows as unknown as { id: string; chocoBalance: string }[];
  if (users.length === 0) {
    console.log("[INFO] No mock users found. Run seed-mock-users.ts first.");
    client.close();
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  let updated = 0;

  for (const u of users) {
    const current = parseFloat(u.chocoBalance || "0");
    const next = current + chocoPerUser;
    await client.execute({
      sql: `UPDATE User SET chocoBalance = ?, updatedAt = ? WHERE id = ?`,
      args: [String(next), now, u.id],
    });
    updated++;
  }

  console.log(`[OK] Granted ${chocoPerUser} CHOCO to ${updated} mock users`);
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
