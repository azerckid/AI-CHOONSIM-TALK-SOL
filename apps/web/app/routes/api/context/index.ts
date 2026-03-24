/**
 * DELETE /api/context
 *
 * 해당 유저의 모든 캐릭터 5계층 컨텍스트 전체 삭제 (명세 7.1, 계획 8.2a).
 * 복구 불가이므로 body에 confirm: true 필요 (2단계 확인용).
 */

import type { ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { deleteAllUserContexts } from "~/lib/context/db";
import { z } from "zod";
import { logger } from "~/lib/logger.server";

const deleteAllSchema = z.object({
    confirm: z.literal(true, { message: "confirm must be true to delete all context" }),
});

export async function action({ request }: ActionFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    if (request.method !== "DELETE") {
        return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    let body: unknown = {};
    try {
        const text = await request.text();
        if (text) body = JSON.parse(text);
    } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = deleteAllSchema.safeParse(body);
    if (!parsed.success) {
        return Response.json({
            error: "Confirmation required",
            message: "삭제된 데이터는 복구할 수 없습니다. 전체 삭제를 원하면 body에 { confirm: true } 를 보내주세요.",
        }, { status: 400 });
    }

    try {
        logger.audit({
            category: "API",
            message: "User requested full context deletion (all characters)",
            metadata: {
                userId: session.user.id,
                action: "DELETE_ALL_CONTEXT",
                timestamp: new Date().toISOString(),
            },
        });

        await deleteAllUserContexts(session.user.id);

        logger.audit({
            category: "API",
            message: "Full user context deleted successfully",
            metadata: {
                userId: session.user.id,
                action: "DELETE_ALL_CONTEXT_SUCCESS",
                timestamp: new Date().toISOString(),
            },
        });

        return Response.json({ success: true, message: "All context has been deleted." });
    } catch (e) {
        logger.error({
            category: "API",
            message: "Failed to delete all context",
            metadata: { userId: session.user.id, error: String(e) },
        });
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
