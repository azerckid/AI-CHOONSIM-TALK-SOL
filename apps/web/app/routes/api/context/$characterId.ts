/**
 * GET/DELETE /api/context/:characterId
 *
 * GET: 5계층 전체 데이터 조회 (명세 11.1)
 * DELETE: 컨텍스트 전체 초기화 (명세 11.1)
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { getFullContextData, deleteUserContext } from "~/lib/context/db";
import { CHARACTERS } from "~/lib/characters";
import { logger } from "~/lib/logger.server";
import {
    DEFAULT_HEARTBEAT,
    DEFAULT_IDENTITY,
    DEFAULT_SOUL,
    DEFAULT_TOOLS
} from "~/lib/context/types";

export async function loader({ request, params }: LoaderFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const characterId = params.characterId;
    if (!characterId) return Response.json({ error: "characterId is required" }, { status: 400 });
    if (!Object.prototype.hasOwnProperty.call(CHARACTERS, characterId)) {
        return Response.json({ error: "Unsupported character" }, { status: 400 });
    }

    const context = await getFullContextData(session.user.id, characterId);

    // 5계층 데이터 통합 반환
    return Response.json({
        characterId,
        heartbeat: context?.heartbeat || DEFAULT_HEARTBEAT,
        identity: context?.identity || DEFAULT_IDENTITY,
        soul: context?.soul || DEFAULT_SOUL,
        tools: context?.tools || DEFAULT_TOOLS,
        memoryCount: context?.memoryCount || 0
    });
}

export async function action({ request, params }: ActionFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const characterId = params.characterId;
    if (!characterId) return Response.json({ error: "characterId is required" }, { status: 400 });
    if (!Object.prototype.hasOwnProperty.call(CHARACTERS, characterId)) {
        return Response.json({ error: "Unsupported character" }, { status: 400 });
    }

    if (request.method !== "DELETE") {
        return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    try {
        // 삭제 전 감사 로그 기록
        logger.audit({
            category: "API",
            message: `User context deletion requested`,
            metadata: {
                userId: session.user.id,
                characterId,
                action: "DELETE_CONTEXT",
                timestamp: new Date().toISOString(),
            }
        });

        await deleteUserContext(session.user.id, characterId);

        // 삭제 완료 감사 로그
        logger.audit({
            category: "API",
            message: `User context deleted successfully`,
            metadata: {
                userId: session.user.id,
                characterId,
                action: "DELETE_CONTEXT_SUCCESS",
                timestamp: new Date().toISOString(),
            }
        });

        return Response.json({ success: true, message: "Context reset successfully" });
    } catch (e) {
        logger.error({
            category: "API",
            message: "Failed to delete context",
            metadata: { userId: session.user.id, characterId, error: String(e) }
        });
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
