/**
 * User Context - Tools 계층
 *
 * 규칙, 회피 주제, 특별한 날 등 기능적 제어 (명세 2.4, 4.4)
 */

import { getFullContextData, updateTools } from "./db";
import { type ToolsDoc, DEFAULT_TOOLS, type UserContextData } from "./types";
import { truncateToTokenLimit } from "./token-budget";

/**
 * Tools 정보 갱신
 */
export async function updateUserTools(
    userId: string,
    characterId: string,
    updates: Partial<ToolsDoc>
): Promise<void> {
    const context = await getFullContextData(userId, characterId);
    const prevTools = context?.tools || DEFAULT_TOOLS;

    const nextTools: ToolsDoc = {
        ...prevTools,
        ...updates
    };

    await updateTools(userId, characterId, nextTools);
}

/**
 * 프롬프트 주입용 Tools 문자열 생성
 * 예: "[GUIDELINES] Avoid: 정치 / Start: 생일"
 * @param maxTokens 계층 토큰 상한 (미지정 시 무제한)
 */
export async function compressToolsForPrompt(
    userId: string,
    characterId: string,
    maxTokens?: number,
    preloadedContext?: UserContextData | null
): Promise<string> {
    const context = preloadedContext !== undefined ? preloadedContext : await getFullContextData(userId, characterId);
    const tools = context?.tools;

    if (!tools) return "";

    const lines: string[] = [];

    // 1. 회피 주제
    if (tools.avoidTopics && tools.avoidTopics.length > 0) {
        lines.push(`- 피해야 할 대화 주제: ${tools.avoidTopics.join(", ")}`);
    }

    // 2. 특별한 날 (오늘 날짜와 매칭되면 강조)
    if (tools.specialDates && tools.specialDates.length > 0) {
        const today = new Date();
        const mmdd = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const upcomingEvents = tools.specialDates.map(d => {
            const isToday = d.date === mmdd;
            return `${d.description} (${d.date})${isToday ? " <--- [오늘입니다! 축하/언급 필수]" : ""}`;
        });
        lines.push(`- 기억해야 할 기념일: ${upcomingEvents.join(", ")}`);
    }

    // 3. 커스텀 규칙
    if (tools.customRules && tools.customRules.length > 0) {
        lines.push("- 사용자가 설정한 대화 규칙:");
        for (const rule of tools.customRules) {
            lines.push(`  * 조건: "${rule.condition}" -> 행동: "${rule.action}"`);
        }
    }

    if (lines.length === 0) return "";

    const raw = `[GUIDELINES & TOOLS]\n${lines.join("\n")}`;
    if (maxTokens != null && maxTokens > 0) {
        return truncateToTokenLimit(raw, maxTokens);
    }
    return raw;
}
