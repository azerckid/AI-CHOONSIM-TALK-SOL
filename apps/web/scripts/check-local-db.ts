import { createClient } from "@libsql/client";

async function main() {
  const client = createClient({ url: "file:./dev.db" });

  // All users
  const users = await client.execute(`SELECT id, email, solanaWallet, chocoBalance FROM "User" LIMIT 10`);
  console.log("Users in dev.db:", JSON.stringify(users.rows, null, 2));

  // Recent sessions
  const sessions = await client.execute(`SELECT id, userId FROM session ORDER BY rowid DESC LIMIT 5`);
  console.log("Sessions:", JSON.stringify(sessions.rows, null, 2));

  client.close();
}

main().catch(console.error);
