/**
 * Mock 유저 소비 시뮬레이션 — 채팅(deductChocoForTokens 로직) 차등 소비
 * ChocoConsumptionLog 적재 → bondbase-sync가 BondBase로 전송
 *
 * 사용: cd apps/web && npx tsx scripts/run-mock-activity.ts
 *      ROUNDS=5 npx tsx scripts/run-mock-activity.ts  (기본 1회, 유저당 1~5회 랜덤)
 */
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.development" });

const CHARACTERS = ["chunsim", "rina"];
const TOKENS_MIN = 500;
const TOKENS_MAX = 2000;
const DEFAULT_ROUNDS = 1;

function randomInt(a: number, b: number): number {
  return a + Math.floor(Math.random() * (b - a + 1));
}

function chocoFromTokens(tokens: number): string {
  return String(Math.floor(tokens / 100));
}

async function main() {
  const rounds = Math.max(1, Number(process.env.ROUNDS) || DEFAULT_ROUNDS);
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
  let totalDeducted = 0;
  let totalLogs = 0;

  for (let r = 0; r < rounds; r++) {
    for (const u of users) {
      const tokens = randomInt(TOKENS_MIN, TOKENS_MAX);
      const chocoToDeduct = chocoFromTokens(tokens);
      const current = parseFloat(u.chocoBalance || "0");
      const deduct = parseInt(chocoToDeduct, 10);
      if (current < deduct) continue;

      const characterId = CHARACTERS[randomInt(0, CHARACTERS.length - 1)];
      const newBalance = current - deduct;

      const logId = crypto.randomUUID();

      await client.execute({
        sql: `INSERT INTO ChocoConsumptionLog (id, characterId, chocoAmount, source, isSynced, createdAt)
              VALUES (?, ?, ?, 'CHAT', 0, ?)`,
        args: [logId, characterId, chocoToDeduct, now],
      });

      await client.execute({
        sql: `UPDATE User SET chocoBalance = ?, updatedAt = ? WHERE id = ?`,
        args: [String(newBalance), now, u.id],
      });

      // ROUNDS > 1일 때 다음 라운드에서 올바른 잔액 사용을 위해 인메모리 값 동기화
      u.chocoBalance = String(newBalance);
      totalDeducted += deduct;
      totalLogs++;
    }
  }

  console.log(`[OK] ${totalLogs} consumption logs, ${totalDeducted} CHOCO deducted from ${users.length} mock users`);
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
