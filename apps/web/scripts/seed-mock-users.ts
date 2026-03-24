/**
 * Mock 유저 50명 생성 — 21_MOCK_USER_SIMULATION_PLAN, 10_MOCK_USER_IMPLEMENTATION_PLAN
 * User 테이블에만 삽입 (server-side 시뮬레이션용, 로그인 불필요)
 *
 * 사용: cd apps/web && npx tsx scripts/seed-mock-users.ts
 */
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.development" });

const MOCK_COUNT = 50;
const INITIAL_CHOCO_MIN = 5000;
const INITIAL_CHOCO_MAX = 10000;

function randomChoco(): string {
  const n = INITIAL_CHOCO_MIN + Math.floor(Math.random() * (INITIAL_CHOCO_MAX - INITIAL_CHOCO_MIN + 1));
  return String(n);
}

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL || "file:./dev.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const now = Math.floor(Date.now() / 1000);
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < MOCK_COUNT; i++) {
    const id = crypto.randomUUID();
    const email = `mock-${id.slice(0, 8)}@test.local`;
    const chocoBalance = randomChoco();

    try {
      await client.execute({
        sql: `INSERT INTO User (id, email, provider, chocoBalance, createdAt, updatedAt, emailVerified)
              VALUES (?, ?, 'local', ?, ?, ?, 0)
              ON CONFLICT(id) DO NOTHING`,
        args: [id, email, chocoBalance, now, now],
      });
      const info = (await client.execute({ sql: "SELECT changes() as n", args: [] })).rows[0] as { n?: number };
      if (info?.n && info.n > 0) {
        created++;
        console.log(`[OK] ${email} choco=${chocoBalance}`);
      } else {
        skipped++;
      }
    } catch (e) {
      console.error(`[FAIL] ${email}:`, e);
    }
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}, Total: ${MOCK_COUNT}`);
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
