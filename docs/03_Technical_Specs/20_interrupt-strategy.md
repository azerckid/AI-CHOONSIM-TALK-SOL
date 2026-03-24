# CHAT_INTERRUPT_STRATEGY: 인터럽트 기반 실시간 대화 시스템
> Created: 2026-02-08
> Last Updated: 2026-02-08

본 문서는 AI 캐릭터(춘심 등)가 답변을 생성 중일 때 유저가 개입하여 대화를 중단하고 주도권을 가져올 수 있는 **인터럽트(Interrupt) 시스템**의 설계 및 구현 전략을 정의합니다.

---

## 1. 개요 (Overview)

### 1.1 프로젝트 컨텍스트

이 문서는 **CHAT-BOTS** 프로젝트의 채팅 인터럽트 시스템 설계 문서입니다.

**현재 프로젝트 상태**:
- **프레임워크**: React Router v7 (Vite)
- **AI 엔진**: Google Gemini API (LangChain)
- **스트리밍**: Server-Sent Events (SSE)
- **데이터베이스**: Turso (libSQL) with Drizzle ORM
- **현재 구현 상태**: 인터럽트 시스템 구현 완료 (Phase 10)

**현재 동작 방식**:
- AI 답변 스트리밍 중에도 `MessageInput`이 활성화 상태를 유지함
- 유저가 새 메시지를 보내면 즉시 기존 스트리밍이 중단(Abort)됨
- 중단된 메시지는 `...`와 함께 DB에 저장되며, 다음 대화 시 문맥으로 활용됨

### 1.2 배경 및 목적

**배경**: 
- 현재 시스템은 AI 답변 중 유저 입력을 비활성화(Disable)하여 긴 답변을 무조건 기다려야 함
- 실제 대화와 달리 유저가 대화 흐름을 제어할 수 없음
- 불필요하게 긴 답변으로 인한 토큰 비용 증가

**목적**: 
- 대화의 흐름을 유저가 제어하도록 하여 실제 대화와 유사한 역동적인 UX 제공
- 불필요한 토큰 소비 방지 (예상 절감: 15~20%)
- 유저 경험 개선 및 대화 몰입감 향상

**핵심 원칙**: 
- 유저는 언제든 말을 끊을 수 있음
- 끊긴 지점까지의 내용은 보존되어야 함
- 중단된 메시지도 대화 문맥에 포함되어야 함

---

## 2. 사용자 경험 (UX Flow)
1.  **동적 입력 허용**: AI가 답변(스트리밍) 중일 때도 하단 입력창과 전송 버튼은 항상 활성화 상태를 유지함.
2.  **개입 시점**: 유저가 답변 내용을 확인하다가 중간에 새로운 의견이나 답변을 전송함.
3.  **즉각 중단 인터랙션**:
    *   유저의 '전송' 클릭 시, 현재 화면에서 생성 중이던 AI 메시지 버블이 즉시 멈춤.
    *   멈춘 메시지 끝에는 `...` 표시가 추가되어 AI의 말이 끊겼음을 시각적으로 암시.
4.  **자연스러운 전환**: AI의 끊긴 메시지가 DB에 저장됨과 동시에 유저의 새 메시지가 전송되고, 이에 반응하는 AI의 새로운 답변이 시작됨.

---

## 3. 기술 명세 (Technical Spec)

### 3.1 데이터베이스 스키마 확장

**Message 테이블에 필드 추가** (`app/db/schema.ts`):

```typescript
export const message = sqliteTable("Message", {
    // ... 기존 필드들 ...
    isInterrupted: integer("isInterrupted", { mode: "boolean" }).default(false),
    interruptedAt: integer("interruptedAt", { mode: "timestamp" }),
});
```

**마이그레이션**:
```bash
npx drizzle-kit generate
npx drizzle-kit push
```

**필드 설명**:
- `isInterrupted`: 메시지가 중단되었는지 여부를 나타내는 플래그
- `interruptedAt`: 중단된 시점의 타임스탬프 (디버깅 및 분석용)

### 3.2 클라이언트 사이드 구현 (React Router v7)

#### 3.2.1 AbortController 도입

**현재 코드 위치**: `app/routes/chat/$id.tsx`

**구현 예시**:
```typescript
const abortControllerRef = useRef<AbortController | null>(null);

const startAiStreaming = async (
  userMessage: string, 
  mediaUrl?: string, 
  giftContext?: { amount: number; itemId: string }
) => {
  // 이전 스트리밍이 있으면 중단
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }

  // 새로운 AbortController 생성
  const controller = new AbortController();
  abortControllerRef.current = controller;

  setIsAiStreaming(true);
  setStreamingContent("");
  setStreamingMediaUrl(null);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userMessage,
        conversationId,
        mediaUrl,
        characterId: dbCharacter?.id,
        giftContext
      }),
      signal: controller.signal, // AbortController signal 추가
    });

    // ... 기존 스트리밍 로직 ...
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      // 중단된 경우: 부분 메시지 저장
      await saveInterruptedMessage(streamingContent);
      return;
    }
    // ... 기존 에러 처리 ...
  }
};

const saveInterruptedMessage = async (content: string) => {
  if (!content.trim()) return;

  const interruptedContent = content + "...";
  
  // 서버에 중단된 메시지 저장 요청
  await fetch("/api/chat/interrupt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationId,
      content: interruptedContent,
      isInterrupted: true,
    }),
  });

  // 로컬 상태 업데이트
  const partialMsg: Message = {
    id: crypto.randomUUID(),
    role: "assistant",
    content: interruptedContent,
    createdAt: new Date().toISOString(),
    isLiked: false,
  };
  setMessages(prev => [...prev, partialMsg]);
  setStreamingContent("");
};

const handleSend = async (content: string, mediaUrl?: string) => {
  // 스트리밍 중이면 먼저 중단
  if (isAiStreaming && abortControllerRef.current) {
    abortControllerRef.current.abort();
    abortControllerRef.current = null;
    setIsAiStreaming(false);
  }

  // ... 기존 메시지 전송 로직 ...
};
```

#### 3.2.2 UI 상태 업데이트

**MessageInput 컴포넌트 수정** (`app/components/chat/MessageInput.tsx`):

```typescript
// disabled 속성 제거 또는 조건 변경
<MessageInput
  onSend={handleSend}
  onGift={handleGift}
  onOpenStore={() => setIsItemStoreOpen(true)}
  userCredits={currentUserCredits}
  ownedHearts={currentUserHearts}
  disabled={false} // 또는 isOptimisticTyping만 체크
/>
```

**중지 버튼 추가 (선택사항)**:
```typescript
{isAiStreaming && (
  <button
    onClick={() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }}
    className="px-3 py-1 text-sm text-red-500 hover:bg-red-50 rounded"
  >
    중지
  </button>
)}
```

#### 3.2.3 스트리밍 중단 처리

**중단 시나리오**:
1. 유저가 새 메시지 전송 시 자동 중단
2. 유저가 중지 버튼 클릭 시 수동 중단
3. 네트워크 오류 등 예외 상황

**중단 처리 로직**:
```typescript
// useEffect로 cleanup 처리
useEffect(() => {
  return () => {
    // 컴포넌트 언마운트 시 스트리밍 중단
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };
}, []);
```

### 3.3 서버 사이드 구현 (API & LangGraph)

#### 3.3.1 중단 신호 처리

**현재 코드 위치**: `app/routes/api/chat/index.ts`

**구현 예시**:
```typescript
export async function action({ request }: ActionFunctionArgs) {
  // ... 기존 인증 및 검증 로직 ...

  const stream = new ReadableStream({
    async start(controller) {
      let fullContent = "";
      let isInterrupted = false;

      // 요청이 중단되었는지 확인
      request.signal?.addEventListener('abort', () => {
        isInterrupted = true;
        // 부분 메시지 저장
        if (fullContent.trim()) {
          saveInterruptedMessage(conversationId, fullContent);
        }
        controller.close();
      });

      try {
        for await (const item of streamAIResponse(...)) {
          // 중단 신호 확인
          if (isInterrupted || request.signal?.aborted) {
            break;
          }

          if (item.type === 'content') {
            fullContent += item.content;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: item.content })}

`));
          }
        }

        // 정상 완료 시에만 최종 메시지 저장
        if (!isInterrupted && fullContent.trim()) {
          await saveMessage(conversationId, fullContent, false);
        }
      } catch (err) {
        // 중단된 경우는 이미 처리됨
        if (!isInterrupted) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Streaming error" })}

`));
        }
      } finally {
        controller.close();
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
```

#### 3.3.2 부분 메시지 영속화

**새 API 엔드포인트**: `app/routes/api/chat/interrupt.ts`

```typescript
import { db } from "~/lib/db.server";
import { auth } from "~/lib/auth.server";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";

const interruptSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1),
  isInterrupted: z.boolean().default(true),
});

export async function action({ request }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const result = interruptSchema.safeParse(body);

  if (!result.success) {
    return Response.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { conversationId, content, isInterrupted } = result.data;

  // 중단된 메시지 저장
  const message = await db.insert(schema.message).values({
    id: crypto.randomUUID(),
    conversationId,
    role: "assistant",
    content: content.endsWith("...") ? content : content + "...",
    isInterrupted: true,
    interruptedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  return Response.json({ message: message[0] });
}
```

#### 3.3.3 Gemini API 중단 처리

**현재 코드 위치**: `app/lib/ai.server.ts`

**구현 예시**:
```typescript
export async function* streamAIResponse(
  userMessage: string,
  history: HistoryMessage[],
  // ... 기존 파라미터들 ...
  abortSignal?: AbortSignal // AbortSignal 추가
) {
  // ... 기존 로직 ...

  try {
    const stream = await model.stream(messages, {
      signal: abortSignal, // Gemini API에 중단 신호 전달
    });

    for await (const chunk of stream) {
      // 중단 신호 확인
      if (abortSignal?.aborted) {
        break;
      }

      if (chunk.content) {
        const cleaned = removeEmojis(chunk.content.toString());
        if (cleaned) {
          yield { type: 'content', content: cleaned };
        }
      }
    }
  } catch (err) {
    // AbortError는 정상적인 중단으로 처리
    if (err instanceof Error && err.name === 'AbortError') {
      return; // 조용히 종료
    }
    throw err;
  }
}
```

### 3.4 대화 문맥 관리 (LangGraph State)

#### 3.4.1 중단된 메시지 포함

**현재 코드 위치**: `app/routes/api/chat/index.ts`

**구현 예시**:
```typescript
// 대화 내역 조회 시 중단된 메시지도 포함
const history = await db.query.message.findMany({
  where: eq(schema.message.conversationId, conversationId),
  orderBy: [desc(schema.message.createdAt)],
  limit: 10,
});

// 중단된 메시지는 "..." 제거 후 문맥에 포함
const formattedHistory = [...history].reverse().map(msg => ({
  role: msg.role,
  content: msg.isInterrupted 
    ? msg.content.replace(/\.\.\.$/, "") // 끝의 "..." 제거
    : msg.content,
  mediaUrl: msg.mediaUrl,
}));
```

#### 3.4.2 장기 기억 반영

**핵심 원칙**: 
- 끊긴 답변이라도 유저가 읽은 부분까지는 AI의 기억(Context)에 포함
- 다음 답변에서 어색함이 없도록 자연스러운 전환 보장

**구현 예시**:
```typescript
// 메모리 생성 시 중단된 메시지도 고려
const memory = await generateSummary(
  formattedHistory, // 중단된 메시지 포함
  currentSummary
);
```

---

## 4. 예외 처리 (Edge Cases)

### 4.1 레이스 컨디션 방지

**문제**: 클라이언트에서 `abort` 처리가 완료되기 전에 새 요청이 들어오는 경우

**해결 방법**:
```typescript
const [isProcessingInterrupt, setIsProcessingInterrupt] = useState(false);

const handleSend = async (content: string, mediaUrl?: string) => {
  // 중단 처리 중이면 대기
  if (isProcessingInterrupt) {
    return;
  }

  // 스트리밍 중이면 먼저 중단
  if (isAiStreaming && abortControllerRef.current) {
    setIsProcessingInterrupt(true);
    abortControllerRef.current.abort();
    
    // 중단 완료 대기 (최대 500ms)
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsProcessingInterrupt(false);
  }

  // 새 메시지 전송
  // ... 기존 로직 ...
};
```

### 4.2 너무 짧은 답변 처리

**문제**: AI가 답변을 시작하자마자(예: 5자 이내) 중단된 경우

**정책**: 기본적으로 유지하되, 최소 길이 임계값 설정 가능

**구현 예시**:
```typescript
const MIN_INTERRUPTED_MESSAGE_LENGTH = 5;

const saveInterruptedMessage = async (content: string) => {
  // 너무 짧은 메시지는 저장하지 않음 (선택사항)
  if (content.trim().length < MIN_INTERRUPTED_MESSAGE_LENGTH) {
    console.log("Message too short, skipping save");
    return;
  }

  // ... 기존 저장 로직 ...
};
```

### 4.3 이미지 생성 중 중단

**문제**: 이미지 생성 툴 호출 중 중단될 경우

**해결 방법**:
```typescript
// 이미지 생성 중단 감지
let imageGenerationAborted = false;

if (abortSignal) {
  abortSignal.addEventListener('abort', () => {
    imageGenerationAborted = true;
  });
}

// 이미지 생성 로직
if (needsImageGeneration && !imageGenerationAborted) {
  try {
    const imageUrl = await generateImage(prompt);
    if (!imageGenerationAborted) {
      yield { type: 'media', mediaUrl: imageUrl };
    }
  } catch (err) {
    if (!imageGenerationAborted) {
      yield { type: 'error', error: 'Image generation failed' };
    }
  }
}
```

### 4.4 네트워크 오류 처리

**문제**: 네트워크 오류로 인한 스트리밍 중단

**해결 방법**:
```typescript
try {
  const response = await fetch("/api/chat", {
    // ... 설정 ...
    signal: controller.signal,
  });
} catch (err) {
  if (err instanceof DOMException && err.name === 'AbortError') {
    // 의도적인 중단
    await saveInterruptedMessage(streamingContent);
  } else if (err instanceof TypeError && err.message.includes('fetch')) {
    // 네트워크 오류
    toast.error("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    // 부분 메시지 저장 (선택사항)
    if (streamingContent.trim()) {
      await saveInterruptedMessage(streamingContent);
    }
  }
}
```

### 4.5 동시 다중 중단 요청

**문제**: 여러 탭이나 세션에서 동시에 중단 요청이 들어오는 경우

**해결 방법**:
```typescript
// 서버 사이드에서 중단 요청 추적
const activeStreams = new Map<string, AbortController>();

export async function action({ request }: ActionFunctionArgs) {
  const streamId = `${session.user.id}-${conversationId}`;
  
  // 기존 스트림이 있으면 중단
  if (activeStreams.has(streamId)) {
    activeStreams.get(streamId)?.abort();
  }

  const controller = new AbortController();
  activeStreams.set(streamId, controller);

  // 스트림 완료 시 제거
  // ...
}
```

---

## 5. 구현 로드맵

### 5.1 Phase 1: 데이터베이스 스키마 확장 (예상 소요: 1일)

**목표**: `Message` 테이블에 인터럽트 관련 필드 추가

**작업 항목**:
- [x] `app/db/schema.ts`에 `isInterrupted`, `interruptedAt` 필드 추가
- [x] Drizzle 마이그레이션 생성 및 적용
- [x] 기존 데이터 마이그레이션 (선택사항)

**검증**:
- [ ] 데이터베이스 스키마 확인
- [ ] 기존 메시지 조회 시 새 필드 포함 확인

---

### 5.2 Phase 2: 클라이언트 사이드 구현 (예상 소요: 2-3일)

**목표**: AbortController 도입 및 UI 상태 업데이트

**작업 항목**:
- [x] `app/routes/chat/$id.tsx`에 `AbortController` 추가
- [x] `startAiStreaming` 함수에 `signal` 파라미터 전달
- [x] `handleSend` 함수에서 이전 스트리밍 중단 로직 추가
- [x] `MessageInput`의 `disabled` 속성 제거 또는 조건 변경
- [x] 중단 시 부분 메시지 저장 로직 구현
- [x] 중지 버튼 추가 (선택사항)

**검증**:
- [ ] AI 스트리밍 중 새 메시지 전송 시 즉시 중단 확인
- [ ] 중단된 메시지에 "..." 표시 확인
- [ ] UI가 항상 활성화 상태 유지 확인

---

### 5.3 Phase 3: 서버 사이드 구현 (예상 소요: 2-3일)

**목표**: 서버 사이드 중단 신호 처리 및 부분 메시지 영속화

**작업 항목**:
- [x] `app/routes/api/chat/index.ts`에 `AbortSignal` 처리 추가
- [x] `app/routes/api/chat/interrupt.ts` 새 엔드포인트 생성
- [x] `app/lib/ai.server.ts`의 `streamAIResponse`에 `abortSignal` 파라미터 추가
- [x] Gemini API 호출 시 중단 신호 전달
- [x] 부분 메시지 저장 로직 구현

**검증**:
- [ ] 클라이언트 중단 시 서버 스트리밍 즉시 종료 확인
- [ ] 중단된 메시지가 데이터베이스에 저장되는지 확인
- [ ] 토큰 사용량이 중단 시점에서 멈추는지 확인

---

### 5.4 Phase 4: 대화 문맥 관리 (예상 소요: 1-2일)

**목표**: 중단된 메시지를 대화 문맥에 포함

**작업 항목**:
- [x] 대화 내역 조회 시 중단된 메시지 포함
- [x] 중단된 메시지의 "..." 제거 후 문맥에 포함
- [x] 메모리 생성 시 중단된 메시지 고려
- [x] AI 재응답 품질 테스트

**검증**:
- [ ] 중단된 메시지 후 새 메시지 전송 시 자연스러운 전환 확인
- [ ] AI가 중단된 내용을 인지하고 이어서 대화하는지 확인
- [ ] 대화 흐름의 자연스러움 확인

---

### 5.5 Phase 5: 예외 처리 및 최적화 (예상 소요: 1-2일)

**목표**: 예외 상황 처리 및 성능 최적화

**작업 항목**:
- [x] 레이스 컨디션 방지 로직 구현
- [x] 너무 짧은 메시지 처리 정책 적용
- [x] 이미지 생성 중단 처리
- [x] 네트워크 오류 처리 개선
- [x] 성능 최적화 (메모리 누수 방지 등)

**검증**:
- [ ] 모든 예외 상황에서 안정적인 동작 확인
- [ ] 메모리 누수 없음 확인
- [ ] 성능 저하 없음 확인

---

### 5.6 Phase 6: 테스트 및 문서화 (예상 소요: 1일)

**목표**: 전체 시스템 테스트 및 문서화

**작업 항목**:
- [x] 통합 테스트 수행
- [x] 사용자 시나리오 테스트
- [x] 성능 벤치마크
- [x] 문서 업데이트
- [x] 코드 리뷰

**검증**:
- [ ] 모든 기능이 정상 작동하는지 확인
- [ ] 예상 효과 달성 여부 확인
- [ ] 문서 완성도 확인

---

## 6. 기대 효과

### 6.1 사용자 경험 개선
- **대화 주도권**: 유저가 대화 흐름을 제어할 수 있어 실제 대화와 유사한 경험 제공
- **반응성 향상**: 긴 답변을 기다리지 않고 즉시 개입 가능
- **몰입감 증가**: 자연스러운 대화 흐름으로 서비스 몰입도 향상

### 6.2 비용 절감
- **토큰 비용 절감**: 불필요한 장황한 답변 중단으로 토큰 비용 약 15~20% 절감 예상
- **서버 리소스 절감**: 중단된 스트리밍으로 인한 컴퓨팅 자원 절약
- **대역폭 절감**: 불필요한 데이터 전송 감소

### 6.3 비즈니스 효과
- **회전율 증가**: 유저 당 평균 대화 시간 단축으로 더 많은 대화 가능
- **사용자 만족도 향상**: 대화 제어권 제공으로 만족도 증가
- **경쟁력 강화**: 차별화된 기능으로 경쟁 우위 확보

---

## 7. 성능 고려사항

### 7.1 메모리 관리
- **AbortController 정리**: 스트리밍 완료 후 `AbortController` 참조 제거
- **이벤트 리스너 정리**: `abort` 이벤트 리스너 제거로 메모리 누수 방지
- **스트림 정리**: 중단 시 `ReadableStream` 정리

### 7.2 네트워크 최적화
- **부분 메시지 크기 제한**: 너무 긴 부분 메시지 저장 방지
- **배치 저장**: 여러 중단 메시지를 배치로 저장하여 네트워크 요청 최소화

### 7.3 데이터베이스 최적화
- **인덱스 추가**: `isInterrupted` 필드에 인덱스 추가 고려
- **쿼리 최적화**: 중단된 메시지 조회 시 인덱스 활용

---

## 8. 보안 고려사항

### 8.1 권한 검증
- 중단 요청 시 사용자 인증 확인
- 대화 소유권 확인 (다른 사용자의 대화 중단 방지)

### 8.2 Rate Limiting
- 중단 요청 빈도 제한 (악의적인 중단 요청 방지)
- 동시 중단 요청 수 제한

---

## 9. 모니터링 및 분석

### 9.1 메트릭 수집
- 중단 빈도: 유저당 평균 중단 횟수
- 중단 시점: 답변 길이별 중단 시점 분포
- 토큰 절감량: 중단으로 인한 실제 토큰 절감량

### 9.2 로깅
- 중단 이벤트 로깅 (디버깅 및 분석용)
- 중단 원인 추적 (의도적 중단 vs 네트워크 오류)

---

## 10. 참고 자료

### 10.1 관련 문서
- [React Router v7 문서](https://reactrouter.com/)
- [AbortController MDN 문서](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [Server-Sent Events MDN 문서](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Google Gemini API 문서](https://ai.google.dev/docs)

### 10.2 프로젝트 내 관련 파일
- `app/routes/chat/$id.tsx`: 채팅 룸 컴포넌트
- `app/routes/api/chat/index.ts`: 채팅 API 엔드포인트
- `app/lib/ai.server.ts`: AI 스트리밍 로직
- `app/components/chat/MessageInput.tsx`: 메시지 입력 컴포넌트
- `app/db/schema.ts`: 데이터베이스 스키마

---

**문서 버전**: 2.0  
**최종 업데이트**: 2026-01-09  
**작성자**: AI Assistant


## Related Documents
- **Specs**: [Document Management Plan](../01_Concept_Design/09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
