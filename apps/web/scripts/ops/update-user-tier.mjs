import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config();

const client = createClient({
    url: process.env.TURSO_DATABASE_URL || "",
    authToken: process.env.TURSO_AUTH_TOKEN || "",
});

async function main() {
    const userName = process.argv[2];
    const tier = process.argv[3];
    const credits = process.argv[4];

    if (!userName) {
        console.log("Usage: node scripts/update-user-tier.mjs <name_or_email> [tier] [credits]");
        console.log("Example: node scripts/update-user-tier.mjs \"bill\" ULTIMATE 5000");
        process.exit(1);
    }

    console.log(`Searching for user: ${userName}...`);

    try {
        // 먼저 사용자 찾기
        const result = await client.execute({
            sql: `SELECT id, name, email, subscriptionTier, credits, subscriptionStatus FROM User WHERE name = ? OR email = ? OR email LIKE ? LIMIT 1`,
            args: [userName, userName, `%${userName}%`]
        });

        if (result.rows.length === 0) {
            console.log(`❌ User "${userName}" not found.`);
            console.log("\nAvailable users:");
            const allUsers = await client.execute(`SELECT id, name, email, subscriptionTier, credits FROM User LIMIT 15`);
            allUsers.rows.forEach(row => {
                console.log(`  - ${row.name || 'N/A'} (${row.email}) | Tier: ${row.subscriptionTier || 'FREE'} | Credits: ${row.credits}`);
            });
            process.exit(1);
        }

        const user = result.rows[0];
        console.log(`\nFound user: ${user.name || 'N/A'} (${user.email})`);
        console.log(`Current State -> Tier: ${user.subscriptionTier || 'FREE'}, Status: ${user.subscriptionStatus || 'N/A'}, Credits: ${user.credits}`);

        // 업데이트 쿼리 구성
        let updateFields = [];
        let args = [];

        if (tier) {
            updateFields.push("subscriptionTier = ?");
            args.push(tier.toUpperCase());

            // 티어를 수동으로 줄 때는 상태를 ACTIVE로 강제 설정
            updateFields.push("subscriptionStatus = ?");
            args.push("ACTIVE");

            // 기간 만료일도 한 달 뒤로 설정 (테스트 편의성)
            const oneMonthLater = new Date();
            oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
            updateFields.push("currentPeriodEnd = ?");
            args.push(oneMonthLater.toISOString());
        }

        if (credits !== undefined) {
            updateFields.push("credits = ?");
            args.push(parseInt(credits));
        }

        if (updateFields.length === 0) {
            console.log("⚠️ No updates specified (tier or credits).");
            process.exit(0);
        }

        args.push(user.id);
        const sql = `UPDATE User SET ${updateFields.join(", ")} WHERE id = ?`;

        // 업데이트 실행
        await client.execute({ sql, args });

        console.log(`\n✅ Successfully updated!`);

        // 확인
        const updated = await client.execute({
            sql: `SELECT name, email, subscriptionTier, subscriptionStatus, credits FROM User WHERE id = ?`,
            args: [user.id]
        });
        const finalUser = updated.rows[0];
        console.log(`New State     -> Tier: ${finalUser.subscriptionTier}, Status: ${finalUser.subscriptionStatus}, Credits: ${finalUser.credits}`);

    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }

    process.exit(0);
}

main();

