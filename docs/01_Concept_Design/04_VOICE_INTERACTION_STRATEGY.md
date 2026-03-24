# AI 캐릭터 보이스 및 실시간 통화(티키타카) 전략 가이드
> Created: 2026-02-08
> Last Updated: 2026-02-08

이 문서는 사용자와 AI 캐릭터 간의 목소리 기반 소통 및 실시간 통화 기능을 구현하기 위한 기술적 전략과 '티키타카'라고 불리는 높은 수준의 상호작용 구현 방안을 정의합니다.

## 1. 개요 (Overview)

단순한 텍스트 채팅을 넘어, 캐릭터의 개성이 담긴 목소리로 대화하는 것은 감정적 유대감을 극대화하는 핵심 요소입니다. 특히 최근 기술은 단순한 TTS(Text-to-Speech)를 넘어, 상대방의 호흡에 맞춘 실시간 반응을 가능하게 합니다.

### 1.1 프로젝트 컨텍스트

이 문서는 **CHAT-BOTS** 프로젝트의 음성 상호작용 기능 구현을 위한 전략 가이드입니다.

**현재 프로젝트 상태**:
- **프레임워크**: React Router v7 (Vite) + TypeScript
- **AI 모델**: Google Gemini API (gemini-2.0-flash-exp) - LangGraph 기반
- **인증**: Better Auth (Drizzle ORM)
- **데이터베이스**: Turso (libSQL) with Drizzle ORM
- **구독 모델**: FREE, BASIC, PREMIUM, ULTIMATE (크레딧 기반)
- **현재 기능**: 텍스트 기반 채팅, 이미지 업로드, 스트리밍 응답, 감정 시스템

**음성 기능의 위치**:
- 기존 텍스트 채팅 기능을 확장하여 음성 상호작용 추가
- 구독 모델과 크레딧 시스템과 통합
- PREMIUM/ULTIMATE 등급에서 우선 제공 (프리미엄 가치)

## 2. 티키타카(Tiki-Taka)를 위한 핵심 기술 요소

사용자가 AI와 통화하고 있다고 느끼게 만드는 핵심은 '타이밍'과 '경청'입니다.

### 2.1 실시간 음성 활동 감지 (VAD: Voice Activity Detection)
*   사용자가 말을 시작하는 순간과 끝내는 순간을 0.1초 단위로 감지합니다.
*   사용자의 말이 끝난 후 AI가 반응하기까지의 '침묵의 시간'을 인간의 대화 수준(300ms~500ms)으로 최적화합니다.

### 2.2 실시간 중단 처리 (Interruption Handling)
*   AI가 대답하는 도중에 사용자가 말을 가로채면, AI는 즉시 말을 멈추고 다시 경청 모드로 전환됩니다.
*   이후 사용자의 새로운 입력을 반영하여 문맥에 맞는 대답을 생성합니다. 이것이 '진짜 통화' 같은 느낌을 주는 가장 중요한 장치입니다.

### 2.3 추임새 및 필러 단어 (Filler Words & Backchanneling)
*   AI가 대답을 생성하는 동안 발생하는 기술적 지연 시간을 지루하지 않게 처리합니다.
*   "음...", "아, 그렇구나", "맞아" 등의 추임새를 실시간으로 삽입하여 AI가 실시간으로 듣고 생각하고 있음을 표현합니다.

## 3. 기술 스택 제안 (Technology Stack)

### 3.1 실시간 엔진 (Real-time Orchestration)

**추천 옵션 (우선순위 순)**:

1. **OpenAI Realtime API** (최우선 추천)
   - STT, LLM, TTS를 하나의 모델에서 처리하여 지연 시간을 극단적으로 줄임
   - 감정 표현이 풍부한 상호작용 제공
   - WebSocket 기반 실시간 스트리밍
   - **비용**: $0.06/분 (입력) + $0.18/분 (출력) - 약 1분당 $0.24
   - **크레딧 차감**: 1분당 약 2,400 Credits (PREMIUM 등급 기준)
   - **장점**: 통합 솔루션, 낮은 지연시간, 높은 품질
   - **단점**: 비용이 높음, OpenAI 계정 필요

2. **Vapi / Retell AI** (매니지드 솔루션)
   - 실시간 통화에 최적화된 매니지드 엔진
   - VAD와 Interruption 처리를 하이레벨에서 제공
   - **비용**: Vapi는 $0.10/분, Retell은 $0.12/분 (대략)
   - **장점**: 빠른 구현, 인프라 관리 불필요
   - **단점**: 커스터마이징 제한, 장기 비용 증가

3. **자체 구현 (Google Cloud Speech-to-Text + Gemini + Google Cloud Text-to-Speech)**
   - 현재 프로젝트의 Gemini API와 통합 용이
   - **비용**: STT $0.006/15초, TTS $0.016/1,000자, Gemini 기존 비용
   - **장점**: 기존 인프라 활용, 비용 최적화 가능
   - **단점**: 구현 복잡도 높음, 지연시간 관리 필요

### 3.2 캐릭터 고유 목소리 (Voice Synthesis)

**추천 옵션**:

1. **ElevenLabs** (최우선 추천)
   - 캐릭터별 개성을 살린 고품질 음성 클로닝 기술
   - 웃음소리, 한숨, 감정 섞인 톤 조절 가능
   - **비용**: $0.18/1,000자 (Creator 플랜)
   - **크레딧 차감**: 1,000자당 약 1,800 Credits
   - **장점**: 최고 품질, 감정 표현 풍부, 한국어 지원 우수
   - **단점**: 비용이 높음

2. **Google Cloud Text-to-Speech**
   - WaveNet 음성 (고품질) 또는 Neural2 음성
   - **비용**: $0.016/1,000자 (WaveNet), $0.004/1,000자 (Standard)
   - **장점**: Google 인프라와 통합 용이, 비용 효율적
   - **단점**: ElevenLabs 대비 감정 표현 제한적

3. **OpenAI TTS** (Realtime API 사용 시)
   - Realtime API와 통합된 TTS
   - **비용**: Realtime API 비용에 포함
   - **장점**: 통합 솔루션, 추가 비용 없음
   - **단점**: 커스터마이징 제한

### 3.3 통화 인터페이스 (Communication Protocol)

*   **WebRTC**: 웹 브라우저와 서버 간의 초저지연 오디오 스트리밍을 위한 표준 프로토콜
*   **WebSocket**: 실시간 양방향 통신을 위한 프로토콜 (OpenAI Realtime API 사용 시)
*   **MediaRecorder API**: 브라우저 내장 오디오 녹음 API (Walkie-Talkie 방식)

## 4. 구현 로드맵 (Roadmap)

### Phase 1: 비동기 보이스 메시지 (Walkie-Talkie 방식)

**목표**: 가장 안정적이며 기록 중심의 채팅에 적합한 음성 메시지 기능 구현

**구현 내용**:
1. **프론트엔드**:
   - `app/components/chat/VoiceRecorder.tsx`: MediaRecorder API 기반 녹음 컴포넌트
   - `app/routes/chat/$id.tsx`: 음성 메시지 전송 UI 추가 (마이크 아이콘 버튼)
   - 오디오 파일 업로드 및 재생 기능

2. **백엔드**:
   - `app/routes/api/voice/transcribe.ts`: STT API 엔드포인트 (Google Cloud Speech-to-Text)
   - `app/routes/api/voice/synthesize.ts`: TTS API 엔드포인트 (ElevenLabs 또는 Google TTS)
   - `app/lib/voice.server.ts`: 음성 처리 유틸리티 함수

3. **데이터베이스 스키마**:
   - `Message` 모델에 `audioUrl` 필드 추가 (이미 `mediaUrl` 존재하므로 활용 가능)
   - `VoiceSession` 모델 추가 (선택사항, 통계용)

4. **크레딧 차감**:
   - STT: 1분당 약 600 Credits (Google Cloud 기준)
   - TTS: 1,000자당 약 1,800 Credits (ElevenLabs 기준)
   - 총 예상: 1분 음성 메시지당 약 2,400 Credits

5. **구독 모델 연계**:
   - FREE: 음성 메시지 비활성화 또는 제한 (일 5회)
   - BASIC: 일 20회 제한
   - PREMIUM: 일 100회 제한
   - ULTIMATE: 무제한

**예상 개발 기간**: 2-3주

---

### Phase 2: 실시간 대화식 통화 (Real-time Call)

**목표**: 전화 아이콘을 통해 통화 모드 진입, 실시간 스트리밍을 통한 끊김 없는 티키타카 구현

**구현 내용**:
1. **프론트엔드**:
   - `app/components/chat/VoiceCall.tsx`: WebRTC 기반 통화 UI 컴포넌트
   - `app/routes/chat/$id.tsx`: 통화 모드 진입/종료 로직
   - 실시간 오디오 스트리밍 및 VAD 시각화

2. **백엔드**:
   - `app/routes/api/voice/call/start.ts`: 통화 세션 시작 API
   - `app/routes/api/voice/call/stream.ts`: WebSocket 기반 실시간 스트리밍 엔드포인트
   - `app/lib/voice-call.server.ts`: OpenAI Realtime API 또는 Vapi 통합

3. **인프라**:
   - WebSocket 서버 설정 (React Router v7 서버 지원)
   - OpenAI Realtime API 또는 Vapi 계정 설정
   - 환경 변수 추가:
     ```
     OPENAI_REALTIME_API_KEY=sk-...
     ELEVENLABS_API_KEY=...
     VOICE_CALL_ENABLED=true
     ```

4. **크레딧 차감**:
   - 실시간 통화: 1분당 약 2,400 Credits (OpenAI Realtime API 기준)
   - 최소 통화 시간: 1분
   - 통화 중 실시간 크레딧 차감 및 잔액 확인

5. **구독 모델 연계**:
   - FREE: 통화 기능 비활성화
   - BASIC: 통화 기능 비활성화
   - PREMIUM: 월 60분 제한 (약 144,000 Credits)
   - ULTIMATE: 월 300분 제한 (약 720,000 Credits) 또는 무제한 (FUP 적용)

**예상 개발 기간**: 4-6주

---

### Phase 3: 감정 기반 반응형 통화

**목표**: 사용자의 목소리 톤을 분석하여 감정을 감지하고, 캐릭터의 목소리 톤과 위로/공감 수준을 동적으로 변경

**구현 내용**:
1. **감정 분석**:
   - `app/lib/emotion-detection.server.ts`: 음성 톤 분석 (Google Cloud Speech-to-Text의 감정 분석 또는 커스텀 ML 모델)
   - 기존 텍스트 기반 감정 시스템과 통합 (`app/lib/ai.server.ts`의 `[EMOTION:CODE]` 시스템)

2. **동적 음성 조절**:
   - ElevenLabs의 감정 파라미터 활용 (stability, similarity, style)
   - 감정에 따른 TTS 프롬프트 조정

3. **데이터베이스**:
   - `VoiceCall` 모델에 `detectedEmotion` 필드 추가
   - 통화 세션별 감정 변화 추적

**예상 개발 기간**: 2-3주

---

## 5. 데이터베이스 스키마 확장

### 5.1 Message 모델 확장

```typescript
// app/db/schema.ts
export const message = sqliteTable("Message", {
    // ... 기존 필드들
    audioUrl: text("audioUrl"), // 음성 메시지 URL (Cloudinary)
    audioDuration: integer("audioDuration"), // 오디오 길이 (초)
    voiceProvider: text("voiceProvider"), // "ELEVENLABS" | "GOOGLE_TTS" | "OPENAI_TTS"
});
```

### 5.2 VoiceSession 모델 추가 (선택사항)

```typescript
export const voiceSession = sqliteTable("VoiceSession", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull().references(() => user.id),
    conversationId: text("conversationId").notNull().references(() => conversation.id),
    characterId: text("characterId").notNull().references(() => character.id),
    type: text("type").notNull().default("VOICE_MESSAGE"), // "VOICE_MESSAGE" | "VOICE_CALL"
    duration: integer("duration"), // 통화 시간 (초)
    creditsUsed: integer("creditsUsed").notNull(),
    provider: text("provider"), // "OPENAI_REALTIME" | "VAPI" | "ELEVENLABS"
    status: text("status").notNull().default("COMPLETED"), // "ACTIVE" | "COMPLETED" | "FAILED"
    detectedEmotion: text("detectedEmotion"), // Phase 3에서 사용
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});
```

---

## 6. API 엔드포인트 설계

### 6.1 Phase 1: 비동기 보이스 메시지

```
POST /api/voice/transcribe
- Request: FormData (audio file)
- Response: { text: string, duration: number, creditsUsed: number }

POST /api/voice/synthesize
- Request: { text: string, characterId: string, emotion?: string }
- Response: { audioUrl: string, duration: number, creditsUsed: number }
```

### 6.2 Phase 2: 실시간 통화

```
POST /api/voice/call/start
- Request: { conversationId: string, characterId: string }
- Response: { sessionId: string, websocketUrl: string }

WebSocket /api/voice/call/stream
- 양방향 오디오 스트리밍
- 메시지 형식: { type: "audio" | "text" | "emotion", data: ... }
```

---

## 7. 환경 변수 설정

```bash
# OpenAI Realtime API (Phase 2)
OPENAI_REALTIME_API_KEY=sk-...

# ElevenLabs (Phase 1, 2, 3)
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID_CHUNSIM=... # 캐릭터별 Voice ID

# Google Cloud Speech-to-Text (Phase 1, 3)
GOOGLE_CLOUD_SPEECH_API_KEY=...
GOOGLE_CLOUD_SPEECH_PROJECT_ID=...

# Google Cloud Text-to-Speech (대안)
GOOGLE_CLOUD_TTS_API_KEY=...

# 기능 플래그
VOICE_MESSAGE_ENABLED=true
VOICE_CALL_ENABLED=false # Phase 2 완료 후 활성화
VOICE_EMOTION_DETECTION_ENABLED=false # Phase 3 완료 후 활성화
```

---

## 8. 크레딧 차감 정책

### 8.1 비동기 보이스 메시지 (Phase 1)

| 작업 | 비용 (USD) | 크레딧 차감 | 비고 |
|------|-----------|------------|------|
| STT (1분) | $0.006 | 600 | Google Cloud 기준 |
| TTS (1,000자) | $0.18 | 1,800 | ElevenLabs 기준 |
| **총합 (1분 메시지)** | **$0.24** | **2,400** | 평균 1분 = 1,000자 가정 |

### 8.2 실시간 통화 (Phase 2)

| 작업 | 비용 (USD) | 크레딧 차감 | 비고 |
|------|-----------|------------|------|
| OpenAI Realtime API (1분) | $0.24 | 2,400 | 입력 + 출력 포함 |
| Vapi (1분) | $0.10 | 1,000 | 대안 옵션 |
| **권장: OpenAI Realtime API** | **$0.24/분** | **2,400/분** | 최고 품질 |

### 8.3 구독 모델별 제한

| 등급 | Phase 1 (보이스 메시지) | Phase 2 (실시간 통화) |
|------|------------------------|---------------------|
| FREE | 비활성화 또는 일 5회 | 비활성화 |
| BASIC | 일 20회 (약 48,000 Credits) | 비활성화 |
| PREMIUM | 일 100회 (약 240,000 Credits) | 월 60분 (약 144,000 Credits) |
| ULTIMATE | 무제한 (FUP 적용) | 월 300분 (약 720,000 Credits) 또는 무제한 |

---

## 9. 에러 처리 및 로깅

### 9.1 에러 처리

- **크레딧 부족**: 통화 시작 전 잔액 확인, 부족 시 업그레이드 안내
- **네트워크 오류**: 자동 재연결 시도 (최대 3회)
- **API 오류**: Fallback 메커니즘 (예: ElevenLabs 실패 시 Google TTS 사용)
- **권한 오류**: 구독 등급 확인 및 업그레이드 안내

### 9.2 로깅

- `app/lib/logger.server.ts`../05_Test/MediaRecorder)

### 14.3 프로젝트 내 관련 문서

- `docs/PAYMENT_IMPLEMENTATION_PLAN.md`: 구독 모델 및 크레딧 시스템
- `docs/PRICING_AND_MARGIN_ANALYSIS.md`: 비용 분석 및 마진 계산
- `docs/03_IMPLEMENTATION_PLAN.md`: 전체 구현 계획


## Related Documents
- **Foundation**: [Document Management Plan](./09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
