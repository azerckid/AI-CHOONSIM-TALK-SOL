import { db } from "../../app/lib/db.server";
import * as schema from "../../app/db/schema";
import { CHARACTERS } from "../../app/lib/characters";
import { eq } from "drizzle-orm";

async function migrate() {
    console.log("🚀 Starting character data migration...");

    for (const [id, charData] of Object.entries(CHARACTERS)) {
        console.log(`\n📦 Migrating character: ${charData.name} (${id})...`);

        // 1. 캐릭터 기본 정보 삽입 (또는 업데이트)
        const existingChar = await db.query.character.findFirst({
            where: eq(schema.character.id, id)
        });

        if (!existingChar) {
            await db.insert(schema.character).values({
                id: id,
                name: charData.name,
                role: charData.role,
                bio: charData.bio,
                personaPrompt: charData.personaPrompt,
                isOnline: charData.isOnline,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            console.log(`✅ Base character record created.`);
        } else {
            console.log(`ℹ️ Base character already exists, skipping insert.`);
        }

        // 2. 미디어 데이터 (Avatar) 삽입
        if (charData.avatarUrl) {
            const existingAvatar = await db.query.characterMedia.findFirst({
                where: (media, { and, eq }) => and(
                    eq(media.characterId, id),
                    eq(media.type, "AVATAR")
                )
            });

            if (!existingAvatar) {
                await db.insert(schema.characterMedia).values({
                    id: crypto.randomUUID(),
                    characterId: id,
                    url: charData.avatarUrl,
                    type: "AVATAR",
                    sortOrder: 0,
                    createdAt: new Date(),
                });
                console.log(`✅ Avatar media created.`);
            }
        }

        // 3. 미디어 데이터 (Gallery) 삽입
        if (charData.photoGallery && charData.photoGallery.length > 0) {
            for (let i = 0; i < charData.photoGallery.length; i++) {
                const url = charData.photoGallery[i];
                const existingGallery = await db.query.characterMedia.findFirst({
                    where: (media, { and, eq }) => and(
                        eq(media.characterId, id),
                        eq(media.url, url)
                    )
                });

                if (!existingGallery) {
                    await db.insert(schema.characterMedia).values({
                        id: crypto.randomUUID(),
                        characterId: id,
                        url: url,
                        type: "NORMAL",
                        sortOrder: i + 1,
                        createdAt: new Date(),
                    });
                }
            }
            console.log(`✅ Gallery media (Normal) processed.`);
        }

        // 4. 캐릭터 통계 데이터 생성
        const existingStats = await db.query.characterStat.findFirst({
            where: eq(schema.characterStat.characterId, id)
        });

        if (!existingStats) {
            await db.insert(schema.characterStat).values({
                id: crypto.randomUUID(),
                characterId: id,
                totalHearts: 0,
                updatedAt: new Date(),
            });
            console.log(`✅ Initial stats created.`);
        }
    }

    console.log("\n✨ Migration finished successfully!");
}

migrate().catch(err => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
});
