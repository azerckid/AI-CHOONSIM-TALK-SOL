/**
 * Phase 1-2 테스트용: 유저 세션 토큰 + 대화 ID 조회
 */
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "../app/db/schema";
import * as dotenv from "dotenv";
import { eq, desc, gt } from "drizzle-orm";

dotenv.config({ path: ".env.development" });

async function main() {
    const client = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const db = drizzle(client, { schema });

    // 유효한 세션 (만료 안 된 것)
    const sessions = await db.query.session.findMany({
        where: (s) => eq(s.userId, "n6F3rktVX2MEuqplpOJBAd3kq6sYh2TF") && gt(s.expiresAt, new Date()),
        orderBy: [desc(schema.session.expiresAt)],
        limit: 1,
    });

    if (sessions.length === 0) {
        console.log("❌ 유효한 세션 없음 — 앱에서 다시 로그인 필요");
        return;
    }

    const session = sessions[0];
    console.log("✅ 세션 토큰:", session.token);
    console.log("   만료:", session.expiresAt);

    // 대화 목록
    const convs = await db.query.conversation.findMany({
        where: eq(schema.conversation.userId, "n6F3rktVX2MEuqplpOJBAd3kq6sYh2TF"),
        orderBy: [desc(schema.conversation.updatedAt)],
        limit: 3,
    });

    console.log(`\n대화 목록 (${convs.length}개):`);
    for (const c of convs) {
        console.log(`  ID: ${c.id}  characterId: ${c.characterId}`);
    }
}

main().catch(console.error);
