import { db } from "~/lib/db.server";
import { MIN_REQUIRED_CHOCO } from "~/lib/constants/chat";
import { BioSchema, type Bio } from "~/lib/schemas/bio";
import { deductChocoForTokens } from "~/lib/chat/choco.server";
import { auth } from "~/lib/auth.server";
import { z } from "zod";
import type { ActionFunctionArgs } from "react-router";
import { streamAIResponse, extractPhotoMarker, extractEmotionMarker } from "~/lib/ai.server";
import { streamAIResponseV2 } from "~/lib/ai-v2.server";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import * as schema from "~/db/schema";
import { eq, and, sql, desc, gte, count } from "drizzle-orm";
import {
    getFullContextData,
    compressMemoryForPrompt,
    extractAndSaveMemoriesFromConversation,
    compressHeartbeatForPrompt,
    updateHeartbeatContext,
    compressIdentityForPrompt,
    compressSoulForPrompt,
    compressToolsForPrompt,
    classifyConversation,
    isSpecialDateToday,
    getLayerBudgets,
} from "~/lib/context";

const chatSchema = z.object({
    message: z.string().optional().default(""),
    conversationId: z.string().uuid(),
    personality: z.enum(["idol", "lover", "hybrid", "roleplay"]).optional(),
    mediaUrl: z.string().optional().nullable().transform(val => val === "" ? null : val),
    characterId: z.string().optional().default("choonsim"),
    giftContext: z.object({
        amount: z.number(),
        itemId: z.string(),
    }).optional(),
}).refine(data => data.message || data.mediaUrl || data.giftContext, {
    message: "Message, media or gift is required",
    path: ["message"],
});

export async function action({ request }: ActionFunctionArgs) {
    const { logger } = await import("~/lib/logger.server");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
    }

    const body = await request.json();
    const result = chatSchema.safeParse(body);

    if (!result.success) {
        return Response.json({ error: result.error.flatten() }, { status: 400 });
    }

    const { message, conversationId, mediaUrl, characterId, giftContext } = result.data;

    // 1. 대화 내역, 사용자 정보 및 캐릭터/대화방 정보 통합 조회 (1회 통신으로 최적화)
    const [history, currentUser, currentConversation] = await Promise.all([
        db.query.message.findMany({
            where: eq(schema.message.conversationId, conversationId),
            orderBy: [desc(schema.message.createdAt)],
            limit: 10,
        }),
        db.query.user.findFirst({
            where: eq(schema.user.id, session.user.id),
            columns: { id: true, bio: true, subscriptionTier: true, chocoBalance: true },
        }),
        db.query.conversation.findFirst({
            where: eq(schema.conversation.id, conversationId),
            with: { character: true }
        }),
    ]);

    // CHOCO 잔액 체크
    const currentChocoBalance = currentUser?.chocoBalance ? parseFloat(currentUser.chocoBalance) : 0;
    if (!currentUser || currentChocoBalance < MIN_REQUIRED_CHOCO) {
        return Response.json(
            { error: "Insufficient CHOCO balance", code: 402 },
            { status: 402 }
        );
    }

    // 기억(memory): 5계층 컨텍스트 우선, 없으면 기존 bio 요약 사용
    let memory: string = "";
    let bioData: Bio = { memory: "", personaMode: "hybrid" };

    // Phase 10: 대화 유형 분류 → 동적 토큰 예산 적용 후 5계층 로드
    try {
        const fullContext = await getFullContextData(session.user.id, characterId);
        const recentText = history
            .slice(0, 3)
            .map((m) => (m as any).content || "")
            .join(" ");
        const conversationType = classifyConversation({
            messageCount: history.length,
            isSpecialDateToday: isSpecialDateToday(fullContext?.tools),
            recentText,
        });
        const budget = getLayerBudgets(conversationType);

        const [contextMemory, contextHeartbeat, contextIdentity, contextSoul, contextTools] = await Promise.all([
            compressMemoryForPrompt(session.user.id, characterId, budget.memory),
            compressHeartbeatForPrompt(session.user.id, characterId, budget.heartbeat, fullContext),
            compressIdentityForPrompt(session.user.id, characterId, budget.identity, fullContext),
            compressSoulForPrompt(session.user.id, characterId, (currentUser?.subscriptionTier as any) || "FREE", budget.soul, fullContext),
            compressToolsForPrompt(session.user.id, characterId, budget.tools, fullContext),
        ]);

        const parts = [];
        if (contextIdentity) parts.push(contextIdentity);
        if (contextSoul) parts.push(contextSoul);
        if (contextTools) parts.push(contextTools);
        if (contextHeartbeat) parts.push(contextHeartbeat);
        if (contextMemory) parts.push(contextMemory);

        if (parts.length > 0) {
            memory = parts.join("\n\n");
        }

        // 페이월 트리거 지시사항 (선택적 감성 순간 포착)
        memory += `\n\n[PAYWALL_TRIGGER SYSTEM - 선택적 사용]
특별히 감성적인 순간에만, 응답 맨 끝에 다음 태그 중 하나를 추가할 수 있습니다:
[PAYWALL_TRIGGER: memory_recall] - 소중한 기억·추억 대화 시
[PAYWALL_TRIGGER: secret_episode] - 특별한 비밀 에피소드 공유 가능한 순간
[PAYWALL_TRIGGER: memory_album] - 대화 기념일·추억 회상 순간
[PAYWALL_TRIGGER: birthday_voice] - 생일·특별한 날 목소리로 전하고 싶을 때
규칙: 10회 대화 중 최대 1회, 응답 맨 마지막에 하나만, 자연스러운 순간에만.`;
    } catch (e) {
        logger.error({
            category: "API",
            message: "Context load failed, falling back to bio",
            metadata: { userId: session.user.id, characterId },
        });
    }

    // Phase 3 Heartbeat: 대화 시작 시점 갱신 (Streak, LastSeen 등)
    // 프롬프트 생성(위 compress)은 '갱신 전' 데이터로 하고, DB는 '갱신'하여 현재 상태 반영
    try {
        await updateHeartbeatContext(session.user.id, characterId, false);
    } catch (e) {
        logger.error({
            category: "API",
            message: "Failed to update heartbeat at start",
            metadata: { userId: session.user.id, characterId },
        });
    }

    if (!memory && currentUser?.bio) {
        try {
            bioData = BioSchema.parse(JSON.parse(currentUser.bio));
            if (bioData.memory) memory = bioData.memory;
        } catch (e) {
            logger.error({ category: "API", message: "Bio parsing error", stackTrace: e instanceof Error ? e.stack : String(e) });
        }
    }

    // 페르소나 모드 결정 (DB 우선)
    const personality = ((currentConversation as any)?.personaMode || "lover") as any;

    // 1.5 선물 연속성 확인 (최근 10분 이내 선물 횟수 조회)
    let giftCountInSession = 0;
    if (giftContext) {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const [giftCountRes] = await db.select({ value: count() })
            .from(schema.giftLog)
            .where(and(
                eq(schema.giftLog.fromUserId, session.user.id),
                eq(schema.giftLog.toCharacterId, characterId),
                gte(schema.giftLog.createdAt, tenMinutesAgo)
            ));

        giftCountInSession = (giftCountRes?.value ?? 0) + 1;
    }

    // 멀티모달 히스토리 구성
    const formattedHistory = [...history].reverse().map(msg => ({
        role: msg.role,
        content: msg.content,
        mediaUrl: msg.mediaUrl,
        isInterrupted: msg.isInterrupted,
    }));

    // SSE 스트리밍 설정
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            let fullContent = "";
            let paywallTriggerType: string | null = null;
            let isAborted = false;
            let isClosed = false;

            // 스트리밍 타임아웃: 120초 후 자동 종료
            const streamTimeoutId = setTimeout(() => {
                if (!isClosed) {
                    isAborted = true;
                    isClosed = true;
                    controller.close();
                }
            }, 120_000);

            const abortHandler = () => {
                isAborted = true;
                if (!isClosed) {
                    isClosed = true;
                    controller.close();
                }
            };
            request.signal.addEventListener("abort", abortHandler);

            try {
                // (이전 단계에서 이미 체크되었으므로 생략 가능하나, 스트림 내 보조 에러 메시지로 유지)
                const userChocoBalance = currentUser?.chocoBalance ? parseFloat(currentUser.chocoBalance) : 0;
                if (!currentUser || userChocoBalance < MIN_REQUIRED_CHOCO) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Insufficient CHOCO balance", code: 402 })}\n\n`));
                    isClosed = true;
                    controller.close();
                    return;
                }

                // 2단계: AI 응답 스트리밍 및 토큰 사용량 집계
                const subscriptionTier = (currentUser?.subscriptionTier as any) || "FREE";
                let tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | null = null;

                const useVercelAI = process.env.USE_VERCEL_AI_SDK === "true" && !mediaUrl;
                const historyForV2 = formattedHistory.map((h) => ({
                    role: h.role as "user" | "assistant",
                    content: h.content,
                    mediaUrl: h.mediaUrl,
                    isInterrupted: h.isInterrupted,
                }));
                const streamSource = useVercelAI
                    ? streamAIResponseV2(
                          message,
                          historyForV2,
                          personality,
                          memory,
                          mediaUrl ?? null,
                          characterId,
                          subscriptionTier,
                          giftContext ? { ...giftContext, countInSession: giftCountInSession } : undefined,
                          request.signal,
                          (currentConversation as any)?.character?.name,
                          (currentConversation as any)?.character?.personaPrompt
                      )
                    : streamAIResponse(
                          message,
                          formattedHistory,
                          personality,
                          memory,
                          mediaUrl,
                          session.user.id,
                          characterId,
                          subscriptionTier,
                          giftContext ? { ...giftContext, countInSession: giftCountInSession } : undefined,
                          request.signal,
                          (currentConversation as any)?.character?.name,
                          (currentConversation as any)?.character?.personaPrompt,
                          conversationId
                      );

                for await (const item of streamSource) {
                    if (isAborted) break;

                    if (item.type === 'content') {
                        fullContent += item.content;
                        // 청크를 즉시 클라이언트로 전달 (타자 치는 효과)
                        if (!isClosed) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: item.content })}\n\n`));
                        }
                    } else if (item.type === 'usage' && item.usage) {
                        tokenUsage = item.usage;
                    }
                }

                if (isAborted) {
                    return;
                }

                // 3단계. 토큰 사용량에 따른 CHOCO 차감 (스트리밍 완료 후)
                if (tokenUsage && tokenUsage.totalTokens > 0) {
                    try {
                        await deductChocoForTokens(session.user.id, characterId, tokenUsage);
                    } catch (err) {
                        logger.error({
                            category: "DB",
                            message: `Failed to deduct CHOCO for user ${session.user.id}`,
                            stackTrace: (err as Error).stack
                        });
                    }
                }

                // 만약 AI 응답이 완전히 비어있는 경우 (세이프티 필터 등에 의해 차단된 경우) 폴백 메시지 설정
                if (!fullContent.trim()) {
                    fullContent = "[EMOTION:THINKING] 음... 그건 잘 모르겠지만 자기는 어떻게 생각해? ㅎㅎ 우리 다른 재미있는 이야기 하자!";
                }

                // PAYWALL_TRIGGER 파싱 및 제거 (표시 콘텐츠에서 태그 제거)
                const paywallMatch = fullContent.match(/\[PAYWALL_TRIGGER:\s*([a-z_]+)\]/i);
                if (paywallMatch) {
                    paywallTriggerType = paywallMatch[1].toLowerCase().trim();
                    fullContent = fullContent.replace(/\[PAYWALL_TRIGGER:\s*[a-z_]+\]/gi, "").trim();
                }

                // 전체 응답에서 사진 마커 먼저 추출
                const firstPhotoMarker = await extractPhotoMarker(fullContent, characterId);
                const photoUrl = firstPhotoMarker.photoUrl;
                const contentWithoutPhotoMarker = firstPhotoMarker.content;

                // 2단계: 전체 응답을 ---로 나누기
                let messageParts = contentWithoutPhotoMarker.split('---').map(p => p.trim()).filter(p => p.length > 0);

                const hasUrl = /https?:\/\//.test(contentWithoutPhotoMarker);
                if (messageParts.length <= 1 && contentWithoutPhotoMarker.length > 100 && !hasUrl) {
                    const chunkSize = 80;
                    messageParts = [];
                    let currentPart = "";
                    const sentences = contentWithoutPhotoMarker.split(/[.!?。！？]\s*/).filter(s => s.trim());

                    for (const sentence of sentences) {
                        if ((currentPart + sentence).length > chunkSize && currentPart) {
                            messageParts.push(currentPart.trim());
                            currentPart = sentence;
                        } else {
                            currentPart += (currentPart ? " " : "") + sentence;
                        }
                    }
                    if (currentPart.trim()) {
                        messageParts.push(currentPart.trim());
                    }
                }

                // 3단계: 가공된 메시지 파트 전송 전, 클라이언트 스트리밍 버퍼 초기화
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ clearStream: true })}\n\n`));

                // 각 말풍선 전송 (DB 저장은 스트림 종료 후 일괄 처리)
                const pendingMessageSaves: Array<{
                    id: string;
                    content: string;
                    mediaUrl: string | null;
                    isFirst: boolean;
                }> = [];

                for (let i = 0; i < messageParts.length; i++) {
                    const part = messageParts[i];
                    const emotionMarker = extractEmotionMarker(part);
                    const emotionCode = emotionMarker.emotion;
                    const finalContent = emotionMarker.content;
                    const messageId = crypto.randomUUID();

                    if (emotionCode) {
                        let expiresAt: Date | null = null;
                        if (giftContext) {
                            const amount = giftContext.amount;
                            const durationMinutes = amount >= 100 ? 30 : amount >= 50 ? 15 : amount >= 10 ? 5 : 1;
                            expiresAt = new Date(Date.now() + durationMinutes * 60000);
                        }

                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                            emotion: emotionCode,
                            expiresAt: expiresAt?.toISOString()
                        })}\n\n`));

                        // DB 업데이트 (비동기 fire-and-forget)
                        db.insert(schema.characterStat)
                            .values({
                                id: crypto.randomUUID(),
                                characterId,
                                currentEmotion: emotionCode,
                                emotionExpiresAt: expiresAt,
                                updatedAt: new Date(),
                            })
                            .onConflictDoUpdate({
                                target: [schema.characterStat.characterId],
                                set: {
                                    currentEmotion: emotionCode,
                                    emotionExpiresAt: expiresAt || undefined,
                                    updatedAt: new Date(),
                                }
                            }).catch(err => logger.error({ category: "API", message: "Failed to update emotion:", stackTrace: (err as Error).stack }));
                    }

                    if (i === 0 && photoUrl) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ mediaUrl: photoUrl })}\n\n`));
                    }

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: finalContent })}\n\n`));
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ messageComplete: true, messageId, mediaUrl: (i === 0 && photoUrl) ? photoUrl : null })}\n\n`));

                    pendingMessageSaves.push({
                        id: messageId,
                        content: finalContent,
                        mediaUrl: (i === 0 && photoUrl) ? photoUrl : null,
                        isFirst: i === 0,
                    });
                }

                // 스트리밍 완료 이벤트 전송
                const usage = tokenUsage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, usage })}\n\n`));

                if (paywallTriggerType) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ paywallTrigger: paywallTriggerType })}\n\n`));
                }

                // 스트림 즉시 종료 — 클라이언트는 모든 이벤트를 이미 수신
                isClosed = true;
                controller.close();

                // 스트림 종료 후 DB 저장 일괄 처리 (클라이언트 응답과 무관하게 백그라운드 실행)
                const firstMsgSave = pendingMessageSaves[0];
                await Promise.allSettled([
                    ...pendingMessageSaves.map(msg =>
                        db.insert(schema.message).values({
                            id: msg.id,
                            role: "assistant",
                            content: msg.content,
                            conversationId,
                            createdAt: new Date(),
                            type: "TEXT",
                            mediaUrl: msg.mediaUrl,
                            mediaType: msg.mediaUrl ? "image" : null,
                        })
                    ),
                    firstMsgSave ? db.insert(schema.agentExecution).values({
                        id: crypto.randomUUID(),
                        messageId: firstMsgSave.id,
                        agentName: `gemini-2.5-flash-${characterId}`,
                        intent: personality || "hybrid",
                        promptTokens: usage.promptTokens,
                        completionTokens: usage.completionTokens,
                        totalTokens: usage.totalTokens,
                        createdAt: new Date(),
                    }).catch(err => logger.error({ category: "API", message: "Failed to save AgentExecution:", stackTrace: (err as Error).stack })) : Promise.resolve(),
                ]);

                // 5계층 memory: 대화에서 기억 추출용 메시지 구성
                const allMessagesForSummary: BaseMessage[] = [
                    ...formattedHistory.map(h => {
                        let content = h.content || (h.mediaUrl ? "이 사진(그림)을 확인해줘." : " ");
                        if (h.role === "assistant" && h.isInterrupted && content.endsWith("...")) {
                            content = content.slice(0, -3).trim();
                        }
                        return h.role === "user" ? new HumanMessage(content) : new AIMessage(content);
                    }),
                    new HumanMessage(message || (mediaUrl ? "이 사진(그림)을 확인해줘." : " ")),
                    new AIMessage(fullContent)
                ];

                // 메모리 추출 & 하트비트 갱신 — 클라이언트 응답과 무관하게 백그라운드 처리
                Promise.all([
                    extractAndSaveMemoriesFromConversation(
                        session.user.id,
                        characterId,
                        allMessagesForSummary,
                        { conversationId }
                    ),
                    updateHeartbeatContext(session.user.id, characterId, true)
                ]).catch(memErr => {
                    logger.error({
                        category: "API",
                        message: "Background memory/heartbeat update failed",
                        metadata: { conversationId, characterId },
                    });
                });
            } catch (error) {
                logger.error({
                    category: "API",
                    message: "Streaming error in chat API",
                    stackTrace: (error as Error).stack,
                    metadata: { conversationId, characterId }
                });
                if (!isClosed) {
                    isClosed = true;
                    controller.error(error);
                }
            } finally {
                clearTimeout(streamTimeoutId);
                request.signal.removeEventListener("abort", abortHandler);
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}
