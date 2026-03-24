import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config();

const client = createClient({
    url: process.env.TURSO_DATABASE_URL || "",
    authToken: process.env.TURSO_AUTH_TOKEN || "",
});

async function main() {
    console.log("Creating Notification table in remote Turso DB...");

    try {
        await client.execute(`
            CREATE TABLE IF NOT EXISTS "Notification" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "userId" TEXT NOT NULL,
                "type" TEXT NOT NULL,
                "title" TEXT NOT NULL,
                "body" TEXT NOT NULL,
                "isRead" INTEGER NOT NULL DEFAULT false,
                "createdAt" INTEGER NOT NULL DEFAULT (unixepoch())
            );
        `);
        console.log("✅ Notification table created successfully");

        await client.execute(`
            CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx"
            ON "Notification" ("userId", "isRead");
        `);
        console.log("✅ Notification_userId_isRead_idx created");

        await client.execute(`
            CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx"
            ON "Notification" ("userId", "createdAt");
        `);
        console.log("✅ Notification_userId_createdAt_idx created");

    } catch (e) {
        if (e.message.includes("already exists") || e.message.includes("duplicate")) {
            console.log("ℹ️  Notification table already exists.");
        } else {
            console.error("❌ Error creating Notification table:", e.message);
            process.exit(1);
        }
    }

    process.exit(0);
}

main();
