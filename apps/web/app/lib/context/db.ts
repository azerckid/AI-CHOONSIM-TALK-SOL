/**
 * User Context Database Operations
 *
 * (userId, characterId) 기준 UserContext 및 UserMemoryItem CRUD 헬퍼
 * 명세서: docs/features/chat/user-context-layers-spec.md
 */

import { eq, and, desc, asc, count, inArray } from "drizzle-orm";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import type {
    HeartbeatDoc,
    IdentityDoc,
    SoulDoc,
    ToolsDoc,
    UserContextData,
    MemoryItem,
} from "./types";
import { maskPII } from "./pii-filter";

// =============================================================================
// ID Generation
// =============================================================================

function generateContextId(userId: string, characterId: string): string {
    return `ctx_${userId}_${characterId}`;
}

function generateMemoryItemId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// =============================================================================
// UserContext Operations
// =============================================================================

/**
 * Get or create UserContext for a user-character pair
 */
export async function getOrCreateUserContext(
    userId: string,
    characterId: string
): Promise<typeof schema.userContext.$inferSelect> {
    const existing = await db
        .select()
        .from(schema.userContext)
        .where(
            and(
                eq(schema.userContext.userId, userId),
                eq(schema.userContext.characterId, characterId)
            )
        )
        .get();

    if (existing) {
        return existing;
    }

    const id = generateContextId(userId, characterId);
    const now = new Date();

    await db.insert(schema.userContext).values({
        id,
        userId,
        characterId,
        createdAt: now,
        updatedAt: now,
    });

    return (await db
        .select()
        .from(schema.userContext)
        .where(eq(schema.userContext.id, id))
        .get())!;
}

/**
 * Get UserContext (returns null if not exists)
 */
export async function getUserContext(
    userId: string,
    characterId: string
): Promise<typeof schema.userContext.$inferSelect | null> {
    const result = await db
        .select()
        .from(schema.userContext)
        .where(
            and(
                eq(schema.userContext.userId, userId),
                eq(schema.userContext.characterId, characterId)
            )
        )
        .get();

    return result ?? null;
}

/**
 * Update heartbeat document
 */
export async function updateHeartbeat(
    userId: string,
    characterId: string,
    heartbeat: HeartbeatDoc
): Promise<void> {
    const context = await getOrCreateUserContext(userId, characterId);

    await db
        .update(schema.userContext)
        .set({
            heartbeatDoc: JSON.stringify(heartbeat),
            updatedAt: new Date(),
        })
        .where(eq(schema.userContext.id, context.id));
}

/**
 * Update identity document
 */
export async function updateIdentity(
    userId: string,
    characterId: string,
    identity: IdentityDoc
): Promise<void> {
    const context = await getOrCreateUserContext(userId, characterId);

    await db
        .update(schema.userContext)
        .set({
            identityDoc: JSON.stringify(identity),
            updatedAt: new Date(),
        })
        .where(eq(schema.userContext.id, context.id));
}

/**
 * Update soul document
 */
export async function updateSoul(
    userId: string,
    characterId: string,
    soul: SoulDoc
): Promise<void> {
    const context = await getOrCreateUserContext(userId, characterId);

    await db
        .update(schema.userContext)
        .set({
            soulDoc: JSON.stringify(soul),
            updatedAt: new Date(),
        })
        .where(eq(schema.userContext.id, context.id));
}

/**
 * Update tools document
 */
export async function updateTools(
    userId: string,
    characterId: string,
    tools: ToolsDoc
): Promise<void> {
    const context = await getOrCreateUserContext(userId, characterId);

    await db
        .update(schema.userContext)
        .set({
            toolsDoc: JSON.stringify(tools),
            updatedAt: new Date(),
        })
        .where(eq(schema.userContext.id, context.id));
}

/**
 * Get full context data (parsed JSON documents + memory count)
 */
export async function getFullContextData(
    userId: string,
    characterId: string
): Promise<UserContextData | null> {
    const context = await getUserContext(userId, characterId);

    if (!context) {
        return null;
    }

    const memoryCountResult = await db
        .select({ count: count() })
        .from(schema.userMemoryItem)
        .where(
            and(
                eq(schema.userMemoryItem.userId, userId),
                eq(schema.userMemoryItem.characterId, characterId),
                eq(schema.userMemoryItem.isArchived, false)
            )
        )
        .get();

    return {
        characterId,
        heartbeat: context.heartbeatDoc ? JSON.parse(context.heartbeatDoc) : null,
        identity: context.identityDoc ? JSON.parse(context.identityDoc) : null,
        soul: context.soulDoc ? JSON.parse(context.soulDoc) : null,
        tools: context.toolsDoc ? JSON.parse(context.toolsDoc) : null,
        memoryCount: memoryCountResult?.count ?? 0,
    };
}

/**
 * Delete all context for a user-character pair
 */
export async function deleteUserContext(
    userId: string,
    characterId: string
): Promise<void> {
    // Delete memory items first
    await db
        .delete(schema.userMemoryItem)
        .where(
            and(
                eq(schema.userMemoryItem.userId, userId),
                eq(schema.userMemoryItem.characterId, characterId)
            )
        );

    // Delete context
    await db
        .delete(schema.userContext)
        .where(
            and(
                eq(schema.userContext.userId, userId),
                eq(schema.userContext.characterId, characterId)
            )
        );
}

/**
 * Delete all context for a user (all characters)
 */
export async function deleteAllUserContexts(userId: string): Promise<void> {
    await db
        .delete(schema.userMemoryItem)
        .where(eq(schema.userMemoryItem.userId, userId));

    await db
        .delete(schema.userContext)
        .where(eq(schema.userContext.userId, userId));
}

/**
 * Get all contexts for a user (all characters)
 * Returns summary information for each character context
 */
export async function getAllUserContexts(userId: string): Promise<Array<{
    characterId: string;
    heartbeat: HeartbeatDoc | null;
    identity: IdentityDoc | null;
    soul: SoulDoc | null;
    tools: ToolsDoc | null;
    memoryCount: number;
    updatedAt: Date | null;
}>> {
    const contexts = await db
        .select()
        .from(schema.userContext)
        .where(eq(schema.userContext.userId, userId))
        .orderBy(desc(schema.userContext.updatedAt));

    const results = await Promise.all(
        contexts.map(async (ctx) => {
            // Get memory count for this character
            const memoryCountResult = await db
                .select({ count: count() })
                .from(schema.userMemoryItem)
                .where(
                    and(
                        eq(schema.userMemoryItem.userId, userId),
                        eq(schema.userMemoryItem.characterId, ctx.characterId),
                        eq(schema.userMemoryItem.isArchived, false)
                    )
                )
                .get();

            return {
                characterId: ctx.characterId,
                heartbeat: ctx.heartbeatDoc ? JSON.parse(ctx.heartbeatDoc) as HeartbeatDoc : null,
                identity: ctx.identityDoc ? JSON.parse(ctx.identityDoc) as IdentityDoc : null,
                soul: ctx.soulDoc ? JSON.parse(ctx.soulDoc) as SoulDoc : null,
                tools: ctx.toolsDoc ? JSON.parse(ctx.toolsDoc) as ToolsDoc : null,
                memoryCount: memoryCountResult?.count || 0,
                updatedAt: ctx.updatedAt,
            };
        })
    );

    return results;
}

// =============================================================================
// UserMemoryItem Operations
// =============================================================================

/**
 * Add a memory item
 */
export async function addMemoryItem(
    userId: string,
    characterId: string,
    content: string,
    options?: {
        category?: string;
        importance?: number;
        sourceConversationId?: string;
        sourceMessageId?: string;
        expiresAt?: Date;
    }
): Promise<typeof schema.userMemoryItem.$inferSelect> {
    const id = generateMemoryItemId();
    const now = new Date();

    await db.insert(schema.userMemoryItem).values({
        id,
        userId,
        characterId,
        content: maskPII(content),
        category: options?.category,
        importance: options?.importance ?? 5,
        sourceConversationId: options?.sourceConversationId,
        sourceMessageId: options?.sourceMessageId,
        createdAt: now,
        expiresAt: options?.expiresAt,
        isArchived: false,
    });

    return (await db
        .select()
        .from(schema.userMemoryItem)
        .where(eq(schema.userMemoryItem.id, id))
        .get())!;
}

/**
 * Get memory items for a user-character pair
 */
export async function getMemoryItems(
    userId: string,
    characterId: string,
    options?: {
        limit?: number;
        includeArchived?: boolean;
    }
): Promise<Array<typeof schema.userMemoryItem.$inferSelect>> {
    let query = db
        .select()
        .from(schema.userMemoryItem)
        .where(
            and(
                eq(schema.userMemoryItem.userId, userId),
                eq(schema.userMemoryItem.characterId, characterId),
                options?.includeArchived
                    ? undefined
                    : eq(schema.userMemoryItem.isArchived, false)
            )
        )
        .orderBy(
            desc(schema.userMemoryItem.importance),
            desc(schema.userMemoryItem.createdAt)
        );

    if (options?.limit) {
        query = query.limit(options.limit) as typeof query;
    }

    return await query.all();
}

/**
 * Get memory items in eviction order (lowest importance, oldest first)
 * Used to trim over-limit items
 */
export async function getMemoryItemsInEvictionOrder(
    userId: string,
    characterId: string,
    limit: number
): Promise<Array<typeof schema.userMemoryItem.$inferSelect>> {
    return db
        .select()
        .from(schema.userMemoryItem)
        .where(
            and(
                eq(schema.userMemoryItem.userId, userId),
                eq(schema.userMemoryItem.characterId, characterId),
                eq(schema.userMemoryItem.isArchived, false)
            )
        )
        .orderBy(
            asc(schema.userMemoryItem.importance),
            asc(schema.userMemoryItem.createdAt)
        )
        .limit(limit)
        .all();
}

/**
 * Delete multiple memory items by id (same user/character)
 */
export async function deleteMemoryItemsByIds(
    userId: string,
    characterId: string,
    itemIds: string[]
): Promise<void> {
    if (itemIds.length === 0) return;
    await db
        .delete(schema.userMemoryItem)
        .where(
            and(
                eq(schema.userMemoryItem.userId, userId),
                eq(schema.userMemoryItem.characterId, characterId),
                inArray(schema.userMemoryItem.id, itemIds)
            )
        );
}

/**
 * Get memory item count (using SQL count for efficiency)
 */
export async function getMemoryItemCount(
    userId: string,
    characterId: string,
    includeArchived = false
): Promise<number> {
    const conditions = [
        eq(schema.userMemoryItem.userId, userId),
        eq(schema.userMemoryItem.characterId, characterId),
    ];

    if (!includeArchived) {
        conditions.push(eq(schema.userMemoryItem.isArchived, false));
    }

    const result = await db
        .select({ count: count() })
        .from(schema.userMemoryItem)
        .where(and(...conditions))
        .get();

    return result?.count ?? 0;
}

/**
 * Delete a specific memory item
 * Returns true if item existed and was deleted
 */
export async function deleteMemoryItem(
    userId: string,
    itemId: string
): Promise<boolean> {
    // Check if item exists first
    const existing = await db
        .select({ id: schema.userMemoryItem.id })
        .from(schema.userMemoryItem)
        .where(
            and(
                eq(schema.userMemoryItem.id, itemId),
                eq(schema.userMemoryItem.userId, userId)
            )
        )
        .get();

    if (!existing) {
        return false;
    }

    await db
        .delete(schema.userMemoryItem)
        .where(
            and(
                eq(schema.userMemoryItem.id, itemId),
                eq(schema.userMemoryItem.userId, userId)
            )
        );

    return true;
}

/**
 * Archive a memory item (soft delete)
 * Returns true if item existed and was archived
 */
export async function archiveMemoryItem(
    userId: string,
    itemId: string
): Promise<boolean> {
    // Check if item exists and is not already archived
    const existing = await db
        .select({ id: schema.userMemoryItem.id, isArchived: schema.userMemoryItem.isArchived })
        .from(schema.userMemoryItem)
        .where(
            and(
                eq(schema.userMemoryItem.id, itemId),
                eq(schema.userMemoryItem.userId, userId)
            )
        )
        .get();

    if (!existing || existing.isArchived) {
        return false;
    }

    await db
        .update(schema.userMemoryItem)
        .set({ isArchived: true })
        .where(
            and(
                eq(schema.userMemoryItem.id, itemId),
                eq(schema.userMemoryItem.userId, userId)
            )
        );

    return true;
}

/**
 * Update memory item importance
 * Returns true if item existed and was updated
 */
export async function updateMemoryImportance(
    userId: string,
    itemId: string,
    importance: number
): Promise<boolean> {
    // Check if item exists
    const existing = await db
        .select({ id: schema.userMemoryItem.id })
        .from(schema.userMemoryItem)
        .where(
            and(
                eq(schema.userMemoryItem.id, itemId),
                eq(schema.userMemoryItem.userId, userId)
            )
        )
        .get();

    if (!existing) {
        return false;
    }

    await db
        .update(schema.userMemoryItem)
        .set({ importance: Math.min(10, Math.max(1, importance)) })
        .where(
            and(
                eq(schema.userMemoryItem.id, itemId),
                eq(schema.userMemoryItem.userId, userId)
            )
        );

    return true;
}
