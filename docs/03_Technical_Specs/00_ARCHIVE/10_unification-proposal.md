# 빌링 시스템 통합 제안서
> Created: 2026-02-08
> Last Updated: 2026-02-08

**작성일**: 2026-01-11  
**최종 업데이트**: 2026-01-11  
**상태**: ✅ 구현 완료 (Phase 1-7)  
**목적**: Credits와 CHOCO 통합 방안 제시 및 마이그레이션 전략 수립

---

## 1. 시스템 분석

### 1.1 통합된 자산 구조 (2026-01-11 업데이트)

#### CHOCO (블록체인 토큰) - 주요 자산 ✅
- **사용처**:
  - 채팅 메시지 전송 시 차감 (`app/routes/api/chat/index.ts`)
  - 아이템 구매 시 차감 (`app/routes/api/items/purchase.ts`)
  - 미션 보상 지급 (`app/routes/missions.tsx`)
  - 멤버십 월간 CHOCO 지급 (`subscription-plans.ts`)
  - X402 결제 시 CHOCO 차감 (`x402.server.ts`)
- **충전 방법**:
  - 토스 결제 → CHOCO 전송 (`toss.server.ts`)
  - 페이팔 결제 → CHOCO 전송 (`api.payment.capture-order.ts`)
  - NEAR 입금 → CHOCO 환전 (`deposit-engine.server.ts`)
  - 기존 Credits → CHOCO 자동 변환 (지갑 생성 시)
- **DB 필드**: `user.chocoBalance` (text, BigNumber string)
- **온체인**: NEAR 블록체인에 실제 토큰으로 존재
- **환율**: 실시간 환율 적용 (CoinGecko, ExchangeRate-API)

#### Credits (Deprecated) ⚠️
- **상태**: 더 이상 사용되지 않음 (호환성을 위해 DB 필드 유지)
- **마이그레이션**: 지갑 생성 시 자동으로 CHOCO로 변환
- **DB 필드**: `user.credits` (integer, deprecated)
- **참고**: 일부 코드에서 호환성을 위해 참조되지만 실제 사용은 하지 않음

### 1.2 해결된 문제점 ✅

1. ✅ **단일 자산 시스템**: CHOCO만 사용하여 사용자 혼란 제거
2. ✅ **일관된 환율**: 실시간 환율 시스템 구축 (CoinGecko, ExchangeRate-API)
3. ✅ **결제 수단 통합**: 모든 결제 수단(토스, 페이팔, NEAR)이 CHOCO로 통합
4. ✅ **아이템 가격**: `priceChoco` 필드로 명확하게 표시
5. ✅ **멤버십**: CHOCO 기반으로 지급

---

## 2. 통합 방안 제안

### 방안 A: CHOCO 완전 통합 (권장) ⭐

#### 개념
- **Credits를 완전히 제거하고 CHOCO만 사용**
- 모든 결제 수단(토스, 페이팔, NEAR) → CHOCO로 변환
- 채팅, 아이템 구매, 멤버십 모두 CHOCO로 처리

#### 장점
1. **단일 자산 시스템**: 사용자 혼란 최소화
2. **블록체인 기반**: 투명성 및 검증 가능성
3. **확장성**: 향후 멀티체인 지원 용이
4. **일관성**: 모든 결제가 동일한 자산으로 처리

#### 단점
1. **마이그레이션 복잡도**: 기존 Credits 보유자 처리 필요
2. **온체인 트랜잭션**: 모든 충전/사용이 온체인 기록 필요 (가스비 대납으로 해결 가능)
3. **개발 리소스**: 전체 시스템 수정 필요

#### 구현 전략
1. **환율 설정**:
   - 1 USD = X CHOCO (예: 1 USD = 10,000 CHOCO)
   - 1 KRW = Y CHOCO (예: 1 KRW = 7.5 CHOCO, USD 환율 기준)
   - CoinGecko API로 실시간 환율 적용

2. **결제 플로우 변경**:
   ```
   토스/페이팔 결제 → USD/KRW → CHOCO 계산 → 온체인 발행 → DB 업데이트
   ```

3. **사용 플로우**:
   ```
   채팅/아이템 사용 → CHOCO 차감 (온체인 + DB)
   ```

4. **마이그레이션**:
   - 기존 Credits → CHOCO 변환 (1:1 또는 환율 적용)
   - `user.credits` 필드 제거 또는 deprecated 처리

---

### 방안 B: Credits를 CHOCO의 내부 단위로 유지

#### 개념
- **Credits는 UI 표시용 내부 단위로만 사용**
- 실제 자산은 CHOCO만 관리
- Credits = CHOCO (1:1 또는 고정 환율)

#### 장점
1. **점진적 마이그레이션**: 기존 코드 수정 최소화
2. **사용자 친화적**: Credits라는 친숙한 단위 유지 가능
3. **유연성**: 향후 환율 조정 가능

#### 단점
1. **이중 관리**: Credits와 CHOCO 동기화 필요
2. **복잡도**: 두 필드 모두 관리해야 함
3. **불일치 위험**: 동기화 실패 시 데이터 불일치 가능

#### 구현 전략
1. **동기화 로직**:
   ```typescript
   // 모든 Credits 변경 시 CHOCO도 함께 변경
   credits += 100 → chocoBalance += 100 (1:1)
   ```

2. **표시 우선순위**:
   - UI: Credits 표시 (사용자 친화적)
   - 실제 자산: CHOCO (온체인 기준)

---

### 방안 C: 하이브리드 방식 (단기 전환)

#### 개념
- **단기**: Credits와 CHOCO 병행 사용
- **장기**: 점진적으로 CHOCO로 통합

#### 장점
1. **점진적 전환**: 리스크 최소화
2. **기존 사용자 보호**: Credits 보유자 영향 최소화

#### 단점
1. **복잡도 증가**: 두 시스템 병행 관리
2. **전환 기간 불명확**: 언제 완전 전환할지 불명확

---

## 3. 권장 방안: CHOCO 완전 통합 (방안 A)

### 3.1 선택 이유

1. **Zero-Friction UX 철학과 일치**: 
   - 이미 NEAR 시스템에서 "Invisible Wallet" 구현 완료
   - 사용자는 CHOCO를 직접 다룰 필요 없음 (내부적으로만 처리)

2. **확장성**:
   - 향후 멀티체인 지원 시 CHOCO가 표준 자산
   - 크로스체인 브릿지 구현 용이

3. **투명성**:
   - 모든 거래가 온체인에 기록되어 검증 가능
   - 사용자 신뢰도 향상

4. **단순성**:
   - 단일 자산 시스템으로 운영 복잡도 감소
   - 버그 및 데이터 불일치 위험 최소화

### 3.2 구현 로드맵

#### Phase 1: 환율 시스템 구축 ✅ 완료
- [x] CoinGecko API 통합 (`exchange-rate.server.ts` 확장)
- [x] USD/KRW → CHOCO 환율 계산 함수 구현
- [x] 환율 캐싱 및 업데이트 로직 구현
- **구현 파일**: `app/lib/near/exchange-rate.server.ts`

#### Phase 2: 결제 수단별 CHOCO 발행 ✅ 완료
- [x] 토스 결제 → CHOCO 발행 로직 구현
- [x] 페이팔 결제 → CHOCO 발행 로직 구현
- [x] NEAR 입금 → CHOCO 발행 로직 유지 (이미 구현됨)
- [x] 결제 완료 시 온체인 CHOCO 발행 (서비스 계정에서 발행)
- **구현 파일**: 
  - `app/lib/toss.server.ts`
  - `app/routes/api.payment.capture-order.ts`
  - `app/routes/api.webhooks.paypal.ts`
  - `app/routes/api.payment.activate-subscription.ts`

#### Phase 3: 사용 로직 변경 ✅ 완료
- [x] 채팅 비용 차감: Credits → CHOCO
- [x] 아이템 구매: `priceCredits` → `priceChoco`
- [x] 멤버십 지급: Credits → CHOCO (구독 활성화 시 CHOCO 전송)
- [x] 미션 보상: Credits → CHOCO
- **구현 파일**:
  - `app/routes/api/chat/index.ts`
  - `app/routes/api/items/purchase.ts`
  - `app/routes/missions.tsx`
  - `app/lib/items.ts`

#### Phase 4: UI 업데이트 ✅ 완료
- [x] 모든 UI에서 Credits 표시 → CHOCO 표시
- [x] 가격 표시: KRW/USD → CHOCO 변환 표시
- [x] 잔액 표시: CHOCO 우선 표시
- **구현 파일**:
  - `app/routes/chat/$id.tsx`
  - `app/components/chat/ChatHeader.tsx`
  - `app/components/chat/MessageInput.tsx`
  - `app/routes/profile/subscription.tsx`
  - `app/routes/admin/users/index.tsx`
  - `app/routes/admin/users/detail.tsx`
  - `app/routes/admin/items/index.tsx`
  - `app/routes/admin/items/edit.tsx`

#### Phase 5: NEAR 입금 로직 정리 ✅ 완료
- [x] NEAR 입금 시 Credits 증가 로직 제거
- [x] CHOCO만 업데이트하도록 변경
- **구현 파일**:
  - `app/lib/near/deposit-engine.server.ts`
  - `app/routes/api/webhooks/near/token-deposit.ts`

#### Phase 6: UI 업데이트 (Credits → CHOCO 표시) ✅ 완료
- [x] 채팅 화면: Credits 표시 제거, CHOCO만 표시
- [x] 관리자 페이지: Credits 컬럼을 CHOCO Balance로 변경
- [x] 프로필 페이지: Credits 표시 제거

#### Phase 7: 마이그레이션 (자동 변환) ✅ 완료
- [x] 지갑 생성 시 Credits → CHOCO 자동 변환 구현
- [x] 로그인 시 자동으로 기존 Credits를 CHOCO로 변환
- [x] 온체인 CHOCO 전송 및 DB 업데이트
- [x] TokenTransfer 기록 생성
- **구현 파일**: `app/lib/near/wallet.server.ts`

#### Phase 8: 문서 업데이트 및 최종 검증 🔄 진행 중
- [x] 구현 상태 문서화
- [ ] 남은 Credits 참조 정리 계획 수립
- [ ] 최종 검증 및 테스트

**총 예상 기간**: 8주

---

## 4. 기술적 세부 사항

### 4.1 환율 계산

```typescript
// app/lib/near/exchange-rate.server.ts 확장
export async function calculateChocoFromUSD(usdAmount: number): Promise<string> {
    const nearPriceUSD = await getNearPriceUSD(); // CoinGecko에서 가져옴
    const chocoPerUSD = 10000; // 1 USD = 10,000 CHOCO (예시)
    return (usdAmount * chocoPerUSD).toString();
}

export async function calculateChocoFromKRW(krwAmount: number): Promise<string> {
    const usdAmount = krwAmount / 1350; // 1 USD = 1,350 KRW (예시)
    return await calculateChocoFromUSD(usdAmount);
}
```

### 4.2 결제 플로우 변경

#### 토스/페이팔 결제 시:
```typescript
// 1. 결제 완료 확인
// 2. KRW/USD → CHOCO 계산
const chocoAmount = await calculateChocoFromKRW(paymentAmount);
// 3. 온체인 CHOCO 발행 (서비스 계정에서 사용자 계정으로 전송)
await sendChocoToken(user.nearAccountId, chocoAmount);
// 4. DB 업데이트
await db.update(schema.user)
    .set({ chocoBalance: sql`${schema.user.chocoBalance} + ${chocoAmount}` })
    .where(eq(schema.user.id, userId));
```

### 4.3 사용 플로우 변경

#### 채팅 비용 차감:
```typescript
// 기존: credits 차감
// 변경: chocoBalance 차감
const chocoCost = calculateChocoFromCredits(creditCost); // 1 Credit = 1 CHOCO (초기)
await db.update(schema.user)
    .set({ chocoBalance: sql`${schema.user.chocoBalance} - ${chocoCost}` })
    .where(eq(schema.user.id, userId));
```

### 4.4 아이템 가격 변경

```typescript
// app/lib/items.ts
export const ITEMS = {
    HEART: {
        id: "heart",
        name: "하트",
        priceChoco: 1500, // 기존 priceCredits → priceChoco
        // 또는 priceUSD, priceKRW 유지하고 런타임에 CHOCO 계산
    },
};
```

---

## 5. 마이그레이션 계획

### 5.1 자동 마이그레이션 구현 ✅ 완료

**구현 방식**: 지갑 생성 시 자동 변환 (로그인 시 트리거)

**구현 위치**: `app/lib/near/wallet.server.ts` - `ensureNearWallet()` 함수

**동작 방식**:
1. 사용자 로그인 시 `ensureNearWallet()` 호출
2. 지갑이 없으면 자동 생성
3. 지갑 생성 성공 후 Credits 확인
4. Credits > 0이면:
   - 1:1 환율로 CHOCO 변환
   - 온체인 CHOCO 전송 (`sendChocoToken`)
   - DB 업데이트 (`chocoBalance` 증가, `credits` = 0)
   - `TokenTransfer` 기록 생성 (purpose: "MIGRATION")

**장점**:
- 사용자 경험: 로그인 시 자동 처리, 별도 작업 불필요
- 안전성: 온체인 전송 실패해도 DB는 업데이트 (나중에 복구 가능)
- 추적 가능: 모든 변환 기록이 `TokenTransfer` 테이블에 저장

### 5.2 수동 마이그레이션 스크립트 (참고용)

기존 사용자 중 지갑이 이미 생성되어 Credits가 남아있는 경우를 위한 수동 스크립트:

```typescript
// scripts/migrate-remaining-credits.ts
async function migrateRemainingCredits() {
    const users = await db.query.user.findMany({
        where: and(
            gt(schema.user.credits, 0),
            isNotNull(schema.user.nearAccountId) // 지갑이 있는 사용자만
        ),
    });

    for (const user of users) {
        const { BigNumber } = await import("bignumber.js");
        const { sendChocoToken } = await import("./app/lib/near/token.server");
        
        const creditsToConvert = user.credits;
        const chocoAmount = new BigNumber(creditsToConvert);
        const chocoAmountRaw = chocoAmount.multipliedBy(new BigNumber(10).pow(18)).toFixed(0);

        try {
            // 온체인 전송
            const sendResult = await sendChocoToken(user.nearAccountId!, chocoAmountRaw);
            const chocoTxHash = (sendResult as any).transaction.hash;

            // DB 업데이트
            const currentChocoBalance = new BigNumber(user.chocoBalance || "0");
            const newChocoBalance = currentChocoBalance.plus(chocoAmount);

            await db.update(schema.user)
                .set({
                    chocoBalance: newChocoBalance.toString(),
                    credits: 0,
                    updatedAt: new Date(),
                })
                .where(eq(schema.user.id, user.id));

            console.log(`✅ Migrated ${creditsToConvert} Credits → ${chocoAmount.toString()} CHOCO for user ${user.id}`);
        } catch (error) {
            console.error(`❌ Failed to migrate Credits for user ${user.id}:`, error);
        }
    }
}
```

### 5.3 롤백 계획

1. **백업**: 마이그레이션 전 전체 DB 백업 (권장)
2. **검증**: 마이그레이션 후 잔액 합계 검증
3. **롤백**: 문제 발생 시 백업 복원
4. **모니터링**: `TokenTransfer` 테이블에서 마이그레이션 기록 확인

---

## 6. 리스크 및 대응 방안

### 6.1 리스크

1. **환율 변동**: USD/KRW 환율 변동 시 CHOCO 가치 변동
   - **대응**: 고정 환율 사용 또는 정기 업데이트

2. **온체인 트랜잭션 실패**: CHOCO 발행 실패 시
   - **대응**: 재시도 로직 및 알림 시스템

3. **기존 사용자 혼란**: Credits → CHOCO 전환 시
   - **대응**: 공지 및 가이드 제공

4. **가스비**: 모든 충전/사용 시 온체인 트랜잭션 필요
   - **대응**: Relayer 시스템 활용 (이미 구현됨)

### 6.2 모니터링

- 환율 모니터링 대시보드 (`/api/admin/monitoring/near` 확장)
- CHOCO 발행/사용 통계
- 결제 실패율 모니터링

---

## 7. 구현 완료 상태

### 7.1 구현 요약

**✅ Phase 1-7 완료**: 빌링 시스템 통합이 성공적으로 완료되었습니다.

**주요 성과**:
1. ✅ 모든 결제 수단(토스, 페이팔, NEAR)이 CHOCO로 통합
2. ✅ 모든 사용 로직(채팅, 아이템, 멤버십, 미션)이 CHOCO 기반으로 변경
3. ✅ UI에서 Credits 표시 완전 제거, CHOCO만 표시
4. ✅ 지갑 생성 시 자동 Credits → CHOCO 변환 구현
5. ✅ 실시간 환율 시스템 구축 (CoinGecko, ExchangeRate-API)

**남은 작업**:
- ⚠️ Credits 필드는 DB 스키마에 유지 (호환성 및 마이그레이션 완료 대기)
- ⚠️ 일부 코드에서 Credits 참조가 남아있음 (deprecated 처리됨)
- ⚠️ 수동 마이그레이션 스크립트 작성 (필요 시)

### 7.2 검증 체크리스트

- [x] 토스 결제 시 CHOCO 전송 및 DB 업데이트 확인
- [x] 페이팔 결제 시 CHOCO 전송 및 DB 업데이트 확인
- [x] NEAR 입금 시 CHOCO 전송 및 DB 업데이트 확인
- [x] 채팅 비용 차감 시 CHOCO 차감 확인
- [x] 아이템 구매 시 CHOCO 차감 확인
- [x] UI에서 CHOCO 표시 확인
- [x] 지갑 생성 시 Credits 자동 변환 확인
- [ ] 프로덕션 환경 테스트 (UAT)
- [ ] 성능 모니터링 및 최적화

### 7.3 다음 단계

1. **프로덕션 배포 전 검증**: 실제 환경에서 테스트
2. **모니터링**: CHOCO 발행/사용 통계 모니터링
3. **사용자 공지**: Credits → CHOCO 전환 안내
4. **정리 작업**: Credits 필드 완전 제거 (선택사항)

---

## 8. 참고 문서

- `docs/specs/NEAR_ZERO_FRICTION_UX_VERIFICATION.md`: NEAR 시스템 검증 보고서
- `docs/specs/NEAR_X402_UI_SPEC.md`: X402 결제 UI 스펙
- `app/lib/credit-policy.ts`: 현재 크레딧 정책
- `app/lib/subscription-plans.ts`: 멤버십 플랜 정의
- `app/lib/items.ts`: 아이템 정의


## Related Documents
- **Specs**: [Document Management Plan](../01_Concept_Design/09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
