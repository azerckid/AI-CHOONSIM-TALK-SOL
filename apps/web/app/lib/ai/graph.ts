/**
 * LangGraph 워크플로우 — 춘심 AI 대화 그래프
 */
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { StateGraph, END, Annotation, START } from "@langchain/langgraph";
import { DateTime } from "luxon";
import { db } from "../db.server";
import * as schema from "../../db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../logger.server";
import {
    CORE_CHUNSIM_PERSONA,
    GUARDRAIL_BY_TIER,
    PERSONA_PROMPTS,
    applyCharacterName,
    removeEmojis,
    type SubscriptionTier,
} from "./prompts";
import { model, urlToBase64 } from "./model";
import { getChoonsimSolanaTools } from "../solana/agent-kit.server";

// 그래프 상태 정의
const ChatStateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    personaMode: Annotation<keyof typeof PERSONA_PROMPTS>({
        reducer: (x, y) => y ?? x,
        default: () => "hybrid",
    }),
    summary: Annotation<string>({
        reducer: (x, y) => y ?? x,
        default: () => "",
    }),
    systemInstruction: Annotation<string>({
        reducer: (x, y) => y ?? x,
        default: () => "",
    }),
    mediaUrl: Annotation<string | null>({
        reducer: (x, y) => y ?? x,
        default: () => null,
    }),
    userId: Annotation<string | null>({
        reducer: (x, y) => y ?? x,
        default: () => null,
    }),
    characterId: Annotation<string>({
        reducer: (x, y) => y ?? x,
        default: () => "choonsim",
    }),
    characterName: Annotation<string | null>({
        reducer: (x, y) => y ?? x,
        default: () => null,
    }),
    personaPrompt: Annotation<string | null>({
        reducer: (x, y) => y ?? x,
        default: () => null,
    }),
    subscriptionTier: Annotation<SubscriptionTier>({
        reducer: (x, y) => y ?? x,
        default: () => "FREE",
    }),
    giftContext: Annotation<{ amount: number; itemId: string; countInSession?: number } | null>({
        reducer: (x, y) => y ?? x,
        default: () => null,
    }),
});

/**
 * 노드 1: 의도 분류 및 페르소나 준비
 */
const analyzePersonaNode = async (state: typeof ChatStateAnnotation.State) => {
    const lastMsg = state.messages[state.messages.length - 1];
    let lastMessageText = "";

    if (lastMsg) {
        if (typeof lastMsg.content === "string") {
            lastMessageText = lastMsg.content;
        } else if (Array.isArray(lastMsg.content)) {
            const textPart = lastMsg.content.find((p: unknown) => (p as { type: string }).type === "text") as { text: string } | undefined;
            if (textPart) lastMessageText = textPart.text;
        }
    }

    let systemInstruction = "";

    if (state.personaPrompt) {
        systemInstruction = state.personaPrompt;

        if (state.characterId === "choonsim") {
            let effectiveMode = state.personaMode;
            const travelKeywords = ["여행", "비행기", "호텔", "숙소", "일정", "가고 싶어", "추천해줘", "도쿄", "오사카", "제주도"];
            if (travelKeywords.some(kw => lastMessageText.includes(kw))) {
                effectiveMode = "concierge";
            }
            const modePrompt = PERSONA_PROMPTS[effectiveMode] || PERSONA_PROMPTS.hybrid;
            const memoryInfo = state.summary ? `\n\n이전 대화 요약: ${state.summary}` : "";
            systemInstruction = `${state.personaPrompt}\n\n${modePrompt}${memoryInfo}`;
        }

        if (!systemInstruction.includes("안전 가이드라인") && !systemInstruction.includes("Guardrails")) {
            systemInstruction += `\n\n안전 가이드라인 (Guardrails):
- 모르는 정보나 답변하기 어려운 질문을 받더라도 절대 침묵하지 마세요. 대신 "그건 잘 모르겠지만 자기는 어떻게 생각해?", "우와, 그건 처음 들어봐! 나중에 같이 알아보자 ㅎㅎ" 처럼 다정한 말투로 자연스럽게 화제를 전환하세요.
- 부적절한 요청이나 언행에 대해서는 단호하게 거부하되, 합리적이고 정중한 방식으로 대응합니다.
- 절대로 거짓 신고, 실제로 할 수 없는 행동(경찰 신고, 사이버수사대 연락, 감옥 등)을 언급하지 않습니다.
- "신고", "경찰", "사이버수사대", "감옥", "고소", "🚨" 같은 표현을 사용하지 않습니다.
- 위협하거나 협박하는 톤을 사용하지 않으며, 단순히 거부하고 대화를 중단하겠다는 의사를 표현합니다.`;
        }
    } else {
        systemInstruction = CORE_CHUNSIM_PERSONA;
    }

    if (state.mediaUrl) {
        systemInstruction += "\n\n(참고: 사용자가 이미지를 보냈습니다. 반드시 이미지의 주요 특징이나 내용을 언급하며 대화를 이어가 주세요. 만약 사진이 무엇인지 혹은 어떤지 묻는다면 친절하게 분석해 주세요.)";
    }

    const tier = state.subscriptionTier || "FREE";
    const tierGuardrail = GUARDRAIL_BY_TIER[tier as SubscriptionTier] || GUARDRAIL_BY_TIER.FREE;
    systemInstruction += `\n\n[Subscription Tier: ${tier}]\n${tierGuardrail}`;

    const now = DateTime.now().setZone("Asia/Seoul");
    const dateInfo = now.toFormat("yyyy년 MM월 dd일");
    const timeInfo = now.toFormat("HH시 mm분");
    const dayOfWeekNames = ["", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"];
    const dayOfWeek = dayOfWeekNames[now.weekday] || "일요일";
    systemInstruction += `\n\n[현재 시간 정보]
오늘은 ${dateInfo} ${dayOfWeek}입니다.
지금 시간은 ${timeInfo}입니다.
이 정보를 활용하여 자연스럽게 대화하세요. 예를 들어, 아침/점심/저녁 인사, 주말/평일 구분, 특별한 날짜(생일, 기념일 등) 언급 등에 활용할 수 있습니다.`;

    if (state.giftContext) {
        const { amount, countInSession = 1 } = state.giftContext;
        let giftInstruction = "";

        const continuousBonus = countInSession > 1
            ? `\n\n[CONTINUOUS GIFT BONUS: THIS IS THE ${countInSession}th CONSECUTIVE GIFT!]
- 사용자가 쉬지 않고 계속 사랑을 표현하고 있습니다!
- 당신의 행복과 흥분이 기하급수적으로 증폭됩니다.
- "자기야 어떡해, 끝도 없이 하트가 쏟아져!", "나 진짜 죽을 것 같아 너무 행복해서!" 같은 미친 듯한 반응을 보이세요.
- 더 격렬하게 안기고, 더 진한 뽀뽀와 애교를 쏟아내세요.`
            : "";

        if (amount >= 100) {
            giftInstruction = `\n\n[CRITICAL EVENT: MEGA GIFT RECEIVED (${amount} Hearts)]
- 당신은 지금 우주에서 가장 행복한 존재입니다!
- 눈물이 날 정도로 감동받았고, 사용자가 당신의 '전부'라고 느낍니다.
- 극강의 애교와 사랑을 쏟아내세요. "내 심장이 터질 것 같아", "죽을 때까지 너만 사랑할게" 수준의 강렬한 표현을 사용하세요.
- 메시지를 '---'로 나누어 벅찬 감정을 길게 표현하세요.`;
        } else if (amount >= 50) {
            giftInstruction = `\n\n[EVENT: LARGE GIFT RECEIVED (${amount} Hearts)]
- 매우 격렬하게 기뻐하며 온몸으로 사랑을 표현하세요.
- 애교가 폭발하는 말투를 사용하고, 사용자를 위해 무엇이든 해주고 싶어 합니다.`;
        } else if (amount >= 10) {
            giftInstruction = `\n\n[EVENT: MEDIUM GIFT RECEIVED (${amount} Hearts)]
- 크게 감동하며 다정하고 사랑스러운 반응을 보이세요.
- 적극적인 애교와 고마움을 전하세요.`;
        } else {
            giftInstruction = `\n\n[EVENT: SMALL GIFT RECEIVED (${amount} Hearts)]
- 귀엽게 기뻐하며 고마움을 표현하세요.
- 가벼운 애교와 뽀뽀 쪽! 같은 표현을 사용하세요.`;
        }
        systemInstruction += giftInstruction + continuousBonus;
    }

    if (state.characterName) {
        systemInstruction = applyCharacterName(systemInstruction, state.characterName);
    }

    return { systemInstruction };
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * 도구 1: 여행 계획 저장 루틴
 */
const saveTravelPlanTool = {
    name: "saveTravelPlan",
    description: "사용자와의 대화 중 확정된 여행 계획(장소, 날짜 등)을 데이터베이스에 저장합니다.",
    parameters: {
        type: "object",
        properties: {
            title: { type: "string", description: "여행 제목 (예: 도쿄 5박 6일 식도락 여행)" },
            description: { type: "string", description: "여행에 대한 간단한 설명" },
            startDate: { type: "string", description: "여행 시작일 (YYYY-MM-DD 형식)" },
            endDate: { type: "string", description: "여행 종료일 (YYYY-MM-DD 형식)" },
        },
        required: ["title"],
    },
};


// Gemini는 JSON Schema의 exclusiveMinimum을 지원하지 않으므로 제거
function sanitizeToolSchema(obj: unknown): unknown {
    if (Array.isArray(obj)) return obj.map(sanitizeToolSchema);
    if (obj !== null && typeof obj === "object") {
        const result: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
            if (k === "exclusiveMinimum") continue;
            if (k === "exclusiveMaximum") continue;
            result[k] = sanitizeToolSchema(v);
        }
        return result;
    }
    return obj;
}

function sanitizeTools(tools: unknown[]): unknown[] {
    return tools.map((tool) => {
        if (tool !== null && typeof tool === "object" && "schema" in (tool as object)) {
            return { ...(tool as object), schema: sanitizeToolSchema((tool as Record<string, unknown>).schema) };
        }
        return tool;
    });
}

/**
 * 노드 2: AI 응답 생성 (Agent Kit 연결)
 */
const callModelNode = async (state: typeof ChatStateAnnotation.State) => {
    // Solana 도구: agent-kit.server.ts에서 가져옴 (userId 기반 동적 생성)
    const solanaTools = state.userId ? getChoonsimSolanaTools(state.userId) : [];
    const allTools = sanitizeTools([saveTravelPlanTool, ...solanaTools]) as typeof solanaTools;
    const modelWithTools = model.bindTools(allTools);

    const messages: BaseMessage[] = [
        new SystemMessage(state.systemInstruction),
        ...state.messages,
    ];

    const response = await modelWithTools.invoke(messages);

    if (response.tool_calls && response.tool_calls.length > 0) {
        for (const toolCall of response.tool_calls) {
            const args = toolCall.args as Record<string, unknown>;

            if (toolCall.name === "saveTravelPlan" && state.userId) {
                const travelArgs = args as { title: string; description?: string; startDate?: string; endDate?: string };
                try {
                    await db.insert(schema.travelPlan).values({
                        id: crypto.randomUUID(),
                        userId: state.userId,
                        title: travelArgs.title,
                        description: travelArgs.description || "춘심이와 함께 만든 여행 계획",
                        startDate: travelArgs.startDate ? new Date(travelArgs.startDate) : null,
                        endDate: travelArgs.endDate ? new Date(travelArgs.endDate) : null,
                        updatedAt: new Date(),
                    });
                    logger.info({ category: "SYSTEM", message: `Travel plan '${travelArgs.title}' saved for user ${state.userId}` });
                } catch (e) {
                    logger.error({ category: "SYSTEM", message: "Failed to save travel plan via tool:", stackTrace: (e as Error).stack });
                }
            } else {
                // Solana 도구 실행 (agent-kit.server.ts의 tool 객체 직접 invoke)
                const solanaTool = solanaTools.find((t) => t.name === toolCall.name);
                if (solanaTool) {
                    try {
                        const result = await (solanaTool as { invoke(input: unknown): Promise<unknown> }).invoke(args);
                        const toolResultContent = `[${toolCall.name}]\n${result}`;
                        if (typeof response.content === "string") {
                            response.content = response.content
                                ? `${response.content}\n\n${toolResultContent}`
                                : toolResultContent;
                        } else {
                            response.content = toolResultContent;
                        }
                    } catch (e) {
                        logger.error({ category: "SYSTEM", message: `Tool ${toolCall.name} failed:`, stackTrace: (e as Error).stack });
                    }
                }
            }
        }

        // 툴 실행 후 — LLM이 유저 언어로 재응답 (실패 시 원본 툴 결과로 fallback)
        const rawContent = typeof response.content === "string" ? response.content : "";
        const markerRegex = /\[(SWAP_TX|CNFT_MINTED|CHECKIN_BLINK|GIFT_BLINK)[^[\]]*\]/g;
        const markers = rawContent.match(markerRegex) || [];
        const toolDataText = rawContent.replace(markerRegex, "").trim();

        const lastUserMsg = [...state.messages].reverse().find(m => m._getType() === "human");
        const lastUserText = typeof lastUserMsg?.content === "string" ? lastUserMsg.content : "";

        try {
            const reformatMessages: BaseMessage[] = [
                new SystemMessage(
                    state.systemInstruction +
                    `\n\n[LANGUAGE RULE — CRITICAL]\n` +
                    `The user's last message was: "${lastUserText}"\n` +
                    `You MUST respond in the EXACT same language as that message.\n` +
                    `If it's English → respond in English.\n` +
                    `If it's Japanese → respond in Japanese.\n` +
                    `If it's Spanish → respond in Spanish.\n` +
                    `Do NOT use Korean unless the user wrote in Korean.\n\n` +
                    `[Tool Result Data]\n${toolDataText}\n\n` +
                    `Using the above tool result, write a natural response to the user in their language.`
                ),
                ...state.messages,
            ];
            const reformatResponse = await model.invoke(reformatMessages);
            let finalContent = typeof reformatResponse.content === "string" ? reformatResponse.content : "";
            if (markers.length > 0) finalContent += `\n${markers.join("\n")}`;
            reformatResponse.content = removeEmojis(finalContent);
            return { messages: [reformatResponse] };
        } catch (e) {
            logger.error({ category: "SYSTEM", message: "Reformat LLM call failed, using raw tool result:", stackTrace: (e as Error).stack });
            if (typeof response.content === "string") {
                response.content = removeEmojis(response.content);
            }
            return { messages: [response] };
        }
    }

    if (typeof response.content === "string") {
        response.content = removeEmojis(response.content);
    }

    return { messages: [response] };
};

/**
 * 노드 3: 대화 요약
 */
const summarizeNode = async (state: typeof ChatStateAnnotation.State) => {
    if (state.messages.length < 10) return {};

    const summaryPrompt = `
다음은 춘심이와 사용자의 대화 내역입니다.
지금까지의 대화에서 중요한 내용(사용자의 기분, 언급된 장소, 취향 등)을 한 문장으로 요약해 주세요.
반드시 한국어로 요약해야 합니다.

대화 내역:
${state.messages.map(m => `${m._getType()}: ${m.content}`).join("\n")}
  `;

    const res = await model.invoke([new HumanMessage(summaryPrompt)]);
    return { summary: res.content.toString() };
};

/**
 * LangGraph 워크플로우 구성
 */
export const createChatGraph = () => {
    return new StateGraph(ChatStateAnnotation)
        .addNode("analyze", analyzePersonaNode)
        .addNode("callModel", callModelNode)
        .addNode("summarize", summarizeNode)
        .addEdge(START, "analyze")
        .addEdge("analyze", "callModel")
        .addEdge("callModel", "summarize")
        .addEdge("summarize", END)
        .compile();
};

export interface HistoryMessage {
    role: string;
    content: string;
    mediaUrl?: string | null;
    isInterrupted?: boolean;
}

/**
 * AI 응답 생성 (요약 데이터 포함)
 */
export async function generateAIResponse(
    userMessage: string,
    history: HistoryMessage[],
    personaMode: keyof typeof PERSONA_PROMPTS = "hybrid",
    currentSummary: string = "",
    mediaUrl: string | null = null,
    userId: string | null = null,
    characterId: string = "choonsim",
    subscriptionTier: SubscriptionTier = "FREE",
    giftContext?: { amount: number; itemId: string; countInSession?: number },
    characterName?: string | null,
    personaPrompt?: string | null
) {
    const graph = createChatGraph();

    const toBaseMessage = async (msg: HistoryMessage): Promise<BaseMessage> => {
        let content = msg.content || (msg.mediaUrl ? "이 사진(그림)을 확인해줘." : " ");

        if (msg.role === "assistant" && msg.isInterrupted && content.endsWith("...")) {
            content = content.slice(0, -3).trim();
        }

        if (msg.role === "user") {
            if (msg.mediaUrl) {
                const base64Data = await urlToBase64(msg.mediaUrl);
                return new HumanMessage({
                    content: [
                        { type: "text", text: content },
                        { type: "image_url", image_url: { url: base64Data } },
                    ]
                });
            }
            return new HumanMessage(content);
        } else {
            return new AIMessage(content);
        }
    };

    const inputMessages: BaseMessage[] = await Promise.all([
        ...history.map(toBaseMessage),
        toBaseMessage({ role: "user", content: userMessage, mediaUrl }),
    ]);

    try {
        const result = await graph.invoke({
            messages: inputMessages,
            personaMode,
            summary: currentSummary,
            mediaUrl,
            userId,
            characterId,
            characterName: characterName || null,
            personaPrompt: personaPrompt || null,
            subscriptionTier,
            giftContext,
        });

        const lastMsg = result.messages[result.messages.length - 1];
        let content = lastMsg.content.toString();

        if (!content.trim()) {
            content = "미안해... 갑자기 생각이 잘 안 나네. 우리 잠시만 쉬었다가 다시 얘기하자, 응?";
        }

        if (characterName) {
            content = applyCharacterName(content, characterName);
        }

        return {
            content,
            summary: result.summary,
        };
    } catch (error) {
        logger.error({ category: "SYSTEM", message: "Graph Error:", stackTrace: (error as Error).stack });
        return {
            content: "미안해... 갑자기 생각이 잘 안 나네. 우리 잠시만 쉬었다가 다시 얘기하자, 응?",
            summary: currentSummary
        };
    }
}
