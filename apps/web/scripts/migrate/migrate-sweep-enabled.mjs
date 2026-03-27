/**
 * 기존 사용자의 isSweepEnabled를 true로 업데이트하는 마이그레이션 스크립트
 * 
 * 실행 방법:
 * node scripts/migrate-sweep-enabled.mjs
 */

import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config({ path: ".env.development" });

const DATABASE_URL = process.env.TURSO_DATABASE_URL;
const AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!DATABASE_URL || !AUTH_TOKEN) {
    console.error("❌ Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set");
    process.exit(1);
}

const client = createClient({
    url: DATABASE_URL,
    authToken: AUTH_TOKEN,
});

async function main() {
    try {
        console.log("🚀 Starting isSweepEnabled migration...\n");

        // 1. 현재 상태 확인
        const currentState = await client.execute({
            sql: `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN isSweepEnabled = 1 THEN 1 ELSE 0 END) as enabled,
                SUM(CASE WHEN isSweepEnabled = 0 THEN 1 ELSE 0 END) as disabled,
                SUM(CASE WHEN isSweepEnabled IS NULL THEN 1 ELSE 0 END) as null_count
            FROM User`,
        });

        const stats = currentState.rows[0];
        console.log("📊 Current State:");
        console.log(`   Total Users: ${stats.total}`);
        console.log(`   Enabled (true): ${stats.enabled}`);
        console.log(`   Disabled (false): ${stats.disabled}`);
        console.log(`   Null: ${stats.null_count}\n`);

        // 2. null인 사용자들을 true로 업데이트 (false로 명시적으로 설정된 사용자는 유지)
        const result = await client.execute({
            sql: `UPDATE User 
                SET isSweepEnabled = 1 
                WHERE isSweepEnabled IS NULL`,
        });

        console.log(`✅ Updated ${result.rowsAffected} users (null → true)\n`);

        // 3. 최종 상태 확인
        const finalState = await client.execute({
            sql: `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN isSweepEnabled = 1 THEN 1 ELSE 0 END) as enabled,
                SUM(CASE WHEN isSweepEnabled = 0 THEN 1 ELSE 0 END) as disabled,
                SUM(CASE WHEN isSweepEnabled IS NULL THEN 1 ELSE 0 END) as null_count
            FROM User`,
        });

        const finalStats = finalState.rows[0];
        console.log("📊 Final State:");
        console.log(`   Total Users: ${finalStats.total}`);
        console.log(`   Enabled (true): ${finalStats.enabled}`);
        console.log(`   Disabled (false): ${finalStats.disabled}`);
        console.log(`   Null: ${finalStats.null_count}\n`);

        console.log("✅ Migration completed successfully!");

    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }

    process.exit(0);
}

main();
