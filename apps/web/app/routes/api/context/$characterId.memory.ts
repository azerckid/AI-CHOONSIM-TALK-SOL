/**
 * GET/POST/DELETE /api/context/:characterId/memory
 *
 * GET: 메모리 목록 조회 (최근순)
 * POST: 메모리 수동 추가 (명세 11.1)
 * DELETE: 메모리 삭제 (Body: { ids: string[] })
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";
import { auth } from "~/lib/auth.server";
import { getMemoryItems, addMemoryItem, deleteMemoryItemsByIds } from "~/lib/context/db";
import { CHARACTERS } from "~/lib/characters";
import { hasReachedMemoryLimit, getUserTier } from "~/lib/context/tier";
import { logger } from "~/lib/logger.server";

const addMemorySchema = z.object({
    content: z.string().min(1),
    category: z.enum(["preference", "event", "person", "worry", "goal", "fact", "other"]).optional().default("other"),
    importance: z.number().min(1).max(10).default(5),
});

const deleteMemorySchema = z.object({
    ids: z.array(z.string()).min(1),
});

export async function loader({ request, params }: LoaderFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const characterId = params.characterId;
    if (!characterId) return Response.json({ error: "characterId is required" }, { status: 400 });

    try {
        const memories = await getMemoryItems(session.user.id, characterId);
        return Response.json({ memories });
    } catch (e) {
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function action({ request, params }: ActionFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const characterId = params.characterId;
    if (!characterId) return Response.json({ error: "characterId is required" }, { status: 400 });

    if (request.method === "POST") {
        // limit check
        // Note: We need current count. getMemoryItems returns all, which might be inefficient for just count, 
        // but for now relying on existing db functions. 
        // Ideally we should have a count function or pass limit to getMemoryItems.
        // Assuming getMemoryItems is reasonably fast for now.
        const currentMemories = await getMemoryItems(session.user.id, characterId);
        const reachedLimit = await hasReachedMemoryLimit(session.user.id, currentMemories.length);

        if (reachedLimit) {
            const tier = await getUserTier(session.user.id);
            return Response.json({
                error: "Memory Limit Reached",
                message: `Your current tier (${tier}) has reached the maximum memory items limit.`
            }, { status: 403 });
        }

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const result = addMemorySchema.safeParse(body);
        if (!result.success) {
            return Response.json({ error: result.error.flatten() }, { status: 400 });
        }

        try {
            const memory = await addMemoryItem(
                session.user.id,
                characterId,
                result.data.content,
                {
                    category: result.data.category,
                    importance: result.data.importance
                }
            );
            return Response.json({ success: true, memory });
        } catch (e) {
            return Response.json({ error: "Failed to add memory" }, { status: 500 });
        }
    }

    if (request.method === "DELETE") {
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const result = deleteMemorySchema.safeParse(body);
        if (!result.success) {
            return Response.json({ error: result.error.flatten() }, { status: 400 });
        }

        try {
            logger.audit({
                category: "API",
                message: `Memory items deletion requested`,
                metadata: {
                    userId: session.user.id,
                    characterId,
                    action: "DELETE_MEMORY",
                    itemCount: result.data.ids.length,
                    timestamp: new Date().toISOString(),
                }
            });

            await deleteMemoryItemsByIds(session.user.id, characterId, result.data.ids);

            logger.audit({
                category: "API",
                message: `Memory items deleted successfully`,
                metadata: {
                    userId: session.user.id,
                    characterId,
                    action: "DELETE_MEMORY_SUCCESS",
                    itemCount: result.data.ids.length,
                    timestamp: new Date().toISOString(),
                }
            });

            return Response.json({ success: true });
        } catch (e) {
            logger.error({
                category: "API",
                message: "Failed to delete memories",
                metadata: { userId: session.user.id, characterId, error: String(e) }
            });
            return Response.json({ error: "Failed to delete memories" }, { status: 500 });
        }
    }

    return Response.json({ error: "Method not allowed" }, { status: 405 });
}
