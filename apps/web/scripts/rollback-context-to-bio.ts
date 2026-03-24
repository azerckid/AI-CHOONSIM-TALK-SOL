/**
 * Phase 9 롤백: 5계층 memory → User.bio 역이전
 *
 * chunsim 캐릭터에 대한 UserMemoryItem을 읽어, content를 합쳐
 * User.bio.memory에 넣는다. (필요 시 복구용으로만 사용)
 * User.bio는 덮어쓰며, 기존 bio의 다른 필드(personaMode 등)는 유지한다.
 *
 * 실행: npx tsx scripts/rollback-context-to-bio.ts
 * 사전: DB 백업 권장
 */

import "dotenv/config";
import { db } from "../app/lib/db.server";
import * as schema from "../app/db/schema";
import { eq } from "drizzle-orm";
import { getMemoryItems } from "../app/lib/context/db";

const DEFAULT_CHARACTER_ID = "chunsim";

async function rollback() {
    console.log("Phase 9 롤백: 5계층 memory → User.bio 역이전\n");

    const userIds = await db
        .selectDistinct({ userId: schema.userMemoryItem.userId })
        .from(schema.userMemoryItem)
        .where(eq(schema.userMemoryItem.characterId, DEFAULT_CHARACTER_ID));

    let updated = 0;
    let failed = 0;

    for (const { userId } of userIds) {
        try {
            const items = await getMemoryItems(userId, DEFAULT_CHARACTER_ID, {
                limit: 100,
                includeArchived: false,
            });
            if (items.length === 0) continue;

            const memoryText = items
                .map((i) => i.content)
                .filter(Boolean)
                .join("\n\n");

            const [user] = await db
                .select({ bio: schema.user.bio })
                .from(schema.user)
                .where(eq(schema.user.id, userId));

            let bioData: Record<string, unknown> = {};
            if (user?.bio) {
                try {
                    bioData = JSON.parse(user.bio) as Record<string, unknown>;
                } catch {
                    /* ignore */
                }
            }

            bioData.memory = memoryText;
            bioData.lastMemoryUpdate = new Date().toISOString();

            await db
                .update(schema.user)
                .set({
                    bio: JSON.stringify(bioData),
                    updatedAt: new Date(),
                })
                .where(eq(schema.user.id, userId));

            updated++;
            console.log(`  [OK] ${userId} (${items.length} items)`);
        } catch (err) {
            failed++;
            console.error(`  [FAIL] ${userId}:`, err);
        }
    }

    console.log("\n--- 결과 ---");
    console.log(`  대상 유저: ${userIds.length}`);
    console.log(`  bio 갱신: ${updated}`);
    console.log(`  실패: ${failed}`);
}

rollback().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
