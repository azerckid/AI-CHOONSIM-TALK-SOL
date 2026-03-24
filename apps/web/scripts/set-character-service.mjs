/**
 * 캐릭터 서비스 상태 설정 (춘심, rina만 isOnline=1)
 * Usage: node scripts/set-character-service.mjs
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
const IN_SERVICE_IDS = ["chunsim", "rina"];

async function main() {
    await client.execute({
        sql: `UPDATE "Character" SET isOnline = 0, updatedAt = unixepoch() * 1000`,
        args: [],
    });
    for (const id of IN_SERVICE_IDS) {
        await client.execute({
            sql: `UPDATE "Character" SET isOnline = 1, updatedAt = unixepoch() * 1000 WHERE id = ?`,
            args: [id],
        });
    }
    const { rows } = await client.execute(`SELECT id, name, isOnline FROM "Character"`);
    console.log("Done. Character service status:");
    rows.forEach((r) => console.log(`  ${r.id} (${r.name}): ${r.isOnline ? "서비스 중" : "준비 중"}`));
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
