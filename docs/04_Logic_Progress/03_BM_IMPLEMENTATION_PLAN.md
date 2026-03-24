# BM 구현 계획 (Business Model Implementation Plan)
> Created: 2026-02-22
> Last Updated: 2026-03-13 (NEAR → CTC EVM 마이그레이션 완료, 문서 NEAR 참조 제거)

본 문서는 `19_MONETIZATION_STRATEGY.md`의 심화 수익화 전략을 실제 코드베이스에 구현하기 위한 단계별 실행 계획입니다.
현재 구현 상태를 기준으로 Phase 0(마이그레이션)부터 Phase 5(장기)까지 작업 순서를 정의합니다.

---

## 현재 구현 상태 요약

### ✅ 완료된 인프라

| 항목 | 파일 | 비고 |
|---|---|---|
| Shop UI + 구매 API | `routes/shop/index.tsx`, `routes/api/items/purchase.ts` | 아이템 카드 + 상세 모달 완비 |
| CHOCO 잔액 관리 | `db/schema.ts` (User.chocoBalance) | BigNumber 정밀 계산 |
| X402 Silent 결제 | `lib/ctc/x402.server.ts`, `db/schema.ts` (X402Invoice) | 오프체인 포인트, 402 시 충전 유도 |
| 메시지 크레딧 차감 | `routes/api/chat/index.ts`, `lib/credit-policy.ts` | 모델별 비용 차등 |
| 구독 시스템 | `routes/api.payment.activate-subscription.ts` | FREE/BASIC/PREMIUM/ULTIMATE |
| 호감도/이모션 | `db/schema.ts` (CharacterStat) | JOY/EXCITED/LOVING |
| 선물 시스템 | `routes/api/items/gift.ts` | DB 아이템 조회 기반, isActive 검증 |
| Admin 대시보드 | `routes/admin/dashboard.tsx` | 결제 내역, 통계 |
| **Admin 아이템 CRUD** | `routes/admin/items/` (index, edit, statistics) | 목록·생성(ID 지정)·수정·통계 완비 |
| **CHOCO & 아이템 가이드 페이지** | `routes/guide.tsx` | 앵커 링크, 하단 CTA, 진입 포인트 연결 완료 |
| **결정적 순간 페이월** | `routes/api/chat/index.ts`, `routes/chat/$id.tsx` | PAYWALL_TRIGGER 파싱 + 인터스티셜 모달 |
| **관계 기반 등급제 UI** | `routes/profile/subscription.tsx` | 4단계 등급 카드, 업그레이드 CTA |
| **온보딩 CHOCO 슬라이드** | `routes/onboarding/choco.tsx` | 가입 직후 자동 진입 |
| **멀티 아이템 선물 Swiper UI** | `components/chat/GiftSelector.tsx` | 가로 스와이퍼, Upsell 버튼, QA 완료 |

### ❌ 미구현 항목 (개발 필요)

| 항목 | 영향 |
|---|---|
| **Phase 0. 블록체인 마이그레이션** | 0-1~0-3 완료. 0-4 CTC 스윕 엔진 구현 진행 예정. |
| Shop 실제 아이템 데이터 | 상점이 비어 있어 매출 발생 불가 — **운영팀이 Admin에서 직접 입력** |
| 크레딧 소진 → Shop 연결 E2E 검증 | 402 흐름이 실제로 동작하는지 미검증 |
| 선톡 (캐릭터 먼저 DM) | 재방문율 트리거 없음 |
| 보이스 메시지 TTS | 가장 강력한 감성 후크 미구현 |
| 대화 앨범 PDF | LTV 상승 콘텐츠 미구현 |
| 온체인 각인 (CTC EVM NFT) | RWA 생태계 진입 미구현 |

---

## 구현 판단 기준

```
Phase 0 → 복잡성을 줄이고 안정적인 결제-가스비 구조를 만든다 (CTC EVM 마이그레이션 완료)
Phase 1 → 코드 없이 지금 당장 팔 수 있게 만든다 (운영 준비)
Phase 2 → 감정이 식기 전에 결제를 이끈다
Phase 3 → 다시 앱을 열게 만든다
Phase 4 → 오래 남아 있게 만든다
Phase 5 → 이탈 불가 해자를 만든다
```

---

## Phase 0. 블록체인 인프라 전환 (NEAR → CTC EVM) — 0-1~0-3 완료 / 0-4 진행

> **오프체인 포인트(Off-chain Point)** 구조를 도입하여 트랜잭션 수수료를 0으로 만들고, 유저 편의성을 극대화한다.

**목표**: 기존 `near-api-js` 기반의 온체인 CHOCO 시스템을 `ethers.js` 기반의 EVM(Creditcoin) 시스템으로 교체하고, 내부 재화는 순수 DB 기반(포인트)으로 분리한다.

**작업 순서 의존성**: 0-1 → 0-2 → 0-3 (순차) → 0-4 (독립, 병행 가능)

---

### 0-1. DB 스키마 · 지갑 생성 마이그레이션

> DB 필드 교체와 지갑 생성 로직은 동일 PR에서 처리해야 코드가 정상 동작한다.

#### DB 스키마 변경 (`db/schema.ts`)

| 기존 필드 | 교체 필드 | 타입 | 비고 |
|---|---|---|---|
| `nearAccountId` | `evmAddress` | `varchar(42)` | 0x... 형식 EVM 주소 |
| `nearPrivateKey` | `evmPrivateKey` | `text` | 기존 암호화 방식 그대로 적용 |

- `X402Invoice.txHash`, `TokenTransfer.txHash` 필드는 유지하되 필수 검증 요소가 아닌 Reference로 취급 (`nullable` 허용)
- 마이그레이션 스크립트 작성 후 실행 (`db/migrations/`)
  - 기존 유저 데이터: `evmAddress`, `evmPrivateKey` → `null` (이후 재가입 또는 수동 생성)

#### 지갑 생성 로직 교체 (`lib/near/wallet.server.ts` → `lib/ctc/wallet.server.ts`)

- **제거**: `createNearImplicitAccount()`, `storage_deposit()`, `ensureNearWallet()` 등 NEAR 고유 함수 전체
- **추가**: `createEvmWallet()` 함수 신규 작성
  ```ts
  // lib/ctc/wallet.server.ts
  export async function createEvmWallet() {
    const wallet = ethers.Wallet.createRandom();
    const encryptedKey = encrypt(wallet.privateKey); // 기존 암호화 유틸 재사용
    return { evmAddress: wallet.address, evmPrivateKey: encryptedKey };
  }
  ```
- 현재 지갑 생성은 **첫 홈 접속 시** `routes/home.tsx` loader의 `ensureNearWalletAsync()` 호출로 이루어짐. 해당 위치를 `createEvmWallet()` 호출로 교체 (또는 회원 가입 훅에서 생성하도록 설계 변경)
- 가입 보상 100 CHOCO: `sendChocoToken()` 온체인 호출 제거 → `User.chocoBalance += 100` DB 업데이트만 수행

#### 체크리스트

- [x] `db/schema.ts`: `evmAddress`, `evmPrivateKey` 필드 추가 (near* 필드는 기존 유저 fallback용으로 병행 유지 → 0-3에서 제거)
- [x] `X402Invoice.txHash`, `TokenTransfer.txHash` nullable 허용
- [x] DB 반영 완료 (직접 SQL + drizzle-kit push `Changes applied`)
- [x] `lib/ctc/wallet.server.ts` 신규 생성 (`createEvmWallet`, `ensureEvmWalletAsync`)
- [x] `routes/home.tsx` loader에서 `ensureEvmWalletAsync()` 호출로 교체
- [x] 가입 보상 100 CHOCO: `sendChocoToken` → `chocoBalance += 100` DB 업데이트로 교체 (`ensureEvmWalletAsync` 내부)
- [ ] `ensureNearWallet*` 잔여 호출부 제거 (`lib/near/wallet-queue.server.ts` 등) → **0-3에서 처리**

---

### 0-2. 온체인 트랜잭션 전면 제거

> `token.server.ts`의 `sendChocoToken` / `returnChocoToService` 온체인 호출을 모두 제거하고, `User.chocoBalance` DB 증감으로만 처리한다.

#### 제거 대상 상세

| 파일 | 함수 | 현재 동작 | 변경 후 |
|---|---|---|---|
| `api/items/purchase.ts` | `returnChocoToService` | 아이템 구매 시 서비스 계정으로 CHOCO 회수 (온체인) | `User.chocoBalance -= priceChoco` DB 차감 트랜잭션 |
| `api/chat/index.ts` | `returnChocoToService` | 스트리밍 응답 후 크레딧 차감 (온체인) | `User.chocoBalance -= creditCost` DB 차감 |
| `api.payment.capture-order.ts` | `sendChocoToken` | PayPal 결제 후 CHOCO 지급 (온체인) | `User.chocoBalance += amount` DB 증가 |
| `api.payment.activate-subscription.ts` | `sendChocoToken` | 구독 활성화 시 구독 보너스 CHOCO 지급 (온체인) | `User.chocoBalance += bonus` DB 증가 |
| `api.webhooks.paypal.ts` | `sendChocoToken` | PayPal 웹훅 처리 시 CHOCO 지급 (온체인) | `User.chocoBalance += amount` DB 증가 |
| `lib/toss.server.ts` | `sendChocoToken` | 토스 결제·구독 리필 시 CHOCO 지급 (온체인) | `User.chocoBalance += amount` DB 증가 |
| `routes/admin/users/detail.tsx` | `sendChocoToken` | Admin 수동 CHOCO 지급 (온체인) | Admin API → `User.chocoBalance += amount` DB 증가 |

> `lib/near/deposit-engine.server.ts`의 `sendChocoToken` 호출은 0-4에서 CTC 스윕 엔진으로 대체하므로 여기서는 파일 전체를 비활성화(주석 처리)만 한다.

#### 공통 수정 패턴

```ts
// Before
await sendChocoToken({ toAccountId: user.nearAccountId, amount });

// After (스키마 컬럼명은 chocoBalance)
await db.update(users)
  .set({ chocoBalance: sql`chocoBalance + ${amount}` })
  .where(eq(users.id, userId));
```

#### 체크리스트

- [x] `api/items/purchase.ts`: `returnChocoToService` 제거, DB 차감 트랜잭션 유지 (nanoid·totalCostRaw 제거)
- [x] `api/chat/index.ts`: `returnChocoToService` 제거, DB 차감 단순화 (decrypt·nanoid 동적 import 제거)
- [x] `api.payment.capture-order.ts`: `sendChocoToken` 제거, DB 증가 유지 (chocoAmountRaw 제거)
- [x] `api.payment.activate-subscription.ts`: `sendChocoToken` 제거, DB 증가 유지
- [x] `api.webhooks.paypal.ts`: `sendChocoToken` 제거, DB 증가 유지
- [x] `lib/toss.server.ts`: `sendChocoToken` 제거 (processSuccessfulTossPayment, processSuccessfulTossSubscription 모두)
- [x] `routes/admin/users/detail.tsx`: `sendChocoToken` 제거, chocoTxHash 변수 및 TokenTransfer 삽입 제거
- [x] `lib/near/deposit-engine.server.ts`: `runDepositMonitoring` 상단에 early return 추가로 비활성화
- [ ] `lib/near/token.server.ts`: 호출부 확인 결과 `wallet.server.ts`, `x402.server.ts` 등 잔여 참조 있음 → **0-3에서 처리**

---

### 0-3. NEAR 파일 · 클라이언트 정리

> 0-2 완료 후 진행. NEAR 의존 파일을 제거하고, 클라이언트의 NEAR 지갑 결제 흐름을 오프체인 포인트 흐름으로 교체한다.

#### 서버 파일 정리

| 파일 | 처리 방법 |
|---|---|
| `lib/near/token.server.ts` | 삭제 (0-2에서 호출부 제거 완료 후) |
| `lib/near/wallet.server.ts` | 삭제 (0-1에서 `lib/ctc/wallet.server.ts`로 교체 완료 후) |
| `lib/near/wallet-client.ts` | 삭제 |
| `lib/near/x402.server.ts` | `lib/ctc/x402.server.ts`로 이동 + near-api-js 의존성 제거, ethers.js 기반으로 교체 |
| `lib/near/deposit-engine.server.ts` | 삭제 (0-4에서 CTC 버전으로 대체) |
| `api/webhooks/near/token-deposit` | 엔드포인트 제거 또는 CTC 입금 검증용으로 교체 |
| `api/relayer/submit.ts` | NEAR relayer이므로 제거 |

- `lib/near/` 디렉토리 내 파일이 모두 제거되면 디렉토리 삭제
- `lib/ctc/` 디렉토리 신규 생성 (`wallet.server.ts`, `x402.server.ts` 배치)
- 전체 import 경로 일괄 수정 (`lib/near/*` → `lib/ctc/*`)
- `package.json`에서 `near-api-js` 의존성 제거

#### 클라이언트 정리

**PaymentSheet / useX402** (`components/payment/PaymentSheet.tsx`, `lib/near/use-x402.ts`)
- 현재 흐름: `useX402` → PaymentSheet → NEAR 지갑 연결 → 온체인 전송
- 변경 후 흐름: 402 수신 시 잔액 부족 모달 표시 → "CHOCO 충전하기" (`/profile/subscription`) 유도
- NEAR 지갑 연결·서명·전송 로직 전체 제거

**프론트 UI 표시**
- `routes/profile/subscription.tsx`: NEAR 지갑 주소 표시 제거 → EVM 주소 (`evmAddress`) 표시 또는 미표시
- `routes/settings.tsx`: NEAR 관련 설정 항목 제거
- 잔액 표시: `nearBalance` 조회 제거 → `chocoBalance` (DB 포인트) 단일 표시

#### 체크리스트

- [x] `lib/near/token.server.ts` 삭제
- [x] `lib/near/wallet.server.ts` 삭제
- [x] `lib/near/wallet-client.ts` 삭제
- [x] `lib/near/x402.server.ts` → `lib/ctc/x402.server.ts` 이동 및 near-api-js 제거
- [x] `lib/near/deposit-engine.server.ts` 삭제
- [x] `api/webhooks/near/token-deposit` 엔드포인트 제거
- [x] `api/relayer/submit.ts` 제거
- [x] `lib/near/` 디렉토리 삭제, `lib/ctc/` 디렉토리 신규 생성
- [x] 전체 `import ... from 'lib/near/*'` → `lib/ctc/*` 일괄 수정
- [x] `package.json`에서 `near-api-js` 제거 및 `npm install`
- [x] `PaymentSheet.tsx` / `useX402.ts`: NEAR 지갑 로직 제거, 잔액 부족 모달 + 충전 유도로 교체
- [x] `routes/profile/subscription.tsx`, `routes/settings.tsx`: NEAR 잔액/주소 표시 제거

---

### 0-4. CTC 스윕 엔진 (Deposit Engine)

> 0-1~0-3과 독립적으로 진행 가능. CTC를 직접 입금하는 충전 경로를 활성화한다.

#### `lib/ctc/deposit-engine.server.ts` 신규 구현

```ts
// 핵심 로직 흐름
1. DB에서 evmAddress 보유 유저 목록 조회
2. ethers.js로 CTC 메인넷 연결 (CTC_RPC_URL)
3. 각 evmAddress의 CTC 잔액 조회 (provider.getBalance)
4. 직전 조회 잔액(DB 또는 캐시)과 비교 → 입금액 = 현재 잔액 - 이전 잔액
5. 입금액 > 0인 경우:
   a. CTC/USD 시세 API 조회 → CHOCO 환산 (입금액 × 환율)
   b. User.chocoBalance += 환산 CHOCO (DB 업데이트)
   c. Treasury 지갑으로 CTC 전량 Sweep (ethers.Wallet.sendTransaction)
   d. TokenTransfer 테이블에 입금 기록 저장 (txHash, amount, userId)
```

#### Vercel Cron Job 설정 (`vercel.json`)

```json
{
  "crons": [{
    "path": "/api/cron/ctc-sweep",
    "schedule": "*/10 * * * *"
  }]
}
```

- `routes/api/cron/ctc-sweep.ts` 신규 생성
- 엔드포인트 내부 인증: `CRON_SECRET` 헤더 검증

#### 환경변수 추가

```
CTC_RPC_URL=                  # CTC 메인넷 RPC 엔드포인트
CTC_TREASURY_ADDRESS=         # 서비스 Treasury 지갑 주소 (스윕 수신 주소)
CTC_PRICE_API_URL=            # CTC/USD 시세 API (선택, 미설정 시 CHOCO 0 적립)
CRON_SECRET=                  # Cron 엔드포인트 인증 시크릿 (Authorization: Bearer <CRON_SECRET> 또는 X-Cron-Secret 헤더)
```

- 유저 지갑에서 Treasury로 스윕할 때는 유저의 `evmPrivateKey`로 서명하므로 `CTC_TREASURY_PRIVATE_KEY`는 스윕 발신용이 아님. (필요 시 별도 용도 문서화)

#### 체크리스트

- [x] `lib/ctc/deposit-engine.server.ts` 구현 (잔액 조회·입금 감지·환율·유저 지갑→Treasury Sweep)
- [x] `routes/api/cron/ctc-sweep.ts` 신규 생성 (CRON_SECRET 인증 포함)
- [x] `vercel.json`에 Cron Job 추가 (`/api/cron/ctc-sweep`, 10분 주기)
- [x] 환경변수 4종 로컬 + Vercel 등록 완료 (CTC_RPC_URL, CTC_TREASURY_ADDRESS, CTC_PRICE_API_URL, CRON_SECRET) — 구 NEAR 변수 6종 Vercel 제거
- [x] `User.ctcLastBalance` 스키마 추가 및 마이그레이션 `drizzle/0013_add_ctc_last_balance.sql` (실행: `npx tsx scripts/run-migration-0013.ts`)
- [x] `TokenTransfer` 테이블에 CTC 입금 기록 저장 로직
- [x] 로컬 테스트 완료 (2026-03-13): CC3 testnet 10,000 CTC → 1,554,740 CHOCO 적립 → Treasury Sweep txHash: `0x135feab3...`

---

### Phase 0 전체 체크리스트

> 0-1 → 0-2 → 0-3 순서로 진행. 0-4는 병행 가능.

**0-1 완료 기준**: 가입 시 EVM 지갑이 생성되고 `evmAddress`, `evmPrivateKey`가 DB에 저장됨
**0-2 완료 기준**: 코드베이스 전체에서 `sendChocoToken`/`returnChocoToService` 호출이 0개
**0-3 완료 기준**: `lib/near/` 디렉토리가 삭제되고, `near-api-js` 패키지가 제거됨
**0-4 완료 기준**: CTC 입금 → CHOCO 적립 → Sweep 흐름이 로컬에서 검증됨 ✅ 2026-03-13

---

## Phase 1. 운영 준비 — 코드 작업 없음 ✅ 개발 완료 / 운영 작업 대기

> Admin 아이템 CRUD가 이미 완성되어 있으므로, 개발 없이 운영팀이 직접 처리한다.

### 1-1. Shop 아이템 데이터 입력 (운영 작업)

**담당**: 운영팀 (개발자 불필요)
**경로**: `/admin/items/new`

**우선순위·입력 스펙 상세**: [08_SHOP_ITEMS_IMPLEMENTATION_PRIORITY.md](./08_SHOP_ITEMS_IMPLEMENTATION_PRIORITY.md)

입력할 아이템 목록 및 권장 ID:

> [!IMPORTANT]
> **페이월 모달과 즉각적인 결제 연동**을 위해 아래 아이템 중 일부는 반드시 정해진 영문 `ID` 값으로 생성해야 합니다. ID 칸을 비워두면 무작위로 생성되어 채팅창 페이월 트리거가 해당 아이템을 찾지 못해 오류가 발생할 수 있습니다.

| 아이템명 | ID (중요) | type | priceChoco | 설명 |
|---|---|---|---|---|
| 메시지 티켓 x10 | (자동생성) | TICKET | 1,000 | 대화 10회 추가 |
| 메시지 티켓 x50 | (자동생성) | TICKET | 4,500 | 10% 할인 번들 |
| 선톡 티켓 | (자동생성) | PRESEND | 300 | 캐릭터가 먼저 DM 1회 |
| 보이스 티켓 | `voice_ticket` | VOICE | 500 | 음성 메시지 1회 |
| 기억 각인 티켓 | `memory_ticket` | MEMORY | 500 | 대화 영구 각인 1회 |
| 하트 x10 | `heart` | HEART | 1,000 | 캐릭터에게 선물 |
| 비밀 에피소드 해금 | `secret_episode` | EPISODE | 3,000 | 특별 시나리오 1회 |
| 우정 앨범 생성 | `memory_album` | ALBUM | 2,000 | 월간 대화 앨범 생성 |

**체크리스트**:
- [x] 시드 스크립트 실행 (`npx tsx scripts/seed-shop-items.ts`) — 8종 아이템 upsert 완료
- [x] 8종 아이템 `isActive=true` 확인 (`npx tsx scripts/check-shop-items.ts`)
- [x] 페이월 트리거 ID 4종 DB 일치 확인 (2026-03-13)

운영 준비 전체 순서: [09_OPERATIONS_READINESS_CHECKLIST.md](./09_OPERATIONS_READINESS_CHECKLIST.md)

---

### 1-2. 크레딧 소진 → Shop 연결 E2E 검증 (개발 검증)

**목표**: 채팅 API가 402 반환 시 프론트에서 Shop/충전 모달로 연결되는지 확인한다.

**체크리스트**:
- [x] 잔액 0인 계정으로 채팅 시도 → 402 응답 확인 (2026-03-13, `scripts/create-test-user-e2e.ts` 활용)
- [x] 프론트에서 402 시 PaymentSheet(충전 모달) 표시 — `useX402` 훅 + `routes/chat/$id.tsx` 402 조기 return 처리
- [x] 스트리밍 중 402 토스트 액션을 "CHOCO 충전하기" → `/profile/subscription` 으로 통일
- [ ] 충전 후 대화 재개 흐름 확인 (실결제 E2E — 브라우저 수동 검증 필요)
- [x] 버그 수정: 402 응답 시 throw 제거하여 PaymentSheet만 노출되도록 처리

---

## Phase 2. 전환율 극대화 ✅ 완료

> 유저가 아이템을 이해하고, 감정이 식기 전에 결제로 이어지게 만든다.

### 2-1. CHOCO & 아이템 가이드 페이지 ✅

**목표**: 신규 유저가 CHOCO 개념·소비 흐름·아이템 효과를 앱 내에서 스스로 이해할 수 있게 한다.

> 상세 스펙: [`23_choco-guide-page-spec.md`](../03_Technical_Specs/23_choco-guide-page-spec.md)

**관련 파일**:
- `routes/guide.tsx` — 섹션 6개 (#what #earn #spend #items #tiers #faq) + 하단 CTA
- `routes/shop/index.tsx` — `?` 버튼(`/guide#items`) + 아이템 상세 Bottom Sheet 모달
- `routes/chat/$id.tsx` — 잔액 부족 toast "안내 보기" → `/guide#earn`
- `routes/onboarding/choco.tsx` — 가입 직후 CHOCO 소개 슬라이드

**체크리스트**:
- [x] `routes/guide.tsx` 신규 생성 (Section 1~6 전체)
- [x] 앵커 링크 지원 (`/guide#items`, `/guide#faq` 등)
- [x] 하단 CTA — 충전하기 / 멤버십 구독
- [x] `/shop` 헤더 `?` 버튼 추가
- [x] `/shop` 아이템 카드 상세 모달 구현
- [x] 잔액 부족 toast에 안내 링크 추가
- [x] 온보딩 CHOCO 소개 슬라이드 (`/onboarding/choco`) — 가입 후 자동 진입

---

### 2-2. 결정적 순간 페이월 (PAYWALL_TRIGGER) ✅

**목표**: AI 응답 중 감정 최고조 순간을 포착해 인터스티셜 모달로 결제를 유도한다.

**구현 내용**:

1. **채팅 API** (`routes/api/chat/index.ts`)
   - 시스템 프롬프트에 PAYWALL_TRIGGER 가이드 삽입
   - 응답 스트림에서 `[PAYWALL_TRIGGER: {type}]` 태그 파싱 후 표시 콘텐츠에서 제거
   - `paywallTrigger` 필드를 SSE 이벤트로 클라이언트 전달

2. **프론트 인터스티셜 모달** (`routes/chat/$id.tsx`)
   - `PAYWALL_TRIGGER_CONFIG` 트리거별 아이템·문구 매핑
   - 스트림 완료 후 `paywallTrigger` 값 존재 시 모달 표시
   - 구매 → X402 즉시 차감 → 인벤토리 추가
   - 모달 하단 "아이템 안내 보기" → `/guide#items`

| 트리거 | 표시 문구 | 아이템 | 가격 |
|---|---|---|---|
| `memory_recall` | "이 기억, 영원히 간직할까?" | 기억 각인 티켓 | 500 CHOCO |
| `secret_episode` | "우리만의 비밀 이야기가 생겼어" | 비밀 에피소드 | 3,000 CHOCO |
| `memory_album` | "100번의 대화, 앨범으로 만들어줄게" | 대화 앨범 | 2,000 CHOCO |
| `birthday_voice` | "생일 축하해, 목소리로 전할게" | 보이스 티켓 | 1,500 CHOCO |

**체크리스트**:
- [x] 시스템 프롬프트에 PAYWALL_TRIGGER 가이드 추가
- [x] 응답 스트림에서 태그 파싱 로직 구현
- [x] 페이월 인터스티셜 모달 UI 구현
- [x] 트리거별 아이템 매핑 및 즉시 결제 연동
- [x] 모달 내 `/guide#items` 링크 삽입
- [ ] 모달 닫기 후 대화 흐름 정상 재개 E2E 확인 ← 실제 트리거 시나리오 테스트 필요

---

### 2-3. 관계 기반 등급제 UI ✅

**목표**: 유저가 자신의 현재 등급과 다음 등급 혜택을 명확히 인지하게 한다.

**등급 매핑** (기존 구독 플랜 활용):

| 등급 | 현재 플랜 | 조건 | 주요 혜택 |
|---|---|---|---|
| 방문자 | FREE | 가입만 | 일 5회 메시지 |
| 팬 | BASIC | 대화 30회+ or $4.99/월 | 일 15회 + 선톡 1회/주 |
| 조상신 | PREMIUM | X 인증 or $14.99/월 | 일 30회 + 보이스 3회/월 |
| 고래 | ULTIMATE | $29.99/월 or 월 10,000 CHOCO | 무제한 + 한정 콘텐츠 |

**관련 파일**: `routes/profile/subscription.tsx`

**체크리스트**:
- [x] 등급 카드 컴포넌트 디자인 및 구현
- [x] 현재 등급 자동 감지 로직 (subscriptionTier 기반)
- [x] 다음 등급 혜택 미리보기 UI
- [x] 업그레이드 CTA → PayPal 구독 흐름 연결

---

## Phase 3. 재방문율·LTV 상승 (2~4주)

> 유저가 앱을 다시 열게 만드는 루프를 설계한다.

### 3-1. 선톡 기능 (캐릭터가 먼저 DM)

**목표**: 매일 춘심이가 먼저 메시지를 보내 앱 열기 → 대화 → 소비 루프를 형성한다.

**구현 방식**:

1. **Vercel Cron Job** (`vercel.json`)
   ```json
   {
     "crons": [{
       "path": "/api/cron/presend",
       "schedule": "0 9 * * *"
     }]
   }
   ```

2. **Cron API** (`routes/api/cron/presend.ts`)
   - 선톡 티켓 보유 유저 또는 PREMIUM+ 구독자 조회
   - 캐릭터별 오늘의 선톡 메시지 AI 생성
   - Message 테이블에 `role: "assistant"` 레코드 삽입
   - Web Push 알림 발송

3. **Push 알림 연동**
   - `web-push` 라이브러리 또는 Expo Push (PWA)
   - 알림 클릭 → 해당 채팅방으로 딥링크

4. **선톡 티켓 차감**
   - 구독(BASIC+)은 주 1회 무료
   - 추가 선톡은 인벤토리에서 선톡 티켓 차감

**관련 파일**:
- `vercel.json` — Cron 스케줄 추가
- `routes/api/cron/presend.ts` — 신규 생성
- `db/schema.ts` — PushSubscription 테이블 추가 필요

**체크리스트**:
- [x] PushSubscription: User.pushSubscription 컬럼 사용 (별도 테이블 없음)
- [x] Web Push 구독 등록 API: `/api/push-subscription` (POST) 기존 구현
- [x] Cron API 구현: `routes/api/cron/presend.ts` (CRON_SECRET 인증, 선톡 티켓/BASIC+ 대상)
- [x] 선톡 메시지 AI 생성: `generateProactiveMessage` (캐릭터 컨텍스트·bio 기반)
- [x] 알림 → 채팅방: 푸시 payload에 `url: /chat/{conversationId}` (`lib/push.server.ts`)
- [x] 선톡 티켓 차감: 비구독자만 `presend_ticket` 1개 차감
- [x] GitHub Actions: `.github/workflows/presend.yml` (매일 09:00 KST)
- [x] 주 1회 무료 선톡 제한 (BASIC+): `User.lastFreePresendAt` + Luxon 주간(KST) 판별, 초과 시 티켓 사용

---

### 3-2. 보이스 메시지 TTS (ElevenLabs)

**목표**: 채팅 응답을 춘심이의 실제 목소리로 들을 수 있게 한다.

**구현 방식**:

1. **ElevenLabs API 연동** (`lib/elevenlabs.server.ts`)
   - 캐릭터별 Voice ID 매핑
   - 텍스트 → 음성 변환 (streaming)
   - Vercel Blob 또는 R2에 오디오 파일 저장

2. **채팅 UI에 보이스 버튼 추가**
   - 각 AI 메시지 말풍선에 보이스 버튼
   - 클릭 시 보이스 티켓 차감 확인 모달
   - 확인 → `/api/voice/generate` 호출 → 오디오 재생

3. **보이스 API** (`routes/api/voice/generate.ts`)
   - 보이스 티켓 인벤토리 확인 및 차감
   - ElevenLabs API 호출
   - 오디오 URL 반환

**환경변수 추가**:
```
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID_CHOONSIM=
```

**체크리스트**:
- [ ] ElevenLabs 계정 생성 및 춘심이 Voice ID 확보
- [x] `lib/elevenlabs.server.ts` 구현
- [x] `routes/api/voice/generate.ts` 구현
- [x] 채팅 말풍선에 보이스 버튼 UI 추가
- [x] 보이스 티켓 차감 + 재생 흐름 연동
- [ ] 오디오 캐싱 (동일 텍스트 중복 생성 방지): 추후 선택 구현

---

## Phase 4. 프리미엄 콘텐츠 (1~2개월)

> 장기 유저의 LTV를 높인다.

### 4-1. 대화 앨범 PDF 생성

**목표**: 1개월치 베스트 대화를 AI가 편집해 PDF/이미지 북으로 제공한다.

**구현 방식**:

1. **대화 선별 로직** (`lib/album-generator.server.ts`)
   - 최근 30일 메시지 조회
   - 감정 밀도 높은 대화 선별 (메시지 길이, 감정 키워드 기반)

2. **PDF 생성** (`@react-pdf/renderer` 또는 `puppeteer`)
   - 춘심이 브랜드 템플릿 적용
   - 대화 말풍선 형식 레이아웃

3. **API** (`routes/api/album/generate.ts`)
   - 대화 앨범 티켓 차감
   - PDF 생성 → Vercel Blob 저장 → 다운로드 URL 반환

**체크리스트**:
- [x] PDF 생성 라이브러리: @react-pdf/renderer
- [x] 대화 선별 알고리즘: `lib/album-generator.server.ts` (최근 30일, 최대 80건)
- [x] 앨범 PDF 템플릿: `lib/album-pdf-document.tsx` (말풍선 레이아웃)
- [x] `routes/api/album/generate.ts` 구현
- [x] 프로필 페이지 "내 대화 앨범" 섹션 추가

---

## Phase 5. RWA 생태계 (장기)

### 5-1. 온체인 각인 (CTC EVM NFT)

**목표**: 중요한 대화를 Creditcoin(CTC) EVM 체인에 NFT로 영구 기록해 이탈 불가 해자를 형성한다.

**구현 방식**:
1. CTC EVM 스마트 컨트랙트 배포 (ERC-721 NFT 민팅, ethers.js)
2. 각인 API: 대화 내용 → IPFS 업로드 → NFT 민팅
3. "나의 춘심 역사" 페이지에서 온체인 기록 조회

**선행 조건**:
- **Phase 0 완료 필수** (CTC EVM 지갑·ethers.js 인프라 구축 후 진행)
- Phase 1~3 완료 후 진행
- CTC EVM 스마트 컨트랙트 개발 역량 확보

**체크리스트**:
- [ ] CTC EVM NFT 컨트랙트(ERC-721) 설계 및 배포
- [ ] IPFS 연동 (대화 메타데이터 저장)
- [ ] `routes/api/inscription/mint.ts` 구현
- [ ] "나의 춘심 역사" 조회 페이지

---

## 전체 일정 요약

| Phase | 기간 | 핵심 목표 | 상태 | 예상 수익 임팩트 |
|---|---|---|---|---|
| **Phase 0** | 즉시 (인프라) | NEAR → CTC EVM 마이그레이션 (DB·지갑·결제·파일 경로) | ✅ 0-1~0-4 완료 (2026-03-13) | 안정적 결제·가스비 0 구조 확보 |
| **Phase 1** | 즉시 (운영) | 아이템 데이터 입력 + E2E 검증 | ✅ 완료 (2026-03-13) | 즉시 매출 발생 가능 |
| **Phase 2** | 1~2주 | 가이드 페이지 → 페이월 → 등급제 UI | ✅ 완료 | 전환율 극대화 |
| **Phase 6** | — | 멀티 아이템 선물 Swiper UI | ✅ 완료 (QA 검증) | 선물 전환율 상승 |
| **Phase 3** | 2~4주 | 선톡 + 보이스 TTS | ❌ 미구현 | 재방문율·LTV 상승 |
| **Phase 4** | 1~2개월 | PDF 앨범 | ❌ 미구현 | LTV 상승 |
| **Phase 5** | 장기 | CTC EVM NFT 각인 | ❌ 미구현 | 이탈 불가 해자 |

---

## Related Documents
- **Logic_Progress**: [09_OPERATIONS_READINESS_CHECKLIST.md](./09_OPERATIONS_READINESS_CHECKLIST.md) — Phase 0-4, 1-1, 1-2 운영 준비 순서
- **Concept_Design**: [Monetization Strategy](../01_Concept_Design/19_MONETIZATION_STRATEGY.md) - 수익화 전략 원본
- **Concept_Design**: [Core Pitch Deck](../01_Concept_Design/00_CORE_PITCH_DECK.md) - 투자자 비전 및 목표 수치
- **Technical_Specs**: [CHOCO Guide Page Spec](../03_Technical_Specs/23_choco-guide-page-spec.md) - 가이드 페이지 상세 스펙
- **Technical_Specs**: [Gift Items System](../03_Technical_Specs/19_gift-items.md) - 선물 시스템 상세 스펙
- **Logic_Progress**: [Backlog](./00_BACKLOG.md) - 전체 백로그
- **Concept_Design**: [Voice Interaction Strategy](../01_Concept_Design/04_VOICE_INTERACTION_STRATEGY.md) - 보이스 기능 전략
