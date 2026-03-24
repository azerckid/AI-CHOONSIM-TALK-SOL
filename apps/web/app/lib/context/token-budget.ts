/**
 * 토큰 예산 모듈 (Phase 10.0b, 10.1)
 *
 * 계층별 상한·우선순위·동적 할당을 한 곳에서 관리.
 * 명세 12.1, 12.2: 계층별 최대 토큰, 대화 유형별 비중 조절
 */

import type { ConversationType } from "./conversation-classifier";

/** 계층별 토큰 상한 (명세 12.1 기준, 총 1,100) */
export const DEFAULT_LAYER_LIMITS = {
    memory: 500,
    heartbeat: 100,
    identity: 100,
    soul: 300,
    tools: 100,
} as const;

export type LayerBudget = {
    memory: number;
    heartbeat: number;
    identity: number;
    soul: number;
    tools: number;
};

/**
 * 대화 유형별 동적 토큰 할당 매트릭스 (명세 12.2)
 * - 첫 대화: identity↑, heartbeat↑ ("오랜만이야" 컨텍스트)
 * - 깊은 대화: soul↑ (고민 상담)
 * - 일상 대화: memory↑ (최근 언급 참조)
 * - 특별한 날: tools↑ (specialDates 우선)
 * 총합은 1,100 유지.
 */
const DYNAMIC_MATRIX: Record<ConversationType, LayerBudget> = {
    first: {
        memory: 350,
        heartbeat: 200,
        identity: 250,
        soul: 200,
        tools: 100,
    },
    deep: {
        memory: 400,
        heartbeat: 100,
        identity: 100,
        soul: 450,
        tools: 50,
    },
    daily: {
        memory: 600,
        heartbeat: 100,
        identity: 100,
        soul: 200,
        tools: 100,
    },
    special_day: {
        memory: 400,
        heartbeat: 100,
        identity: 100,
        soul: 200,
        tools: 300,
    },
};

/**
 * 대화 유형에 따른 계층별 토큰 예산 반환
 */
export function getLayerBudgets(conversationType: ConversationType): LayerBudget {
    return { ...DYNAMIC_MATRIX[conversationType] };
}

/**
 * 한글/영문 간이 토큰 추정: 1토큰 ≈ 2글자 (compress 모듈과 동일)
 */
export const CHARS_PER_TOKEN = 2;

/**
 * 토큰 수에 해당하는 최대 글자 수 (압축 시 상한)
 */
export function tokenBudgetToCharLimit(tokens: number): number {
    return tokens * CHARS_PER_TOKEN;
}

/**
 * 문자열을 토큰 추정치 기준으로 잘라 반환 (계층별 예산 준수용)
 */
export function truncateToTokenLimit(text: string, maxTokens: number): string {
    if (!text || maxTokens <= 0) return text;
    const maxChars = tokenBudgetToCharLimit(maxTokens);
    if (text.length <= maxChars) return text;
    return text.slice(0, maxChars).trimEnd() + "...";
}
