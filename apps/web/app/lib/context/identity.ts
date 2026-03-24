/**
 * User Context - Identity 계층
 *
 * 닉네임, 호칭, 관계 정보 관리 (명세 2.2, 4.3)
 */

import { getFullContextData, updateIdentity } from "./db";
import { type IdentityDoc, DEFAULT_IDENTITY, type Honorific, type RelationshipType, type UserContextData } from "./types";
import { truncateToTokenLimit } from "./token-budget";

/**
 * Identity 정보 갱신 (Partial update)
 */
export async function updateUserIdentity(
    userId: string,
    characterId: string,
    updates: Partial<IdentityDoc>
): Promise<void> {
    const context = await getFullContextData(userId, characterId);
    const prevIdentity = context?.identity || DEFAULT_IDENTITY;

    const nextIdentity: IdentityDoc = {
        ...prevIdentity,
        ...updates
    };

    await updateIdentity(userId, characterId, nextIdentity);
}

/**
 * 프롬프트 주입용 Identity 문자열 생성
 * 예: "[Identity] User: 지훈(오빠), Relationship: 연인(반말)"
 * @param maxTokens 계층 토큰 상한 (미지정 시 무제한)
 */
export async function compressIdentityForPrompt(
    userId: string,
    characterId: string,
    maxTokens?: number,
    preloadedContext?: UserContextData | null
): Promise<string> {
    const context = preloadedContext !== undefined ? preloadedContext : await getFullContextData(userId, characterId);
    const identity = context?.identity || DEFAULT_IDENTITY;

    const namePart = identity.nickname
        ? identity.nickname
        : "이름 모름";

    const titlePart = identity.customTitle
        ? `("${identity.customTitle}"라고 부름)`
        : "";

    const relationPart = identity.relationshipType;
    const honorificPart = identity.honorific === "반말"
        ? "반말 사용"
        : identity.honorific === "존댓말"
            ? "존댓말 사용"
            : "반말/존댓말 혼용";

    const raw = `[USER INFO]
- 이름/호칭: ${namePart} ${titlePart}
- 관계: ${relationPart}
- 말투: ${honorificPart}
- 특이사항: ${identity.inferredTraits?.join(", ") || "없음"}`;
    if (maxTokens != null && maxTokens > 0) {
        return truncateToTokenLimit(raw, maxTokens);
    }
    return raw;
}
