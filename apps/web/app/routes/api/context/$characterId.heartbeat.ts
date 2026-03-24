/**
 * PUT /api/context/:characterId/heartbeat
 *
 * Heartbeat 갱신 (명세 11.1)
 * 대화 시작/종료 시 내부 함수로 호출하거나 REST로 트리거
 */

import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { auth } from "~/lib/auth.server";
import { updateHeartbeatContext } from "~/lib/context/heartbeat";
import { getFullContextData } from "~/lib/context/db";
import { CHARACTERS } from "~/lib/characters";
import { logger } from "~/lib/logger.server";

const updateHeartbeatSchema = z.object({
    /** true면 대화 종료 시점, false면 대화 시작 시점 */
    isEnd: z.boolean().optional().default(false),
});

export async function action({ request, params }: ActionFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const characterId = params.characterId;
    if (!characterId) {
        return Response.json({ error: "characterId is required" }, { status: 400 });
    }

    if (!Object.prototype.hasOwnProperty.call(CHARACTERS, characterId)) {
        return Response.json({ error: "Unsupported character" }, { status: 400 });
    }

    if (request.method !== "PUT") {
        return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    let body: unknown = {};
    try {
        const text = await request.text();
        if (text) {
            body = JSON.parse(text);
        }
    } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = updateHeartbeatSchema.safeParse(body);
    if (!result.success) {
        return Response.json({ error: result.error.flatten() }, { status: 400 });
    }

    try {
        await updateHeartbeatContext(session.user.id, characterId, result.data.isEnd);

        // 갱신된 heartbeat 반환
        const context = await getFullContextData(session.user.id, characterId);

        return Response.json({
            success: true,
            heartbeat: context?.heartbeat || null
        });
    } catch (e) {
        logger.error({ category: "API", message: "Failed to update heartbeat", stackTrace: (e as Error).stack });
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
