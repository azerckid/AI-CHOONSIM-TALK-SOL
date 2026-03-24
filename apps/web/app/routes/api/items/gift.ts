import type { ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { z } from "zod";
import * as schema from "~/db/schema";
import { eq, and, sql, or } from "drizzle-orm";
import { logger } from "~/lib/logger.server";

const giftSchema = z.object({
    characterId: z.string(),
    itemId: z.string(),
    amount: z.number().min(1),
    message: z.string().optional(),
    conversationId: z.string(),
});

export async function action({ request }: ActionFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const result = giftSchema.safeParse(body);

    if (!result.success) {
        return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { characterId, itemId, amount, message, conversationId } = result.data;

    const item = await db.query.item.findFirst({
        where: eq(schema.item.id, itemId),
    });

    if (!item) {
        return Response.json({ error: "Item not found" }, { status: 404 });
    }

    if (!item.isActive) {
        return Response.json({ error: "Item is not currently available" }, { status: 400 });
    }

    try {
        return await db.transaction(async (tx) => {
            // 1. Check & Deduct from Inventory First
            const inventory = await tx.query.userInventory.findFirst({
                where: and(
                    eq(schema.userInventory.userId, session.user.id),
                    eq(schema.userInventory.itemId, itemId)
                )
            });

            if (inventory && inventory.quantity >= amount) {
                // Use Inventory
                await tx.update(schema.userInventory)
                    .set({ quantity: sql`${schema.userInventory.quantity} - ${amount}`, updatedAt: new Date() })
                    .where(and(
                        eq(schema.userInventory.userId, session.user.id),
                        eq(schema.userInventory.itemId, itemId)
                    ));
            } else {
                throw new Error("Insufficient hearts");
            }

            // 3. Check if this is a new giver (before updating CharacterStat)
            const existingGift = await tx.query.giftLog.findFirst({
                where: and(
                    eq(schema.giftLog.fromUserId, session.user.id),
                    eq(schema.giftLog.toCharacterId, characterId)
                ),
            });

            const isNewGiver = !existingGift;

            // 4. Calculate Emotion Expiry (Gambia Formula)
            const durationMinutes = amount >= 100 ? 30 : amount >= 50 ? 15 : amount >= 10 ? 5 : 1;
            const emotionExpiresAt = new Date(Date.now() + durationMinutes * 60000);
            const initialEmotion = amount >= 100 ? "LOVING" : amount >= 50 ? "EXCITED" : "JOY";

            // Upsert CharacterStat
            const existingStat = await tx.query.characterStat.findFirst({
                where: eq(schema.characterStat.characterId, characterId)
            });

            if (existingStat) {
                await tx.update(schema.characterStat)
                    .set({
                        totalHearts: sql`${schema.characterStat.totalHearts} + ${amount}`,
                        totalUniqueGivers: isNewGiver ? sql`${schema.characterStat.totalUniqueGivers} + 1` : undefined,
                        currentEmotion: initialEmotion,
                        emotionExpiresAt,
                        lastGiftAt: new Date(),
                        updatedAt: new Date(),
                    })
                    .where(eq(schema.characterStat.characterId, characterId));
            } else {
                await tx.insert(schema.characterStat).values({
                    id: crypto.randomUUID(),
                    characterId,
                    totalHearts: amount,
                    totalUniqueGivers: 1,
                    currentEmotion: initialEmotion,
                    emotionExpiresAt,
                    lastGiftAt: new Date(),
                    updatedAt: new Date(),
                });
            }

            // 5. Create GiftLog
            const [newGiftLog] = await tx.insert(schema.giftLog).values({
                id: crypto.randomUUID(),
                fromUserId: session.user.id,
                toCharacterId: characterId,
                itemId,
                amount,
                message,
                createdAt: new Date(),
            }).returning();

            // 6. Create a system message for the chat to acknowledge the gift
            const [systemMsg] = await tx.insert(schema.message).values({
                id: crypto.randomUUID(),
                role: "assistant",
                content: `💝 **${session.user.name || "사용자"}**님이 ${item.name} **${amount}**개를 선물했습니다!`,
                conversationId,
                type: "TEXT",
                createdAt: new Date(),
            }).returning();

            // 7. Update mission progress (Gift missions)
            const giftMissions = await tx.query.mission.findMany({
                where: and(
                    eq(schema.mission.isActive, true),
                    or(
                        sql`${schema.mission.title} LIKE '%Gift%'`,
                        sql`${schema.mission.title} LIKE '%Heart%'`,
                        sql`${schema.mission.title} LIKE '%선물%'`,
                        sql`${schema.mission.description} LIKE '%gift%'`
                    )
                )
            });

            for (const mission of giftMissions) {
                const userMission = await tx.query.userMission.findFirst({
                    where: and(
                        eq(schema.userMission.userId, session.user.id),
                        eq(schema.userMission.missionId, mission.id)
                    )
                });

                if (!userMission || (userMission.status === "IN_PROGRESS" && userMission.progress < 100)) {
                    const newProgress = Math.min((userMission?.progress || 0) + 25, 100);

                    if (userMission) {
                        await tx.update(schema.userMission)
                            .set({
                                progress: newProgress,
                                status: newProgress === 100 ? "COMPLETED" : "IN_PROGRESS",
                                lastUpdated: new Date()
                            })
                            .where(and(
                                eq(schema.userMission.userId, session.user.id),
                                eq(schema.userMission.missionId, mission.id)
                            ));
                    } else {
                        await tx.insert(schema.userMission).values({
                            id: crypto.randomUUID(),
                            userId: session.user.id,
                            missionId: mission.id,
                            progress: newProgress,
                            status: newProgress === 100 ? "COMPLETED" : "IN_PROGRESS",
                            lastUpdated: new Date()
                        });
                    }
                }
            }

            return Response.json({ success: true, giftLog: newGiftLog, systemMsg });
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ category: "PAYMENT", message: "Gifting transaction error", stackTrace: (error as Error).stack });
        if (errorMessage === "Insufficient hearts") {
            return Response.json({ error: "Insufficient hearts" }, { status: 400 });
        }
        return Response.json({ error: "Gifting failed" }, { status: 500 });
    }
}
