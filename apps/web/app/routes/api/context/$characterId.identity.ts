/**
 * GET/PUT /api/context/:characterId/identity
 * Identity 계층 조회·수정 (명세 11.1 - 기본 기능)
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";
import { auth } from "~/lib/auth.server";
import { updateUserIdentity } from "~/lib/context/identity";
import { getFullContextData } from "~/lib/context/db";
import { CHARACTERS } from "~/lib/characters";
import { DEFAULT_IDENTITY } from "~/lib/context/types";
import { logger } from "~/lib/logger.server";

const updateIdentitySchema = z.object({
    nickname: z.string().max(20).optional(),
    honorific: z.enum(["반말", "존댓말", "혼합"]).optional(),
    relationshipType: z.enum(["팬", "친구", "연인", "동생", "오빠/언니"]).optional(),
    customTitle: z.string().max(20).optional(),
});

export async function loader({ request, params }: LoaderFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const characterId = params.characterId;
    if (!characterId) return Response.json({ error: "characterId is required" }, { status: 400 });
    if (!Object.prototype.hasOwnProperty.call(CHARACTERS, characterId)) {
        return Response.json({ error: "Unsupported character" }, { status: 400 });
    }

    const context = await getFullContextData(session.user.id, characterId);
    return Response.json({ identity: context?.identity || DEFAULT_IDENTITY });
}

export async function action({ request, params }: ActionFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const characterId = params.characterId;
    if (!characterId) return Response.json({ error: "characterId is required" }, { status: 400 });
    if (!Object.prototype.hasOwnProperty.call(CHARACTERS, characterId)) {
        return Response.json({ error: "Unsupported character" }, { status: 400 });
    }

    if (request.method !== "PUT") {
        return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = updateIdentitySchema.safeParse(body);
    if (!result.success) {
        return Response.json({ error: result.error.flatten() }, { status: 400 });
    }

    try {
        await updateUserIdentity(session.user.id, characterId, result.data);
        return Response.json({ success: true });
    } catch (e) {
        logger.error({ category: "API", message: "Failed to update identity", stackTrace: (e as Error).stack });
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
