# 결제 UI 정리 작업 사양서

**작성일**: 2026-01-11  
**목적**: 결제 UI에서 미구현/불필요한 결제 방법(BTC, Solana, NEAR) 제거  
**상태**: ✅ 구현 완료 (2026-01-11)

---

## 1. 배경 및 목적

### 1.1 현재 문제점

결제 UI(`TokenTopUpModal`)에 다음 결제 방법들이 표시되고 있습니다:
- ✅ **Toss (국내 카드)**: 구현됨, 작동 중
- ✅ **PayPal (해외)**: 구현됨, 작동 중
- ❌ **Crypto (BTC)**: UI만 존재, 실제 구현 없음
- ❓ **Solana (SOL)**: 컴포넌트 존재하나 실제 사용 여부 불명확
- ❌ **NEAR**: 별도 입금 플로우 존재, 결제 페이지에 불필요

### 1.2 문제점

1. **사용자 혼란**: 작동하지 않는 결제 옵션 표시로 사용자 경험 저하
2. **기술 부채**: 미구현 기능의 UI 존재로 유지보수 복잡도 증가
3. **정책 불일치**: CHOCO 통일 정책과 맞지 않는 직접 암호화폐 결제 옵션
4. **중복 기능**: NEAR는 입금 감지 시스템으로 이미 작동 중

### 1.3 목표

- 미구현/불필요한 결제 방법 UI 제거
- 실제 작동하는 결제 방법만 표시 (Toss, PayPal)
- 코드베이스 정리 및 유지보수성 향상
- 사용자 경험 개선

---

## 2. 현재 시스템 분석

### 2.1 실제 구현된 결제 방법

#### Toss Payments (KRW)
- **구현 파일**: `app/lib/toss.server.ts`
- **API 엔드포인트**: `app/routes/api.payment.toss.*`
- **상태**: ✅ 완전 구현 및 작동 중
- **기능**: 
  - 일회성 충전
  - 멤버십 구독
  - 아이템 구매

#### PayPal (USD)
- **구현 파일**: `app/routes/api.payment.capture-order.ts`, `app/routes/api.payment.activate-subscription.ts`
- **API 엔드포인트**: `app/routes/api.webhooks.paypal.ts`
- **상태**: ✅ 완전 구현 및 작동 중
- **기능**:
  - 일회성 충전
  - 멤버십 구독
  - 웹훅을 통한 자동 갱신

#### NEAR 입금 (자동 감지)
- **구현 파일**: `app/lib/near/deposit-engine.server.ts`
- **크론 잡**: `app/lib/cron.server.ts` (매분 실행)
- **상태**: ✅ 완전 구현 및 작동 중
- **기능**:
  - NEAR 입금 자동 감지
  - CHOCO 자동 환전
  - 자동 회수(Sweep) 서비스 계정으로

### 2.2 미구현/불필요한 결제 방법

#### Crypto (BTC)
- **UI 위치**: `app/components/payment/TokenTopUpModal.tsx` (라인 188-196)
- **상태**: ❌ UI만 존재, 실제 구현 없음
- **문제점**: 
  - 사용자가 선택해도 작동하지 않음
  - Coinbase Commerce 관련 코드는 있으나 BTC 직접 결제는 없음

#### Solana (SOL)
- **UI 위치**: `app/components/payment/TokenTopUpModal.tsx` (라인 197-205)
- **컴포넌트**: `app/components/payment/SolanaPayButton.tsx` 존재
- **API**: `app/routes/api/payment/solana/*` 존재
- **상태**: ❓ 구현은 되어 있으나 실제 사용 여부 불명확
- **문제점**:
  - CHOCO 통일 정책과 맞지 않음
  - 실제 사용되지 않을 가능성 높음

#### NEAR (결제 페이지)
- **UI 위치**: `app/components/payment/TokenTopUpModal.tsx` (라인 206-214)
- **컴포넌트**: `app/components/payment/NearPayButton.tsx` 존재
- **API**: `app/routes/api/payment/near/*` 존재
- **상태**: ❌ 별도 입금 플로우로 이미 작동 중
- **문제점**:
  - NEAR는 입금 감지 시스템으로 자동 처리됨
  - 결제 페이지에 두면 중복/혼란
  - 사용자가 직접 결제할 필요 없음

---

## 3. 제거 대상 및 범위

### 3.1 UI 제거 대상

**파일**: `app/components/payment/TokenTopUpModal.tsx`

**제거할 UI 요소**:
1. **Crypto (BTC) 탭 버튼** (라인 188-196)
   ```tsx
   <button onClick={() => setPaymentMethod("CRYPTO")}>
       Crypto (BTC)
   </button>
   ```

2. **Solana (SOL) 탭 버튼** (라인 197-205)
   ```tsx
   <button onClick={() => setPaymentMethod("SOLANA")}>
       Solana (SOL)
   </button>
   ```

3. **NEAR 탭 버튼** (라인 206-214)
   ```tsx
   <button onClick={() => setPaymentMethod("NEAR")}>
       NEAR
   </button>
   ```

4. **결제 처리 로직** (라인 276-290)
   - `paymentMethod === "CRYPTO"` 케이스
   - `paymentMethod === "SOLANA"` 케이스
   - `paymentMethod === "NEAR"` 케이스

### 3.2 타입 정의 수정

**파일**: `app/components/payment/TokenTopUpModal.tsx`

**변경 전**:
```typescript
const [paymentMethod, setPaymentMethod] = useState<"PAYPAL" | "TOSS" | "CRYPTO" | "SOLANA" | "NEAR">("TOSS");
```

**변경 후**:
```typescript
const [paymentMethod, setPaymentMethod] = useState<"PAYPAL" | "TOSS">("TOSS");
```

### 3.3 Import 제거 (선택적)

**제거 가능한 Import**:
- `SolanaPayButton` (실제 사용되지 않으면)
- `NearPayButton` (실제 사용되지 않으면)

---

## 4. 구현 계획

### 4.1 Phase 1: UI 제거

**작업 내용**:
1. `TokenTopUpModal.tsx`에서 BTC, Solana, NEAR 탭 버튼 제거
2. 타입 정의에서 `"CRYPTO" | "SOLANA" | "NEAR"` 제거
3. 결제 처리 로직에서 해당 케이스 제거
4. 사용하지 않는 Import 제거

**예상 소요 시간**: 30분

### 4.2 Phase 2: 관련 컴포넌트 확인 및 정리 (선택적)

**작업 내용**:
1. `SolanaPayButton.tsx` 사용 여부 확인
   - 다른 곳에서 사용되는지 검색
   - 사용되지 않으면 제거 또는 주석 처리
2. `NearPayButton.tsx` 사용 여부 확인
   - 다른 곳에서 사용되는지 검색
   - 사용되지 않으면 제거 또는 주석 처리
3. 관련 API 엔드포인트 확인
   - `app/routes/api/payment/solana/*`
   - `app/routes/api/payment/near/*`
   - 실제 사용 여부 확인 후 결정

**예상 소요 시간**: 1시간

### 4.3 Phase 3: 테스트 및 검증

**작업 내용**:
1. 결제 모달 UI 테스트
   - Toss 결제 플로우 정상 작동 확인
   - PayPal 결제 플로우 정상 작동 확인
   - 제거된 탭이 표시되지 않음 확인
2. 타입 에러 확인
   - TypeScript 컴파일 에러 없음 확인
3. 빌드 테스트
   - 프로덕션 빌드 정상 작동 확인

**예상 소요 시간**: 30분

---

## 5. 상세 구현 내용

### 5.1 TokenTopUpModal.tsx 수정

#### 5.1.1 타입 정의 수정

**위치**: 라인 39

**변경 전**:
```typescript
const [paymentMethod, setPaymentMethod] = useState<"PAYPAL" | "TOSS" | "CRYPTO" | "SOLANA" | "NEAR">("TOSS");
```

**변경 후**:
```typescript
const [paymentMethod, setPaymentMethod] = useState<"PAYPAL" | "TOSS">("TOSS");
```

#### 5.1.2 탭 버튼 제거

**위치**: 라인 168-215

**변경 전**:
```tsx
<div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10 overflow-x-auto scrollbar-hide">
    <button onClick={() => setPaymentMethod("TOSS")}>국내 (카드)</button>
    <button onClick={() => setPaymentMethod("PAYPAL")}>해외 (PayPal)</button>
    <button onClick={() => setPaymentMethod("CRYPTO")}>Crypto (BTC)</button>
    <button onClick={() => setPaymentMethod("SOLANA")}>Solana (SOL)</button>
    <button onClick={() => setPaymentMethod("NEAR")}>NEAR</button>
</div>
```

**변경 후**:
```tsx
<div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10 overflow-x-auto scrollbar-hide">
    <button onClick={() => setPaymentMethod("TOSS")}>국내 (카드)</button>
    <button onClick={() => setPaymentMethod("PAYPAL")}>해외 (PayPal)</button>
</div>
```

#### 5.1.3 결제 처리 로직 제거

**위치**: 라인 276-290 (예상)

**제거할 코드**:
```tsx
) : paymentMethod === "CRYPTO" ? (
    // BTC 결제 UI
) : paymentMethod === "SOLANA" ? (
    <SolanaPayButton ... />
) : paymentMethod === "NEAR" ? (
    <NearPayButton ... />
) : null
```

**변경 후**: 해당 케이스 제거, Toss와 PayPal만 남김

#### 5.1.4 Import 정리

**위치**: 파일 상단

**제거할 Import** (사용되지 않으면):
```typescript
import { SolanaPayButton } from "./SolanaPayButton";
import { NearPayButton } from "./NearPayButton";
```

---

## 6. NEAR 입금 안내 추가 (선택적)

### 6.1 배경

NEAR는 결제 페이지에서 제거하되, 사용자가 NEAR로 CHOCO를 충전할 수 있는 방법을 안내해야 합니다.

### 6.2 구현 방안

**옵션 1**: 설정 페이지에 NEAR 입금 안내 추가
- `app/routes/settings.tsx`에 NEAR 입금 섹션 추가
- 입금 주소 표시 및 안내

**옵션 2**: 별도 안내 모달 추가
- "NEAR로 충전하기" 버튼 추가
- 모달에서 입금 주소 및 안내 표시

**옵션 3**: 결제 모달 하단에 간단한 안내 추가
- "NEAR로 충전하기" 링크 추가
- 클릭 시 설정 페이지로 이동 또는 안내 모달 표시

### 6.3 권장 사항

**옵션 3**을 권장합니다:
- 사용자가 NEAR 입금 방법을 쉽게 찾을 수 있음
- 결제 페이지에서 완전히 제거하지 않고 안내만 제공
- 구현이 간단함

---

## 7. 관련 파일 목록

### 7.1 수정 대상 파일

1. **`app/components/payment/TokenTopUpModal.tsx`**
   - 탭 버튼 제거
   - 타입 정의 수정
   - 결제 처리 로직 수정
   - Import 정리

### 7.2 확인 대상 파일 (선택적)

1. **`app/components/payment/SolanaPayButton.tsx`**
   - 다른 곳에서 사용되는지 확인
   - 사용되지 않으면 제거 또는 주석 처리

2. **`app/components/payment/NearPayButton.tsx`**
   - 다른 곳에서 사용되는지 확인
   - 사용되지 않으면 제거 또는 주석 처리

3. **`app/routes/api/payment/solana/*`**
   - 실제 사용 여부 확인
   - 사용되지 않으면 제거 또는 주석 처리

4. **`app/routes/api/payment/near/*`**
   - 실제 사용 여부 확인
   - 사용되지 않으면 제거 또는 주석 처리

### 7.3 참고 문서

- `docs/features/billing/crypto-payment.md`: 크립토 결제 관련 문서 (참고용)

---

## 8. 테스트 시나리오

### 8.1 UI 테스트

1. **결제 모달 열기**
   - ✅ Toss 탭만 표시됨
   - ✅ PayPal 탭만 표시됨
   - ❌ BTC, Solana, NEAR 탭이 표시되지 않음

2. **Toss 결제 플로우**
   - ✅ Toss 탭 선택 시 정상 작동
   - ✅ 결제 버튼 클릭 시 Toss 결제 창 열림
   - ✅ 결제 완료 후 CHOCO 지급 확인

3. **PayPal 결제 플로우**
   - ✅ PayPal 탭 선택 시 정상 작동
   - ✅ PayPal 버튼 클릭 시 PayPal 결제 창 열림
   - ✅ 결제 완료 후 CHOCO 지급 확인

### 8.2 타입 체크

1. **TypeScript 컴파일**
   - ✅ 타입 에러 없음
   - ✅ `paymentMethod` 타입이 `"PAYPAL" | "TOSS"`로 제한됨

2. **빌드 테스트**
   - ✅ 프로덕션 빌드 성공
   - ✅ 런타임 에러 없음

### 8.3 기능 테스트

1. **결제 완료 후**
   - ✅ CHOCO 잔액 정상 증가
   - ✅ Payment 기록 정상 생성
   - ✅ TokenTransfer 기록 정상 생성 (온체인 전송 시)

---

## 9. 롤백 계획

### 9.1 문제 발생 시

만약 제거 후 문제가 발생하면:

1. **즉시 롤백**: Git을 사용하여 이전 커밋으로 되돌림
2. **부분 롤백**: 특정 파일만 이전 버전으로 복원
3. **점진적 제거**: 하나씩 제거하며 테스트

### 9.2 롤백 명령어

```bash
# 전체 롤백
git revert <commit-hash>

# 특정 파일만 롤백
git checkout <commit-hash> -- app/components/payment/TokenTopUpModal.tsx
```

---

## 10. UI 텍스트 CHOCO 통일 작업

### 10.1 배경

빌링 시스템이 CHOCO로 통일되었으나, UI에는 여전히 "Credit", "크레딧" 용어가 사용되고 있습니다. 사용자 경험 일관성을 위해 모든 UI 텍스트를 CHOCO로 변경해야 합니다.

### 10.2 현재 문제점

1. **제목 및 설명**:
   - "Credit Top Up" → "CHOCO Top Up" 또는 "CHOCO 충전"
   - "크레딧을 충전하세요" → "CHOCO를 충전하세요"

2. **패키지 표시**:
   - "5,000 C" → "5,000 CHOCO" (권장)
   - 또는 "5,000 C" 유지 시 하단에 "(C = CHOCO)" 안내 추가

3. **일관성 문제**:
   - 백엔드는 CHOCO로 통일됨
   - UI에는 여전히 "Credit", "크레딧" 표기
   - 사용자 혼란 가능

### 10.3 변경해야 하는 이유

1. **브랜딩 일관성**: CHOCO로 통일하여 브랜드 일관성 유지
2. **사용자 경험**: "크레딧"과 "CHOCO" 혼용 시 사용자 혼란
3. **정책 일치**: 빌링 시스템이 CHOCO로 통일되었으므로 UI도 동일한 용어 사용

### 10.4 변경 대상 파일 및 내용

#### 10.4.1 TokenTopUpModal.tsx

**파일**: `app/components/payment/TokenTopUpModal.tsx`

**변경 사항**:

1. **제목 변경** (라인 115):
   ```tsx
   // 변경 전
   <DialogTitle className="text-xl font-bold tracking-tight text-white">Credit Top Up</DialogTitle>
   
   // 변경 후
   <DialogTitle className="text-xl font-bold tracking-tight text-white">CHOCO Top Up</DialogTitle>
   ```

2. **설명 변경** (라인 117):
   ```tsx
   // 변경 전
   AI 캐릭터와 더 즐겁게 대화하기 위해 크레딧을 충전하세요.
   
   // 변경 후
   AI 캐릭터와 더 즐겁게 대화하기 위해 CHOCO를 충전하세요.
   ```

3. **패키지 표시 변경** (라인 156):
   ```tsx
   // 변경 전
   {(pkg.credits + pkg.bonus).toLocaleString()} C
   
   // 변경 후 (옵션 1: 권장)
   {(pkg.credits + pkg.bonus).toLocaleString()} CHOCO
   
   // 변경 후 (옵션 2: 약자 사용 시)
   {(pkg.credits + pkg.bonus).toLocaleString()} C
   // 하단에 안내 추가: "(C = CHOCO)"
   ```

#### 10.4.2 SolanaPayButton.tsx

**파일**: `app/components/payment/SolanaPayButton.tsx`

**변경 사항**:

1. **성공 메시지** (라인 97):
   ```tsx
   // 변경 전
   <p className="text-green-200/80">크레딧 충전이 성공적으로 완료되었습니다.</p>
   
   // 변경 후
   <p className="text-green-200/80">CHOCO 충전이 성공적으로 완료되었습니다.</p>
   ```

2. **Toast 메시지** (라인 70):
   ```tsx
   // 변경 전
   toast.success(`${credits} credits have been added!`);
   
   // 변경 후
   toast.success(`${credits} CHOCO가 충전되었습니다!`);
   ```

#### 10.4.3 NearPayButton.tsx

**파일**: `app/components/payment/NearPayButton.tsx`

**변경 사항**:

1. **Toast 메시지** (라인 72):
   ```tsx
   // 변경 전
   toast.success(`${credits} credits have been added!`);
   
   // 변경 후
   toast.success(`${credits} CHOCO가 충전되었습니다!`);
   ```

#### 10.4.4 CoinbaseCommerceButton.tsx

**파일**: `app/components/payment/CoinbaseCommerceButton.tsx`

**변경 사항**:

1. **설명 텍스트** (라인 36):
   ```tsx
   // 변경 전
   description: `${packageName} (${credits} Credits)`,
   
   // 변경 후
   description: `${packageName} (${credits} CHOCO)`,
   ```

### 10.5 구현 계획

#### Phase 1: 주요 결제 모달 텍스트 변경
- [ ] `TokenTopUpModal.tsx` 제목 변경
- [ ] `TokenTopUpModal.tsx` 설명 변경
- [ ] `TokenTopUpModal.tsx` 패키지 표시 변경

#### Phase 2: 결제 버튼 컴포넌트 텍스트 변경
- [ ] `SolanaPayButton.tsx` 메시지 변경
- [ ] `NearPayButton.tsx` 메시지 변경
- [ ] `CoinbaseCommerceButton.tsx` 설명 변경

#### Phase 3: 테스트 및 검증
- [ ] UI 텍스트 확인
- [ ] 다국어 지원 확인 (필요 시)
- [ ] 사용자 피드백 수집

### 10.6 주의사항

1. **내부 코드 변수명**: `CREDIT_PACKAGES` 같은 내부 코드 변수명은 변경 불필요 (UI에 노출되지 않음)
2. **약자 사용**: "C"를 사용하는 경우 "(C = CHOCO)" 안내 추가 권장
3. **일관성 유지**: 모든 결제 관련 UI에서 동일한 용어 사용

---

## 11. 향후 개선 사항

### 11.1 NEAR 입금 안내 개선

- 설정 페이지에 NEAR 입금 섹션 추가
- 입금 주소 QR 코드 생성
- 입금 내역 실시간 표시

### 11.2 결제 방법 확장 (필요 시)

향후 새로운 결제 방법을 추가할 때:
- 실제 구현 완료 후에만 UI 추가
- 명확한 테스트 시나리오 작성
- 문서화 필수

### 11.3 코드 정리

- 사용되지 않는 컴포넌트 및 API 엔드포인트 제거
- 관련 문서 업데이트
- 테스트 코드 정리

---

## 12. 구현 체크리스트

### Phase 1: UI 제거
- [x] `TokenTopUpModal.tsx`에서 BTC 탭 버튼 제거
- [x] `TokenTopUpModal.tsx`에서 Solana 탭 버튼 제거
- [x] `TokenTopUpModal.tsx`에서 NEAR 탭 버튼 제거
- [x] 타입 정의에서 `"CRYPTO" | "SOLANA" | "NEAR"` 제거
- [x] 결제 처리 로직에서 해당 케이스 제거
- [x] 사용하지 않는 Import 제거

### Phase 2: 관련 컴포넌트 확인 (선택적)
- [x] `SolanaPayButton.tsx` 사용 여부 확인 (텍스트 변경 완료)
- [x] `NearPayButton.tsx` 사용 여부 확인 (텍스트 변경 완료)
- [x] 관련 API 엔드포인트 사용 여부 확인
- [ ] 사용되지 않는 파일 제거 또는 주석 처리 (선택적 - 향후 사용 가능성 고려)

### Phase 3: UI 텍스트 CHOCO 통일
- [x] `TokenTopUpModal.tsx` 제목 변경 ("Credit Top Up" → "CHOCO Top Up")
- [x] `TokenTopUpModal.tsx` 설명 변경 ("크레딧" → "CHOCO")
- [x] `TokenTopUpModal.tsx` 패키지 표시 변경 ("C" → "CHOCO" 또는 안내 추가)
- [x] `SolanaPayButton.tsx` 메시지 변경
- [x] `NearPayButton.tsx` 메시지 변경
- [x] `CoinbaseCommerceButton.tsx` 설명 변경

### Phase 4: 테스트 및 검증
- [ ] 결제 모달 UI 테스트 (수동 테스트 필요)
- [ ] Toss 결제 플로우 테스트 (수동 테스트 필요)
- [ ] PayPal 결제 플로우 테스트 (수동 테스트 필요)
- [ ] UI 텍스트 확인 (CHOCO로 통일되었는지) (수동 테스트 필요)
- [x] TypeScript 컴파일 에러 확인
- [ ] 프로덕션 빌드 테스트 (권장)

### Phase 5: 문서화 (선택적)
- [ ] NEAR 입금 안내 추가 (설정 페이지 또는 모달) (향후 개선 사항)
- [x] 관련 문서 업데이트 (검증 보고서 작성 완료)

---

## 13. 승인 및 구현

- [x] 설계 검토 완료
- [x] 구현 시작
- [x] 테스트 완료 (코드 검증 완료, 수동 테스트 권장)
- [ ] 배포 준비 (프로덕션 빌드 테스트 후 진행 권장)

---

## 14. 참고 사항

### 13.1 CHOCO 통일 정책

현재 시스템은 모든 결제를 CHOCO로 통일하고 있습니다:
- Toss (KRW) → CHOCO 환전
- PayPal (USD) → CHOCO 환전
- NEAR 입금 → CHOCO 자동 환전

따라서 BTC, Solana 직접 결제는 이 정책과 맞지 않습니다.

### 13.2 NEAR 입금 시스템

NEAR는 별도의 입금 감지 시스템으로 작동합니다:
- 사용자가 NEAR를 자신의 계정으로 입금
- 크론 잡이 입금을 자동 감지
- CHOCO로 자동 환전
- 자동 회수(Sweep) 서비스 계정으로

따라서 결제 페이지에서 직접 결제할 필요가 없습니다.

---

**문서 버전**: 1.0  
**최종 수정일**: 2026-01-11  
**완료일**: 2026-01-11
