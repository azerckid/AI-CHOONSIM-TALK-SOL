/**
 * LangGraph 워크플로우 — 춘심 AI 대화 그래프
 */
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { StateGraph, END, Annotation, START } from "@langchain/langgraph";
import { db } from "../db.server";
import * as schema from "../../db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../logger.server";
import {
    PERSONA_PROMPTS,
    removeEmojis,
    applyCharacterName,
    buildStreamSystemInstruction,
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
    // 여행 키워드 감지 → concierge 모드 자동 전환
    let effectiveMode = state.personaMode;
    const lastMsg = state.messages[state.messages.length - 1];
    if (lastMsg) {
        const lastText = typeof lastMsg.content === "string"
            ? lastMsg.content
            : Array.isArray(lastMsg.content)
                ? ((lastMsg.content.find((p: unknown) => (p as { type: string }).type === "text") as { text: string } | undefined)?.text ?? "")
                : "";
        const travelKeywords = ["여행", "비행기", "호텔", "숙소", "일정", "가고 싶어", "추천해줘", "도쿄", "오사카", "제주도"];
        if (travelKeywords.some(kw => lastText.includes(kw))) {
            effectiveMode = "concierge";
        }
    }

    const systemInstruction = buildStreamSystemInstruction({
        personaMode: effectiveMode,
        currentSummary: state.summary,
        mediaUrl: state.mediaUrl,
        characterId: state.characterId,
        subscriptionTier: state.subscriptionTier,
        giftContext: state.giftContext ?? undefined,
        characterName: state.characterName,
        personaPrompt: state.personaPrompt,
    });

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

const _chatGraph = new StateGraph(ChatStateAnnotation)
    .addNode("analyze", analyzePersonaNode)
    .addNode("callModel", callModelNode)
    .addNode("summarize", summarizeNode)
    .addEdge(START, "analyze")
    .addEdge("analyze", "callModel")
    .addEdge("callModel", "summarize")
    .addEdge("summarize", END)
    .compile();

export const createChatGraph = () => _chatGraph;

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
