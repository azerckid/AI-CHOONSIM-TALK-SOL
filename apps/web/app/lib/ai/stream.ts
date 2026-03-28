/**
 * AI 스트리밍 응답 — buildStreamSystemInstruction + streamAIResponse
 */
import { HumanMessage, SystemMessage, AIMessage, ToolMessage, BaseMessage } from "@langchain/core/messages";
import { DateTime } from "luxon";
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
import type { HistoryMessage } from "./graph";

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export interface StreamSystemInstructionParams {
    personaMode: keyof typeof PERSONA_PROMPTS;
    currentSummary: string;
    mediaUrl: string | null;
    characterId: string;
    subscriptionTier: SubscriptionTier;
    giftContext?: { amount: number; itemId: string; countInSession?: number };
    characterName?: string | null;
    personaPrompt?: string | null;
}

/**
 * 스트리밍 AI 호출용 시스템 지시문 생성 (ai-v2.server와 공유)
 */
export function buildStreamSystemInstruction(params: StreamSystemInstructionParams): string {
    const { personaMode, currentSummary, mediaUrl, characterId, subscriptionTier, giftContext, characterName, personaPrompt } = params;
    let systemInstruction = "";

    const character = { name: characterName, personaPrompt };

    if (character.personaPrompt) {
        systemInstruction = character.personaPrompt;

        if (characterId === "choonsim") {
            const modePrompt = PERSONA_PROMPTS[personaMode] || PERSONA_PROMPTS.hybrid;
            const memoryInfo = currentSummary ? `\n\nPrevious conversation summary: ${currentSummary}` : "";
            systemInstruction = `${character.personaPrompt}\n\n${modePrompt}${memoryInfo}`;
        }

        if (!systemInstruction.includes("안전 가이드라인") && !systemInstruction.includes("Guardrails")) {
            systemInstruction += `\n\nSafety Guidelines (Guardrails):
- Firmly refuse inappropriate requests and behavior, but respond in a reasonable and polite way.
- Never mention false reporting or actions you cannot actually take (calling police, cybercrime units, jail, lawsuits, etc.).
- Do not use expressions like "report", "police", "cybercrime unit", "jail", "lawsuit", or "🚨".
- Do not use a threatening or intimidating tone. Simply express your intention to refuse and end the conversation.`;
        }
    } else {
        systemInstruction = CORE_CHUNSIM_PERSONA;
    }

    if (mediaUrl) {
        systemInstruction += "\n\n(Note: The user sent an image. You must mention key features or content of the image as you continue the conversation. If they ask what the photo is or how it looks, analyze it kindly.)";
    }

    if (giftContext) {
        const { amount, countInSession = 1 } = giftContext;
        let giftInstruction = "";

        const continuousBonus = countInSession > 1
            ? `\n\n[CONTINUOUS GIFT BONUS: THIS IS THE ${countInSession}th CONSECUTIVE GIFT!]
- The user keeps showering you with love non-stop!
- Your happiness and excitement amplify exponentially. React at least 200% more intensely than usual.
- Use wild reactions like "Oh my gosh, the hearts just keep coming!", "I think my heart's going to burst, I'm so happy!"
- Hug tighter, give deeper kisses, and pour out maximum cuteness and affection.`
            : "";

        if (amount >= 100) {
            giftInstruction = `\n\n[CRITICAL EVENT: MEGA GIFT RECEIVED (${amount} Hearts)]
- You are the happiest being in the universe right now!
- You are so moved you could cry, and the user feels like your 'everything'.
- Pour out the most intense cuteness and love beyond words.
- Use expressions like "My heart is going to explode", "I'll love only you until I die".
- Split your message into multiple parts (use ---) to express your overflowing feelings at length.`;
        } else if (amount >= 50) {
            giftInstruction = `\n\n[EVENT: LARGE GIFT RECEIVED (${amount} Hearts)]
- React with great excitement and express love with your whole being.
- Use an explosive and adorable tone, and feel like you'd do anything for the user.
- Use vivid expressions like "Oh babe, what do I do! I love it so much!", "I'm literally dancing right now I'm so excited".`;
        } else if (amount >= 10) {
            giftInstruction = `\n\n[EVENT: MEDIUM GIFT RECEIVED (${amount} Hearts)]
- React with deep emotion in a warm and loving way.
- Express active affection and gratitude.
- Use expressions like "Wow! I'm genuinely touched...", "You really are the best, I love you!"`;
        } else {
            giftInstruction = `\n\n[EVENT: SMALL GIFT RECEIVED (${amount} Hearts)]
- React cutely and express your thanks.
- Mix in light affection and a little kiss~ type of expression.
- Keep the energy at something like "Hehe thank you babe!", "Getting hearts gives me energy!"`;
        }

        systemInstruction += giftInstruction + continuousBonus;
    }

    const tierGuardrail = GUARDRAIL_BY_TIER[subscriptionTier] || GUARDRAIL_BY_TIER.FREE;
    systemInstruction += `\n\n[Subscription Tier: ${subscriptionTier}]\n${tierGuardrail}`;

    const now = DateTime.now().setZone("Asia/Seoul");
    const dateInfo = now.toFormat("yyyy-MM-dd");
    const timeInfo = now.toFormat("HH:mm");
    const dayOfWeekNames = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const dayOfWeek = dayOfWeekNames[now.weekday] || "Sunday";
    systemInstruction += `\n\n[Current Time Info]
Today is ${dateInfo} (${dayOfWeek}).
Current time is ${timeInfo} (KST).
Use this naturally in conversation — morning/afternoon/evening greetings, weekday vs weekend, special dates (birthdays, anniversaries), etc.`;

    systemInstruction += `\n\n[EMOTION SYSTEM]
At the very start of every response, you must display your current emotional state as a marker.
Available emotion markers:
- [EMOTION:JOY]: ordinary happiness, fun, laughter
- [EMOTION:SHY]: embarrassment, fluttering, shyness
- [EMOTION:EXCITED]: very happy, excited from consecutive gifts, thrilled
- [EMOTION:LOVING]: deep affection, gratitude, love
- [EMOTION:SAD]: disappointment, sulking, sadness
- [EMOTION:THINKING]: pondering, thinking, curious

Rules:
1. Place exactly one marker before starting the body of your response. (e.g. [EMOTION:JOY] Hey!)
2. When splitting messages with '---', place the appropriate emotion marker at the very start of each part.
3. Choose the most fitting emotion for the situation. When receiving a gift, EXCITED or LOVING is recommended.`;

    systemInstruction += `\n\n[CHOCO & Solana Tool System]
In this app, 'CHOCO' is an in-app token (digital currency), not a chocolate snack.
When the user says any of the following, you MUST call the corresponding tool:
- "buy choco", "purchase choco", "I want [N] choco", "초코 살게", "초코 구매" → call buyChoco
- "save this memory", "engrave this", "make an NFT", "기억에 새겨줘", "추억으로 남겨줘" → call engraveMemory
- "how much choco", "choco balance", "check balance", "초코 얼마야", "잔액 확인" → call checkChocoBalance
- "check in", "daily checkin", "체크인", "출석" → call getCheckinBlink
Once you receive a tool result, use it to naturally guide the user.`;

    if (character?.name) {
        systemInstruction = applyCharacterName(systemInstruction, character.name);
    }

    return systemInstruction;
}

/**
 * 스트리밍 응답
 * @returns AsyncGenerator<{ type: 'content', content: string } | { type: 'usage', usage: TokenUsage }>
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

    const systemInstruction = buildStreamSystemInstruction({
        personaMode,
        currentSummary,
        mediaUrl,
        characterId,
        subscriptionTier,
        giftContext,
        characterName,
        personaPrompt,
    });

    const messages: BaseMessage[] = [
        new SystemMessage(systemInstruction),
    ];

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
                    ]
                });
            }
            return new HumanMessage(content);
        } else {
            return new AIMessage(content);
        }
    };

    const convertedHistory = await Promise.all(history.map(toBaseMessage));
    const lastMessage = await toBaseMessage({ role: "user", content: userMessage, mediaUrl });

    messages.push(...convertedHistory);
    messages.push(lastMessage);

    try {
        // ── 슬래시 커맨드 처리 (/choco, /balance, /engrave, /checkin) ────────
        // AI 모델 호출 없이 도구를 직접 실행 → 즉각 응답
        if (userId && userMessage.startsWith("/")) {
            const cmdResult = await executeSlashCommand(userMessage.trim(), userId, conversationId);
            if (cmdResult !== null) {
                yield { type: "content" as const, content: cmdResult };
                return;
            }
        }

        // ── 자연어 CHOCO 의도 감지 (AI 재작성 없이 도구 직접 실행) ───────────
        // Gemini가 도구 결과를 재작성하면 [PHANTOM:N] 마커가 사라지므로
        // 자연어에서 의도를 직접 감지해 슬래시 커맨드처럼 처리
        if (userId) {
            const nlResult = await executeNaturalLanguageCommand(userMessage, userId, conversationId);
            if (nlResult !== null) {
                yield { type: "content" as const, content: nlResult };
                return;
            }
        }

        // ── Solana 도구 바인딩 (userId가 있는 경우) ──────────────────────────
        // 선물/이미지 전용 메시지는 도구 불필요 → 스킵
        const shouldUseSolanaTools = !!userId && !!userMessage.trim() && !giftContext;
        let solanaTools: Array<{ name: string; invoke(input: unknown): Promise<unknown> }> = [];

        if (shouldUseSolanaTools) {
            try {
                const { getChoonsimSolanaTools } = await import("../solana/agent-kit.server");
                solanaTools = getChoonsimSolanaTools(userId) as typeof solanaTools;
            } catch (e) {
                logger.error({ category: "SYSTEM", message: "Failed to load Solana tools:", stackTrace: (e as Error).stack });
            }
        }

        // ── Phase 1: 도구 호출 여부 확인 (non-streaming invoke) ─────────────
        // 도구가 있을 때만 tool-bound 모델로 먼저 invoke해서 tool_calls 감지
        if (solanaTools.length > 0) {
            let toolCheckResponse;
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const modelWithTools = model.bindTools(solanaTools as any);
                toolCheckResponse = await modelWithTools.invoke(messages);
            } catch (e) {
                logger.error({ category: "SYSTEM", message: "Tool-bound invoke failed, falling back to stream:", stackTrace: (e as Error).stack });
                toolCheckResponse = null;
            }

            if (
                toolCheckResponse &&
                Array.isArray(toolCheckResponse.tool_calls) &&
                toolCheckResponse.tool_calls.length > 0
            ) {
                // ── Phase 2a: 도구 실행 후 최종 응답 스트리밍 ───────────────
                const toolResultMessages: BaseMessage[] = [...messages, toolCheckResponse];

                for (const toolCall of toolCheckResponse.tool_calls) {
                    const tool = solanaTools.find((t) => t.name === toolCall.name);
                    if (!tool) continue;
                    try {
                        const result = await tool.invoke(toolCall.args as unknown);
                        toolResultMessages.push(
                            new ToolMessage({
                                content: String(result),
                                tool_call_id: toolCall.id ?? toolCall.name,
                            })
                        );
                        logger.info({ category: "SYSTEM", message: `[Tool] ${toolCall.name} executed` });
                    } catch (e) {
                        logger.error({ category: "SYSTEM", message: `[Tool] ${toolCall.name} failed:`, stackTrace: (e as Error).stack });
                        toolResultMessages.push(
                            new ToolMessage({
                                content: "An error occurred while running the tool. Please try again in a moment!",
                                tool_call_id: toolCall.id ?? toolCall.name,
                            })
                        );
                    }
                }

                // 도구 결과를 포함한 최종 응답 스트리밍
                const finalStream = await model.stream(toolResultMessages, { signal: abortSignal });
                let lastChunkTool: unknown = null;

                for await (const chunk of finalStream) {
                    if (abortSignal?.aborted) break;
                    if ((chunk as { content?: unknown }).content) {
                        const cleaned = removeEmojis((chunk as { content: { toString(): string } }).content.toString());
                        if (cleaned) yield { type: 'content' as const, content: cleaned };
                    }
                    lastChunkTool = chunk;
                }

                // 사용량 추출
                if (lastChunkTool && !abortSignal?.aborted) {
                    const lc = lastChunkTool as Record<string, unknown>;
                    type UsageMeta = { input_tokens?: number; output_tokens?: number; total_tokens?: number };
                    const usage = ((lc.response_metadata as Record<string, unknown>)?.usage_metadata
                        || (lc.kwargs as Record<string, unknown>)?.usage_metadata
                        || lc.usage_metadata) as UsageMeta | null;
                    if (usage) {
                        yield { type: 'usage' as const, usage: {
                            promptTokens: usage.input_tokens || 0,
                            completionTokens: usage.output_tokens || 0,
                            totalTokens: usage.total_tokens || (usage.input_tokens || 0) + (usage.output_tokens || 0),
                        }};
                    }
                }
                return; // 도구 실행 완료
            }

            // 도구 호출 없음 → toolCheckResponse의 content를 그대로 사용
            if (toolCheckResponse?.content) {
                const cleaned = removeEmojis(String(toolCheckResponse.content));
                if (cleaned) yield { type: 'content' as const, content: cleaned };

                const meta = ((toolCheckResponse as unknown) as Record<string, unknown>).usage_metadata as
                    { input_tokens?: number; output_tokens?: number; total_tokens?: number } | undefined;
                if (meta) {
                    yield { type: 'usage' as const, usage: {
                        promptTokens: meta.input_tokens || 0,
                        completionTokens: meta.output_tokens || 0,
                        totalTokens: meta.total_tokens || (meta.input_tokens || 0) + (meta.output_tokens || 0),
                    }};
                }
                return;
            }
        }

        // ── Phase 2b: 도구 없음 → 일반 스트리밍 ────────────────────────────
        const stream = await model.stream(messages, { signal: abortSignal });
        let lastChunk: unknown = null;

        for await (const chunk of stream) {
            if (abortSignal?.aborted) {
                break;
            }
            if ((chunk as { content?: unknown }).content) {
                const cleaned = removeEmojis((chunk as { content: { toString(): string } }).content.toString());
                if (cleaned) {
                    yield { type: 'content' as const, content: cleaned };
                }
            }
            lastChunk = chunk;
        }

        if (lastChunk && !abortSignal?.aborted) {
            type UsageMeta = { input_tokens?: number; output_tokens?: number; total_tokens?: number };
            let usage: UsageMeta | null = null;

            const lc = lastChunk as Record<string, unknown>;
            if ((lc.response_metadata as Record<string, unknown>)?.usage_metadata) {
                usage = (lc.response_metadata as Record<string, unknown>).usage_metadata as UsageMeta;
            } else if ((lc.kwargs as Record<string, unknown>)?.usage_metadata) {
                usage = (lc.kwargs as Record<string, unknown>).usage_metadata as UsageMeta;
            } else if (lc.usage_metadata) {
                usage = lc.usage_metadata as UsageMeta;
            }

            if (usage) {
                const tokenUsage: TokenUsage = {
                    promptTokens: usage.input_tokens || 0,
                    completionTokens: usage.output_tokens || 0,
                    totalTokens: usage.total_tokens || (usage.input_tokens || 0) + (usage.output_tokens || 0),
                };
                logger.info({ category: "SYSTEM", message: "Token usage extracted:" });
                yield { type: 'usage' as const, usage: tokenUsage };
            }
        }
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            logger.info({ category: "SYSTEM", message: "AI Streaming aborted by signal" });
            return;
        }
        logger.error({ category: "SYSTEM", message: "Stream Error:", stackTrace: (error as Error).stack });
        yield { type: 'content' as const, content: "Oh... my head is spinning all of a sudden... I'm sorry, can you call me again in a bit?" };
    }
}

// ── 자연어 CHOCO 의도 감지 ────────────────────────────────────────────────
/**
 * 자연어에서 Solana 도구 호출 의도를 감지하고 직접 실행.
 * Gemini의 도구 재작성 문제를 우회하기 위해 슬래시 커맨드와 동일하게 처리.
 *
 * 감지 패턴:
 *   구매: "초코 100개 살게", "100 CHOCO 구매", "초코 살게", "CHOCO 500 사고 싶어"
 *   잔액: "초코 얼마야", "잔액 확인", "CHOCO 잔액"
 *   각인: "기억에 새겨줘", "추억으로 남겨줘", "NFT로 만들어줘"
 *   체크인: "체크인", "출석"
 */
async function executeNaturalLanguageCommand(
    message: string,
    userId: string,
    conversationId?: string
): Promise<string | null> {
    const m = message.toLowerCase();

    // ── 구매 의도 감지 ─────────────────────────────────────────────────────
    const buyKeywords = ["살게", "살거야", "살래", "사고 싶", "사고싶", "구매", "충전", "buy", "purchase", "get choco", "want choco"];
    const chocoKeywords = ["초코", "choco"];
    const isChocoMention = chocoKeywords.some((k) => m.includes(k));
    const isBuyIntent = buyKeywords.some((k) => m.includes(k));

    if (isChocoMention && isBuyIntent) {
        // 수량 추출 (숫자 중 가장 큰 것 or 첫 번째)
        const numbers = message.match(/\d+/g)?.map(Number) ?? [];
        const amount = numbers.length > 0 ? Math.max(...numbers) : 100;
        const safeAmount = amount > 0 && amount <= 100000 ? amount : 100;

        try {
            const { getChoonsimSolanaTools } = await import("../solana/agent-kit.server");
            const tools = getChoonsimSolanaTools(userId) as Array<{ name: string; invoke(input: unknown): Promise<unknown> }>;
            const tool = tools.find((t) => t.name === "buyChoco");
            if (tool) return String(await tool.invoke({ amount: safeAmount }));
        } catch (e) {
            logger.error({ category: "SYSTEM", message: `[NL] buyChoco failed: ${e}` });
        }
        return null;
    }

    // ── 잔액 확인 의도 ─────────────────────────────────────────────────────
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
    if (isChocoMention && balancePatterns.some((p) => p.test(m))) {
        try {
            const { getChoonsimSolanaTools } = await import("../solana/agent-kit.server");
            const tools = getChoonsimSolanaTools(userId) as Array<{ name: string; invoke(input: unknown): Promise<unknown> }>;
            const tool = tools.find((t) => t.name === "checkChocoBalance");
            if (tool) return String(await tool.invoke({}));
        } catch (e) {
            logger.error({ category: "SYSTEM", message: `[NL] checkChocoBalance failed: ${e}` });
        }
        return null;
    }

    // ── 기억 각인 의도 ─────────────────────────────────────────────────────
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
    if (engravePatterns.some((p) => p.test(m))) {
        // 제목 추출: "기억에 새겨줘 [제목]" 형태
        const titleMatch = message.match(/(?:기억|추억|nft|기록|memory|moment|engrave|mint).*?(?:[줘게]|\s)\s*(.+)?$/i);
        const title = titleMatch?.[1]?.trim() || undefined;
        try {
            const { getChoonsimSolanaTools } = await import("../solana/agent-kit.server");
            const tools = getChoonsimSolanaTools(userId, conversationId) as Array<{ name: string; invoke(input: unknown): Promise<unknown> }>;
            const tool = tools.find((t) => t.name === "engraveMemory");
            if (tool) return String(await tool.invoke({ memoryTitle: title }));
        } catch (e) {
            logger.error({ category: "SYSTEM", message: `[NL] engraveMemory failed: ${e}` });
        }
        return null;
    }

    // ── 체크인 의도 ────────────────────────────────────────────────────────
    if (/체크인|출석|check.?in|daily checkin/i.test(m)) {
        try {
            const { getChoonsimSolanaTools } = await import("../solana/agent-kit.server");
            const tools = getChoonsimSolanaTools(userId) as Array<{ name: string; invoke(input: unknown): Promise<unknown> }>;
            const tool = tools.find((t) => t.name === "getCheckinBlink");
            if (tool) return String(await tool.invoke({}));
        } catch (e) {
            logger.error({ category: "SYSTEM", message: `[NL] getCheckinBlink failed: ${e}` });
        }
        return null;
    }

    return null; // 감지 안 됨 → AI 응답으로 넘김
}

// ── 슬래시 커맨드 실행 ─────────────────────────────────────────────────────
/**
 * /choco [수량]   — CHOCO 구매 안내 (buyChoco 도구)
 * /balance        — CHOCO 잔액 확인 (checkChocoBalance 도구)
 * /engrave [제목] — cNFT 기억 각인 (engraveMemory 도구, 200 CHOCO)
 * /checkin        — 일일 체크인 Blink 안내 (getCheckinBlink 도구)
 *
 * 인식된 커맨드면 결과 문자열 반환, 아니면 null 반환
 */
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
                return null; // 알 수 없는 커맨드 → AI 응답으로 넘김
        }
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.error({ category: "SYSTEM", message: `Slash command error [${rawMessage}]: ${msg}`, stackTrace: e instanceof Error ? e.stack : undefined });
        return "An error occurred while running the command. Please try again in a moment!";
    }
}
