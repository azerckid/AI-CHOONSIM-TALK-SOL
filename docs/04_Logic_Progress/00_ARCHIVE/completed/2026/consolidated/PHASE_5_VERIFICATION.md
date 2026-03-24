---
status: archived
archived_reason: "통합됨"
consolidated_into: "docs/reports/PHASE_1_TO_5_COMPLETE_VERIFICATION.md"
archived_date: 2026-01-14
original_location: "docs/reports/verification/PHASE_5_VERIFICATION.md"
tags: [completed, verification, phase, consolidated]
---

# Phase 5 진행 상태 검증 보고서

**⚠️ 이 문서는 통합되었습니다. 최신 정보는 `docs/reports/PHASE_1_TO_5_COMPLETE_VERIFICATION.md`를 참조하세요.**

**검증일**: 2026-01-11
**검증자**: Antigravity AI Assistant

---

## Phase 5: 가스비 대납 (Relayer) 구현 검증 결과

### 완료된 작업 ✅

#### 1. Relayer Server 구축 ✅ 완료

**구현 파일**:
- `app/lib/near/relayer.server.ts`: `submitMetaTransaction` 함수 구현

**구현 내용**:
- ✅ 서비스 계정(Relayer) 설정 및 키 관리
- ✅ SignedDelegate 직렬화/역직렬화 처리
- ✅ Meta Transaction 전송 로직 (`relayerAccount.signedDelegate`)
- ✅ 트랜잭션 해시 추출 및 반환
- ✅ 에러 처리 및 로깅

**핵심 로직**:
```typescript
export async function submitMetaTransaction(signedDelegateSerialized: string) {
    // 1. 서비스 계정(Relayer) 설정
    const keyStore = new keyStores.InMemoryKeyStore();
    const keyPair = KeyPair.fromString(privateKey);
    await keyStore.setKey(networkId, serviceAccountId, keyPair);
    
    // 2. SignedDelegate 복원
    const signedDelegate = transactions.SignedDelegate.decode(
        Buffer.from(signedDelegateSerialized, "base64")
    );
    
    // 3. 트랜잭션 전송 (Relayer가 가스비 지불)
    const result = await relayerAccount.signedDelegate(signedDelegate);
    
    return { success: true, txHash: result.transaction_outcome?.id };
}
```

#### 2. Meta Transaction API 엔드포인트 ✅ 완료

**구현 파일**:
- `app/routes/api/relayer/submit.ts`: Meta Transaction 제출 API

**구현 내용**:
- ✅ POST 엔드포인트 구현
- ✅ Zod 스키마를 통한 입력 검증 (`signedDelegate` 필수)
- ✅ `submitMetaTransaction` 호출 및 결과 반환
- ✅ 에러 처리 및 HTTP 상태 코드 관리

**API 스펙**:
- **엔드포인트**: `POST /api/relayer/submit`
- **요청 본문**: `{ signedDelegate: string }` (base64 인코딩된 SignedDelegate)
- **응답**: `{ success: boolean, txHash?: string, error?: string }`

#### 3. 클라이언트 사이드 Meta Transaction 생성 ✅ 완료

**구현 파일**:
- `app/lib/near/wallet-client.ts`: `createSignedDelegate`, `transferChocoTokenGasless` 함수

**구현 내용**:
- ✅ `createSignedDelegate` 함수 구현
  - DelegateAction 생성 (senderId, receiverId, actions, nonce, maxBlockHeight)
  - 사용자 서명 수행 (`transactions.signDelegateAction`)
  - base64 직렬화 반환
- ✅ `transferChocoTokenGasless` 함수 구현
  - `ft_transfer_call` 액션 생성
  - SignedDelegate 생성 및 Relayer API 호출
  - 트랜잭션 해시 반환

**핵심 로직**:
```typescript
export async function transferChocoTokenGasless(
    accountId: string,
    recipientId: string,
    amount: string,
    tokenContract: string
): Promise<string> {
    // 1. ft_transfer_call 액션 생성
    const action = transactions.functionCall("ft_transfer_call", {...}, gas, deposit);
    
    // 2. SignedDelegate 생성 및 서명
    const signedDelegate = await createSignedDelegate(accountId, tokenContract, [action]);
    
    // 3. Relayer API 호출
    const response = await fetch("/api/relayer/submit", {
        method: "POST",
        body: JSON.stringify({ signedDelegate }),
    });
    
    return result.txHash;
}
```

#### 4. X402 인터셉터 통합 ✅ 완료

**구현 파일**:
- `app/lib/near/use-x402.ts`: 자동 결제 로직에 가스비 대납 적용

**구현 내용**:
- ✅ `transferChocoTokenGasless` 함수 사용
- ✅ 한도 내 자동 결제 시 가스비 0원으로 처리
- ✅ 사용자는 NEAR 코인 없이도 CHOCO 토큰 전송 가능

**통합 위치**:
```typescript
// 자동 결제 실행 (가스비 대납 사용)
const txHash = await transferChocoTokenGasless(
    accountId,
    x402.invoice.recipient,
    x402.invoice.amount,
    x402.invoice.tokenContract
);
```

#### 5. UI 통합 ✅ 완료

**구현 파일**:
- `app/components/payment/PaymentSheet.tsx`: 결제 시트에 가스비 대납 옵션 추가

**구현 내용**:
- ✅ `useRelayer` 상태로 가스비 대납 옵션 제공
- ✅ 기본적으로 Relayer 사용 (`useRelayer: true`)
- ✅ 기존 방식(`transferChocoToken`)과 가스비 대납 방식(`transferChocoTokenGasless`) 분기 처리
- ✅ 사용자가 선택적으로 전환 가능 (향후 UI 추가 가능)

**통합 위치**:
```typescript
if (useRelayer) {
    // Phase 5: 가스비 대납(Relayer) 사용
    txHashResult = await transferChocoTokenGasless(...);
} else {
    // 기존 방식 (사용자가 가스비 부담)
    txHashResult = await transferChocoToken(...);
}
```

---

### 추가 완료 작업 ✅ (2026-01-11 업데이트)

#### 1. Rate Limiting ✅ 완료

**구현 파일**:
- `app/routes/api/relayer/submit.ts`: Rate Limiting 로직 구현

**구현 내용**:
- ✅ 사용자별 시간당 요청 제한 (`RATE_LIMIT_PER_HOUR = 10`)
- ✅ `relayerLog` 테이블을 사용한 최근 1시간 내 성공한 요청 수 확인
- ✅ Rate Limit 초과 시 429 상태 코드 반환
- ✅ 응답에 남은 할당량 정보 포함 (`remainingQuota`)
- ✅ 인증된 사용자만 요청 가능 (세션 검증)

**핵심 로직**:
```typescript
const RATE_LIMIT_PER_HOUR = 10;
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
const recentLogs = await db.query.relayerLog.findMany({
    where: and(
        eq(relayerLog.userId, userId),
        gte(relayerLog.createdAt, oneHourAgo),
        eq(relayerLog.status, "SUCCESS")
    )
});

if (recentLogs.length >= RATE_LIMIT_PER_HOUR) {
    return Response.json({
        error: "Rate limit exceeded. Please try again later.",
        limit: RATE_LIMIT_PER_HOUR,
        current: recentLogs.length
    }, { status: 429 });
}
```

#### 2. 모니터링 ✅ 완료

**구현 파일**:
- `app/lib/near/relayer.server.ts`: `getRelayerBalance`, `logRelayerAction` 함수 구현
- `app/routes/api/relayer/submit.ts`: 잔액 체크 및 로깅 통합

**구현 내용**:
- ✅ 서비스 계정 잔액 조회 (`getRelayerBalance`)
- ✅ 잔액 임계값 체크 (`LOW_BALANCE_THRESHOLD = 0.5 NEAR`)
- ✅ 잔액이 낮을 때 경고 로그 출력 (`console.warn`)
- ✅ 모든 트랜잭션 성공/실패 로깅 (`logRelayerAction`)
- ✅ 사용자 ID, IP 주소, 트랜잭션 해시, 에러 메시지 기록
- ✅ `relayerLog` 테이블에 상세 정보 저장

**데이터베이스 스키마**:
- ✅ `RelayerLog` 테이블 정의 (`app/db/schema.ts`)
- ✅ 인덱스 설정 (`userId`, `createdAt`, `requestIp`, `createdAt`)
- ✅ 관계 설정 (User와의 관계)

**핵심 로직**:
```typescript
// 잔액 모니터링
const balance = await getRelayerBalance();
if (parseFloat(balance.available) < LOW_BALANCE_THRESHOLD) {
    console.warn(`[RELAYER WARNING] Low balance: ${balance.available} NEAR`);
}

// 결과 로깅
await logRelayerAction({
    userId,
    requestIp: clientIp,
    txHash: result.success ? result.txHash : undefined,
    error: result.success ? undefined : result.error,
    status: result.success ? "SUCCESS" : "FAILED",
});
```

---

### 미구현 작업 ❌

#### 1. 보안 강화

**현재 상태**:
- ⚠️ 서비스 계정 키가 환경 변수에 평문 저장 (개발 환경)
- ❌ 멀티시그 지갑 미사용
- ❌ 키 로테이션 전략 없음

**구현 필요 사항**:
- 프로덕션 환경에서 멀티시그 지갑 사용
- 키 관리 시스템(KMS) 통합 (선택사항)
- 정기적인 키 로테이션 계획

---

## 구현 상태 요약

| 작업 항목 | 상태 | 완료도 | 비고 |
|----------|------|--------|------|
| Relayer Server 구축 | ✅ 완료 | 100% | `relayer.server.ts` 구현 완료 |
| Meta Transaction API | ✅ 완료 | 100% | `POST /api/relayer/submit` 구현 완료 |
| 클라이언트 사이드 구현 | ✅ 완료 | 100% | `createSignedDelegate`, `transferChocoTokenGasless` 구현 완료 |
| X402 인터셉터 통합 | ✅ 완료 | 100% | 자동 결제에 가스비 대납 적용 |
| UI 통합 | ✅ 완료 | 100% | `PaymentSheet`에 가스비 대납 옵션 추가 |
| Rate Limiting | ✅ 완료 | 100% | 사용자별 시간당 10회 제한 구현 완료 |
| 모니터링 | ✅ 완료 | 100% | 잔액 체크 및 로깅 구현 완료 |
| 보안 강화 | ⚠️ 부분 완료 | 30% | 멀티시그 지갑 미사용 (프로덕션 준비 필요) |

**전체 완료도**: 약 **95%** (핵심 기능 및 운영 안정성 강화 완료, 프로덕션 보안 강화 필요)

---

## 구현 품질 평가

### 잘 구현된 부분 ✅

1. **Meta Transaction 아키텍처**
   - SignedDelegate 패턴 정확히 구현
   - 사용자 서명과 Relayer 전송 분리
   - 가스비 추상화 완료

2. **에러 처리**
   - 서버/클라이언트 양쪽에서 에러 처리 구현
   - 명확한 에러 메시지 반환
   - 로깅 포함

3. **UI/UX 통합**
   - 기존 결제 플로우와 자연스럽게 통합
   - 사용자 선택권 제공 (향후 UI 확장 가능)
   - 가스비 0원 경험 제공

4. **코드 구조**
   - 서버/클라이언트 로직 명확히 분리
   - 재사용 가능한 함수 구조
   - 타입 안정성 확보

### 개선 필요 사항 ⚠️

1. **보안** (프로덕션 준비)
   - 멀티시그 지갑 도입 (현재 단일 키 사용)
   - Access Key 권한 분리 (FunctionCall Access Key 사용)
   - 키 로테이션 전략 수립

2. **운영 최적화** (선택사항)
   - 가스비 사용량 통계 및 분석
   - 자동 충전 시스템 (잔액 임계값 이하 시)
   - 대시보드 구축 (선택사항)

3. **비용 최적화**
   - 가스비 사용량 분석
   - 불필요한 트랜잭션 최소화
   - 배치 처리 고려 (선택사항)

---

## 개선 권장 사항

### 완료된 개선 사항 ✅

1. **Rate Limiting 구현** ✅ 완료
   - `app/routes/api/relayer/submit.ts`에 Rate Limiting 구현 완료
   - 사용자별 시간당 10회 제한
   - `relayerLog` 테이블 기반 추적
   - 429 상태 코드 및 남은 할당량 정보 반환

2. **모니터링 로깅** ✅ 완료
   - 서비스 계정 잔액 조회 및 체크 구현 완료
   - 잔액 임계값 이하 시 경고 로그 출력
   - 모든 트랜잭션 성공/실패 로깅 구현 완료
   - 사용자 ID, IP 주소, 트랜잭션 해시 기록

### Phase 6 준비 사항

1. **보안 강화**
   - 멀티시그 지갑 도입
   - 키 관리 시스템 검토
   - 보안 감사 준비

2. **비용 최적화**
   - 가스비 사용량 분석
   - 트랜잭션 최적화
   - 배치 처리 전략 수립

---

## 검증 체크리스트

### 기능 검증

- [x] `submitMetaTransaction` 함수가 정상 작동하는가? ✅ (코드 검토 완료)
- [x] `POST /api/relayer/submit` 엔드포인트가 정상 작동하는가? ✅ (코드 검토 완료)
- [x] `createSignedDelegate` 함수가 정상 작동하는가? ✅ (코드 검토 완료)
- [x] `transferChocoTokenGasless` 함수가 정상 작동하는가? ✅ (코드 검토 완료)
- [x] X402 인터셉터에서 가스비 대납이 정상 작동하는가? ✅ (코드 통합 확인)
- [x] `PaymentSheet`에서 가스비 대납 옵션이 정상 작동하는가? ✅ (코드 통합 확인)

### 통합 검증

- [ ] 실제 테스트넷에서 Meta Transaction이 정상 작동하는가? (테스트 필요)
- [ ] 사용자가 NEAR 없이도 CHOCO 토큰 전송이 가능한가? (테스트 필요)
- [ ] Relayer 서비스 계정이 가스비를 정상적으로 지불하는가? (테스트 필요)
- [ ] 트랜잭션 실패 시 에러 처리가 정상 작동하는가? (테스트 필요)

---

## 결론

Phase 5의 핵심 기능인 **가스비 대납 (Relayer) 구현**이 완료되었습니다.

**완료된 핵심 기능**:
- ✅ Relayer Server 구축 (`relayer.server.ts`)
- ✅ Meta Transaction API (`POST /api/relayer/submit`)
- ✅ 클라이언트 사이드 구현 (`createSignedDelegate`, `transferChocoTokenGasless`)
- ✅ X402 인터셉터 통합 (자동 결제에 가스비 대납 적용)
- ✅ UI 통합 (`PaymentSheet`에 가스비 대납 옵션 추가)
- ✅ Rate Limiting 구현 (사용자별 시간당 10회 제한)
- ✅ 모니터링 시스템 구축 (잔액 체크 및 로깅)

**추가 개선 사항** (프로덕션 준비):
- 멀티시그 지갑 도입 (보안 강화)
- Access Key 권한 분리 (FunctionCall Access Key 사용)
- 가스비 사용량 통계 및 자동 충전 (운영 최적화)

**전체 진행률**: 약 **95%** (핵심 기능 및 운영 안정성 강화 완료, 프로덕션 보안 강화 필요)

---

---

## 추가 개선 사항 검증 (2026-01-11 업데이트)

### 완료된 개선 사항 ✅

#### 1. Rate Limiting 구현 ✅ 완료

**구현 위치**: `app/routes/api/relayer/submit.ts`

**구현 내용**:
- ✅ 사용자별 시간당 요청 제한 (`RATE_LIMIT_PER_HOUR = 10`)
- ✅ `relayerLog` 테이블 기반 추적
- ✅ 최근 1시간 내 성공한 요청만 카운트
- ✅ Rate Limit 초과 시 429 상태 코드 반환
- ✅ 응답에 남은 할당량 정보 포함

**보안 효과**:
- 서비스 계정의 가스비 남용 방지
- 사용자별 공정한 리소스 분배
- DDoS 공격 완화

#### 2. 모니터링 시스템 구축 ✅ 완료

**구현 위치**: 
- `app/lib/near/relayer.server.ts`: `getRelayerBalance`, `logRelayerAction` 함수
- `app/routes/api/relayer/submit.ts`: 잔액 체크 및 로깅 통합

**구현 내용**:
- ✅ 서비스 계정 잔액 조회 (`getRelayerBalance`)
- ✅ 잔액 임계값 체크 (`LOW_BALANCE_THRESHOLD = 0.5 NEAR`)
- ✅ 잔액이 낮을 때 경고 로그 출력
- ✅ 모든 트랜잭션 성공/실패 로깅
- ✅ 사용자 ID, IP 주소, 트랜잭션 해시, 에러 메시지 기록
- ✅ `RelayerLog` 테이블에 상세 정보 저장

**운영 효과**:
- 서비스 계정 잔액 모니터링으로 서비스 중단 방지
- 트랜잭션 실패율 추적 가능
- 사용자별 사용 패턴 분석 가능
- 문제 발생 시 빠른 디버깅 가능

### 데이터베이스 스키마 확인 ✅

**구현 위치**: `app/db/schema.ts`

**스키마 내용**:
- ✅ `RelayerLog` 테이블 정의
- ✅ 필드: `id`, `userId`, `requestIp`, `txHash`, `error`, `status`, `createdAt`
- ✅ 인덱스: `userId + createdAt`, `requestIp + createdAt`
- ✅ 관계: User와의 관계 설정

### 개선된 완료도

**전체 완료도**: **95%** (이전 85%에서 향상)

**향상된 항목**:
- Rate Limiting 구현으로 보안 강화
- 모니터링 시스템 구축으로 운영 안정성 향상
- 로깅 시스템으로 디버깅 및 분석 용이

**남은 작업** (프로덕션 준비):
- 멀티시그 지갑 도입 (보안 강화)
- Access Key 권한 분리 (보안 강화)
- 가스비 사용량 통계 및 자동 충전 (운영 최적화)

---

**작성일**: 2026-01-11
**버전**: 1.1 (Rate Limiting 및 모니터링 구현 완료)
