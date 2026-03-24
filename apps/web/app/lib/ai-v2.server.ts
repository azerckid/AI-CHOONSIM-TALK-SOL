/**
 * Vercel AI SDK 기반 AI 채팅 프로토타입
 *
 * Phase 1: 기존 ai.server.ts와 병행하여 streamText 검증용.
 * Phase 2: chat API에서 streamAIResponseV2로 전환 가능 (USE_VERCEL_AI_SDK=true 시)
 *
 * @see docs/01_Concept_Design/15_VERCEL_AI_SDK_ADOPTION.md
 */

import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import {
    buildStreamSystemInstruction,
    type StreamSystemInstructionParams,
    type SubscriptionTier,
} from "~/lib/ai.server";
import type { PersonaMode } from "~/lib/ai.server";
import { logger } from "~/lib/logger.server";

const DEFAULT_MODEL = "gemini-2.5-flash";

export interface HistoryMessage {
    role: "user" | "assistant";
    content: string;
    mediaUrl?: string | null;
    isInterrupted?: boolean;
}

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

/**
 * Vercel AI SDK streamText를 사용한 스트리밍 응답 생성 (프로토타입)
 */
export function streamTextV2(
    systemInstruction: string,
    messages: HistoryMessage[],
    userMessage: string,
    options?: {
        model?: string;
        abortSignal?: AbortSignal;
    }
) {
    const modelId = options?.model ?? DEFAULT_MODEL;

    const modelMessages = [
        ...messages.map((m) =>
            m.role === "user"
                ? { role: "user" as const, content: m.content }
                : { role: "assistant" as const, content: m.content }
        ),
        { role: "user" as const, content: userMessage },
    ];

    return streamText({
        model: google(modelId),
        system: systemInstruction,
        messages: modelMessages,
        abortSignal: options?.abortSignal,
        maxOutputTokens: 2048,
    });
}

/**
 * streamAIResponse와 동일한 출력 형식을 갖는 Vercel AI SDK 기반 스트리밍
 * USE_VERCEL_AI_SDK=true 이고 mediaUrl이 없을 때 chat API에서 사용
 *
 * @returns AsyncGenerator<{ type: 'content', content: string } | { type: 'usage', usage: TokenUsage }>
 */
export async function* streamAIResponseV2(
    userMessage: string,
    history: HistoryMessage[],
    personaMode: PersonaMode,
    currentSummary: string,
    mediaUrl: string | null,
    characterId: string,
    subscriptionTier: SubscriptionTier,
    giftContext: { amount: number; itemId: string; countInSession?: number } | undefined,
    abortSignal: AbortSignal | undefined,
    characterName: string | null | undefined,
    personaPrompt: string | null | undefined
) {
    if (giftContext && !userMessage.trim()) {
        userMessage = `(시스템: 사용자가 하트 ${giftContext.amount}개를 선물했습니다. 이에 대해 당신의 페르소나와 현재 감정에 맞춰 격렬하게 반응하세요.)`;
    }

    const params: StreamSystemInstructionParams = {
        personaMode,
        currentSummary,
        mediaUrl,
        characterId,
        subscriptionTier,
        giftContext,
        characterName,
        personaPrompt,
    };
    const systemInstruction = buildStreamSystemInstruction(params);

    const result = streamTextV2(
        systemInstruction,
        history.map((h) => ({ role: h.role, content: h.content })),
        userMessage,
        { abortSignal }
    );

    try {
        for await (const chunk of result.textStream) {
            if (chunk) {
                yield { type: "content" as const, content: chunk };
            }
        }

        const usage = await result.usage;
        if (usage) {
            const tokenUsage: TokenUsage = {
                promptTokens: usage.inputTokens ?? 0,
                completionTokens: usage.outputTokens ?? 0,
                totalTokens: usage.totalTokens ?? (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
            };
            yield { type: "usage" as const, usage: tokenUsage };
        }
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            return;
        }
        logger.error({ category: "SYSTEM", message: "streamAIResponseV2 Error:", stackTrace: (error as Error).stack });
        yield {
            type: "content" as const,
            content: "아... 갑자기 머리가 핑 돌아... 미안해, 잠시만 이따가 다시 불러줄래?",
        };
    }
}
