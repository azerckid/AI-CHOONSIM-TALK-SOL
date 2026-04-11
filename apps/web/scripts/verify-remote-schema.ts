import { createClient } from "@libsql/client";

const url = "libsql://choonsim-talk-sol-azerckid.aws-ap-northeast-1.turso.io";
const authToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzQzNzYzNzAsImlkIjoiMDE5ZDIxMTItOWYwMS03ZDU1LWJlZmYtNDhjNTZlMGQ3MjVlIiwicmlkIjoiN2FmMTQ1MTMtYTFkZi00ZDQ2LTlmODgtNWY0ZTc4OWVhNmJiIn0.t3-ShMw1WVXPSYy2WWBDZXfRWlXTsLIojAI34eE7sOwvz4yHz7IWq8TLeEtQja0vNcdg1R_4Se1NONDDmrcfCg";

async function verifySchema() {
    const client = createClient({ url, authToken });
    try {
        const result = await client.execute("PRAGMA table_info(UserMission)");
        console.log("Column list in UserMission:");
        console.table(result.rows.map(row => ({
            name: row.name,
            type: row.type,
            notnull: row.notnull
        })));
        
        const hasColumn = result.rows.some(row => row.name === "txSignature");
        if (hasColumn) {
            console.log("\n✅ SUCCESS: 'txSignature' column exists.");
        } else {
            console.log("\n❌ ERROR: 'txSignature' column is still missing.");
        }
    } catch (error) {
        console.error("Failed to fetch schema:", error);
    } finally {
        // client.close() if needed, but for simple script it will exit
    }
}

verifySchema();
