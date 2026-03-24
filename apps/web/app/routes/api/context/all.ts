/**
 * GET /api/context/all
 *
 * 본인의 모든 캐릭터 컨텍스트 목록 조회 (명세 11.1)
 * 캐릭터별 요약 정보 반환
 */

import type { LoaderFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { getAllUserContexts } from "~/lib/context/db";
import { CHARACTERS } from "~/lib/characters";
import { logger } from "~/lib/logger.server";

export async function loader({ request }: LoaderFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const contexts = await getAllUserContexts(session.user.id);

        // 캐릭터 정보와 함께 반환
        const enrichedContexts = contexts.map((ctx) => {
            const character = CHARACTERS[ctx.characterId as keyof typeof CHARACTERS];
            return {
                ...ctx,
                characterName: character?.name || ctx.characterId,
                characterAvatarUrl: character?.avatarUrl || "",
            };
        });

        return Response.json({
            contexts: enrichedContexts,
            totalCount: enrichedContexts.length,
        });
    } catch (e) {
        logger.error({ category: "API", message: "Failed to get all contexts", stackTrace: (e as Error).stack });
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
