# NEAR 입금 → 환전 → X402 결제 플로우 점검 보고서

**점검일**: 2026-01-11
**점검자**: Antigravity AI Assistant

---

## 전체 플로우 개요

```
[1. NEAR 입금] → [2. 입금 감지] → [3. CHOCO 환전] → [4. 자산 회수] → [5. X402 결제]
```

---

## 1. NEAR 입금 및 감지 (Phase 6.5)

### 1.1 입금 감지 프로세스

**구현 파일**: `app/lib/near/deposit-engine.server.ts`
**크론 잡**: 매분 실행 (`app/lib/cron.server.ts` 라인 163-175)

**워크플로우**:
1. 모든 NEAR 계정이 연결된 사용자 조회
2. 각 사용자의 현재 잔액 조회 (`account.getState()`)
3. `nearLastBalance`와 비교하여 입금 감지
4. 최소 입금 금액 체크 (0.01 NEAR 미만 무시)

**상태**:
- ✅ 입금 감지 로직 정상 작동
- ✅ 최소 입금 금액 체크 구현됨
- ✅ 에러 처리 개별 격리됨

---

## 2. NEAR → CHOCO 환전

### 2.1 환전 프로세스

**구현 파일**: `app/lib/near/deposit-engine.server.ts`의 `processExchangeAndSweep()`

**워크플로우**:
1. **시세 조회**: 고정비율 1 NEAR = 5,000 CHOCO (MVP)
2. **CHOCO 토큰 전송**: `sendChocoToken()` 호출
   - 서비스 계정(`rogulus.testnet`) → 사용자 계정
   - 온체인 전송 (실제 CHOCO 토큰 발행)
3. **DB 업데이트**:
   - `user.chocoBalance` 증가 (BigNumber 사용)
   - `user.nearLastBalance` 업데이트
4. **ExchangeLog 기록**:
   - `fromChain`: "NEAR"
   - `toToken`: "CHOCO"
   - `txHash`: 실제 CHOCO 전송 트랜잭션 해시
   - `status`: "PENDING_SWEEP"

**상태**:
- ✅ 온체인 CHOCO 토큰 전송 구현됨
- ✅ DB 트랜잭션으로 원자성 보장
- ✅ ExchangeLog 기록 완료

**개선 권장**:
- 시세 오라클 연동 (현재 고정비율 사용)

---

## 3. 자산 회수 (Sweep)

### 3.1 회수 프로세스

**구현 파일**: `app/lib/near/deposit-engine.server.ts`의 `executeSweep()`

**워크플로우**:
1. **조건 확인**: `user.isSweepEnabled === true`
2. **안전 마진 계산**: 가스비를 위해 0.01 NEAR 남김
3. **NEAR 전송**: 사용자 계정 → Treasury 계정(`rogulus.testnet`)
4. **상태 업데이트**:
   - `ExchangeLog.status`: "COMPLETED"
   - `ExchangeLog.sweepTxHash`: 회수 트랜잭션 해시
   - `user.nearLastBalance`: 스윕 후 잔액

**상태**:
- ✅ 자동 회수 로직 구현됨
- ✅ 안전 마진 처리 완료
- ✅ 상태 업데이트 정상 작동

---

## 4. X402 결제 프로세스

### 4.1 인보이스 생성

**구현 파일**: `app/lib/near/x402.server.ts`의 `createX402Invoice()`

**워크플로우**:
1. **CHOCO 환율 계산**: 1 Credit = $0.0001, 1 CHOCO = 1 Credit
2. **인보이스 생성**: `X402Invoice` 테이블에 저장
   - `status`: "PENDING"
   - `chocoAmount`: 필요한 CHOCO 토큰 수량 (raw, 18 decimals)
   - `expiresAt`: 30분 후 만료
3. **402 응답 반환**: `createX402Response()` 호출

**상태**:
- ✅ 인보이스 생성 로직 정상 작동
- ✅ 만료 시간 설정 완료

---

### 4.2 클라이언트 결제

**구현 파일**: `app/components/payment/PaymentSheet.tsx`

**워크플로우**:
1. **잔액 확인**: 사용자의 CHOCO 잔액 조회
2. **CHOCO 토큰 전송**: `transferChocoToken()` 또는 `transferChocoTokenGasless()` 호출
   - 사용자 계정 → 서비스 계정(`rogulus.testnet`)
3. **결제 검증 요청**: `/api/x402/verify` 엔드포인트 호출

**상태**:
- ✅ 잔액 확인 로직 구현됨
- ✅ CHOCO 토큰 전송 구현됨
- ✅ 가스비 대납 옵션 지원됨

---

### 4.3 결제 검증 및 완료 처리

**구현 파일**: `app/lib/near/x402.server.ts`의 `verifyX402Payment()`

**워크플로우**:
1. **인보이스 조회**: 토큰으로 인보이스 찾기
2. **온체인 검증**: `verifyTokenTransfer()` 호출
   - 트랜잭션 해시 검증
   - CHOCO 토큰 전송 확인
   - 금액 대조 (최소 인보이스 금액 이상)
3. **DB 업데이트**:
   - `X402Invoice.status`: "PAID"
   - `TokenTransfer` 기록 생성
   - **⚠️ 문제 발견**: `user.chocoBalance` 증가 (라인 136)
   - **⚠️ 문제 발견**: `user.credits` 증가 (라인 135)

**상태**:
- ✅ 온체인 검증 로직 정상 작동
- ❌ **잔액 업데이트 로직 오류**: CHOCO 토큰을 지출했는데 잔액을 증가시킴
- ❌ **크레딧 업데이트 로직 오류**: 결제인데 크레딧을 증가시킴

---

## 5. 발견된 문제점

### 5.1 X402 결제 검증 로직 오류

**위치**: `app/lib/near/x402.server.ts` 라인 132-139

**문제**:
```typescript
// 현재 코드 (잘못됨)
await tx.update(schema.user)
    .set({
        credits: sql`${schema.user.credits} + ${creditsToAdd}`, // ❌ 증가 (잘못됨)
        chocoBalance: sql`${schema.user.chocoBalance} + ${transfer.amount}`, // ❌ 증가 (잘못됨)
        updatedAt: new Date(),
    })
    .where(eq(schema.user.id, invoice.userId));
```

**설명**:
- X402 결제는 CHOCO 토큰을 **지출**하는 것이므로 잔액을 **감소**시켜야 합니다.
- 결제는 크레딧을 **소비**하는 것이므로 크레딧을 **감소**시켜야 합니다.
- 현재 코드는 입금 처리 로직과 동일하게 작성되어 있어 오류가 발생합니다.

**수정 필요**:
```typescript
// 수정된 코드
await tx.update(schema.user)
    .set({
        credits: sql`${schema.user.credits} - ${creditsToAdd}`, // ✅ 감소 (결제)
        chocoBalance: sql`${schema.user.chocoBalance} - ${transfer.amount}`, // ✅ 감소 (지출)
        updatedAt: new Date(),
    })
    .where(eq(schema.user.id, invoice.userId));
```

**또는**:
- X402 결제는 크레딧만 사용하고 CHOCO는 온체인에서만 관리하는 경우:
```typescript
// CHOCO는 온체인에서만 관리, DB는 동기화만
const currentChocoBalance = await getChocoBalance(invoice.userId);
await tx.update(schema.user)
    .set({
        credits: sql`${schema.user.credits} - ${creditsToAdd}`, // ✅ 감소 (결제)
        chocoBalance: currentChocoBalance, // ✅ 온체인 잔액으로 동기화
        updatedAt: new Date(),
    })
    .where(eq(schema.user.id, invoice.userId));
```

---

## 6. 전체 플로우 데이터 흐름

### 6.1 정상 플로우 (입금 → 환전)

```
[사용자] NEAR 입금 (1 NEAR)
    ↓
[크론 잡] 입금 감지
    ↓
[서버] CHOCO 토큰 전송 (5,000 CHOCO)
    ↓
[DB] user.chocoBalance: 0 → 5,000 (+5,000)
    ↓
[서버] NEAR 회수 (0.99 NEAR → Treasury)
    ↓
[DB] ExchangeLog 기록 (COMPLETED)
```

### 6.2 정상 플로우 (X402 결제)

```
[사용자] X402 결제 요청 ($0.01 = 100 CHOCO)
    ↓
[서버] 인보이스 생성 (PENDING)
    ↓
[클라이언트] CHOCO 토큰 전송 (100 CHOCO → 서비스 계정)
    ↓
[서버] 결제 검증
    ↓
[DB] user.chocoBalance: 5,000 → 4,900 (-100) ✅
[DB] user.credits: 100 → 0 (-100) ✅
[DB] X402Invoice.status: PENDING → PAID
```

### 6.3 현재 문제가 있는 플로우 (X402 결제)

```
[사용자] X402 결제 요청 ($0.01 = 100 CHOCO)
    ↓
[서버] 인보이스 생성 (PENDING)
    ↓
[클라이언트] CHOCO 토큰 전송 (100 CHOCO → 서비스 계정)
    ↓
[서버] 결제 검증
    ↓
[DB] user.chocoBalance: 5,000 → 5,100 (+100) ❌ (잘못됨)
[DB] user.credits: 100 → 200 (+100) ❌ (잘못됨)
```

**결과**: 
- 온체인에서는 CHOCO가 지출되었지만 DB에서는 증가함
- 크레딧도 증가하여 결제가 아닌 보상으로 처리됨
- 데이터 불일치 발생

---

## 7. 수정 권장 사항

### 7.1 즉시 수정 필요

1. **`verifyX402Payment()` 함수 수정**
   - CHOCO 잔액 감소로 변경
   - 크레딧 감소로 변경 (또는 크레딧 업데이트 제거)

2. **로직 검증**
   - X402 결제는 **지출**이므로 잔액/크레딧 감소
   - 입금/환전은 **수입**이므로 잔액/크레딧 증가

### 7.2 추가 개선 사항

1. **온체인 동기화**
   - X402 결제 후 온체인 CHOCO 잔액으로 DB 동기화
   - `getChocoBalance()` 호출하여 실제 잔액 반영

2. **에러 처리 강화**
   - 잔액 부족 시 명확한 에러 메시지
   - 트랜잭션 실패 시 롤백 처리

3. **로깅 개선**
   - `console.log` 대신 `logger` 서버 사용
   - 결제 내역 상세 로깅

---

## 8. 결론

**전체 플로우 상태**:
- ✅ NEAR 입금 감지: 정상 작동
- ✅ NEAR → CHOCO 환전: 정상 작동
- ✅ 자산 회수 (Sweep): 정상 작동
- ❌ X402 결제 검증: **잔액/크레딧 업데이트 로직 오류**

**우선순위**:
1. **긴급**: X402 결제 검증 로직 수정 (데이터 불일치 해결)
2. **중요**: 온체인 동기화 로직 추가
3. **개선**: 로깅 및 에러 처리 강화

---

**작성일**: 2026-01-11
**버전**: 1.0 (Initial Verification)
