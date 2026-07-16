/**
 * LangGraph 워크플로우 — 춘심 AI 대화 그래프
 */
import { SystemMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { StateGraph, END, Annotation, START } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
    PERSONA_PROMPTS,
    removeEmojis,
    buildStreamSystemInstruction,
    type SubscriptionTier,
} from "./prompts";
import { bindModelTools, model } from "./model";
import { getChoonsimSolanaTools } from "../solana/agent-kit.server";
import { generateSummary } from "./memory";

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
    conversationId: Annotation<string | null>({
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
        const travelKeywords = [
            "여행", "비행기", "호텔", "숙소", "일정", "가고 싶어", "추천해줘", "도쿄", "오사카", "제주도",
            "travel", "trip", "flight", "hotel", "itinerary", "vacation", "tokyo", "osaka",
        ];
        const lowerLastText = lastText.toLowerCase();
        if (travelKeywords.some(kw => lowerLastText.includes(kw.toLowerCase()))) {
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


// Gemini는 JSON Schema의 exclusiveMinimum/exclusiveMaximum을 지원하지 않으므로
// JSON schema 형태로 들어온 도구 정의에서만 해당 키를 제거한다.
function sanitizeToolSchema(obj: unknown): unknown {
    if (
        obj !== null &&
        typeof obj === "object" &&
        "safeParse" in (obj as Record<string, unknown>)
    ) {
        return obj;
    }
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

function sanitizeTools<T>(tools: T[]): T[] {
    return tools.map((tool) => {
        if (tool !== null && typeof tool === "object" && "schema" in (tool as object)) {
            const clonedTool = Object.assign(Object.create(Object.getPrototypeOf(tool)), tool);
            clonedTool.schema = sanitizeToolSchema((tool as Record<string, unknown>).schema);
            return clonedTool;
        }
        return tool;
    });
}

/**
 * 노드 2: AI 응답 생성
 * Solana 도구는 LangGraph ToolNode 경로로 실행된다.
 */
/** userId가 있을 때만 Solana 도구를 로드하고 Gemini 호환 스키마로 정리한다. */
function getSanitizedTools(userId: string | null, conversationId: string | null) {
    if (!userId) return [];
    return sanitizeTools(getChoonsimSolanaTools(userId, conversationId ?? undefined));
}

const callModelNode = async (state: typeof ChatStateAnnotation.State) => {
    const messages: BaseMessage[] = [
        new SystemMessage(state.systemInstruction),
        ...state.messages,
    ];

    const tools = getSanitizedTools(state.userId, state.conversationId);
    const chatModel = tools.length > 0 ? bindModelTools(tools) : model;
    const response = await chatModel.invoke(messages);

    if (typeof response.content === "string") {
        response.content = removeEmojis(response.content);
    }

    return { messages: [response] };
};

const executeToolsNode = async (state: typeof ChatStateAnnotation.State) => {
    if (!state.userId) return {};

    const toolNode = new ToolNode(getSanitizedTools(state.userId, state.conversationId));

    return await toolNode.invoke({ messages: state.messages });
};

const shouldContinueAfterModel = (state: typeof ChatStateAnnotation.State) => {
    const lastMessage = state.messages[state.messages.length - 1];
    if (AIMessage.isInstance(lastMessage) && lastMessage.tool_calls?.length) {
        return "tools";
    }

    return "summarize";
};

/**
 * 노드 3: 대화 요약
 */
const summarizeNode = async (state: typeof ChatStateAnnotation.State) => {
    if (state.messages.length < 10) return {};

    const summary = await generateSummary(state.messages);
    if (!summary) return {};
    return { summary };
};

const _chatGraph = new StateGraph(ChatStateAnnotation)
    .addNode("analyze", analyzePersonaNode)
    .addNode("callModel", callModelNode)
    .addNode("tools", executeToolsNode)
    .addNode("summarize", summarizeNode)
    .addEdge(START, "analyze")
    .addEdge("analyze", "callModel")
    .addConditionalEdges("callModel", shouldContinueAfterModel, ["tools", "summarize"])
    .addEdge("tools", "callModel")
    .addEdge("summarize", END)
    .compile();

export const createChatGraph = () => _chatGraph;

export interface HistoryMessage {
    role: string;
    content: string;
    mediaUrl?: string | null;
    isInterrupted?: boolean;
}
