/**
 * User Context - Memory 계층
 *
 * 대화에서 기억 추출, 등급별 한도 적용, 한도 초과 시 정리 (명세 3.1, 4.3)
 */

import { extractMemoryCandidates } from "~/lib/ai.server";
import type { BaseMessage } from "@langchain/core/messages";
import { logger } from "~/lib/logger.server";
import { getMemoryItemCount, getMemoryItemsInEvictionOrder, deleteMemoryItemsByIds, addMemoryItem } from "./db";
import { getUserTier } from "./tier";
import { MEMORY_LIMIT_BY_TIER } from "./constants";
import { sanitizeForMemory } from "./pii-filter";

/** 한도 초과 시 오래된/낮은 중요도 순으로 제거하여 상한 이하로 유지 */
export async function evictOldMemoriesIfOverLimit(
    userId: string,
    characterId: string
): Promise<void> {
    const tier = await getUserTier(userId);
    const limit = MEMORY_LIMIT_BY_TIER[tier];
    if (limit === null) return;

    const current = await getMemoryItemCount(userId, characterId);
    if (current <= limit) return;

    const toRemove = current - limit;
    const candidates = await getMemoryItemsInEvictionOrder(userId, characterId, toRemove + 50);
    const idsToDelete = candidates.slice(0, toRemove).map((r) => r.id);
    if (idsToDelete.length > 0) {
        await deleteMemoryItemsByIds(userId, characterId, idsToDelete);
        logger.info?.({
            category: "SYSTEM",
            message: "Memory eviction (over limit)",
            metadata: { userId, characterId, tier, removed: idsToDelete.length },
        });
    }
}

/**
 * 대화에서 기억 후보 추출 → PII 필터 → 저장, 한도 초과 시 정리
 * 실패 시 로그만 남기고 예외 전파하지 않음 (대화 플로우 유지)
 */
export async function extractAndSaveMemoriesFromConversation(
    userId: string,
    characterId: string,
    messages: BaseMessage[],
    options?: { conversationId?: string }
): Promise<void> {
    try {
        const candidates = await extractMemoryCandidates(messages);
        if (!candidates || candidates.length === 0) return;

        for (const raw of candidates) {
            const sanitized = sanitizeForMemory(raw);
            if (!sanitized) continue;

            await addMemoryItem(userId, characterId, sanitized, {
                importance: 5,
                sourceConversationId: options?.conversationId,
            });
        }

        await evictOldMemoriesIfOverLimit(userId, characterId);
    } catch (err) {
        logger.error?.({
            category: "SYSTEM",
            message: "extractAndSaveMemoriesFromConversation failed",
            stackTrace: (err as Error).stack,
            metadata: { userId, characterId },
        });
    }
}
