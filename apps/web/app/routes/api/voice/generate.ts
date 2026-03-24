/**
 * Phase 3-2: 보이스 메시지 TTS — 메시지 ID로 음성 생성, 보이스 티켓 차감
 * Related: docs/04_Logic_Progress/03_BM_IMPLEMENTATION_PLAN.md Phase 3-2
 */
import type { ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { z } from "zod";
import { textToSpeech, getVoiceIdForCharacter } from "~/lib/elevenlabs.server";

const VOICE_TICKET_ITEM_ID = "voice_ticket";

const bodySchema = z.object({
    messageId: z.string().min(1),
});

export async function action({ request }: ActionFunctionArgs) {
    if (request.method !== "POST") {
        return new Response(null, { status: 405 });
    }

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: z.infer<typeof bodySchema>;
    try {
        body = bodySchema.parse(await request.json());
    } catch {
        return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { messageId } = body;

    // 메시지 조회 및 대화 소유권 확인
    const msg = await db.query.message.findFirst({
        where: eq(schema.message.id, messageId),
        columns: { id: true, content: true, role: true, conversationId: true },
    });
    if (!msg || msg.role !== "assistant") {
        return Response.json({ error: "Message not found or not an assistant message" }, { status: 404 });
    }

    const conv = await db.query.conversation.findFirst({
        where: eq(schema.conversation.id, msg.conversationId),
        columns: { userId: true, characterId: true },
    });
    if (!conv || conv.userId !== session.user.id) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // 보이스 티켓 보유 및 차감
    const inventory = await db.query.userInventory.findFirst({
        where: and(
            eq(schema.userInventory.userId, session.user.id),
            eq(schema.userInventory.itemId, VOICE_TICKET_ITEM_ID),
            gt(schema.userInventory.quantity, 0)
        ),
        columns: { id: true, quantity: true },
    });
    if (!inventory) {
        return Response.json(
            { error: "No voice ticket available. Purchase from the shop." },
            { status: 400 }
        );
    }

    const voiceId = getVoiceIdForCharacter(conv.characterId);
    if (!voiceId) {
        return Response.json(
            { error: "Voice not configured. Set ELEVENLABS_VOICE_ID_CHOONSIM." },
            { status: 503 }
        );
    }

    const audioBuffer = await textToSpeech(msg.content, voiceId);
    if (!audioBuffer) {
        return Response.json(
            { error: "Failed to generate speech" },
            { status: 502 }
        );
    }

    // 티켓 1개 차감 (quantity > 0 조건으로 재조회하여 동시성 안전)
    await db.update(schema.userInventory)
        .set({
            quantity: inventory.quantity - 1,
            updatedAt: new Date(),
        })
        .where(
            and(
                eq(schema.userInventory.id, inventory.id),
                gt(schema.userInventory.quantity, 0)
            )
        );

    return new Response(new Uint8Array(audioBuffer), {
        status: 200,
        headers: {
            "Content-Type": "audio/mpeg",
            "Content-Length": String(audioBuffer.length),
        },
    });
}
