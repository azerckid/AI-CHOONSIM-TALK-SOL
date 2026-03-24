/**
 * User Context 5-Layer System Constants
 *
 * 등급별 memory 항목 상한 (명세 4.3)
 * 상세 제한은 app/lib/context/tier.ts TIER_LIMITS 참조
 */

import type { SubscriptionTier } from "./tier";

/** 등급별 memory 최대 항목 수 (null = 무제한) */
export const MEMORY_LIMIT_BY_TIER: Record<SubscriptionTier, number | null> = {
    FREE: 20,
    BASIC: 50,
    PREMIUM: 200,
    ULTIMATE: null,
};

/** 프롬프트 주입 시 memory 계층 최대 토큰 (명세 12.1) */
export const MEMORY_PROMPT_MAX_TOKENS = 500;

/** 프롬프트에 넣을 memory 항목 최대 개수 */
export const MEMORY_PROMPT_MAX_ITEMS = 10;
