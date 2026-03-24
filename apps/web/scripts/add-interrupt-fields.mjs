import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
    console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
    process.exit(1);
}

const client = createClient({ url, authToken });

async function run() {
    try {
        console.log("Adding interrupt fields to Message table...");

        // Add isInterrupted (integer in SQLite for boolean, default 0 for false)
        try {
            await client.execute('ALTER TABLE "Message" ADD COLUMN "isInterrupted" INTEGER NOT NULL DEFAULT 0');
            console.log("Added isInterrupted column");
        } catch (e) {
            console.log(`isInterrupted column: ${e.message}`);
        }

        // Add interruptedAt (integer for timestamp)
        try {
            await client.execute('ALTER TABLE "Message" ADD COLUMN "interruptedAt" INTEGER');
            console.log("Added interruptedAt column");
        } catch (e) {
            console.log(`interruptedAt column: ${e.message}`);
        }

        console.log("Migration completed successfully!");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        client.close();
    }
}

run();
