/**
 * User Context - Soul 계층
 *
 * 가치관, 꿈, 고민 등 내면의 깊은 정보 관리 (명세 2.3)
 * PREMIUM/ULTIMATE 티어 전용 기능
 */

import { getFullContextData, updateSoul } from "./db";
import { type SoulDoc, DEFAULT_SOUL, type UserContextData } from "./types";
import { getUserTier, type SubscriptionTier } from "./tier";
import { truncateToTokenLimit } from "./token-budget";

/**
 * Soul 정보 갱신 (Partial update)
 */
export async function updateUserSoul(
    userId: string,
    characterId: string,
    updates: Partial<SoulDoc>
): Promise<void> {
    const context = await getFullContextData(userId, characterId);
    const prevSoul = context?.soul || DEFAULT_SOUL;

    const nextSoul: SoulDoc = {
        ...prevSoul,
        ...updates
    };

    await updateSoul(userId, characterId, nextSoul);
}

/**
 * 프롬프트 주입용 Soul 문자열 생성
 * 예: "[DEEP MIND] Values: 자유, 성장 / Dreams: 세계일주"
 */
// [5.4] 등급에 따른 접근 제어: FREE/BASIC은 Soul 미지원
/**
 * @param maxTokens 계층 토큰 상한 (미지정 시 무제한)
 */
export async function compressSoulForPrompt(
    userId: string,
    characterId: string,
    tier?: SubscriptionTier,
    maxTokens?: number,
    preloadedContext?: UserContextData | null
): Promise<string> {
    const userTier = tier || await getUserTier(userId);

    // PREMIUM 이상, 또는 별도 허용 로직
    if (userTier === "FREE" || userTier === "BASIC") {
        return "";
    }

    const context = preloadedContext !== undefined ? preloadedContext : await getFullContextData(userId, characterId);
    const soul = context?.soul;

    if (!soul) return "";

    // 비어있는지 확인 (모든 키가 없거나 배열이 비었는지)
    const isEmpty =
        (!soul.lifePhase) &&
        (!soul.values || soul.values.length === 0) &&
        (!soul.dreams || soul.dreams.length === 0) &&
        (!soul.fears || soul.fears.length === 0) &&
        (!soul.recurringWorries || soul.recurringWorries.length === 0) &&
        (!soul.summary);

    if (isEmpty) return "";

    const lines: string[] = [];
    lines.push("[SOUL & DEEP MIND]");

    if (soul.lifePhase) lines.push(`- 현재 삶의 단계: ${soul.lifePhase}`);
    if (soul.values && soul.values.length > 0) lines.push(`- 핵심 가치관: ${soul.values.join(", ")}`);
    if (soul.dreams && soul.dreams.length > 0) lines.push(`- 꿈과 소망: ${soul.dreams.join(", ")}`);
    if (soul.fears && soul.fears.length > 0) lines.push(`- 두려움/약점: ${soul.fears.join(", ")}`);
    if (soul.recurringWorries && soul.recurringWorries.length > 0) lines.push(`- 마음의 짐(고민): ${soul.recurringWorries.join(", ")}`);
    if (soul.summary) lines.push(`- 내면 요약: ${soul.summary}`);

    const raw = lines.join("\n");
    if (maxTokens != null && maxTokens > 0) {
        return truncateToTokenLimit(raw, maxTokens);
    }
    return raw;
}
