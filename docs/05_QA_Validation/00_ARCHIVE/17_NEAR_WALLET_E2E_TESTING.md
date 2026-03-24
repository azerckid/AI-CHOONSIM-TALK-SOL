# NEAR 지갑 E2E 테스트 가이드
> Created: 2026-02-08
> Last Updated: 2026-02-08

지갑 생성 → NEAR 입금 → CHOCO 전환 → CHOCO 소비(대화/하트 구매) 전체 플로우를 테스트하는 방법.

---

## 빠른 시작

**통합 테스트 스크립트로 한 번에 검증:**

```bash
# 1. 유저 ID 확인 (DB에 실제로 존재하는 유저 ID 필요)
npx drizzle-kit studio
# → User 테이블에서 id 컬럼 확인 (예: user_abc123def456)

# 2. 통합 테스트 실행
npx tsx scripts/test-wallet-e2e-flow.ts <userId>
# 예시: npx tsx scripts/test-wallet-e2e-flow.ts user_abc123def456
```

**⚠️ 중요**: `<userId>`는 **DB에 실제로 존재하는 유저 ID**여야 합니다. 임의로 만든 ID는 사용할 수 없습니다.

스크립트가 자동으로 다음을 검증합니다:
- ✅ 지갑 생성 여부 (없으면 생성)
- ✅ 온체인 NEAR/CHOCO 잔액
- ✅ deposit-engine 실행 및 CHOCO 전환
- ✅ CHOCO 소비 이력 (대화, 아이템 구매)

**상세 내용은 아래 섹션 참고.**

---

## 1. 테스트 방법 개요

| 방법 | 용도 | 장점 | 단점 |
|------|------|------|------|
| **통합 테스트 스크립트** | **기본 검증, CI/CD, 정기 검증** | 자동화, 재현 가능, 빠름 | 온체인 네트워크 의존 |
| **수동 테스트 시나리오** | 개발/QA 단계 상세 체크리스트 | 실제 UX 확인, 엣지 케이스 검증 | 반복 작업, 사람 실수 가능 |
| **E2E 테스트 (Playwright)** | UI 플로우 검증 | 브라우저 환경 시뮬레이션 | 설정 복잡, 느림 |

**권장**: **통합 테스트 스크립트**를 먼저 실행하여 기본 상태를 확인한 후, 필요 시 **수동 테스트 시나리오**로 상세 검증.

**빠른 시작**: `npx tsx scripts/test-wallet-e2e-flow.ts <userId>` 실행으로 전체 플로우를 한 번에 검증 가능.

---

## 2. 수동 테스트 시나리오

> **참고**: 먼저 **통합 테스트 스크립트**(섹션 3)를 실행하여 기본 상태를 확인한 후, 문제가 있거나 상세 검증이 필요할 때 이 섹션의 수동 시나리오를 사용하세요.

### 2.1 준비

- 테스트넷 NEAR 계정 (NEAR faucet에서 받기: https://testnet.mynearwallet.com/)
- 테스트용 유저 계정 (회원가입 또는 기존 계정)
- 브라우저 개발자 도구 (네트워크 탭, 콘솔)
- 통합 테스트 스크립트 실행 결과 (참고용)

### 2.2 시나리오 1: 신규 유저 지갑 생성

| 단계 | 동작 | 확인 사항 |
|------|------|-----------|
| 1 | 회원가입 또는 로그인 | 유저 계정 생성/로그인 성공 |
| 2 | `/home` 접속 | `nearAccountId` 없으면 `/wallet-setup` 리다이렉트 |
| 3 | 지갑 생성 대기 화면 | 스피너, 진행 문구 로테이션, 10~20초 대기 |
| 4 | 홈 화면 이동 | `nearAccountId` 존재, `chocoBalance` 확인 (100 CHOCO 예상) |
| 5 | Drizzle Studio 또는 DB 조회 | `User` 테이블: `nearAccountId`, `nearPublicKey`, `nearPrivateKey`, `chocoBalance` 확인 |
| 6 | NEAR Explorer에서 계정 확인 | `https://explorer.testnet.near.org/accounts/{nearAccountId}` - 계정 존재, 잔액 0.1 NEAR |

**검증 포인트**
- 지갑 ID 형식: `{nanoid}.{serviceAccountId}` (예: `abc123.rogulus.testnet`)
- 키 정보가 DB에 암호화되어 저장됨
- 온체인 계정이 실제로 생성됨
- CHOCO 잔액이 DB에 반영됨

---

### 2.3 시나리오 2: NEAR 입금 → CHOCO 전환

| 단계 | 동작 | 확인 사항 |
|------|------|-----------|
| 1 | 테스트넷 지갑에서 유저 `nearAccountId`로 NEAR 전송 | 예: 0.1 NEAR 전송 (테스트넷 faucet 또는 다른 계정에서) |
| 2 | NEAR Explorer에서 입금 확인 | 트랜잭션 해시, 잔액 증가 확인 |
| 3 | deposit-engine 실행 (또는 Cron 대기) | `scripts/run-monitoring.ts` 또는 Cron 작업 실행 |
| 4 | DB `chocoBalance` 확인 | 입금량 × 환율(예: 5000) = CHOCO 증가량 확인 |
| 5 | `ExchangeLog` 테이블 확인 | `fromChain: "NEAR"`, `toToken: "CHOCO"`, `status: "PENDING_SWEEP"` 또는 `"COMPLETED"` |
| 6 | NEAR 스윕 확인 | 유저 지갑의 NEAR가 트레저리로 이동했는지 확인 (NEAR Explorer) |
| 7 | CHOCO 온체인 잔액 확인 | `getChocoBalance(nearAccountId)` 또는 NEAR Explorer에서 토큰 잔액 확인 |

**검증 포인트**
- 입금 감지: `nearLastBalance` 업데이트
- 환율 적용: CoinGecko API 또는 고정 비율
- CHOCO 전송: 서비스 계정 → 유저 지갑 `ft_transfer` 트랜잭션
- 스윕: 유저 지갑 → 트레저리 NEAR 전송 (0.02 NEAR 이상만)

---

### 2.4 시나리오 3: CHOCO 소비 (대화)

| 단계 | 동작 | 확인 사항 |
|------|------|-----------|
| 1 | 채팅 화면 접속 | `/chat/{conversationId}` 또는 새 대화 시작 |
| 2 | 메시지 전송 | 최소 필요 CHOCO 10 이상인지 확인 (부족 시 402 응답) |
| 3 | AI 응답 스트리밍 | 응답 수신 확인 |
| 4 | 스트리밍 완료 후 DB 확인 | `chocoBalance` 감소 확인 (1,000 토큰 ≈ 10 CHOCO) |
| 5 | `TokenTransfer` 테이블 확인 | `purpose: "CHAT_USAGE"`, `status: "COMPLETED"`, 유저 → 서비스 계정 |
| 6 | 온체인 트랜잭션 확인 | NEAR Explorer에서 `ft_transfer` (유저 → 서비스 계정) 확인 |

**검증 포인트**
- CHOCO 부족 시 402 + X402 인보이스 생성
- 스트리밍 완료 후에만 차감 (중간 취소 시 차감 없음)
- 온체인 반환: 유저 지갑에서 서비스 계정으로 CHOCO 전송
- DB와 온체인 잔액 동기화

---

### 2.5 시나리오 4: CHOCO로 하트 구매

| 단계 | 동작 | 확인 사항 |
|------|------|-----------|
| 1 | 아이템 목록 확인 | `/items` 또는 관련 API에서 하트 아이템 확인 |
| 2 | 하트 구매 API 호출 | `POST /api/items/purchase` (itemId: 하트, quantity: 1) |
| 3 | DB `chocoBalance` 확인 | 구매 비용만큼 감소 확인 |
| 4 | DB `heartsCount` 확인 | 유저의 하트 개수 증가 확인 |
| 5 | `TokenTransfer` 테이블 확인 | `purpose: "ITEM_PURCHASE"`, 유저 → 서비스 계정 |
| 6 | 온체인 트랜잭션 확인 | NEAR Explorer에서 `ft_transfer` 확인 |

**검증 포인트**
- CHOCO 부족 시 에러 응답
- 하트 아이템 가격 확인 (예: 10 CHOCO = 1 하트)
- 구매 후 하트 사용 가능 (선물 등)

---

## 3. 통합 테스트 스크립트

### 3.1 스크립트 개요

**파일**: `scripts/test-wallet-e2e-flow.ts`

이 스크립트는 NEAR 지갑의 전체 플로우를 자동으로 검증합니다:
1. 지갑 생성 확인 (없으면 생성)
2. 온체인 NEAR 잔액 확인
3. 온체인 CHOCO 잔액 확인 (DB와 비교)
4. deposit-engine 실행 및 CHOCO 전환 확인
5. CHOCO 소비 이력 확인 (대화, 아이템 구매 등)

### 3.2 실행 방법

```bash
# 기본 실행
npx tsx scripts/test-wallet-e2e-flow.ts <userId>

# 예시
npx tsx scripts/test-wallet-e2e-flow.ts user_abc123def456
```

**⚠️ 중요: `<userId>`는 DB에 실제로 존재하는 유저 ID여야 합니다.**

**유저 ID 확인 방법**

| 방법 | 설명 |
|------|------|
| **Drizzle Studio** | `npx drizzle-kit studio` 실행 → User 테이블 열기 → `id` 컬럼 확인 |
| **SQL 직접 조회** | `SELECT id, email, name FROM User LIMIT 10;` 실행 |
| **테스트용 유저 생성** | 실제 회원가입을 통해 새 유저 생성 후 해당 유저의 `id` 사용 |

**유저 ID 형식 예시**
- `user_abc123def456` (nanoid 형식)
- `clx1234567890abcdef` (다른 형식일 수도 있음)

**주의**: 임의로 만든 ID(예: `test-user-123`)를 사용하면 "유저를 찾을 수 없습니다" 에러가 발생합니다. 반드시 DB에 존재하는 실제 유저 ID를 사용하세요.

### 3.3 실행 결과 해석

스크립트는 각 단계별로 성공/실패를 표시하고, 마지막에 요약을 출력합니다.

**성공 예시**
```
✅ [1. 유저 조회] 유저 발견: test@example.com
✅ [2. 지갑 생성] 기존 지갑: abc123.rogulus.testnet
✅ [3. NEAR 잔액] 0.1 NEAR
✅ [4. CHOCO 잔액] 온체인: 100 CHOCO, DB: 100 CHOCO
✅ [5. deposit-engine] 실행 완료. CHOCO 변화: 0 CHOCO
✅ [6. CHOCO 소비 이력] 5건의 이력 확인됨

성공: 6건, 실패: 0건
✅ 모든 테스트가 성공했습니다!
```

**실패 시 확인 사항**
- `❌ [2. 지갑 생성]`: 네트워크 문제 또는 서비스 계정 키 확인
- `❌ [3. NEAR 잔액]`: 온체인 계정이 실제로 생성되었는지 NEAR Explorer에서 확인
- `❌ [4. CHOCO 잔액]`: 가입 축하금 전송 여부 확인, Storage deposit 완료 여부 확인
- `⚠️  NEAR 잔액이 0.01 미만`: 입금 테스트를 위해 테스트넷 faucet에서 NEAR 입금 필요

### 3.4 단계별 테스트 가이드

**Step 1: 기본 지갑 상태 확인**
```bash
npx tsx scripts/test-wallet-e2e-flow.ts <userId>
```
→ 지갑 생성 여부, NEAR/CHOCO 잔액 확인

**Step 2: NEAR 입금 후 CHOCO 전환 확인**
1. 테스트넷 faucet (https://testnet.mynearwallet.com/)에서 유저 `nearAccountId`로 NEAR 전송 (최소 0.01 NEAR)
2. 스크립트 재실행:
```bash
npx tsx scripts/test-wallet-e2e-flow.ts <userId>
```
→ deposit-engine이 입금을 감지하고 CHOCO로 전환했는지 확인

**Step 3: CHOCO 소비 확인**
1. 실제 대화 또는 아이템 구매를 통해 CHOCO 소비
2. 스크립트 재실행:
```bash
npx tsx scripts/test-wallet-e2e-flow.ts <userId>
```
→ TokenTransfer 이력에서 소비 내역 확인

### 3.5 출력 예시 상세

**환전 이력 확인**
```
  → 최근 환전 이력:
     1. 0.1 NEAR → 500 CHOCO (비율: 5000, 상태: COMPLETED)
     2. 0.05 NEAR → 250 CHOCO (비율: 5000, 상태: PENDING_SWEEP)
```

**CHOCO 소비 이력 확인**
```
  → 최근 TokenTransfer 이력:
     1. [CHAT_USAGE] 10 CHOCO (COMPLETED) - 2026-02-05 오후 7:30:00
     2. [ITEM_PURCHASE] 50 CHOCO (COMPLETED) - 2026-02-05 오후 7:25:00
     3. [SIGNUP_REWARD] 100 CHOCO (COMPLETED) - 2026-02-05 오후 7:20:00

  → 목적별 통계:
     CHAT_USAGE: 3건
     ITEM_PURCHASE: 1건
     SIGNUP_REWARD: 1건
```

### 3.6 주의사항

- **네트워크 의존성**: 테스트넷 네트워크 상태에 따라 온체인 조회가 실패할 수 있음.
- **비용**: 실제 테스트넷 NEAR를 사용하므로, faucet에서 받은 NEAR를 소비함.
- **동시 실행**: 같은 유저에 대해 여러 스크립트를 동시에 실행하지 말 것 (DB 충돌 가능).
- **환전 지연**: NEAR 입금 후 deposit-engine이 실행되기 전까지는 CHOCO 전환이 안 될 수 있음 (Cron 주기 확인).

---

## 4. E2E 테스트 (Playwright, 선택적)

### 4.1 설정

```typescript
// tests/e2e/wallet-flow.spec.ts

import { test, expect } from '@playwright/test';

test.describe('NEAR 지갑 E2E 플로우', () => {
    test('지갑 생성 → NEAR 입금 → CHOCO 전환 → 대화 → 하트 구매', async ({ page }) => {
        // 1. 회원가입/로그인
        await page.goto('/signup');
        // ... 회원가입 ...

        // 2. 지갑 생성 대기
        await page.goto('/home');
        await expect(page).toHaveURL('/wallet-setup');
        await page.waitForSelector('text=Setting up Wallet');
        // 대기 화면 확인...

        // 3. 홈 화면 확인
        await expect(page).toHaveURL('/home');
        // 지갑 주소 표시 확인...

        // 4. 채팅 테스트 (CHOCO 소비)
        await page.goto('/chat/chunsim');
        await page.fill('[data-testid="message-input"]', '안녕');
        await page.click('[data-testid="send-button"]');
        // 응답 대기...

        // 5. 하트 구매 테스트
        await page.goto('/items');
        await page.click('[data-testid="heart-item"]');
        await page.click('[data-testid="purchase-button"]');
        // 구매 확인...
    });
});
```

**장점**: 브라우저 환경에서 실제 UX 검증 가능.  
**단점**: 설정 복잡, 네트워크 의존성, 느림.

---

## 5. 테스트 체크리스트

> **권장**: 통합 테스트 스크립트(`npx tsx scripts/test-wallet-e2e-flow.ts <userId>`)를 실행하면 아래 항목 대부분을 자동으로 검증합니다. 수동으로 확인이 필요한 항목만 체크하세요.

### 5.1 지갑 생성

- [ ] DB에 `nearAccountId`, `nearPublicKey`, `nearPrivateKey` 저장됨
- [ ] 온체인 계정이 실제로 생성됨 (NEAR Explorer 확인)
- [ ] 초기 NEAR 잔액 0.1 NEAR
- [ ] 가입 축하 CHOCO 100 전송됨 (온체인 확인)
- [ ] DB `chocoBalance` = "100"

### 5.2 NEAR 입금 → CHOCO 전환

- [ ] 입금 감지 (`nearLastBalance` 업데이트)
- [ ] 환율 적용 (CoinGecko 또는 고정 비율)
- [ ] CHOCO 전송 (서비스 계정 → 유저)
- [ ] `ExchangeLog` 기록
- [ ] NEAR 스윕 (트레저리로 이동)
- [ ] DB `chocoBalance` 증가

### 5.3 CHOCO 소비 (대화)

- [ ] CHOCO 부족 시 402 응답
- [ ] 대화 성공 시 CHOCO 차감
- [ ] 온체인 반환 (유저 → 서비스 계정)
- [ ] `TokenTransfer` 기록 (`purpose: "CHAT_USAGE"`)
- [ ] DB와 온체인 잔액 동기화

### 5.4 CHOCO로 하트 구매

- [ ] CHOCO 부족 시 에러
- [ ] 구매 성공 시 CHOCO 차감
- [ ] `heartsCount` 증가
- [ ] `TokenTransfer` 기록 (`purpose: "ITEM_PURCHASE"`)
- [ ] 온체인 전송 확인

---

## 6. 디버깅 팁

### 6.1 온체인 상태 확인

```bash
# NEAR Explorer
https://explorer.testnet.near.org/accounts/{nearAccountId}

# RPC 직접 조회
npx tsx scripts/check-onchain-state.ts
```

### 6.2 DB 상태 확인

```bash
# Drizzle Studio
npx drizzle-kit studio

# 또는 직접 쿼리
SELECT id, email, nearAccountId, chocoBalance, walletStatus 
FROM User 
WHERE id = '{userId}';
```

### 6.3 로그 확인

```bash
# 서버 로그에서 확인
# [Wallet], [PAYMENT], [SYSTEM] 카테고리 로그 검색
```

---

## 7. 자주 발생하는 문제

| 문제 | 원인 | 해결 |
|------|------|------|
| 지갑 생성 타임아웃 | 네트워크 지연, RPC 문제 | 재시도, 다른 RPC 노드 사용 |
| CHOCO 전송 실패 | Storage deposit 미완료 | `ensureStorageDeposit` 재실행 |
| 입금 미감지 | `nearLastBalance` 동기화 문제 | deposit-engine 수동 실행 |
| 스윕 실패 | 가스 부족, 키 불일치 | `NEAR_TREASURY_ACCOUNT_ID` 확인, 키 복구 |

---

## 8. 참조

- **통합 테스트 스크립트**: `scripts/test-wallet-e2e-flow.ts` (이 문서의 섹션 3 참고)
- 지갑 생성: `app/lib/near/wallet.server.ts`
- 입금 모니터링: `app/lib/near/deposit-engine.server.ts`
- CHOCO 전송: `app/lib/near/token.server.ts`
- 대화 API: `app/routes/api/chat/index.ts`
- 아이템 구매: `app/routes/api/items/purchase.ts`
- 관련 문서: `../01_Foundation/14_NEAR_DEPOSIT_ENGINE_FOLLOW_UP.md`

---

**작성일**: 2026-02-05  
**최종 수정일시**: 2026-02-05 19:30 KST


## Related Documents
- **Test**: [Document Management Plan](../01_Concept_Design/09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
