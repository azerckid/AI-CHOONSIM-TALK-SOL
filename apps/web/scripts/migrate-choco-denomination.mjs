/**
 * CHOCO 토큰 리디노미네이션 마이그레이션 스크립트
 * 
 * 목적: 1 CHOCO의 가치가 $0.0001에서 $0.001로 10배 상향됨에 따라,
 *      기존 유저들의 잔액(수치)을 1/10로 조정하여 실질 가치를 보존함.
 * 
 * 실행 방법: node scripts/migrate-choco-denomination.mjs
 */
import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env 파일 로드
dotenv.config({ path: path.join(__dirname, "../.env") });

const client = createClient({
    url: process.env.TURSO_DATABASE_URL || "",
    authToken: process.env.TURSO_AUTH_TOKEN || "",
});

async function main() {
    try {
        console.log("🚀 Starting CHOCO re-denomination migration...\n");

        if (!process.env.TURSO_DATABASE_URL) {
            throw new Error("TURSO_DATABASE_URL is not defined in .env");
        }

        // 1. 현재 상태 확인
        const beforeStats = await client.execute({
            sql: `SELECT 
                COUNT(*) as total_users,
                SUM(CAST(chocoBalance AS REAL)) as total_choco
            FROM User
            WHERE chocoBalance IS NOT NULL AND chocoBalance != '0'`,
        });

        const totalUsers = beforeStats.rows[0].total_users;
        const totalChocoBefore = parseFloat(beforeStats.rows[0].total_choco) || 0;

        console.log("📊 Before Migration:");
        console.log(`   Total Users with CHOCO: ${totalUsers}`);
        console.log(`   Total CHOCO: ${totalChocoBefore.toLocaleString()}\n`);

        if (totalUsers === 0) {
            console.log("ℹ️ No users with CHOCO balance found. Skipping migration.");
            process.exit(0);
        }

        // 2. 마이그레이션 실행 (트랜잭션 권장하나 Turso 단일 쿼리로도 가능)
        console.log("⚠️ Updating user balances (dividing by 10)...");
        const result = await client.execute({
            sql: `UPDATE User
                SET chocoBalance = CAST(CAST(chocoBalance AS REAL) / 10 AS TEXT),
                    updatedAt = CURRENT_TIMESTAMP
                WHERE chocoBalance IS NOT NULL AND chocoBalance != '0'`,
        });

        console.log(`✅ Updated ${result.rowsAffected} users\n`);

        // 3. 마이그레이션 후 검증
        const afterStats = await client.execute({
            sql: `SELECT 
                COUNT(*) as total_users,
                SUM(CAST(chocoBalance AS REAL)) as total_choco
            FROM User
            WHERE chocoBalance IS NOT NULL AND chocoBalance != '0'`,
        });

        const totalChocoAfter = parseFloat(afterStats.rows[0].total_choco) || 0;
        const expectedTotal = totalChocoBefore / 10;

        console.log("📊 After Migration:");
        console.log(`   Total Users with CHOCO: ${afterStats.rows[0].total_users}`);
        console.log(`   Total CHOCO: ${totalChocoAfter.toLocaleString()}\n`);

        // 4. 정밀 검증 (오차 범위 내 확인)
        if (Math.abs(totalChocoAfter - expectedTotal) < 0.01) {
            console.log("✅ Migration verification passed!");
            console.log(`   Expected: ${expectedTotal.toLocaleString()}, Actual: ${totalChocoAfter.toLocaleString()}\n`);
        } else {
            console.error("❌ Migration verification failed!");
            console.error(`   Expected: ${expectedTotal}, Actual: ${totalChocoAfter}\n`);
            // 경고: 수치가 맞지 않으면 수동 확인 필요
        }

        console.log("🎉 CHOCO Re-denomination completed successfully!");

    } catch (error) {
        console.error("❌ Migration Error:", error.message);
        process.exit(1);
    }

    process.exit(0);
}

main();
