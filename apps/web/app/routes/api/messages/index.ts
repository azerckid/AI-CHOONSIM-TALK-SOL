import { db } from "~/lib/db.server";
import { auth } from "~/lib/auth.server";
import { z } from "zod";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import * as schema from "~/db/schema";
import { eq, and, sql, or } from "drizzle-orm";

const messageSchema = z.object({
    content: z.string().min(1),
    conversationId: z.string().uuid(),
});

export async function loader({ request }: LoaderFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(request.url);
    const conversationId = url.searchParams.get("conversationId");

    if (!conversationId) {
        return new Response("Missing conversationId", { status: 400 });
    }

    const messages = await db.query.message.findMany({
        where: eq(schema.message.conversationId, conversationId),
        orderBy: [schema.message.createdAt],
    });

    return Response.json({ messages });
}

export async function action({ request }: ActionFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
    }

    const body = await request.json();
    const result = messageSchema.safeParse(body);

    if (!result.success) {
        return Response.json({ error: result.error.flatten() }, { status: 400 });
    }

    const { content, conversationId } = result.data;

    // 1. 사용자 메시지 저장
    const [userMessage] = await db.insert(schema.message).values({
        id: crypto.randomUUID(),
        role: "user",
        content,
        conversationId,
        senderId: session.user.id,
        createdAt: new Date(),
    }).returning();

    // 2. 미션 진행도 업데이트 (채팅 미션)
    const chatMissions = await db.query.mission.findMany({
        where: and(
            eq(schema.mission.isActive, true),
            or(
                sql`${schema.mission.title} LIKE '%Chat%'`,
                sql`${schema.mission.title} LIKE '%Message%'`,
                sql`${schema.mission.title} LIKE '%채팅%'`,
                sql`${schema.mission.description} LIKE '%chat%'`
            )
        )
    });

    for (const mission of chatMissions) {
        const userMission = await db.query.userMission.findFirst({
            where: and(
                eq(schema.userMission.userId, session.user.id),
                eq(schema.userMission.missionId, mission.id)
            )
        });

        if (!userMission || (userMission.status === "IN_PROGRESS" && userMission.progress < 100)) {
            const newProgress = Math.min((userMission?.progress || 0) + 20, 100);

            await db.insert(schema.userMission).values({
                id: crypto.randomUUID(),
                userId: session.user.id,
                missionId: mission.id,
                progress: newProgress,
                status: newProgress === 100 ? "COMPLETED" : "IN_PROGRESS",
                lastUpdated: new Date(),
            }).onConflictDoUpdate({
                target: [schema.userMission.userId, schema.userMission.missionId],
                set: {
                    progress: newProgress,
                    status: newProgress === 100 ? "COMPLETED" : "IN_PROGRESS",
                    lastUpdated: new Date()
                }
            });
        }
    }

    return Response.json({ message: userMessage });
}

