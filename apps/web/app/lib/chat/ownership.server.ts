import { and, eq } from "drizzle-orm";
import * as schema from "~/db/schema";
import { db } from "~/lib/db.server";

export function ownedConversationWhere(conversationId: string, userId: string) {
    return and(
        eq(schema.conversation.id, conversationId),
        eq(schema.conversation.userId, userId)
    );
}

export async function isOwnedConversation(conversationId: string, userId: string): Promise<boolean> {
    const conversation = await db.query.conversation.findFirst({
        where: ownedConversationWhere(conversationId, userId),
        columns: { id: true },
    });

    return Boolean(conversation);
}

export async function findOwnedMessage(messageId: string, userId: string) {
    const message = await db.query.message.findFirst({
        where: eq(schema.message.id, messageId),
    });

    if (!message) return null;

    const conversation = await db.query.conversation.findFirst({
        where: ownedConversationWhere(message.conversationId, userId),
        columns: {
            id: true,
            userId: true,
            characterId: true,
        },
    });

    if (!conversation) return null;

    return { message, conversation };
}

export function forbiddenJson() {
    return Response.json({ error: "Forbidden" }, { status: 403 });
}
