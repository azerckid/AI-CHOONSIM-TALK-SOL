import { createClient } from "@libsql/client";

async function main() {
  const client = createClient({ url: "file:./dev.db" });

  const migrations = [
    {
      name: "add solanaWallet",
      sql: `ALTER TABLE "User" ADD COLUMN "solanaWallet" TEXT`,
    },
    {
      name: "add chocoBalance (if missing)",
      sql: `ALTER TABLE "User" ADD COLUMN "chocoBalance" TEXT DEFAULT '0'`,
    },
  ];

  for (const m of migrations) {
    try {
      await client.execute(m.sql);
      console.log(`✅ ${m.name}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("duplicate column") || msg.includes("already exists")) {
        console.log(`ℹ️  ${m.name} — already exists`);
      } else {
        console.error(`❌ ${m.name}:`, msg);
      }
    }
  }

  // Seed chocoBalance for test account
  try {
    await client.execute({
      sql: `UPDATE "User" SET chocoBalance = '500' WHERE email = 'azerckid@gmail.com'`,
      args: [],
    });
    console.log("✅ chocoBalance seeded for azerckid@gmail.com");
  } catch (e) {
    console.error("chocoBalance seed error:", e);
  }

  // Verify
  const result = await client.execute({
    sql: `SELECT id, email, solanaWallet, chocoBalance FROM "User" WHERE email = 'azerckid@gmail.com'`,
    args: [],
  });
  console.log("\nVerification:", JSON.stringify(result.rows, null, 2));

  client.close();
}

main().catch(console.error);
