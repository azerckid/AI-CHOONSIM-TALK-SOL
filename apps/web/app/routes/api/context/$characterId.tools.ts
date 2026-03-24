/**
 * GET/PUT /api/context/:characterId/tools
 * Tools 계층 조회·수정 (명세 11.1)
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";
import { auth } from "~/lib/auth.server";
import { updateUserTools } from "~/lib/context/tools";
import { getFullContextData } from "~/lib/context/db";
import { CHARACTERS } from "~/lib/characters";
import { logger } from "~/lib/logger.server";

const specialDateSchema = z.object({
    date: z.string().regex(/^\d{2}-\d{2}$/, "Format must be MM-DD"),
    description: z.string(),
});

const customRuleSchema = z.object({
    condition: z.string(),
    action: z.string(),
});

const updateToolsSchema = z.object({
    avoidTopics: z.array(z.string()).optional(),
    specialDates: z.array(specialDateSchema).optional(),
    enabledFeatures: z.array(z.string()).optional(),
    disabledFeatures: z.array(z.string()).optional(),
    customRules: z.array(customRuleSchema).optional(),
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
    return Response.json({ tools: context?.tools || {} });
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

    const result = updateToolsSchema.safeParse(body);
    if (!result.success) {
        return Response.json({ error: result.error.flatten() }, { status: 400 });
    }

    try {
        await updateUserTools(session.user.id, characterId, result.data);
        return Response.json({ success: true });
    } catch (e) {
        logger.error({ category: "API", message: "Failed to update tools", stackTrace: (e as Error).stack });
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
