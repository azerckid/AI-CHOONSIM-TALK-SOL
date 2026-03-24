import { db } from "~/lib/db.server";
import { auth } from "~/lib/auth.server";
import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";
import * as schema from "~/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "~/lib/logger.server";

export async function action({ request, params }: ActionFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (request.method !== "POST" && request.method !== "DELETE") {
        return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const { id: messageId } = params;
    if (!messageId) {
        return Response.json({ error: "Message ID is required" }, { status: 400 });
    }

    const userId = session.user.id;

    try {
        // 메시지 존재 확인
        const message = await db.query.message.findFirst({
            where: eq(schema.message.id, messageId),
        });

        if (!message) {
            return Response.json({ error: "Message not found" }, { status: 404 });
        }

        // 기존 좋아요 확인
        const existingLike = await db.query.messageLike.findFirst({
            where: and(
                eq(schema.messageLike.messageId, messageId),
                eq(schema.messageLike.userId, userId)
            ),
        });

        if (request.method === "POST") {
            // 좋아요 추가
            if (existingLike) {
                return Response.json({ liked: true, message: "Already liked" });
            }

            await db.insert(schema.messageLike).values({
                id: crypto.randomUUID(),
                messageId,
                userId,
                createdAt: new Date(),
            });

            return Response.json({ liked: true });
        } else {
            // 좋아요 제거
            if (!existingLike) {
                return Response.json({ liked: false, message: "Not liked" });
            }

            await db.delete(schema.messageLike)
                .where(and(
                    eq(schema.messageLike.messageId, messageId),
                    eq(schema.messageLike.userId, userId)
                ));

            return Response.json({ liked: false });
        }
    } catch (error) {
        logger.error({ category: "API", message: "Message like/unlike error", stackTrace: (error as Error).stack });
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}

