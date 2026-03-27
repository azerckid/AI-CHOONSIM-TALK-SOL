# AI Agent 전환 구현 명세 — 춘심 Assistant → Agent
> Created: 2026-03-27
> Status: 구현 예정

---

## 1. 개요

현재 춘심은 **Reactive Assistant**입니다.
유저가 말 걸면 응답하고, 끝납니다.

목표는 **Autonomous Agent**입니다.
스스로 판단하고, 온체인 액션을 직접 실행합니다.

---

## 2. 현재 vs 목표 아키텍처

### 현재 (Assistant)
```
유저 메시지
    ↓
analyzePersona → callModel → summarize
    ↓
텍스트 응답 반환 (끝)
```

### 목표 (Agent)
```
유저 메시지 or 자율 트리거
    ↓
analyzePersona → callModel
    ↓
도구 필요? ─── Yes ──→ executeTool (온체인 포함)
    ↓ No              ↓
    ↓         결과를 컨텍스트에 반영
    ↓              ↓
    └──── summarize → 응답 반환
```

핵심 차이: **도구가 실제 온체인 액션을 실행합니다.**

---

## 3. Agent 도구 분류

### 3-1. Read 도구 (현재 구현됨)
| 도구 | 동작 |
|------|------|
| `checkChocoBalance` | DB CHOCO 잔액 조회 |
| `getSolBalance` | Devnet SOL 잔액 조회 |
| `getCheckinBlink` | 체크인 Blink URL 반환 |
| `getGiftBlink` | 선물 Blink URL 반환 |
| `getMemoryNFTInfo` | cNFT 안내 |

### 3-2. Write 도구 (신규 추가)
| 도구 | 동작 | 트리거 |
|------|------|--------|
| `transferChocoSPL` | 서버 지갑 → 유저 지갑 SPL CHOCO 전송 | 구매 완료, 보상 지급 |
| `engraveMemory` | cNFT 발행 → 유저 지갑 전송 | "기억에 새겨줘" |
| `grantChocoReward` | 특정 조건 달성 시 CHOCO 자동 지급 | 마일스톤, 이벤트 |

### 3-3. 자율 트리거 (Proactive Agent)
| 트리거 | 조건 | 동작 |
|--------|------|------|
| 생일 감지 | 유저 프로필 생일 = 오늘 | 100 CHOCO 자동 전송 + 생일 축하 메시지 |
| 연속 대화 마일스톤 | 30일 / 100일 연속 | CHOCO 보상 + 기념 cNFT 자동 발행 |
| 첫 구매 | 최초 CHOCO 구매 감지 | 보너스 50 CHOCO 지급 |
| 감정 피크 감지 | 대화 중 특별한 감정 순간 | "이 순간 기억에 새길까?" 먼저 제안 |

---

## 4. 수정 파일 목록

| 파일 | 작업 내용 |
|------|-----------|
| `app/lib/ai/graph.ts` | Write 도구 3개 추가, agent-kit.server.ts 연결 |
| `app/lib/solana/agent-kit.server.ts` | `transferChocoSPL`, `mintMemoryNFT` 실제 구현 |
| `app/routes/api/cron/presend.ts` | 생일/마일스톤 자율 보상 트리거 추가 |
| `app/db/schema.ts` | `user.solanaWallet` 컬럼 추가 |
| `app/routes/api/user/wallet.ts` | 신규 — 지갑 주소 저장 API |
| `app/routes/profile/index.tsx` | Phantom 설치 안내 + 지갑 주소 등록 UI |

---

## 5. graph.ts 변경 상세

### 5-1. agent-kit.server.ts 연결
```typescript
// 현재: graph.ts 안에 도구 하드코딩
const checkChocoBalanceTool = { name: "checkChocoBalance", ... }

// 변경 후: agent-kit.server.ts에서 도구 가져옴
import { getChoonsimSolanaTools } from "~/lib/solana/agent-kit.server";

// callModelNode에서:
const solanaTools = getChoonsimSolanaTools(state.userId);
const allTools = [saveTravelPlanTool, ...solanaTools];
```

### 5-2. Write 도구 실행 흐름
```typescript
// engraveMemory 도구 실행 예시
if (toolCall.name === "engraveMemory") {
  // 1. 유저 지갑 + 잔액 확인
  const user = await db.query.user.findFirst({
    where: eq(schema.user.id, state.userId),
    columns: { solanaWallet: true, chocoBalance: true }
  });

  // 2. 지갑 없음
  if (!user?.solanaWallet) {
    return "Phantom 지갑 등록이 필요해! 프로필 → Wallet 메뉴에서 등록해줘 💕";
  }

  // 3. 잔액 부족
  if (parseFloat(user.chocoBalance) < 200) {
    return `CHOCO가 부족해... 현재 ${user.chocoBalance} CHOCO. 200 CHOCO가 필요해!`;
  }

  // 4. cNFT 민팅 API 호출
  const result = await fetch("/api/solana/mint-memory", { ... });

  // 5. 결과 반환
  return `기억에 새겼어! 🎖️\nSolana Explorer: https://...`;
}
```

---

## 6. 안전 장치 (Guardrails)

자율 Agent가 온체인 액션을 실행하므로 반드시 제한이 필요합니다.

| 제한 | 내용 |
|------|------|
| 일일 자동 지급 한도 | 유저당 최대 500 CHOCO/일 자동 지급 |
| cNFT 민팅 한도 | 유저당 최대 5회/일 |
| 유저 확인 필요 금액 | 1,000 CHOCO 이상 지급 시 어드민 승인 필요 |
| 온체인 실패 시 | DB 롤백 + 에러 로그 기록 |
| 모든 온체인 액션 | `systemLog` 테이블에 기록 |

---

## 7. 구현 순서

```
Step 1. DB 마이그레이션 — solanaWallet 컬럼 추가
Step 2. /api/user/wallet — 지갑 저장 API
Step 3. agent-kit.server.ts — transferChocoSPL, engraveMemory 구현
Step 4. graph.ts — agent-kit 연결 + Write 도구 추가
Step 5. profile/index.tsx — Phantom 안내 UI
Step 6. cron/presend.ts — 자율 보상 트리거 추가
```

---

## 8. 주의사항

- `SOLANA_AGENT_PRIVATE_KEY`는 서버 전용. 절대 클라이언트 노출 금지
- 온체인 전송 실패 시 DB도 변경하지 않음 (원자성 유지)
- Devnet 기준 구현 → 실서비스 전 Mainnet 전환 필요
- SPL Token-2022 Transfer Fee 1% 자동 차감됨 (수신량 = 전송량 × 0.99)
