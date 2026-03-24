/**
 * GET/PUT /api/context/:characterId/soul
 * Soul 계층 조회·수정 (명세 11.1 - PREMIUM/ULTIMATE 전용)
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";
import { auth } from "~/lib/auth.server";
import { canUseSoul } from "~/lib/context/tier";
import { updateUserSoul } from "~/lib/context/soul";
import { getFullContextData } from "~/lib/context/db";
import { CHARACTERS } from "~/lib/characters";

const updateSoulSchema = z.object({
    values: z.array(z.string()).optional(),
    dreams: z.array(z.string()).optional(),
    fears: z.array(z.string()).optional(),
    recurringWorries: z.array(z.string()).optional(),
    lifePhase: z.string().optional(),
    summary: z.string().optional(),
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
    return Response.json({ soul: context?.soul || {} });
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

    const allowed = await canUseSoul(session.user.id);
    if (!allowed) {
        return Response.json({
            error: "Upgrade Required",
            message: "Soul context is available for PREMIUM plan and above."
        }, { status: 403 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = updateSoulSchema.safeParse(body);
    if (!result.success) {
        return Response.json({ error: result.error.flatten() }, { status: 400 });
    }

    try {
        await updateUserSoul(session.user.id, characterId, result.data);
        return Response.json({ success: true });
    } catch (e) {
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
