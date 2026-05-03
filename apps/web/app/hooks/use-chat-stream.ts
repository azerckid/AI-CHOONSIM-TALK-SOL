/**
 * AI 채팅 스트리밍 훅
 * - startAiStreaming: SSE 스트림 연결 및 파싱
 * - saveInterruptedMessage: 중단된 메시지 저장
 *
 * 타자 효과(typewriter): 서버로부터 최종 가공된 텍스트를 받은 뒤,
 * setInterval(16ms) 기준으로 2글자씩 화면에 출력합니다.
 */
import { useRef, useCallback } from "react";
import { useRevalidator } from "react-router";
import { toast } from "sonner";
import type { Message } from "~/lib/chat/types";

interface UseChatStreamOptions {
    conversationId: string;
    characterId: string | undefined;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    setIsAiStreaming: (v: boolean) => void;
    setIsOptimisticTyping: (v: boolean) => void;
    setStreamingContent: React.Dispatch<React.SetStateAction<string>>;
    setStreamingMediaUrl: React.Dispatch<React.SetStateAction<string | null>>;
    setCurrentEmotion: (v: string) => void;
    setEmotionExpiresAt: (v: string | null) => void;
    setPaywallTrigger: (v: string | null) => void;
    setCurrentUserChocoBalance: React.Dispatch<React.SetStateAction<number>>;
    setLastOptimisticDeduction: (v: number) => void;
    setChocoChange: (v: number | undefined) => void;
    optimisticIntervalRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>;
    lastOptimisticDeductionRef: React.MutableRefObject<number>;
    abortControllerRef: React.MutableRefObject<AbortController | null>;
    onInsufficientChoco?: () => void;
}

type TypewriterItem = {
    text: string;
    onComplete: () => void;
};

type DonePayload = {
    usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
};

export function useChatStream(opts: UseChatStreamOptions) {
    const {
        conversationId,
        characterId,
        setMessages,
        setIsAiStreaming,
        setIsOptimisticTyping,
        setStreamingContent,
        setStreamingMediaUrl,
        setCurrentEmotion,
        setEmotionExpiresAt,
        setPaywallTrigger,
        setCurrentUserChocoBalance,
        setLastOptimisticDeduction,
        setChocoChange,
        optimisticIntervalRef,
        lastOptimisticDeductionRef,
        abortControllerRef,
        onInsufficientChoco,
    } = opts;

    const revalidator = useRevalidator();

    // 타자 애니메이션 상태 (ref로 관리 — 리렌더와 무관하게 유지)
    const typewriterTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const typewriterQueueRef = useRef<TypewriterItem[]>([]);
    const pendingDoneRef = useRef<DonePayload | null>(null);

    const saveInterruptedMessage = useCallback(async (content: string, mediaUrl: string | null) => {
        try {
            await fetch("/api/chat/interrupt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversationId, content, mediaUrl }),
            });
        } catch (e) {
            console.error("Failed to save interrupted message:", e);
        }
    }, [conversationId]);

    const startAiStreaming = useCallback(async (
        userMessage: string,
        mediaUrl?: string,
        giftContext?: { amount: number; itemId: string }
    ) => {
        // 이전 타자 애니메이션 정리
        if (typewriterTimerRef.current !== null) {
            clearInterval(typewriterTimerRef.current);
            typewriterTimerRef.current = null;
        }
        typewriterQueueRef.current = [];
        pendingDoneRef.current = null;

        setIsAiStreaming(true);
        setStreamingContent("");
        setStreamingMediaUrl(null);

        // ─── 로컬 헬퍼 함수 ───────────────────────────────────────────
        // 모든 타자 큐가 비었고 done 이벤트가 도착했을 때 스트리밍 완전 종료
        function doFinishStreaming() {
            const doneData = pendingDoneRef.current;
            pendingDoneRef.current = null;
            setIsAiStreaming(false);

            if (optimisticIntervalRef.current) {
                clearInterval(optimisticIntervalRef.current);
                optimisticIntervalRef.current = null;
            }

            if (doneData?.usage?.totalTokens) {
                const actualCost = Math.ceil(doneData.usage.totalTokens / 100);
                const adjustment = lastOptimisticDeductionRef.current - actualCost;
                setCurrentUserChocoBalance((prev: number) => Math.max(0, prev + adjustment));
                setChocoChange(-actualCost);
                setTimeout(() => setChocoChange(undefined), 2000);
                setLastOptimisticDeduction(0);
                revalidator.revalidate();
            } else {
                setTimeout(() => {
                    setChocoChange(undefined);
                    setLastOptimisticDeduction(0);
                    revalidator.revalidate();
                }, 2000);
            }
        }

        // 큐에서 다음 항목 타자 출력
        function processQueue() {
            if (typewriterTimerRef.current !== null) return; // 이미 실행 중

            const next = typewriterQueueRef.current.shift();
            if (!next) {
                // 큐 비었음 — done 이벤트가 대기 중이면 완전 종료
                if (pendingDoneRef.current !== null) {
                    doFinishStreaming();
                }
                return;
            }

            let idx = 0;
            const itemText = next.text;
            const itemOnComplete = next.onComplete;
            setStreamingContent(""); // 새 버블 시작 전 초기화

            // 사람이 타이핑하는 것처럼 불규칙한 딜레이
            function scheduleNextChar() {
                const char = itemText[idx] ?? "";

                // 문장 부호 뒤에는 잠깐 멈춤 (생각하는 느낌)
                let delay: number;
                if (/[.!?。！？]/.test(char)) {
                    delay = 180 + Math.random() * 270; // 180~450ms
                } else if (/[,，、]/.test(char)) {
                    delay = 90 + Math.random() * 120;  // 90~210ms
                } else {
                    // 평균 67ms, ±30ms 랜덤 변동 (37~97ms)
                    delay = 37 + Math.random() * 60;
                }

                typewriterTimerRef.current = setTimeout(() => {
                    typewriterTimerRef.current = null;
                    const nextIdx = Math.min(idx + 1, itemText.length);
                    setStreamingContent(itemText.slice(0, nextIdx));
                    idx = nextIdx;

                    if (nextIdx < itemText.length) {
                        scheduleNextChar();
                    } else {
                        itemOnComplete(); // 메시지 버블 확정
                        setTimeout(processQueue, 60);
                    }
                }, delay) as unknown as ReturnType<typeof setInterval>;
            }

            scheduleNextChar();
        }
        // ──────────────────────────────────────────────────────────────

        try {
            if (abortControllerRef.current) abortControllerRef.current.abort();

            if (optimisticIntervalRef.current) {
                clearInterval(optimisticIntervalRef.current);
                optimisticIntervalRef.current = null;
            }
            const controller = new AbortController();
            abortControllerRef.current = controller;

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({
                    message: userMessage,
                    conversationId,
                    mediaUrl,
                    characterId,
                    giftContext
                }),
            });

            if (response.status === 402) return;
            if (!response.ok) throw new Error("AI 응답 요청 실패");

            setIsOptimisticTyping(false);

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let currentMessageContent = "";

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const rawChunk = decoder.decode(value, { stream: true });
                    const lines = rawChunk.split("\n");

                    for (const line of lines) {
                        if (!line.startsWith("data: ")) continue;

                        try {
                            const data = JSON.parse(line.slice(6));

                            // ── 에러 처리 ──
                            if (data.error && data.code === 402) {
                                setIsAiStreaming(false);
                                setIsOptimisticTyping(false);
                                if (optimisticIntervalRef.current) {
                                    clearInterval(optimisticIntervalRef.current);
                                    optimisticIntervalRef.current = null;
                                }
                                if (lastOptimisticDeductionRef.current > 0) {
                                    setCurrentUserChocoBalance((p) => p + lastOptimisticDeductionRef.current);
                                    setLastOptimisticDeduction(0);
                                }
                                if (onInsufficientChoco) {
                                    onInsufficientChoco();
                                } else {
                                    toast.error("CHOCO 잔액이 부족합니다.", {
                                        action: { label: "CHOCO 충전하기", onClick: () => window.location.href = "/profile/subscription" },
                                    });
                                }
                                return;
                            }

                            // ── 감정 이벤트 ──
                            if (data.emotion) setCurrentEmotion(data.emotion);
                            if (data.expiresAt) setEmotionExpiresAt(data.expiresAt);

                            // ── 실시간 청크 & clearStream: 무시 (TypingIndicator 유지) ──
                            // data.chunk, data.clearStream — 서버에서 오지만 표시에 사용하지 않음

                            // ── 미디어 URL (message 완료 전 미리 수신) ──
                            if (data.mediaUrl && !data.messageComplete) {
                                setStreamingMediaUrl(data.mediaUrl);
                            }

                            // ── 최종 가공된 텍스트 수신 ──
                            if (data.text) {
                                currentMessageContent = data.text;
                            }

                            // ── 메시지 완료 → 타자 큐에 추가 ──
                            if (data.messageComplete) {
                                const content = currentMessageContent;
                                const msgId = data.messageId || crypto.randomUUID();
                                const msgMediaUrl = data.mediaUrl || null;

                                typewriterQueueRef.current.push({
                                    text: content,
                                    onComplete: () => {
                                        setMessages(prev => [...prev, {
                                            id: msgId,
                                            role: "assistant" as const,
                                            content,
                                            mediaUrl: msgMediaUrl,
                                            createdAt: new Date().toISOString(),
                                            isLiked: false,
                                        }]);
                                        setStreamingContent("");
                                        setStreamingMediaUrl(null);
                                    },
                                });

                                processQueue();
                                currentMessageContent = "";
                            }

                            // ── 페이월 트리거 ──
                            if (data.paywallTrigger) {
                                setPaywallTrigger(data.paywallTrigger);
                            }

                            // ── 스트림 완료 ──
                            if (data.done) {
                                // 타자 큐가 비어있으면 즉시 종료, 아니면 큐 완료 후 종료
                                pendingDoneRef.current = { usage: data.usage || null };
                                if (typewriterTimerRef.current === null && typewriterQueueRef.current.length === 0) {
                                    doFinishStreaming();
                                }
                            }
                        } catch {
                            // SSE parse error — ignore
                        }
                    }
                }
            }
        } catch (err: unknown) {
            // 타자 애니메이션 정리
            if (typewriterTimerRef.current !== null) {
                clearInterval(typewriterTimerRef.current);
                typewriterTimerRef.current = null;
            }
            typewriterQueueRef.current = [];
            pendingDoneRef.current = null;

            if (err instanceof Error && err.name === 'AbortError') {
                return;
            }
            console.error("Streaming error:", err);
            toast.error("답변을 가져오는 중 오류가 발생했습니다.");
            setIsAiStreaming(false);
            setIsOptimisticTyping(false);

            if (optimisticIntervalRef.current) {
                clearInterval(optimisticIntervalRef.current);
                optimisticIntervalRef.current = null;
            }

            if (lastOptimisticDeductionRef.current > 0) {
                setCurrentUserChocoBalance((prev: number) => prev + lastOptimisticDeductionRef.current);
                const rolledBack = lastOptimisticDeductionRef.current;
                setLastOptimisticDeduction(0);
                setChocoChange(rolledBack);
                setTimeout(() => setChocoChange(undefined), 2000);
            }

            setStreamingContent(prev => {
                if (prev) {
                    const partialMsg: Message = {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: prev + "...",
                        createdAt: new Date().toISOString(),
                    };
                    setMessages(msgs => [...msgs, partialMsg]);
                }
                return "";
            });
        }
    }, [
        conversationId, characterId, abortControllerRef, optimisticIntervalRef,
        lastOptimisticDeductionRef, setIsAiStreaming, setIsOptimisticTyping,
        setStreamingContent, setStreamingMediaUrl, setCurrentEmotion, setEmotionExpiresAt,
        setPaywallTrigger, setMessages, setCurrentUserChocoBalance, setLastOptimisticDeduction,
        setChocoChange, revalidator,
    ]);

    return { startAiStreaming, saveInterruptedMessage };
}
