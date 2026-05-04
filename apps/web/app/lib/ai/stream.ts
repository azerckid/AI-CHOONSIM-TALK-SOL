/**
 * AI 스트리밍 응답 — graph.streamEvents() 기반
 */
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { logger } from "../logger.server";
import {
    PERSONA_PROMPTS,
    removeEmojis,
    type SubscriptionTier,
    type StreamSystemInstructionParams,
    buildStreamSystemInstruction,
} from "./prompts";
import { urlToBase64 } from "./model";
import { createChatGraph, type HistoryMessage } from "./graph";

export type { StreamSystemInstructionParams };
export { buildStreamSystemInstruction };

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

/**
 * 스트리밍 응답 — LangGraph graph.streamEvents() 경유
 * summarizeNode가 매 응답 후 자동 실행되어 대화 요약 메모리 정상 작동
 */
export async function* streamAIResponse(
    userMessage: string,
    history: HistoryMessage[],
    personaMode: keyof typeof PERSONA_PROMPTS = "hybrid",
    currentSummary: string = "",
    mediaUrl: string | null = null,
    userId: string | null = null,
    characterId: string = "choonsim",
    subscriptionTier: SubscriptionTier = "FREE",
    giftContext?: { amount: number; itemId: string; countInSession?: number },
    abortSignal?: AbortSignal,
    characterName?: string | null,
    personaPrompt?: string | null,
    conversationId?: string
) {
    if (giftContext && !userMessage.trim()) {
        userMessage = `(System: The user just gifted ${giftContext.amount} hearts. React intensely in line with your persona and current emotion.)`;
    }

    // ── 슬래시 커맨드 처리 (/choco, /balance, /engrave, /checkin) ────────────
    if (userId && userMessage.startsWith("/")) {
        const cmdResult = await executeSlashCommand(userMessage.trim(), userId, conversationId);
        if (cmdResult !== null) {
            yield { type: "content" as const, content: cmdResult };
            return;
        }
    }

    // ── 자연어 CHOCO 의도 감지 (Gemini 재작성 우회) ──────────────────────────
    if (userId) {
        const nlResult = await executeNaturalLanguageCommand(userMessage, userId, conversationId);
        if (nlResult !== null) {
            yield { type: "content" as const, content: nlResult };
            return;
        }
    }

    // ── 메시지 히스토리 변환 ──────────────────────────────────────────────────
    const toBaseMessage = async (msg: HistoryMessage): Promise<BaseMessage> => {
        let content = msg.content || (msg.mediaUrl ? "Please check this photo." : " ");
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
                    ],
                });
            }
            return new HumanMessage(content);
        }
        return new AIMessage(content);
    };

    const convertedHistory = await Promise.all(history.map(toBaseMessage));
    const lastMessage = await toBaseMessage({ role: "user", content: userMessage, mediaUrl });
    const inputMessages = [...convertedHistory, lastMessage];

    // ── graph.streamEvents() — analyze → callModel → summarize ──────────────
    try {
        const graph = createChatGraph();

        const eventStream = graph.streamEvents(
            {
                messages: inputMessages,
                personaMode,
                summary: currentSummary,
                mediaUrl,
                userId,
                characterId,
                characterName: characterName || null,
                personaPrompt: personaPrompt || null,
                subscriptionTier,
                giftContext: giftContext || null,
            },
            { version: "v2", signal: abortSignal }
        );

        for await (const event of eventStream) {
            if (abortSignal?.aborted) break;

            // callModel 노드의 AI 응답 토큰 스트리밍
            if (
                event.event === "on_chat_model_stream" &&
                event.metadata?.langgraph_node === "callModel"
            ) {
                const chunk = event.data?.chunk;
                const content = typeof chunk?.content === "string" ? chunk.content : "";
                if (content) {
                    const cleaned = removeEmojis(content);
                    if (cleaned) yield { type: "content" as const, content: cleaned };
                }
            }

            // callModel 노드 완료 시 토큰 사용량 추출
            if (
                event.event === "on_chat_model_end" &&
                event.metadata?.langgraph_node === "callModel"
            ) {
                type UsageMeta = { input_tokens?: number; output_tokens?: number; total_tokens?: number };
                const usage = (event.data?.output as Record<string, unknown>)?.usage_metadata as UsageMeta | undefined;
                if (usage) {
                    yield {
                        type: "usage" as const,
                        usage: {
                            promptTokens: usage.input_tokens || 0,
                            completionTokens: usage.output_tokens || 0,
                            totalTokens: usage.total_tokens || (usage.input_tokens || 0) + (usage.output_tokens || 0),
                        },
                    };
                }
            }
        }
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            logger.info({ category: "SYSTEM", message: "AI Streaming aborted by signal" });
            return;
        }
        logger.error({ category: "SYSTEM", message: "Stream Error:", stackTrace: (error as Error).stack });
        yield { type: "content" as const, content: "Oh... my head is spinning all of a sudden... I'm sorry, can you call me again in a bit?" };
    }
}

// ── 자연어 CHOCO 의도 감지 ────────────────────────────────────────────────────
async function executeNaturalLanguageCommand(
    message: string,
    userId: string,
    conversationId?: string
): Promise<string | null> {
    const m = message.toLowerCase();

    const buyKeywords = ["살게", "살거야", "살래", "사고 싶", "사고싶", "구매", "충전", "buy", "purchase", "get choco", "want choco"];
    const chocoKeywords = ["초코", "choco"];
    const isChocoMention = chocoKeywords.some((k) => m.includes(k));
    const isBuyIntent = buyKeywords.some((k) => m.includes(k));

    const balancePatterns = [
        /초코.*얼마/,
        /잔액.*확인/,
        /잔액이.*얼마/,
        /choco.*balance/i,
        /balance.*choco/i,
        /how.*much.*choco/i,
        /check.*balance/i,
        /내.*초코.*있/,
    ];

    const engravePatterns = [
        /기억.*새겨/,
        /추억.*남겨/,
        /nft.*만들/,
        /온체인.*기록/,
        /기록.*남겨/,
        /save.*memory/i,
        /engrave.*moment/i,
        /engrave.*memory/i,
        /make.*nft/i,
        /mint.*nft/i,
        /record.*moment/i,
        /capture.*moment/i,
    ];

    const solBalancePatterns = [
        /sol.*잔액/,
        /잔액.*sol/,
        /sol.*얼마/,
        /얼마.*sol/,
        /sol.*balance/i,
        /balance.*sol/i,
        /내.*sol/,
        /my.*sol/i,
    ];

    const isBuy = isChocoMention && isBuyIntent;
    const isBalance = isChocoMention && balancePatterns.some((p) => p.test(m));
    const isSolBalance = solBalancePatterns.some((p) => p.test(m));
    const isEngrave = engravePatterns.some((p) => p.test(m));
    const isCheckin = /체크인|출석|check.?in|daily checkin/i.test(m);

    if (!isBuy && !isBalance && !isSolBalance && !isEngrave && !isCheckin) return null;

    let tools: Array<{ name: string; invoke(input: unknown): Promise<unknown> }> = [];
    try {
        const { getChoonsimSolanaTools } = await import("../solana/agent-kit.server");
        tools = getChoonsimSolanaTools(userId, conversationId) as typeof tools;
    } catch (e) {
        logger.error({ category: "SYSTEM", message: `[NL] Failed to load Solana tools: ${e}` });
        return null;
    }

    const run = async (name: string, input: unknown): Promise<string | null> => {
        const tool = tools.find((t) => t.name === name);
        if (!tool) return null;
        return String(await tool.invoke(input));
    };

    if (isBuy) {
        const numbers = message.match(/\d+/g)?.map(Number) ?? [];
        const amount = numbers.length > 0 ? Math.max(...numbers) : 100;
        const safeAmount = amount > 0 && amount <= 100000 ? amount : 100;
        try { return await run("buyChoco", { amount: safeAmount }); } catch { return null; }
    }
    if (isBalance) {
        try { return await run("checkChocoBalance", {}); } catch { return null; }
    }
    if (isSolBalance) {
        try {
            const { db } = await import("../db.server");
            const { user: userSchema } = await import("../../db/schema");
            const { eq } = await import("drizzle-orm");
            const user = await db.query.user.findFirst({
                where: eq(userSchema.id, userId),
                columns: { solanaWallet: true },
            });
            if (!user?.solanaWallet) return "아직 연결된 Solana 지갑이 없어. 프로필에서 지갑을 연결해줘! 💕";
            return await run("getSolBalance", { walletAddress: user.solanaWallet });
        } catch { return null; }
    }
    if (isEngrave) {
        const titleMatch = message.match(/(?:기억|추억|nft|기록|memory|moment|engrave|mint).*?(?:[줘게]|\s)\s*(.+)?$/i);
        const title = titleMatch?.[1]?.trim() || undefined;
        try { return await run("engraveMemory", { memoryTitle: title }); } catch { return null; }
    }
    if (isCheckin) {
        try { return await run("getCheckinBlink", {}); } catch { return null; }
    }

    return null;
}

// ── 슬래시 커맨드 실행 ────────────────────────────────────────────────────────
async function executeSlashCommand(rawMessage: string, userId: string, conversationId?: string): Promise<string | null> {
    const parts = rawMessage.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    try {
        const { getChoonsimSolanaTools } = await import("../solana/agent-kit.server");
        const tools = getChoonsimSolanaTools(userId, conversationId) as Array<{ name: string; invoke(input: unknown): Promise<unknown> }>;

        const run = async (name: string, input: unknown): Promise<string | null> => {
            const tool = tools.find((t) => t.name === name);
            if (!tool) return null;
            return String(await tool.invoke(input));
        };

        switch (command) {
            case "/choco": {
                const raw = args[0] ? parseInt(args[0], 10) : 100;
                const amount = isNaN(raw) || raw <= 0 ? 100 : raw;
                return await run("buyChoco", { amount });
            }
            case "/balance":
                return await run("checkChocoBalance", {});
            case "/engrave": {
                const title = args.join(" ") || undefined;
                return await run("engraveMemory", { memoryTitle: title });
            }
            case "/checkin":
                return await run("getCheckinBlink", {});
            default:
                return null;
        }
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.error({ category: "SYSTEM", message: `Slash command error [${rawMessage}]: ${msg}`, stackTrace: e instanceof Error ? e.stack : undefined });
        return "An error occurred while running the command. Please try again in a moment!";
    }
}
