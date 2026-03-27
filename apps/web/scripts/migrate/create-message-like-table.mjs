import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config();

const client = createClient({
    url: process.env.TURSO_DATABASE_URL || "",
    authToken: process.env.TURSO_AUTH_TOKEN || "",
});

async function main() {
    console.log("Creating MessageLike table in remote Turso DB...");

    try {
        await client.execute(`
            CREATE TABLE IF NOT EXISTS "MessageLike" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "messageId" TEXT NOT NULL,
                "userId" TEXT NOT NULL,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                UNIQUE("messageId", "userId")
            );
        `);
        console.log("✅ MessageLike table created successfully");
    } catch (e) {
        if (e.message.includes("already exists") || e.message.includes("duplicate")) {
            console.log("ℹ️ MessageLike table already exists.");
        } else {
            console.error("❌ Error creating MessageLike table:", e.message);
            process.exit(1);
        }
    }

    process.exit(0);
}

main();

