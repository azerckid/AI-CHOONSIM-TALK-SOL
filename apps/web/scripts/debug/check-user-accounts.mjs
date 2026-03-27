import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config();

const client = createClient({
    url: process.env.TURSO_DATABASE_URL || "",
    authToken: process.env.TURSO_AUTH_TOKEN || "",
});

async function main() {
    const args = process.argv.slice(2);
    const userIdentifier = args[0] || "Twitter User";

    try {
        // Find user
        let user;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (emailRegex.test(userIdentifier)) {
            const { rows } = await client.execute({
                sql: "SELECT id, email, name, provider, image, avatarUrl FROM User WHERE email = ?",
                args: [userIdentifier],
            });
            user = rows[0];
        } else {
            const { rows } = await client.execute({
                sql: "SELECT id, email, name, provider, image, avatarUrl FROM User WHERE id = ? OR name = ?",
                args: [userIdentifier, userIdentifier],
            });
            user = rows[0];
        }

        if (!user) {
            console.error(`❌ User not found.`);
            process.exit(1);
        }

        console.log(`\n📊 User 정보:`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Name: ${user.name || "NULL"}`);
        console.log(`   Email: ${user.email || "NULL"}`);
        console.log(`   Provider: ${user.provider || "NULL"}`);
        console.log(`   Image: ${user.image ? user.image.substring(0, 60) + "..." : "NULL"}`);
        console.log(`   AvatarUrl: ${user.avatarUrl || "NULL"}`);

        // Check accounts
        const { rows: accounts } = await client.execute({
            sql: "SELECT id, providerId, accountId, createdAt FROM account WHERE userId = ? ORDER BY createdAt DESC",
            args: [user.id],
        });

        console.log(`\n🔗 연결된 Account 레코드 (${accounts.length}개):`);
        if (accounts.length === 0) {
            console.log("   (없음)");
        } else {
            accounts.forEach((acc, idx) => {
                console.log(`   ${idx + 1}. Provider: ${acc.providerId}`);
                console.log(`      Account ID: ${acc.id}`);
                console.log(`      Provider Account ID: ${acc.accountId}`);
                console.log(`      Created: ${acc.createdAt}`);
            });
        }

    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }

    process.exit(0);
}

main();

