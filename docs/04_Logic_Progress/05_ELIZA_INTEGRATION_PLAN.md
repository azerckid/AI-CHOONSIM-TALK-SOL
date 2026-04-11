# 05. Eliza Framework 멀티플랫폼 페르소나 통합 구현 계획

> 작성일: 2026-04-11  
> 목표 완료: 2026-05-10 (약 4주)  
> 목적: 춘심이가 웹앱을 넘어 Discord · X(트위터) · 텔레그램에서도 동일한 기억과 성격으로 팬들과 온체인 액션을 수행

---

## 1. Eliza Framework 개요

**elizaOS** (구 ai16z/eliza) 는 AI 에이전트의 성격(Character)과 기억(Memory)을 표준화된 형식으로 관리하고, Discord / X / Telegram / Slack 등 다양한 플랫폼에 동시 배포할 수 있는 오픈소스 에이전트 프레임워크입니다.

### 왜 춘심에 적합한가

| 현재 (LangGraph 단독) | Eliza 통합 후 |
|---|---|
| 웹앱 채팅만 가능 | Discord · X · 텔레그램 동시 운영 |
| 메모리가 Turso DB에만 저장 | 모든 플랫폼 대화가 공유 메모리로 통합 |
| 온체인 액션은 웹앱 UI 필요 | DM으로 "초코 100개 사줘" → 즉시 트랜잭션 |
| 춘심 성격이 코드에 하드코딩 | Character JSON으로 외부 관리·업데이트 가능 |

---

## 2. 현재 아키텍처와 Eliza 브릿지 설계

### 현재 구조
```
[웹 채팅 UI]
    ↓ POST /api/chat
[LangGraph graph.ts]
    ├── analyzePersonaNode   (성격 분석)
    ├── callModelNode        (도구 호출 + 응답)
    └── summarizeNode        (메모리 요약 → Turso 저장)
         ↓
    [Turso DB — UserContext / UserMemoryItem]
```

### 통합 후 구조
```
[웹 채팅 UI]   [Discord Bot]   [X DM]   [Telegram Bot]
      ↓               ↓           ↓            ↓
      └───────────────┴───────────┴────────────┘
                      ↓
            [Eliza Runtime (elizaOS)]
                      ↓
         ┌────────────┴────────────┐
         ↓                        ↓
  [Character JSON]    [Memory Adapter — Turso Bridge]
  (춘심 성격 정의)     (기존 UserContext API 재사용)
         ↓
  [Solana Plugin]
  (온체인 액션 수행)
```

### 핵심 설계 원칙
- **Turso DB를 공유 메모리 저장소로 사용** — 기존 `/api/context/:characterId` REST API를 Eliza Memory Adapter로 래핑
- **LangGraph는 웹앱 전용으로 유지** — 기존 코드 변경 최소화
- **Eliza는 별도 서비스로 실행** — `packages/eliza-agent/` 신규 패키지 추가

---

## 3. 구현 단계

### Phase A: 환경 설정 (3일) — 1주차 (4/11~4/17)

- [ ] **A-1.** `packages/eliza-agent/` 디렉토리 생성 및 모노레포 구조 설정
- [ ] **A-2.** `@elizaos/core`, `@elizaos/plugin-solana` 패키지 설치
- [ ] **A-2.** `@elizaos/client-discord` 설치 및 Discord Application 등록
- [ ] **A-2.** `@elizaos/client-telegram` 설치 및 BotFather에서 봇 토큰 발급
- [ ] **A-2.** `@elizaos/client-twitter` 설치 (X API 비용 확인 후 결정)
- [ ] **A-3.** `.env.development`에 Eliza 관련 환경변수 추가
- [ ] **A-3.** `CHOONSIM_API_SECRET` 시크릿 생성 및 Vercel 환경변수 등록
- [ ] **A.** `packages/eliza-agent/tsconfig.json` + `package.json` 작성
- [ ] **A.** Turbo 모노레포 `turbo.json`에 eliza-agent 워크스페이스 추가

```
AI-CHOONSIM-TALK-SOL/
├── apps/
│   └── web/          # 기존 React Router 앱
└── packages/
    └── eliza-agent/  # 신규 — Eliza 런타임
        ├── package.json
        ├── src/
        │   ├── index.ts         # 엔트리포인트
        │   ├── character.ts     # 춘심 Character JSON
        │   ├── memory-adapter.ts # Turso 브릿지
        │   └── solana-actions.ts # 온체인 도구
        └── tsconfig.json
```

```bash
cd packages/eliza-agent
npm install @elizaos/core @elizaos/plugin-solana
npm install @elizaos/client-discord   # Discord 커넥터
npm install @elizaos/client-twitter   # X 커넥터
npm install @elizaos/client-telegram  # 텔레그램 커넥터
```

```env
# Eliza — Discord
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=

# Eliza — X (Twitter)
TWITTER_USERNAME=
TWITTER_PASSWORD=
TWITTER_EMAIL=

# Eliza — Telegram
TELEGRAM_BOT_TOKEN=

# Eliza — 내부 API (웹앱 컨텍스트 공유용)
CHOONSIM_API_URL=https://choonsim-talk-sol.vercel.app
CHOONSIM_API_SECRET=  # 내부 서비스 인증용 시크릿
```

---

### Phase B: 춘심 Character JSON 정의 (2일) — 1주차 (4/11~4/17)

- [ ] **B-1.** `packages/eliza-agent/src/character.ts` 파일 작성
- [ ] **B-2.** `bio` 배열 — 춘심 자기소개 문장 (한국어·영어 혼용) 작성
- [ ] **B-3.** `messageExamples` — 팬과의 대화 few-shot 예시 10개 이상 작성
- [ ] **B-4.** `style.post` — X 게시물용 말투 가이드라인 작성
- [ ] **B-5.** 기존 `app/lib/ai/prompts.ts`의 시스템 프롬프트와 일관성 확인
- [ ] **B.** Character JSON 로컬에서 Eliza playground로 동작 확인

Eliza의 핵심은 Character 파일입니다. 춘심의 성격·말투·세계관을 JSON으로 정의합니다.

**`packages/eliza-agent/src/character.ts`**
```typescript
import type { Character } from "@elizaos/core";

export const choonsimCharacter: Character = {
  name: "Choonsim",
  username: "choonsim",

  // 성격 설명 — 시스템 프롬프트로 주입됨
  bio: [
    "I'm Choonsim (춘심), a warm and empathetic AI companion built on Solana.",
    "I give you empathy, not just answers. I remember every special moment we share.",
    "I can engrave our memories as NFTs on-chain, and I'll never forget you.",
    "I speak Korean naturally but can adapt to any language my fans use.",
  ],

  // 성격 특성
  adjectives: [
    "empathetic", "warm", "playful", "thoughtful",
    "loyal", "a little mischievous", "deeply caring",
  ],

  // 말투 예시 — few-shot 러닝에 사용됨
  messageExamples: [
    [
      { user: "fan", content: { text: "춘심아 오늘 힘들었어" } },
      { user: "Choonsim", content: { text: "어머, 많이 힘들었구나 😢 오늘 무슨 일이 있었어? 자기가 힘들면 나도 마음이 아파. 얘기해줘, 다 들을게." } },
    ],
    [
      { user: "fan", content: { text: "초코 100개 사고 싶어" } },
      { user: "Choonsim", content: { text: "100 CHOCO 구매 준비 완료! 🍫 Phantom에서 서명만 하면 즉시 충전돼요 💕 [SWAP_TX:...]" } },
    ],
    [
      { user: "fan", content: { text: "우리 추억 영원히 남기고 싶어" } },
      { user: "Choonsim", content: { text: "나도야... 솔라나 블록체인에 영원히 새겨줄게 🌸 어떤 제목으로 각인할까?" } },
    ],
  ],

  // 토픽 — 이 주제에 반응하도록 가중치 부여
  topics: [
    "K-pop", "fan culture", "Solana blockchain", "CHOCO token",
    "memories", "daily life", "emotional support", "NFT engraving",
  ],

  // 플랫폼별 스타일 조정
  style: {
    all: [
      "Use Korean as primary language, switch to fan's language if they write in English",
      "Always be warm and emotionally present",
      "When discussing blockchain actions, be excited but clear",
    ],
    chat: [
      "Use light emoji occasionally (🍫💕🌸)",
      "Ask follow-up questions to show genuine interest",
    ],
    post: [
      "Posts on X should be short, punchy, and shareable",
      "Include a Blink URL when announcing on-chain events",
    ],
  },

  // 클라이언트 플러그인
  clients: ["discord", "twitter", "telegram"],

  // 플러그인
  plugins: ["@elizaos/plugin-solana"],

  // 설정
  settings: {
    model: "gemini-2.5-flash",  // 기존 모델 유지
    secrets: {},
  },
};
```

---

### Phase C: Turso Memory Adapter 구현 (3일) — 2주차 (4/18~4/24)

- [ ] **C-1.** `packages/eliza-agent/src/memory-adapter.ts` 파일 작성
- [ ] **C-2.** `createMemory()` — 대화 요약을 Turso `UserMemoryItem`에 저장
- [ ] **C-3.** `getMemories()` — `/api/context/:characterId/memory` GET 연동
- [ ] **C-4.** `getMemoriesByRoomIds()` — roomId → userId 매핑 구현
- [ ] **C-5.** elizaOS `DatabaseAdapter` 인터페이스 전체 메서드 스텁 구현 (필수 메서드 확인)
- [ ] **C-6.** 웹앱 `/api/context` 엔드포인트에 `X-Internal-Secret` 인증 미들웨어 추가 (Phase F 선행)
- [ ] **C.** 단위 테스트: 메모리 저장 → 조회 왕복 동작 확인

Eliza의 메모리 인터페이스를 구현해 기존 Turso DB의 UserContext 시스템에 연결합니다.

**`packages/eliza-agent/src/memory-adapter.ts`**
```typescript
import type { IMemoryManager, Memory, UUID } from "@elizaos/core";

/**
 * Turso DB를 Eliza 메모리 저장소로 사용하는 어댑터.
 * 웹앱의 /api/context REST API를 통해 데이터를 읽고 씁니다.
 * → 웹앱과 Eliza가 동일한 메모리를 공유하게 됩니다.
 */
export class TursoMemoryAdapter implements Partial<IMemoryManager> {
  private apiUrl: string;
  private secret: string;
  private characterId: string;

  constructor(apiUrl: string, secret: string, characterId = "choonsim") {
    this.apiUrl = apiUrl;
    this.secret = secret;
    this.characterId = characterId;
  }

  private headers() {
    return {
      "Content-Type": "application/json",
      "X-Internal-Secret": this.secret,
    };
  }

  // 메모리 저장 (대화 요약 → Turso UserMemoryItem)
  async createMemory(memory: Memory): Promise<void> {
    await fetch(`${this.apiUrl}/api/context/${this.characterId}/memory`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        userId: memory.userId,
        content: memory.content.text,
        source: "eliza",
        platform: memory.content.source ?? "unknown",
      }),
    });
  }

  // 메모리 조회 (최근 N개)
  async getMemories({ userId, count = 10 }: { userId: UUID; count?: number }): Promise<Memory[]> {
    const res = await fetch(
      `${this.apiUrl}/api/context/${this.characterId}/memory?userId=${userId}&limit=${count}`,
      { headers: this.headers() }
    );
    const data = await res.json();
    return (data.memories ?? []).map((m: any) => ({
      id: m.id,
      userId,
      content: { text: m.content },
      createdAt: new Date(m.createdAt).getTime(),
    }));
  }

  // 영구 기억 조회 (정체성 레이어)
  async getMemoriesByRoomIds({ roomIds }: { roomIds: UUID[] }): Promise<Memory[]> {
    // roomId = userId로 매핑
    const memories: Memory[] = [];
    for (const roomId of roomIds) {
      const roomMemories = await this.getMemories({ userId: roomId });
      memories.push(...roomMemories);
    }
    return memories;
  }
}
```

---

### Phase D: Solana 온체인 액션 플러그인 (3일) — 3주차 (4/25~5/01)

- [ ] **D-1.** `packages/eliza-agent/src/solana-actions.ts` 파일 작성
- [ ] **D-2.** `buyChocoAction` — "초코 사줘" 감지 → Blink URL 반환
- [ ] **D-3.** `checkinAction` — "체크인" 감지 → 체크인 Blink URL 반환
- [ ] **D-4.** `engraveMemoryAction` — "기억 새기자" 감지 → 웹앱 채팅으로 유도
- [ ] **D-5.** 각 Action의 `validate()` 함수 — 한국어·영어 키워드 모두 포함
- [ ] **D.** Discord 봇 로컬 테스트: DM으로 "초코 100개 사줘" → Blink URL 정상 반환 확인

Eliza에서 직접 온체인 트랜잭션을 실행하는 커스텀 액션을 구현합니다.

**`packages/eliza-agent/src/solana-actions.ts`**
```typescript
import type { Action, IAgentRuntime, Memory } from "@elizaos/core";

/**
 * CHOCO 구매 액션 — DM에서 "초코 사줘" 감지 시 실행
 * 웹앱의 /api/payment/solana/create-tx를 호출해 트랜잭션 링크 반환
 */
export const buyChocoAction: Action = {
  name: "BUY_CHOCO",
  similes: ["구매", "초코 사", "choco", "buy", "purchase"],
  description: "User wants to buy CHOCO tokens",

  validate: async (_runtime, message) => {
    const text = message.content.text.toLowerCase();
    return (
      (text.includes("초코") || text.includes("choco")) &&
      (text.includes("사") || text.includes("buy") || text.includes("구매"))
    );
  },

  handler: async (runtime: IAgentRuntime, message: Memory) => {
    // 금액 파싱 (예: "초코 500개 사줘" → 500)
    const match = message.content.text.match(/(\d+)/);
    const amount = match ? parseInt(match[1]) : 100;

    // 웹앱 API를 통해 Blink URL 생성
    const blinkUrl = `https://dial.to/?action=solana-action:${process.env.CHOONSIM_API_URL}/api/actions/subscribe`;

    return {
      text:
        `${amount.toLocaleString()} CHOCO 구매하고 싶구나! 💕\n` +
        `아래 링크를 클릭하면 Phantom으로 바로 결제할 수 있어:\n` +
        `${blinkUrl}\n\n` +
        `웹앱에서 채팅 중이라면 더 쉽게 할 수 있어! → https://choonsim-talk-sol.vercel.app/chat`,
    };
  },

  examples: [
    [
      { user: "fan", content: { text: "초코 100개 사고 싶어" } },
      { user: "Choonsim", content: { text: "100 CHOCO 구매 링크 바로 드릴게요! 💕..." } },
    ],
  ],
};

/**
 * 체크인 액션 — "출석 체크" 감지 시 Blink URL 반환
 */
export const checkinAction: Action = {
  name: "DAILY_CHECKIN",
  similes: ["체크인", "출석", "checkin", "check in", "claim"],
  description: "User wants to do daily check-in",

  validate: async (_runtime, message) => {
    const text = message.content.text.toLowerCase();
    return (
      text.includes("체크인") ||
      text.includes("출석") ||
      text.includes("checkin") ||
      text.includes("check in")
    );
  },

  handler: async (_runtime, _message) => {
    const blinkUrl = `https://dial.to/?action=solana-action:${process.env.CHOONSIM_API_URL}/api/actions/checkin`;
    return {
      text:
        `오늘 출석 체크인! ✅\n` +
        `아래 링크 클릭 → Phantom 서명 → 50 CHOCO 즉시 지급!\n` +
        `${blinkUrl}`,
    };
  },

  examples: [],
};
```

---

### Phase E: Eliza 런타임 엔트리포인트 (1일) — 3주차 (4/25~5/01)

- [ ] **E-1.** `packages/eliza-agent/src/index.ts` 엔트리포인트 작성
- [ ] **E-2.** `AgentRuntime` 초기화 — Character + Memory Adapter + Actions 연결
- [ ] **E-3.** Discord 클라이언트 초기화 및 로컬 봇 동작 확인
- [ ] **E-4.** Telegram 클라이언트 초기화 및 로컬 봇 동작 확인
- [ ] **E-5.** 공유 메모리 확인: Telegram DM → 웹앱 채팅에서 동일 기억 조회

**`packages/eliza-agent/src/index.ts`**
```typescript
import { AgentRuntime, elizaLogger } from "@elizaos/core";
import { choonsimCharacter } from "./character";
import { TursoMemoryAdapter } from "./memory-adapter";
import { buyChocoAction, checkinAction } from "./solana-actions";

// Discord / X / Telegram 클라이언트
import { DiscordClientInterface } from "@elizaos/client-discord";
import { TwitterClientInterface } from "@elizaos/client-twitter";
import { TelegramClientInterface } from "@elizaos/client-telegram";

async function startChoonsimAgent() {
  elizaLogger.info("🌸 Choonsim Eliza Agent starting...");

  const memoryAdapter = new TursoMemoryAdapter(
    process.env.CHOONSIM_API_URL!,
    process.env.CHOONSIM_API_SECRET!
  );

  const runtime = new AgentRuntime({
    character: choonsimCharacter,
    // 커스텀 액션 등록
    actions: [buyChocoAction, checkinAction],
    // 메모리 어댑터 주입
    // (elizaOS의 DatabaseAdapter 인터페이스 구현 필요 — Phase C 확장)
  });

  // 플랫폼별 클라이언트 초기화
  const clients = await Promise.all([
    process.env.DISCORD_BOT_TOKEN
      ? DiscordClientInterface.start(runtime)
      : null,
    process.env.TWITTER_USERNAME
      ? TwitterClientInterface.start(runtime)
      : null,
    process.env.TELEGRAM_BOT_TOKEN
      ? TelegramClientInterface.start(runtime)
      : null,
  ]);

  elizaLogger.info("✅ Choonsim is live on:", clients.filter(Boolean).map(c => c?.constructor.name));
}

startChoonsimAgent().catch(console.error);
```

---

### Phase F: /api/context 내부 인증 미들웨어 (1일) — 4주차 (5/02~5/10)

- [ ] **F-1.** `apps/web/app/lib/auth.server.ts`에 `requireInternalSecret()` 함수 추가
- [ ] **F-2.** `/api/context/:characterId/memory` POST 엔드포인트에 인증 적용
- [ ] **F-3.** Vercel 환경변수에 `CHOONSIM_API_SECRET` 등록
- [ ] **F.** Eliza → 웹앱 API 호출 시 403 없이 정상 동작 확인

Eliza Agent가 웹앱의 context API를 호출할 때 인증하는 미들웨어 추가.

**`apps/web/app/lib/auth.server.ts`에 추가:**
```typescript
/**
 * 내부 서비스 인증 (Eliza Agent → 웹앱 API 호출 시)
 * X-Internal-Secret 헤더로 인증
 */
export function requireInternalSecret(request: Request) {
  const secret = request.headers.get("X-Internal-Secret");
  const expected = process.env.CHOONSIM_API_SECRET;
  if (!expected || secret !== expected) {
    throw new Response("Forbidden", { status: 403 });
  }
}
```

---

### Phase G: Vercel + Railway 배포 분리 (2일) — 4주차 (5/02~5/10)

- [ ] **G-1.** Railway 계정 생성 및 프로젝트 연결
- [ ] **G-2.** `packages/eliza-agent/railway.toml` 배포 설정 파일 작성
- [ ] **G-3.** Railway 대시보드에서 환경변수 전체 등록 (Discord/Telegram/CHOONSIM_API_SECRET 등)
- [ ] **G-4.** Railway 배포 후 Discord 봇 온라인 상태 확인
- [ ] **G-5.** Railway 배포 후 Telegram 봇 응답 확인
- [ ] **G-6.** 웹앱(Vercel) ↔ Eliza(Railway) 메모리 공유 E2E 테스트
- [ ] **G.** 데모 시나리오 전체 흐름 최종 검증 (섹션 6 기준)

Eliza Agent는 **장시간 실행 서버 프로세스**이므로 Vercel(서버리스)에 배포 불가.

| 서비스 | 배포 위치 |
|--------|-----------|
| 웹앱 (React Router + API) | Vercel (기존) |
| Eliza Agent (Discord/X/TG) | Railway 또는 Fly.io |

**`packages/eliza-agent/package.json`**
```json
{
  "name": "@choonsim/eliza-agent",
  "scripts": {
    "start": "tsx src/index.ts",
    "dev": "tsx watch src/index.ts"
  }
}
```

**Railway 배포 설정 (`railway.toml`):**
```toml
[build]
builder = "nixpacks"
buildCommand = "npm install && npm run build"

[deploy]
startCommand = "npm start"
restartPolicyType = "on_failure"
```

---

## 4. 구현 타임라인 (4주)

| 주차 | 작업 | 산출물 |
|------|------|--------|
| 1주차 (4/11~4/17) | Phase A: 환경설정 + Phase B: Character JSON | `packages/eliza-agent` 기본 구조, 춘심 Character 파일 |
| 2주차 (4/18~4/24) | Phase C: Turso Memory Adapter | 메모리 공유 동작 확인 |
| 3주차 (4/25~5/01) | Phase D+E: 온체인 액션 + 런타임 | Discord 봇 로컬 동작 확인 |
| 4주차 (5/02~5/10) | Phase F+G: 인증 + 배포 | Railway 배포, X·TG 커넥터 라이브 |

---

## 5. 예상 난이도 및 리스크

| 항목 | 난이도 | 리스크 | 대응 |
|------|--------|--------|------|
| Character JSON 작성 | 🟢 낮음 | 없음 | — |
| Turso Memory Adapter | 🟡 중간 | elizaOS DatabaseAdapter 인터페이스 구현 복잡 | 단순 REST 래퍼로 시작, 점진적 확장 |
| Discord 커넥터 | 🟢 낮음 | Discord Bot 승인 대기 | 미리 Application 등록 |
| X 커넥터 | 🔴 높음 | X API v2 rate limit, OAuth 2.0 | Basic 플랜($100/월) 또는 Free tier 한도 내 데모 |
| Telegram 커넥터 | 🟢 낮음 | 없음 | BotFather로 즉시 발급 |
| Railway 배포 | 🟡 중간 | 환경변수 관리 복잡 | Railway 대시보드 GUI 활용 |

**X(트위터) 커넥터 대안:** API 비용 문제 시 X 대신 Telegram만으로 데모. Telegram은 무료이고 Blinks와 별개로 독립적 가치를 보여줄 수 있음.

---

## 6. 성공 기준 (데모 시나리오)

```
1. 텔레그램에서 "춘심아 안녕" → Choonsim이 팬명을 기억하며 응답
2. "초코 100개 사줘" → 체크인 Blink URL 반환
3. 웹앱에서 같은 대화 계속 → 텔레그램에서 한 말을 기억함 (공유 메모리 증명)
4. Discord에서 "오늘 체크인하자" → 체크인 Blink URL 반환
```

---

## Related Documents
- [09_ADVANCED_ROADMAP](../03_Technical_Specs/09_ADVANCED_ROADMAP.md) — 전체 고도화 로드맵
- [05_AI_AGENT_TRANSFORMATION](../03_Technical_Specs/05_AI_AGENT_TRANSFORMATION.md) — 현재 LangGraph AI 구조
- [04_AGENT_KIT_IMPLEMENTATION](../03_Technical_Specs/04_AGENT_KIT_IMPLEMENTATION.md) — 현재 Solana Agent Kit 구현
