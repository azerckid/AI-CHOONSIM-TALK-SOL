import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config();

const client = createClient({
    url: process.env.TURSO_DATABASE_URL || "",
    authToken: process.env.TURSO_AUTH_TOKEN || "",
});

async function main() {
    console.log("Adding unique constraint to session.token in remote Turso DB...");

    try {
        // SQLite에서는 CREATE UNIQUE INDEX를 사용하여 unique constraint 추가
        await client.execute(`
            CREATE UNIQUE INDEX IF NOT EXISTS "session_token_unique" ON "session"("token");
        `);
        console.log("✅ Unique index on session.token created successfully");
    } catch (e) {
        if (e.message.includes("already exists") || e.message.includes("duplicate")) {
            console.log("ℹ️ Unique index on session.token already exists.");
        } else {
            console.error("❌ Error creating unique index:", e.message);
            process.exit(1);
        }
    }

    process.exit(0);
}

main();

