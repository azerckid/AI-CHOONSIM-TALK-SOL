import cron from "node-cron";
import { db } from "./db.server";
import * as schema from "../db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { generateProactiveMessage, type PersonaMode } from "./ai.server";
import { DateTime } from "luxon";
import webpush from "web-push";
import { logger } from "./logger.server";
import { BioSchema } from "./schemas/bio";

// VAPID 키 설정
const vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY!,
    privateKey: process.env.VAPID_PRIVATE_KEY!
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
    webpush.setVapidDetails(
        "mailto:example@yourdomain.com",
        vapidKeys.publicKey,
        vapidKeys.privateKey
    );
}

async function sendPushNotification(user: { name: string | null, pushSubscription: string | null }, content: string) {
    if (!user.pushSubscription) return;

    try {
        const subscription = JSON.parse(user.pushSubscription);
        const payload = JSON.stringify({
            title: "춘심이의 메시지",
            body: content,
            url: "/chats"
        });

        await webpush.sendNotification(subscription, payload);
    } catch (error) {
        logger.error({
            category: "SYSTEM",
            message: `Push Notification Error for ${user.name}`,
            stackTrace: (error as Error).stack
        });
    }
}

export function initCronJobs() {
    logger.info({ category: "SYSTEM", message: "Initializing Cron Jobs..." });

    // 1. Proactive Message Check (Every Minute)
    cron.schedule("* * * * *", async () => {
        const now = DateTime.now().setZone("Asia/Seoul").toFormat("HH:mm");

        try {
            const usersToCheckIn = await db.query.user.findMany({
                where: eq(schema.user.checkInTime, now),
                columns: { id: true, name: true, bio: true, pushSubscription: true },
            });

            if (usersToCheckIn.length > 0) {
                logger.info({
                    category: "SYSTEM",
                    message: `Starting proactive message delivery for ${usersToCheckIn.length} users`
                });
            }

            // 병렬 처리로 변경하여 실행 시간 단축
            const processUser = async (user: typeof usersToCheckIn[0]) => {
                try {
                    let conversation = await db.query.conversation.findFirst({
                        where: eq(schema.conversation.userId, user.id),
                        orderBy: [desc(schema.conversation.updatedAt)]
                    });

                    if (!conversation) {
                        const [newConv] = await db.insert(schema.conversation).values({
                            id: crypto.randomUUID(),
                            title: "춘심이와의 대화",
                            userId: user.id,
                            updatedAt: new Date(),
                        }).returning();
                        conversation = newConv;
                    }

                    if (!conversation) return;

                    let memory = "";
                    let personaMode: PersonaMode = "hybrid";
                    if (user.bio) {
                        try {
                            const bioData = BioSchema.parse(JSON.parse(user.bio));
                            memory = bioData.memory;
                            personaMode = bioData.personaMode ?? "hybrid";
                        } catch (e) {
                            logger.warn({
                                category: "SYSTEM",
                                message: `Failed to parse bio JSON for user ${user.id}`,
                                metadata: { userId: user.id, error: String(e) },
                            });
                        }
                    }

                    // AI API 호출에 타임아웃 설정 (30초)
                    const messageContent = await Promise.race([
                        generateProactiveMessage(user.name || "친구", memory, personaMode),
                        new Promise<string>((_, reject) =>
                            setTimeout(() => reject(new Error("AI API timeout")), 30000)
                        )
                    ]) as string;

                    const messageParts = messageContent.split('---').map(p => p.trim()).filter(p => p.length > 0);

                    for (const part of messageParts) {
                        await db.insert(schema.message).values({
                            id: crypto.randomUUID(),
                            role: "assistant",
                            content: part,
                            conversationId: conversation.id,
                            createdAt: new Date(),
                        });
                        await sendPushNotification(user, part);
                        if (messageParts.length > 1) await new Promise(resolve => setTimeout(resolve, 1500));
                    }
                } catch (error) {
                    logger.error({
                        category: "SYSTEM",
                        message: `Failed to process proactive message for user ${user.id}`,
                        stackTrace: (error as Error).stack
                    });
                }
            };

            // 병렬 처리: 최대 5개씩 동시 처리하여 과부하 방지
            const BATCH_SIZE = 5;
            for (let i = 0; i < usersToCheckIn.length; i += BATCH_SIZE) {
                const batch = usersToCheckIn.slice(i, i + BATCH_SIZE);
                await Promise.all(batch.map(processUser));
            }

            if (usersToCheckIn.length > 0) {
                logger.audit({ category: "SYSTEM", message: `Successfully delivered proactive messages to ${usersToCheckIn.length} users` });
            }
        } catch (error) {
            logger.error({
                category: "SYSTEM",
                message: "Proactive Message Cron Error",
                stackTrace: (error as Error).stack
            });
        }
    });



    // Phase 0-3: 레거시 Deposit Monitor 및 Wallet Creation Queue 제거됨
    // CTC 스윕 엔진은 Phase 0-4에서 별도 크론으로 추가 예정
}
