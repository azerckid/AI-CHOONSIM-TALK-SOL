import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config();

const client = createClient({
    url: process.env.TURSO_DATABASE_URL || "",
    authToken: process.env.TURSO_AUTH_TOKEN || "",
});

async function main() {
    console.log("Checking and adding missing columns to remote Turso DB...");

    const tablesToUpdate = [
        { table: "User", column: "checkInTime", type: "TEXT" },
        { table: "User", column: "pushSubscription", type: "TEXT" },
        { table: "User", column: "subscriptionTier", type: "TEXT DEFAULT 'FREE'" },
        { table: "Message", column: "mediaUrl", type: "TEXT" },
        { table: "Message", column: "mediaType", type: "TEXT" },
    ];

    for (const item of tablesToUpdate) {
        try {
            await client.execute(`ALTER TABLE ${item.table} ADD COLUMN ${item.column} ${item.type};`);
            console.log(`✅ Added column ${item.table}.${item.column}`);
        } catch (e) {
            if (e.message.includes("duplicate column name") || e.message.includes("already exists")) {
                console.log(`ℹ️ Column ${item.table}.${item.column} already exists.`);
            } else {
                console.error(`❌ Error adding ${item.table}.${item.column}:`, e.message);
            }
        }
    }

    process.exit(0);
}

main();
