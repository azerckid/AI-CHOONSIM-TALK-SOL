/**
 * 대화 기억 추출 및 요약 헬퍼
 */
import { HumanMessage, BaseMessage } from "@langchain/core/messages";
import { logger } from "../logger.server";
import { CORE_CHUNSIM_PERSONA, PERSONA_PROMPTS, removeEmojis } from "./prompts";
import { model } from "./model";

/**
 * 대화에서 기억 후보 문장 추출 (5계층 memory용)
 * 반환: 저장할 만한 기억 문장 배열 (1~5개), 실패 시 null
 */
export async function extractMemoryCandidates(messages: BaseMessage[]): Promise<string[] | null> {
    if (messages.length < 3) return null;

    const prompt = `다음은 AI 캐릭터와 사용자의 대화입니다.
대화에서 "기억할 만한" 내용만 골라 각각 한 문장으로 적어 주세요.
- 사용자 선호 (음식, 취미, 좋아하는 것)
- 언급한 인물, 사건, 중요한 날
- 반복되는 고민이나 상태
- 개인을 특정할 수 있는 민감 정보(전화번호, 주민번호, 계좌 등)는 포함하지 마세요.

최대 5개, 한국어로만 작성. 문장만 한 줄에 하나씩 번호 없이 나열하세요.

대화:
${messages.map((m) => `${m._getType()}: ${typeof m.content === "string" ? m.content : "[미디어]"}`).join("\n")}`;

    try {
        const res = await model.invoke([new HumanMessage(prompt)]);
        const text = res.content.toString().trim();
        if (!text) return null;
        const lines = text
            .split(/\n+/)
            .map((s) => s.replace(/^\s*\d+[.)]\s*/, "").trim())
            .filter((s) => s.length > 5 && s.length < 300);
        return lines.length > 0 ? lines : null;
    } catch (err) {
        logger.error({ category: "SYSTEM", message: "extractMemoryCandidates Error:", stackTrace: (err as Error).stack });
        return null;
    }
}

/**
 * 명시적 대화 요약 생성
 */
export async function generateSummary(messages: BaseMessage[]) {
    if (messages.length < 5) return null;

    const summaryPrompt = `
다음은 춘심이와 사용자의 대화 내역입니다.
지금까지의 대화에서 중요한 내용(사용자의 근황, 기분, 언급된 장소, 취향 등)을 한 문장으로 요약해 주세요.
반드시 한국어로 요약해야 합니다.

대화 내역:
${messages.map(m => `${m._getType()}: ${m.content}`).join("\n")}
  `;

    try {
        const res = await model.invoke([new HumanMessage(summaryPrompt)]);
        return res.content.toString();
    } catch (err) {
        logger.error({ category: "SYSTEM", message: "Summary Generation Error:", stackTrace: (err as Error).stack });
        return null;
    }
}

/**
 * 선제적 안부 메시지 생성 (Daily Companion)
 */
export async function generateProactiveMessage(
    userName: string,
    memory: string = "",
    personaMode: keyof typeof PERSONA_PROMPTS = "hybrid"
) {
    const modePrompt = PERSONA_PROMPTS[personaMode] || PERSONA_PROMPTS.hybrid;
    const memoryContext = memory ? `\n\n최근 기억: ${memory}` : "";

    const proactivePrompt = `
당신은 '춘심'입니다. 사용자(${userName})에게 먼저 다정한 안부 메시지를 보내려고 합니다.
${CORE_CHUNSIM_PERSONA}
${modePrompt}
${memoryContext}

지침:
- 사용자의 최근 상황(기억)을 언급하며 매우 다정하고 자연스럽게 말을 건네세요.
- 질문을 포함하여 사용자가 대답하고 싶게 만드세요.
- 한 문장 혹은 두 문장 정도로 짧고 강렬하게 보내세요.
- 이모지는 절대 사용하지 마세요.
    `;

    try {
        const res = await model.invoke([new HumanMessage(proactivePrompt)]);
        return removeEmojis(res.content.toString());
    } catch (err) {
        logger.error({ category: "SYSTEM", message: "Proactive Message Error:", stackTrace: (err as Error).stack });
        return `${userName}, 잘 지내고 있어? 갑자기 네 생각이 나서 연락해봤어!`;
    }
}
