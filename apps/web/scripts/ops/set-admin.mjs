/**
 * 사용자 role을 ADMIN으로 설정
 * Usage: node scripts/set-admin.mjs <email>
 */
import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env.development") });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
    console.error("TURSO_DATABASE_URL required");
    process.exit(1);
}

const client = createClient({ url, authToken: authToken || undefined });

async function main() {
    const email = process.argv[2] || "azerckid@gmail.com";

    const { rows } = await client.execute({
        sql: `SELECT id, email, role FROM "User" WHERE email = ?`,
        args: [email],
    });

    if (rows.length === 0) {
        console.error(`User not found: ${email}`);
        process.exit(1);
    }

    const user = rows[0];
    console.log(`Found: ${user.email} (id: ${user.id}), current role: ${user.role || "USER"}`);

    await client.execute({
        sql: `UPDATE "User" SET role = 'ADMIN', updatedAt = unixepoch() * 1000 WHERE email = ?`,
        args: [email],
    });

    console.log(`Done. ${email} is now ADMIN.`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
