# 06. Slash Commands

채팅창에서 `/` 로 시작하는 명령어를 입력하면 AI 모델 호출 없이 Solana 도구를 직접 실행합니다.

## 사용 가능한 커맨드

| 커맨드 | 인수 | 설명 | 비용 |
|--------|------|------|------|
| `/choco` | `[수량]` | CHOCO 구매 안내 + 지갑으로 SPL 전송 | SOL (Devnet) |
| `/balance` | — | CHOCO 잔액 확인 | 무료 |
| `/engrave` | `[제목]` | 현재 대화를 cNFT로 온체인에 각인 | 200 CHOCO |
| `/checkin` | — | 오늘의 체크인 Blink URL 안내 | 무료 |

### 사용 예시

```
/choco 500        → 500 CHOCO 구매 안내 + Solana Pay 링크
/choco            → 기본 100 CHOCO 구매 안내
/balance          → 현재 CHOCO 잔액 표시
/engrave 첫 만남  → "첫 만남" 제목으로 cNFT 발행 (200 CHOCO 차감)
/engrave          → 기본 제목으로 cNFT 발행
/checkin          → 일일 체크인 Blink URL (50 CHOCO 보상)
```

---

## 구현 구조

### 백엔드 (`stream.ts`)

`streamAIResponse` 진입 시, 메시지가 `/`로 시작하면 **AI 모델을 호출하지 않고** `executeSlashCommand()`를 직접 실행합니다.

```
유저 메시지
  └─ "/" 시작? YES → executeSlashCommand() → 도구 결과를 응답으로 yield → 종료
                NO  → 기존 스트리밍 로직 진행
```

**파일**: `apps/web/app/lib/ai/stream.ts`

```typescript
// executeSlashCommand(rawMessage, userId): Promise<string | null>
// - "/choco [수량]"  → buyChoco 도구
// - "/balance"       → checkChocoBalance 도구
// - "/engrave [제목]" → engraveMemory 도구
// - "/checkin"       → getCheckinBlink 도구
// - 인식 불가 커맨드 → null 반환 (AI 응답으로 넘어감)
```

### 프론트엔드 (`MessageInput.tsx`)

입력창에 `/`를 타이핑하는 순간 커맨드 힌트 팝업이 입력창 위에 표시됩니다.

- 추가 입력 시 커맨드 이름으로 필터링
- 커맨드 클릭 시 자동 완성 (인수가 있으면 공백 포함)

**파일**: `apps/web/app/components/chat/MessageInput.tsx`

---

## 도구 연결

슬래시 커맨드는 `agent-kit.server.ts`의 `getChoonsimSolanaTools(userId)` 도구 배열을 직접 호출합니다.

| 커맨드 | 도구 이름 |
|--------|-----------|
| `/choco` | `buyChoco` |
| `/balance` | `checkChocoBalance` |
| `/engrave` | `engraveMemory` |
| `/checkin` | `getCheckinBlink` |

---

## 전제 조건

- `/engrave` 실행 시 CHOCO 잔액 200 이상 필요
- `/choco` 결제 완료 후 Phantom 지갑으로 SPL CHOCO 자동 전송
  (지갑 미등록 시 프로필 → Phantom Wallet 등록 안내)
- 모든 온체인 작업은 Devnet 기준
