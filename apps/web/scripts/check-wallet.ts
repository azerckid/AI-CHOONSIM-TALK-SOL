import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.development" });

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const result = await client.execute({
    sql: `SELECT id, email, solanaWallet, chocoBalance FROM "User" WHERE email = ?`,
    args: ["azerckid@gmail.com"],
  });

  console.log("User row:", JSON.stringify(result.rows, null, 2));

  // Also check sessions
  const sessions = await client.execute({
    sql: `SELECT id, userId FROM session WHERE userId = ? LIMIT 3`,
    args: [result.rows[0]?.id as string],
  });
  console.log("Sessions:", JSON.stringify(sessions.rows, null, 2));

  client.close();
}

main().catch(console.error);
