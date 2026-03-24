/**
 * 대화 유형 분류기 (Phase 10.0a)
 *
 * 대화 맥락에서 유형을 판별하여 동적 토큰 할당에 사용.
 * 명세 12.2: 첫 대화 / 깊은 대화 / 일상 대화 / 특별한 날
 */

import type { ToolsDoc } from "./types";

/** 대화 유형 */
export type ConversationType = "first" | "deep" | "daily" | "special_day";

export interface ClassifierInput {
    /** 현재 대화의 메시지 수 (이번 요청 포함 전까지) */
    messageCount: number;
    /** 오늘이 해당 유저·캐릭터의 특별한 날인지 (tools.specialDates 기준) */
    isSpecialDateToday?: boolean;
    /** 최근 메시지 텍스트 (깊은 대화 판별용, 선택) */
    recentText?: string;
}

/** 깊은 대화(고민/상담) 추정 키워드 */
const DEEP_CONVERSATION_KEYWORDS = [
    "고민", "상담", "힘들", "조언", "도움", "우울", "걱정", "불안",
    "슬프", "힘들어", "어려워", "말해줘", "들어줘", "위로", "공감",
];

/**
 * 대화 유형 분류 (규칙 기반)
 * - first: 대화가 막 시작된 경우 (메시지 수 0~1)
 * - special_day: 오늘이 기념일 등 특별한 날
 * - deep: 최근 발화에 고민/상담 관련 키워드가 있는 경우
 * - daily: 그 외 일상 대화
 */
export function classifyConversation(input: ClassifierInput): ConversationType {
    if (input.messageCount <= 1) {
        return "first";
    }
    if (input.isSpecialDateToday === true) {
        return "special_day";
    }
    const text = (input.recentText ?? "").toLowerCase();
    const hasDeepKeyword = DEEP_CONVERSATION_KEYWORDS.some((kw) => text.includes(kw));
    if (hasDeepKeyword) {
        return "deep";
    }
    return "daily";
}

/**
 * tools 문서와 오늘 날짜로 특별한 날 여부 판별
 */
export function isSpecialDateToday(tools: ToolsDoc | null | undefined): boolean {
    if (!tools?.specialDates?.length) return false;
    const now = new Date();
    const mmdd = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return tools.specialDates.some((d) => d.date === mmdd);
}
