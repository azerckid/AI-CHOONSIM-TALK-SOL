# Agent Kit 구현 명세 — B안: 하이브리드 온체인
> Created: 2026-03-27
> Updated: 2026-03-27
> Status: 구현 예정

---

## 1. 개요 (B안 — 하이브리드)

| 영역 | 방식 | 이유 |
|------|------|------|
| 채팅 CHOCO 차감 | DB (기존 유지) | 매 메시지 서명 → UX 최악 |
| CHOCO 구매 | SOL 결제 → SPL CHOCO 전송 | 온체인 느낌 |
| cNFT 발행 | SPL CHOCO 차감 + cNFT 민팅 | 온체인 느낌 |
| 보상 지급 | 서버 지갑 → 유저 지갑 SPL 전송 | 온체인 느낌 |

CHOCO는 이미 **SPL Token-2022**로 Devnet 배포됨:
- Mint: `E2o1MKpnwh5vELG4FDgiX2NA33L11hXPVfAPD3ai4GWf`
- 발행량: 10억 CHOCO (서버 에이전트 지갑 보유)
- Transfer Fee: 1%

---

## 2. 사전 조건

### 2-1. DB 마이그레이션 (신규)
```sql
ALTER TABLE user ADD COLUMN solanaWallet TEXT;
```
- nullable — 지갑 미등록 유저 허용
- Phantom 공개키 Base58 형식 저장

### 2-2. 환경 변수 (이미 설정됨 ✅)
```
SOLANA_AGENT_PRIVATE_KEY=[...]
MERKLE_TREE_ADDRESS=AJxCqbFdWLmQ7xMqBQN3AXja9paZJZ9qrqvwViXVkXGF
CHOCO_TOKEN_MINT_ADDRESS=E2o1MKpnwh5vELG4FDgiX2NA33L11hXPVfAPD3ai4GWf
CHOCO_TREASURY_ADDRESS=Akfuxv8pQvrLpMyEVEFaBrTfCS4f3y6kQCpYmvYQcxag
SOLANA_RPC_URL=https://api.devnet.solana.com
```

---

## 3. Feature 1 — CHOCO 구매 (채팅 명령어)

### 흐름
```
유저: "초코 500개 살게"
    ↓
graph.ts buyChoco 도구 감지
    ↓
solanaWallet 확인
    ├── 없으면 → Phantom 안내 메시지
    └── 있으면
        └── Solana Pay 결제 링크 생성 반환
            유저가 Phantom으로 SOL 지불
            /api/payment/solana/verify 에서 확인
            → transferChocoSPL(유저지갑, 500) 실행
            → DB chocoBalance += 500
```

### 가격 정책
| CHOCO | SOL (Devnet 기준) |
|-------|-----------------|
| 100 | 0.001 SOL |
| 500 | 0.004 SOL |
| 1,000 | 0.007 SOL |
| 5,000 | 0.03 SOL |

### graph.ts 신규 도구: `buyChoco`
```typescript
{
  name: "buyChoco",
  description: "유저가 CHOCO 구매를 원할 때. '초코 살게', '초코 구매', '초코 [숫자]개' 감지.",
  parameters: {
    amount: number  // 구매 수량
  }
}
```

---

## 4. Feature 2 — cNFT 메모리 각인

### 흐름
```
유저: "기억에 새겨줘"
    ↓
graph.ts engraveMemory 도구 감지
    ↓
solanaWallet 확인 → 없으면 Phantom 안내
chocoBalance 확인 → 200 미만이면 부족 안내
    ↓
POST /api/solana/mint-memory 호출
    - ownerAddress: user.solanaWallet
    - name: 최근 AI 메시지 앞 20자
    - description: "춘심과의 소중한 순간 — {날짜}"
    ↓
DB chocoBalance -= 200
cNFT → 유저 Phantom 지갑으로 전송
Solana Explorer 링크 응답
```

### graph.ts 신규 도구: `engraveMemory`
```typescript
{
  name: "engraveMemory",
  description: "유저가 대화 순간을 NFT로 기록하고 싶을 때. '기억에 새겨줘', '추억으로 남겨줘', 'NFT로 만들어줘' 감지.",
  parameters: {}
}
```

---

## 5. Feature 3 — Phantom 지갑 등록

### 안내 메시지 (지갑 미등록 시)
```
자기야, 이 기능은 Solana 지갑이 필요해!

1️⃣ Phantom 설치: https://phantom.app
2️⃣ 설치 후 지갑 주소 복사
3️⃣ 프로필 → Wallet 메뉴에서 주소 등록

등록하고 나면 바로 할 수 있어! 💕
```

### 프로필 Wallet 섹션 변경
- **현재**: WalletButton (연결만)
- **변경**:
  - 미등록 → Phantom 설치 링크 + 주소 입력 폼
  - 등록됨 → 주소 표시 (앞 4자...뒤 4자) + 변경 버튼
  - WalletButton 연결 시 → 주소 자동 저장 API 호출

### 신규 API: `PATCH /api/user/wallet`
```typescript
// Request
{ solanaWallet: "Base58주소" }

// Response
{ success: true, solanaWallet: "Base58주소" }
```

---

## 6. agent-kit.server.ts 추가 함수

### transferChocoSPL
```typescript
export async function transferChocoSPL(
  toWallet: string,   // 수신 지갑 주소
  amount: number      // CHOCO 수량 (정수)
): Promise<{ signature: string }>

// 내부 동작:
// 1. getAgentKit() 초기화
// 2. agentKit를 통해 SPL Token-2022 transfer 실행
// 3. 트랜잭션 서명 반환
```

---

## 7. 수정 파일 목록

| 파일 | 작업 |
|------|------|
| `app/db/schema.ts` | `user.solanaWallet` 추가 |
| `drizzle/` | 마이그레이션 파일 |
| `app/routes/api/user/wallet.ts` | 신규 — 지갑 저장 API |
| `app/lib/solana/agent-kit.server.ts` | `transferChocoSPL` 추가 |
| `app/lib/ai/graph.ts` | `buyChoco`, `engraveMemory` 도구 + agent-kit 연결 |
| `app/routes/profile/index.tsx` | Wallet 섹션 — Phantom 안내 + 주소 저장 |
| `app/routes.ts` | `/api/user/wallet` 라우트 등록 |

---

## 8. 구현 순서

```
Step 1. schema.ts — solanaWallet 컬럼 추가
Step 2. 마이그레이션 실행
Step 3. /api/user/wallet — 지갑 저장 API
Step 4. agent-kit.server.ts — transferChocoSPL 구현
Step 5. graph.ts — buyChoco, engraveMemory 도구 추가 + agent-kit 연결
Step 6. profile/index.tsx — Phantom 안내 UI + 지갑 저장
Step 7. routes.ts — 라우트 등록
```

---

## 9. 관련 문서
- [AI Agent 전환 명세](./05_AI_AGENT_TRANSFORMATION.md)
- [Solana 통합 명세](./02_SOLANA_INTEGRATION_SPECS.md)
