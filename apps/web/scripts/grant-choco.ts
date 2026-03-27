import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.development" });

const EMAIL = "azerckid@gmail.com";
const AMOUNT = "500";

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const result = await client.execute({
    sql: `UPDATE user SET chocoBalance = ?, updatedAt = datetime('now') WHERE email = ?`,
    args: [AMOUNT, EMAIL],
  });

  if (result.rowsAffected === 0) {
    console.log(`❌ 유저를 찾을 수 없습니다: ${EMAIL}`);
  } else {
    console.log(`✅ ${EMAIL} → ${AMOUNT} CHOCO 지급 완료`);
  }

  client.close();
}

main().catch(console.error);
