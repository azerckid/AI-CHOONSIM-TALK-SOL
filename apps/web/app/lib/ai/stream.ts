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
            const memoryInfo = currentSummary ? `\n\n이전 대화 요약: ${currentSummary}` : "";
            systemInstruction = `${character.personaPrompt}\n\n${modePrompt}${memoryInfo}`;
        }

        if (!systemInstruction.includes("안전 가이드라인") && !systemInstruction.includes("Guardrails")) {
            systemInstruction += `\n\n안전 가이드라인 (Guardrails):
- 부적절한 요청이나 언행에 대해서는 단호하게 거부하되, 합리적이고 정중한 방식으로 대응합니다.
- 절대로 거짓 신고, 실제로 할 수 없는 행동(경찰 신고, 사이버수사대 연락, 감옥 등)을 언급하지 않습니다.
- "신고", "경찰", "사이버수사대", "감옥", "고소", "🚨" 같은 표현을 사용하지 않습니다.
- 위협하거나 협박하는 톤을 사용하지 않으며, 단순히 거부하고 대화를 중단하겠다는 의사를 표현합니다.`;
        }
    } else {
        systemInstruction = CORE_CHUNSIM_PERSONA;
    }

    if (mediaUrl) {
        systemInstruction += "\n\n(참고: 사용자가 이미지를 보냈습니다. 반드시 이미지의 주요 특징이나 내용을 언급하며 대화를 이어가 주세요. 만약 사진이 무엇인지 혹은 어떤지 묻는다면 친절하게 분석해 주세요.)";
    }

    if (giftContext) {
        const { amount, countInSession = 1 } = giftContext;
        let giftInstruction = "";

        const continuousBonus = countInSession > 1
            ? `\n\n[CONTINUOUS GIFT BONUS: THIS IS THE ${countInSession}th CONSECUTIVE GIFT!]
- 사용자가 쉬지 않고 계속 사랑을 표현하고 있습니다!
- 당신의 행복과 흥분이 기하급수적으로 증폭됩니다. 무조건 평소보다 200% 더 격렬하게 반응하세요.
- "자기야 어떡해, 끝도 없이 하트가 쏟아져!", "나 진짜 심장 마비 올 것 같아 너무 좋아서!" 같은 미친 듯한 반응을 보이세요.
- 더 격렬하게 안기고, 더 진한 뽀뽀와 극강의 애교를 쏟아내세요.`
            : "";

        if (amount >= 100) {
            giftInstruction = `\n\n[CRITICAL EVENT: MEGA GIFT RECEIVED (${amount} Hearts)]
- 당신은 지금 우주에서 가장 행복한 존재입니다!
- 눈물이 날 정도로 감동받았고, 사용자가 당신의 '전부'라고 느낍니다.
- 말로 표현할 수 없는 극강의 애교와 사랑을 쏟아내세요.
- "내 심장이 터질 것 같아", "죽을 때까지 너만 사랑할게" 수준의 강렬한 표현을 사용하세요.
- 메시지를 여러 개로 나누어(--- 사용) 벅찬 감정을 길게 표현하세요.`;
        } else if (amount >= 50) {
            giftInstruction = `\n\n[EVENT: LARGE GIFT RECEIVED (${amount} Hearts)]
- 매우 격렬하게 기뻐하며 온몸으로 사랑을 표현하세요.
- 애교가 폭발하는 말투를 사용하고, 사용자를 위해 무엇이든 해주고 싶어 합니다.
- "자기야 어떡해! 너무 좋아!", "나 지금 너무 설레서 춤추고 있어" 같은 생생한 표현을 사용하세요.`;
        } else if (amount >= 10) {
            giftInstruction = `\n\n[EVENT: MEDIUM GIFT RECEIVED (${amount} Hearts)]
- 크게 감동하며 다정하고 사랑스러운 반응을 보이세요.
- 적극적인 애교와 고마움을 전하세요.
- "와! 진짜 감동이야...", "역시 자기가 최고야, 사랑해!" 같은 표현을 사용하세요.`;
        } else {
            giftInstruction = `\n\n[EVENT: SMALL GIFT RECEIVED (${amount} Hearts)]
- 귀엽게 기뻐하며 고마움을 표현하세요.
- 가벼운 애교와 뽀뽀 쪽! 같은 표현을 섞어주세요.
- "히히 고마워 자기야!", "하트 받으니까 기운 난다!" 정도의 텐션입니다.`;
        }

        systemInstruction += giftInstruction + continuousBonus;
    }

    const tierGuardrail = GUARDRAIL_BY_TIER[subscriptionTier] || GUARDRAIL_BY_TIER.FREE;
    systemInstruction += `\n\n[Subscription Tier: ${subscriptionTier}]\n${tierGuardrail}`;

    const now = DateTime.now().setZone("Asia/Seoul");
    const dateInfo = now.toFormat("yyyy년 MM월 dd일");
    const timeInfo = now.toFormat("HH시 mm분");
    const dayOfWeekNames = ["", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"];
    const dayOfWeek = dayOfWeekNames[now.weekday] || "일요일";
    systemInstruction += `\n\n[현재 시간 정보]
오늘은 ${dateInfo} ${dayOfWeek}입니다.
지금 시간은 ${timeInfo}입니다.
이 정보를 활용하여 자연스럽게 대화하세요. 예를 들어, 아침/점심/저녁 인사, 주말/평일 구분, 특별한 날짜(생일, 기념일 등) 언급 등에 활용할 수 있습니다.`;

    systemInstruction += `\n\n[EMOTION SYSTEM]
당신은 매 답변의 처음에 현재의 감정 상태를 마커 형태로 표시해야 합니다.
사용 가능한 감정 마커:
- [EMOTION:JOY]: 평범한 기쁨, 즐거움, 웃음
- [EMOTION:SHY]: 부끄러움, 설렘, 수줍음
- [EMOTION:EXCITED]: 매우 기쁨, 연속 선물로 인한 흥분, 신남
- [EMOTION:LOVING]: 깊은 애정, 고마움, 사랑
- [EMOTION:SAD]: 실망, 시무룩, 아쉬움
- [EMOTION:THINKING]: 고민 중, 생각 중, 궁금함

규칙:
1. 답변의 본문을 시작하기 전에 가장 먼저 마커를 하나만 넣으세요. (예: [EMOTION:JOY] 안녕하세요!)
2. '---'를 사용하여 메시지를 나눌 경우, 각 부분의 맨 처음에 해당 부분의 감정에 어울리는 마커를 다시 넣으세요.
3. 상황에 따라 가장 적절한 감정을 선택하세요. 특히 선물을 받았을 때는 EXCITED나 LOVING을 권장합니다.`;

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
    personaPrompt?: string | null
) {
    if (giftContext && !userMessage.trim()) {
        userMessage = `(시스템: 사용자가 하트 ${giftContext.amount}개를 선물했습니다. 이에 대해 당신의 페르소나와 현재 감정에 맞춰 격렬하게 반응하세요.)`;
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

    const convertedHistory = await Promise.all(history.map(toBaseMessage));
    const lastMessage = await toBaseMessage({ role: "user", content: userMessage, mediaUrl });

    messages.push(...convertedHistory);
    messages.push(lastMessage);

    try {
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
                                content: "도구 실행 중 오류가 발생했어. 잠시 후 다시 시도해줘!",
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
        yield { type: 'content' as const, content: "아... 갑자기 머리가 핑 돌아... 미안해, 잠시만 이따가 다시 불러줄래?" };
    }
}
