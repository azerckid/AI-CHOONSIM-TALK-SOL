import type { ActionFunctionArgs } from "react-router";
import { db } from "~/lib/db.server";
import { auth } from "~/lib/auth.server";
import { z } from "zod";
import * as schema from "~/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "~/lib/logger.server";

const createChatSchema = z.object({
    characterId: z.string(),
});

export async function action({ request }: ActionFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        return new Response("Unauthorized", { status: 401 });
    }

    // POST 요청만 허용
    if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    try {
        const body = await request.json();
        const result = createChatSchema.safeParse(body);

        if (!result.success) {
            return Response.json({ error: "Invalid character ID" }, { status: 400 });
        }

        const { characterId } = result.data;

        // 존재하는 캐릭터인지 확인
        const character = await db.query.character.findFirst({
            where: eq(schema.character.id, characterId),
            columns: { id: true, name: true, isOnline: true }
        });
        if (!character) {
            return Response.json({ error: "Character not found" }, { status: 404 });
        }
        if (!character.isOnline) {
            return Response.json({ error: "아직 서비스 준비 중인 캐릭터입니다." }, { status: 403 });
        }

        // 이미 존재하는 대화방이 있는지 확인
        const existingConversation = await db.query.conversation.findFirst({
            where: and(
                eq(schema.conversation.userId, session.user.id),
                eq(schema.conversation.characterId, characterId)
            ),
        });

        if (existingConversation) {
            return Response.json({ conversationId: existingConversation.id });
        }

        // 새 대화방 생성
        const [newConversation] = await db.insert(schema.conversation).values({
            id: crypto.randomUUID(),
            userId: session.user.id,
            characterId: characterId,
            title: character.name,
            updatedAt: new Date(),
        }).returning();

        if (!newConversation) {
            throw new Error("Failed to create conversation Record");
        }

        return Response.json({ conversationId: newConversation.id });

    } catch (error) {
        logger.error({ category: "API", message: "Create chat error", stackTrace: (error as Error).stack });
        return Response.json({ error: "Failed to create chat" }, { status: 500 });
    }
}

