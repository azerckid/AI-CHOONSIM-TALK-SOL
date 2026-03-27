import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.development" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:./dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// 1. mock 유저 수
const users = await client.execute(`SELECT COUNT(*) as cnt FROM User WHERE email LIKE 'mock-%@test.local'`);
console.log("Mock 유저 수:", users.rows[0].cnt);

// 2. ChocoConsumptionLog 전체 현황
const logTotal = await client.execute(`SELECT COUNT(*) as cnt, SUM(CAST(chocoAmount as REAL)) as total FROM ChocoConsumptionLog`);
console.log("ChocoConsumptionLog 전체:", logTotal.rows[0]);

// 3. isSynced별 현황
const syncStatus = await client.execute(`
  SELECT isSynced, COUNT(*) as cnt, SUM(CAST(chocoAmount as REAL)) as total
  FROM ChocoConsumptionLog GROUP BY isSynced
`);
console.log("isSynced 현황:", syncStatus.rows);

// 4. 캐릭터별 현황
const byChar = await client.execute(`
  SELECT characterId, isSynced, COUNT(*) as cnt, SUM(CAST(chocoAmount as REAL)) as total
  FROM ChocoConsumptionLog GROUP BY characterId, isSynced
`);
console.log("캐릭터별 현황:", byChar.rows);

// 5. 일별 분포
const daily = await client.execute(`
  SELECT date(createdAt, 'unixepoch') as day, COUNT(*) as cnt
  FROM ChocoConsumptionLog
  GROUP BY day ORDER BY day DESC LIMIT 10
`);
console.log("일별 분포:", daily.rows);

// 6. character 테이블 bondBaseId 확인
try {
  const chars = await client.execute(`SELECT id, bondBaseId FROM character LIMIT 10`);
  console.log("Character bondBaseId:", chars.rows);
} catch {
  const chars = await client.execute(`SELECT id FROM character LIMIT 10`);
  console.log("Character (컬럼명 확인 필요):", chars.rows);
}

await client.close();
