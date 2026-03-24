/**
 * 유저의 인증 수단 확인 (password 여부, OAuth 여부)
 */
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "../app/db/schema";
import * as dotenv from "dotenv";
import { eq } from "drizzle-orm";

dotenv.config({ path: ".env.development" });

async function main() {
    const client = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const db = drizzle(client, { schema });

    const accounts = await db.query.account.findMany({
        where: eq(schema.account.userId, "n6F3rktVX2MEuqplpOJBAd3kq6sYh2TF"),
    });
    console.log("azerckid@gmail.com 인증 수단:");
    for (const a of accounts) {
        console.log(`  providerId: ${a.providerId}, accountId: ${a.accountId}`);
    }

    // 활성 세션 확인
    const sessions = await db.query.session.findMany({
        where: eq(schema.session.userId, "n6F3rktVX2MEuqplpOJBAd3kq6sYh2TF"),
        limit: 3,
        orderBy: (s, { desc }) => [desc(s.createdAt)],
    });
    console.log(`\n활성 세션 ${sessions.length}개:`);
    for (const s of sessions) {
        console.log(`  token: ${s.token.slice(0, 20)}... expires: ${s.expiresAt}`);
    }
}

main().catch(console.error);
