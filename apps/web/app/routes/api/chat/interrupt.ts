import { db } from "~/lib/db.server";
import { auth } from "~/lib/auth.server";
import * as schema from "~/db/schema";
import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { forbiddenJson, isOwnedConversation } from "~/lib/chat/ownership.server";

const interruptSchema = z.object({
    conversationId: z.string().uuid(),
    content: z.string().min(1),
    isInterrupted: z.boolean().optional().default(true),
});

export async function action({ request }: ActionFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
    }

    const body = await request.json();
    const result = interruptSchema.safeParse(body);

    if (!result.success) {
        return Response.json({ error: result.error.flatten() }, { status: 400 });
    }

    const { conversationId, content } = result.data;

    const canAccess = await isOwnedConversation(conversationId, session.user.id);
    if (!canAccess) return forbiddenJson();

    // 중단된 메시지 저장
    const [createdMessage] = await db.insert(schema.message).values({
        id: crypto.randomUUID(),
        conversationId,
        role: "assistant",
        content: content.endsWith("...") ? content : content + "...",
        isInterrupted: true,
        interruptedAt: new Date(),
        createdAt: new Date(),
        type: "TEXT", // Default is TEXT but being explicit
    }).returning();

    return Response.json({ success: true, message: createdMessage });
}
