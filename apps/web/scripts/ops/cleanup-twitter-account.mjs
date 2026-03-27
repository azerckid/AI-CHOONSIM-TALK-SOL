import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config();

const client = createClient({
    url: process.env.TURSO_DATABASE_URL || "",
    authToken: process.env.TURSO_AUTH_TOKEN || "",
});

async function main() {
    const args = process.argv.slice(2);
    const userIdentifier = args[0]; // email, name, 또는 userId

    if (!userIdentifier) {
        console.log("Usage: node scripts/cleanup-twitter-account.mjs <userIdentifier>");
        console.log("Example: node scripts/cleanup-twitter-account.mjs bill");
        console.log("Example: node scripts/cleanup-twitter-account.mjs user@example.com");
        process.exit(1);
    }

    console.log(`Finding user with identifier: ${userIdentifier}...`);

    try {
        // Find user by email, name, or ID
        let user;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (emailRegex.test(userIdentifier)) {
            const { rows } = await client.execute({
                sql: "SELECT id, email, name, provider FROM User WHERE email = ?",
                args: [userIdentifier],
            });
            user = rows[0];
        } else {
            const { rows } = await client.execute({
                sql: "SELECT id, email, name, provider FROM User WHERE id = ? OR name = ?",
                args: [userIdentifier, userIdentifier],
            });
            user = rows[0];
        }

        if (!user) {
            console.error(`❌ User with identifier "${userIdentifier}" not found.`);
            process.exit(1);
        }

        console.log(`✅ Found user: ${user.name || user.email} (${user.email})`);
        console.log(`   Current provider: ${user.provider || "NULL"}`);

        // Find Twitter account
        const { rows: twitterAccounts } = await client.execute({
            sql: "SELECT id, providerId, accountId, createdAt FROM account WHERE userId = ? AND providerId = 'twitter'",
            args: [user.id],
        });

        if (twitterAccounts.length === 0) {
            console.log("ℹ️  No Twitter account found for this user.");
            process.exit(0);
        }

        console.log(`\nFound ${twitterAccounts.length} Twitter account(s):`);
        twitterAccounts.forEach((acc, idx) => {
            console.log(`   ${idx + 1}. Account ID: ${acc.id}, Provider: ${acc.providerId}, Account ID: ${acc.accountId}`);
        });

        // Ask for confirmation
        console.log(`\n⚠️  This will delete all Twitter account records for user: ${user.name || user.email}`);
        console.log("   Press Ctrl+C to cancel, or wait 3 seconds to proceed...");
        
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Delete Twitter accounts
        const { rowsAffected } = await client.execute({
            sql: "DELETE FROM account WHERE userId = ? AND providerId = 'twitter'",
            args: [user.id],
        });

        console.log(`\n✅ Deleted ${rowsAffected} Twitter account record(s).`);

        // Check if user still has other accounts
        const { rows: remainingAccounts } = await client.execute({
            sql: "SELECT providerId FROM account WHERE userId = ?",
            args: [user.id],
        });

        if (remainingAccounts.length === 0) {
            console.log("⚠️  Warning: User has no remaining accounts. They may need to log in again.");
        } else {
            console.log(`\nRemaining accounts for this user:`);
            remainingAccounts.forEach((acc) => {
                console.log(`   - ${acc.providerId}`);
            });
        }

        // Show updated user info
        const { rows: updatedUser } = await client.execute({
            sql: "SELECT id, email, name, provider, image, avatarUrl FROM User WHERE id = ?",
            args: [user.id],
        });

        console.log(`\n📊 Updated user info:`);
        console.log(`   Provider: ${updatedUser[0].provider || "NULL"}`);
        console.log(`   Image: ${updatedUser[0].image ? updatedUser[0].image.substring(0, 50) + "..." : "NULL"}`);
        console.log(`   AvatarUrl: ${updatedUser[0].avatarUrl ? updatedUser[0].avatarUrl.substring(0, 50) + "..." : "NULL"}`);

    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }

    process.exit(0);
}

main();

