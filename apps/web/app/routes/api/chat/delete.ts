import { db } from "~/lib/db.server";
import { auth } from "~/lib/auth.server";
import { z } from "zod";
import type { ActionFunctionArgs } from "react-router";
import { deleteImage } from "~/lib/cloudinary.server";
import * as schema from "~/db/schema";
import { eq, isNotNull, and } from "drizzle-orm";
import { deleteUserContext } from "~/lib/context/db";
import { logger } from "~/lib/logger.server";
import { BioSchema } from "~/lib/schemas/bio";

const deleteSchema = z.object({
    conversationId: z.string().uuid(),
    resetMemory: z.boolean().optional().default(false),
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
    const result = deleteSchema.safeParse(body);

    if (!result.success) {
        return Response.json({ error: result.error.flatten() }, { status: 400 });
    }

    const { conversationId, resetMemory } = result.data;

    try {
        // 1. 해당 대화방의 이미지 메시지 찾기
        const messagesWithMedia = await db.query.message.findMany({
            where: and(
                eq(schema.message.conversationId, conversationId),
                isNotNull(schema.message.mediaUrl)
            ),
            columns: { mediaUrl: true }
        });

        // 2. Cloudinary에서 이미지 삭제
        for (const msg of messagesWithMedia) {
            if (msg.mediaUrl) {
                await deleteImage(msg.mediaUrl);
            }
        }

        // 3. DB 데이터 삭제 (트랜잭션 권장)
        await db.transaction(async (tx) => {
            // 메시지 삭제
            await tx.delete(schema.message)
                .where(eq(schema.message.conversationId, conversationId));

            // 대화방 삭제 (기억 초기화가 아닐 때만)
            if (!resetMemory) {
                // Fetch characterId before deleting if needed for context reset?
                // Actually resetMemory logic is separate.
                await tx.delete(schema.conversation)
                    .where(eq(schema.conversation.id, conversationId));
            }

            // 기억 초기화 요청이 있는 경우
            if (resetMemory) {
                const user = await tx.query.user.findFirst({
                    where: eq(schema.user.id, session.user.id),
                    columns: { bio: true }
                });

                if (user?.bio) {
                    try {
                        const bioData = BioSchema.parse(JSON.parse(user.bio));
                        const { memory: _m, lastMemoryUpdate: _l, ...rest } = bioData;
                        await tx.update(schema.user)
                            .set({ bio: JSON.stringify(rest), updatedAt: new Date() })
                            .where(eq(schema.user.id, session.user.id));
                    } catch (e) {
                        logger.warn({ category: "DB", message: "Failed to reset legacy bio memory", stackTrace: e instanceof Error ? e.stack : String(e) });
                    }
                }
            }

            // [Phase 8] 5계층 컨텍스트 삭제 (Legacy bio 삭제와 병행)
            if (resetMemory) {
                // 대화방 정보로 캐릭터 ID 조회
                const conversation = await tx.query.conversation.findFirst({
                    where: eq(schema.conversation.id, conversationId),
                    columns: { characterId: true }
                });

                if (conversation?.characterId) {
                    // 참고: tx 내부가 아니지만 별도 호출. 실패해도 치명적이지 않음 (로그만 남김)
                    // 하지만 async/await 안에서 호출하므로 순차 실행됨.
                    // tx 밖에서 실행해야 할 수도 있음 (deleteUserContext가 내부적으로 db 호출하므로)
                    // deleteUserContext는 db.delete를 쓰므로 트랜잭션과 섞이면 데드락 가능성? 
                    // 여기선 에러 핸들링만 감싸서 호출.
                    try {
                        await deleteUserContext(session.user.id, conversation.characterId);
                    } catch (e) {
                        logger.error({ category: "DB", message: "Failed to reset user context layers", stackTrace: (e as Error).stack });
                    }
                }
            }
        });

        return Response.json({ success: true });
    } catch (error) {
        logger.error({ category: "API", message: "Delete conversation error", stackTrace: (error as Error).stack });
        return Response.json({ error: "Failed to delete conversation" }, { status: 500 });
    }
}

