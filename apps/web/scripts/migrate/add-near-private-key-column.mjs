import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import { readFileSync } from "fs";

// 환경 변수 로드
dotenv.config({ path: ".env.development" });

const client = createClient({
    url: process.env.TURSO_DATABASE_URL || "",
    authToken: process.env.TURSO_AUTH_TOKEN || "",
});

async function main() {
    console.log("Adding nearPrivateKey column to User table...");

    try {
        // 컬럼이 이미 존재하는지 확인
        const checkResult = await client.execute({
            sql: `PRAGMA table_info("User")`,
        });

        const hasColumn = checkResult.rows.some(
            (row) => row.name === "nearPrivateKey"
        );

        if (hasColumn) {
            console.log("✅ nearPrivateKey column already exists. Skipping migration.");
            return;
        }

        // 컬럼 추가
        await client.execute({
            sql: `ALTER TABLE "User" ADD COLUMN "nearPrivateKey" text;`,
        });

        console.log("✅ Successfully added nearPrivateKey column to User table.");
    } catch (error) {
        console.error("❌ Error adding column:", error.message);
        process.exit(1);
    }
}

main()
    .then(() => {
        console.log("Migration completed.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Migration failed:", error);
        process.exit(1);
    });
