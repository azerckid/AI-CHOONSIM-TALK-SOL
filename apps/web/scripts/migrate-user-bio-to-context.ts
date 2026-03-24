/**
 * Phase 9: User.bio → 5계층 마이그레이션
 *
 * User.bio JSON의 memory 문자열을 추출해, 기본 캐릭터(chunsim)에 대해
 * UserContext 및 UserMemoryItem 1건을 생성한다.
 * 이미 해당 유저·캐릭터에 memory가 있으면 건너뛴다.
 *
 * 실행: npx tsx scripts/migrate-user-bio-to-context.ts
 * 사전: DB 백업 권장 (CRITICAL: DATABASE INTEGRITY RULE)
 */

import "dotenv/config";
import { db } from "../app/lib/db.server";
import * as schema from "../app/db/schema";
import {
    getOrCreateUserContext,
    addMemoryItem,
    getMemoryItemCount,
} from "../app/lib/context/db";

const DEFAULT_CHARACTER_ID = "chunsim";

interface BioData {
    memory?: string;
    lastMemoryUpdate?: string;
    personaMode?: string;
    [key: string]: unknown;
}

function parseBio(bio: string | null): BioData | null {
    if (!bio || typeof bio !== "string") return null;
    try {
        const data = JSON.parse(bio) as BioData;
        return data && typeof data === "object" ? data : null;
    } catch {
        return null;
    }
}

async function migrate() {
    console.log("Phase 9: User.bio → 5계층 마이그레이션 시작\n");

    const users = await db
        .select({ id: schema.user.id, email: schema.user.email, bio: schema.user.bio })
        .from(schema.user);

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of users) {
        const bioData = parseBio(user.bio);
        const memoryText =
            bioData?.memory && typeof bioData.memory === "string"
                ? bioData.memory.trim()
                : "";

        if (!memoryText) {
            skipped++;
            continue;
        }

        try {
            const count = await getMemoryItemCount(user.id, DEFAULT_CHARACTER_ID);
            if (count > 0) {
                skipped++;
                continue;
            }

            await getOrCreateUserContext(user.id, DEFAULT_CHARACTER_ID);
            await addMemoryItem(user.id, DEFAULT_CHARACTER_ID, memoryText, {
                importance: 8,
                category: "other",
            });

            migrated++;
            console.log(`  [OK] ${user.email ?? user.id} → ${DEFAULT_CHARACTER_ID}`);
        } catch (err) {
            failed++;
            console.error(`  [FAIL] ${user.email ?? user.id}:`, err);
        }
    }

    console.log("\n--- 결과 ---");
    console.log(`  전체 유저: ${users.length}`);
    console.log(`  이전 완료: ${migrated}`);
    console.log(`  건너뜀(비어있음/이미 있음): ${skipped}`);
    console.log(`  실패: ${failed}`);
}

migrate().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
