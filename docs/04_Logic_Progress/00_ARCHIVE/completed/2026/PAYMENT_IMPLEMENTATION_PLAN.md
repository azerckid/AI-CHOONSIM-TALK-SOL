
# PayPal 결제 시스템 구현 계획 (PayPal Implementation Plan)

## 1. 개요 (Overview)
본 문서는 챗봇 서비스에 PayPal 결제 시스템을 도입하기 위한 기술적인 구현 계획을 기술합니다.
주요 목표는 **정기 구독(Subscription)** 모델과 **토큰 충전(Token Top-up)** 모델을 지원하여, 사용자에게 다양한 과금 옵션을 제공하고 수익화를 실현하는 것입니다.

**프로젝트 컨텍스트:**
- **Framework**: React Router v7 (Vite)
- **Database**: Turso (libSQL) with Prisma ORM
- **Authentication**: Better Auth (session-based)
- **AI Integration**: Google Gemini API with LangGraph
- **Current Status**: User 모델에 `subscriptionTier` 필드가 이미 존재 (기본값: "FREE")

## 1.1 규제 대응 및 전략 수정 (Legal & Strategy Update)

**[중요] 한국 법적 규제(VASP) 대응을 위한 결제 전략 수정**
한국 내에서 암호화폐 결제 서비스를 제공하기 위해서는 **가상자산사업자(VASP) 신고**가 법적 필수 요건입니다. 현재 상황에서 VASP 신고 없이 서비스를 오픈하면 법적 리스크가 발생할 수 있습니다.

따라서 다음과 같이 **국가별 이원화 결제 전략(Dual Payment Strategy)**을 채택합니다:

1.  **한국 사용자 (KR)**
    *   **Main**: **Toss Payments** (신용카드, 계좌이체, 카카오페이 등 내수 최적화)
    *   **Sub**: PayPal (선택사항)
    *   **Crypto**: **비노출 (Hidden)** - 법적 리스크 해소 전까지 제공하지 않음.

2.  **글로벌 사용자 (Global)**
    *   **Main**: **PayPal** (전 세계용)
    *   **Crypto**: **Coinbase Commerce**, **Solana Pay**, **NEAR Protocol** 적극 활용

이 전략에 따라 구현 계획에 **Toss Payments 연동 (Phase 5)**과 **국가별 분기 처리 (Phase 6)**가 추가되었습니다.


## 2. 비즈니스 모델 및 요구사항 (Requirements)

### 2.1 결제 모델 구성
결제 시스템은 크게 두 가지 축으로 구성됩니다.

1.  **정기 구독 (Recurring Subscription)**
    *   사용자가 매월/매년 일정 금액을 지불하고 특정 등급(Tier)을 유지합니다.
    *   등급에 따라 기본 토큰 지급량, 고급 AI 모델 사용 권한, 이미지 생성 횟수 등의 혜택이 차등 적용됩니다.
    *   **Tier 구성안**:
        *   **FREE**: 기본 기능, 제한된 일일 토큰 (무료)
        *   **BASIC**: 광고 제거, 추가 토큰, 표준 응답 속도
        *   **PREMIUM**: 고급 모델(GPT-4/Claude 3.5 Sonnet 등) 접근, 대용량 토큰, 빠른 반응
        *   **ULTIMATE**: 무제한에 가까운 토큰, 전용 컨시어지 기능, 우선 서포트

2.  **단건 결제 (One-time Payment / Token Top-up)**
    *   구독과 별개로, AI 대화에 필요한 '토큰'을 추가로 충전하는 기능입니다.
    *   예: $5에 500 Credit, $10에 1,200 Credit 충전 등.
    *   구독자에게는 충전 시 할인 혜택을 제공할 수도 있습니다.

### 2.2 기능 요구사항
*   **결제 승인 및 처리**: PayPal Smart Payment Buttons 연동.
*   **구독 관리**: 업그레이드, 다운그레이드, 구독 취소 처리.
*   **결제 내역 조회**: 사용자가 자신의 결제 이력을 마이페이지에서 확인.
*   **자동 갱신 처리**: Webhook을 통해 갱신 성공/실패 여부를 DB에 동기화.
*   **토큰 차감 로직**: AI 사용량에 따른 정밀한 토큰 차감 시스템 연동.

---

## 3. 데이터베이스 설계 (Database Schema)

기존 `prisma/schema.prisma` 파일에 결제 및 구독 관련 모델을 추가/확장합니다.

### 3.1 User 모델 확장
사용자의 현재 구독 상태와 잔여 토큰(Credit)을 관리합니다.

**현재 상태**: `subscriptionTier` 필드는 이미 존재합니다. 아래 필드들을 추가해야 합니다.

```prisma
model User {
  // ... 기존 필드들
  subscriptionTier   String?   @default("FREE") // 이미 존재: FREE, BASIC, PREMIUM, ULTIMATE
  
  // 추가 필요: 구독 관련
  subscriptionStatus String?   // ACTIVE, CANCELLED, PAST_DUE, SUSPENDED, NULL
  subscriptionId     String?   // PayPal Subscription ID (unique)
  currentPeriodEnd   DateTime? // 구독 만료일/다음 결제일
  lastTokenRefillAt  DateTime? // 마지막 토큰 리필 시점 (중복 방지용)
  
  // 추가 필요: 토큰/크레딧 관련
  credits            Int       @default(100) // 현재 보유 크레딧 (토큰)
  
  // 관계
  Payment            Payment[]
  
  @@index([subscriptionId]) // PayPal Subscription ID로 빠른 조회
}
```

**마이그레이션 전략:**
- 기존 사용자들은 `credits` 기본값 100으로 자동 설정
- `subscriptionStatus`는 NULL로 시작 (무료 사용자)
- `subscriptionTier`는 이미 존재하므로 변경 없음

### 3.2 Payment (결제 이력) 모델 추가
모든 결제(구독 갱신, 단건 충전) 로그를 저장합니다.

```prisma
model Payment {
  id              String   @id @default(uuid())
  userId          String
  amount          Float
  currency        String   @default("USD")
  status          String   // PENDING, COMPLETED, FAILED, REFUNDED, CANCELLED
  type            String   // SUBSCRIPTION, TOPUP, SUBSCRIPTION_RENEWAL
  provider        String   @default("PAYPAL")
  transactionId   String?  @unique // PayPal Transaction ID (중복 방지)
  subscriptionId String?  // PayPal Subscription ID (구독 결제인 경우)
  description     String?  // "Premium Plan - Monthly" or "500 Credits Top-up"
  creditsGranted  Int?     // 지급된 크레딧 수 (토큰 충전인 경우)
  metadata        String?  // 추가 메타데이터 (JSON string)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  User            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, createdAt]) // 사용자별 결제 내역 조회 최적화
  @@index([transactionId]) // PayPal 트랜잭션 ID로 빠른 조회
  @@index([subscriptionId]) // 구독별 결제 내역 조회
}
```

### 3.3 SubscriptionPlan (구독 플랜 메타데이터) - *Optional*
하드코딩하지 않고 관리자 페이지에서 플랜을 관리하려면 필요하지만, 초기에는 상수로 관리 가능합니다.

**초기 구현**: TypeScript 상수로 관리 (`app/lib/subscription-plans.ts`)
**향후 확장**: 관리자 페이지에서 플랜을 동적으로 관리하려면 DB 모델 추가 고려

```typescript
// app/lib/subscription-plans.ts
export const SUBSCRIPTION_PLANS = {
  FREE: {
    tier: "FREE",
    monthlyPrice: 0,
    creditsPerMonth: 1500, // 50 credits/day * 30 days
    aiModel: "gemini-2.0-flash-exp",
    features: ["기본 기능", "광고 포함"],
  },
  BASIC: {
    tier: "BASIC",
    monthlyPrice: 4.99,
    creditsPerMonth: 2000,
    aiModel: "gemini-2.0-flash-exp",
    features: ["광고 제거", "추가 토큰"],
  },
  PREMIUM: {
    tier: "PREMIUM",
    monthlyPrice: 14.99,
    creditsPerMonth: 10000,
    aiModel: "gemini-2.0-flash-exp", // 향후 GPT-4o 등 고급 모델
    features: ["고급 AI 모델", "빠른 응답"],
  },
  ULTIMATE: {
    tier: "ULTIMATE",
    monthlyPrice: 29.99,
    creditsPerMonth: -1, // 무제한 (FUP)
    aiModel: "gemini-2.0-flash-exp", // 향후 최고급 모델
    features: ["무제한 토큰", "컨시어지 서비스", "우선 서포트"],
  },
} as const;
```

---

## 4. 기술 스택 및 라이브러리 (Tech Stack)

### Frontend
*   **@paypal/react-paypal-js** (최신 버전): PayPal 공식 React 래퍼 라이브러리. 스크립트 로드 및 버튼 렌더링을 쉽게 처리.
*   **UI Components**: 기존 디자인 시스템(Tailwind CSS v4, shadcn/ui Nova Preset)을 활용한 Pricing Card 및 결제 모달.
*   **Toast 알림**: Sonner (shadcn/ui)를 사용하여 결제 성공/실패 피드백 제공.
*   **Toss Payments SDK**: `@tosspayments/payment-widget-sdk` (한국 사용자용 결제 위젯)


### Backend (React Router v7)
*   **@paypal/checkout-server-sdk** (최신 버전): 서버 사이드에서 결제 유효성 검증 및 Webhook 처리.
*   **Webhook Handler**: `app/routes/api/webhooks/paypal.ts` 엔드포인트에서 결제 성공, 구독 갱신 이벤트를 비동기로 처리.
*   **API Routes**: React Router v7의 파일 기반 라우팅 구조 사용
  - `app/routes/api/payment/create-order.ts`
  - `app/routes/api/payment/capture-order.ts`
  - `app/routes/api/payment/create-subscription.ts`
  - `app/routes/api/payment/cancel-subscription.ts`
  - `app/routes/api/webhooks/paypal.ts`

### 환경 변수 설정
`.env` 파일에 다음 변수들을 추가해야 합니다:

```env
# PayPal 설정
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox  # 또는 'live' (프로덕션)
PAYPAL_WEBHOOK_ID=your_webhook_id  # Webhook 서명 검증용

# PayPal API Base URL (자동 설정되지만 명시 가능)
# PAYPAL_API_BASE_URL=https://api-m.sandbox.paypal.com  # Sandbox
# PAYPAL_API_BASE_URL=https://api-m.paypal.com  # Production
```

---

## 5. 구현 단계 (Implementation Steps)

### Phase 1: 설정 및 스키마 업데이트 ✅ (완료)
1.  **PayPal Developer 계정 생성**: 
    - [PayPal Developer Dashboard](https://developer.paypal.com/)에서 계정 생성
    - Sandbox 앱 생성 및 Client ID, Secret Key 발급
    - Webhook URL 등록: `https://yourdomain.com/api/webhooks/paypal` (프로덕션) 또는 ngrok 등으로 로컬 테스트
2.  **환경 변수 설정**: `.env`에 PayPal 관련 변수 추가 (위 4번 항목 참조)
3.  **패키지 설치**:
    ```bash
    npm install @paypal/react-paypal-js @paypal/checkout-server-sdk
    ```
4.  **Prisma Schema 업데이트**: 
    - User 모델에 `subscriptionStatus`, `subscriptionId`, `currentPeriodEnd`, `lastTokenRefillAt`, `credits` 필드 추가
    - Payment 모델 추가
    - 마이그레이션 실행: `npx prisma migrate dev --name add_payment_system`
5.  **구독 플랜 상수 파일 생성**: `app/lib/subscription-plans.ts` 생성

### Phase 2: 단건 결제 (토큰 충전) 구현 ✅ (완료)
구독보다 구현이 단순한 단건 결제부터 시작하여 결제 파이프라인을 검증합니다.

1.  **Backend API** (React Router v7 파일 구조):
    *   `app/routes/api/payment/create-order.ts`: 
        - `POST /api/payment/create-order`
        - 주문 생성 (클라이언트에서 요청)
        - Zod 스키마로 요청 검증 (`{ amount: number, credits: number }`)
        - PayPal API로 주문 생성 후 `orderId` 반환
    *   `app/routes/api/payment/capture-order.ts`: 
        - `POST /api/payment/capture-order`
        - 결제 승인 및 DB 업데이트 (토큰 지급)
        - PayPal API로 결제 검증 (서버 사이드 검증 필수)
        - 트랜잭션으로 `Payment` 레코드 생성 및 `User.credits` 증가
        - 성공 시 Toast 알림을 위한 성공 응답 반환
        - 에러 발생 시 `toast.error()` 사용 (프론트엔드에서 처리)

2.  **Frontend**:
    *   토큰 충전 모달 UI 구현 (`app/components/payment/TokenTopUpModal.tsx`)
        - shadcn/ui Dialog 컴포넌트 사용
        - 토큰 패키지 선택 UI (예: $5 → 500 credits, $10 → 1,200 credits)
    *   PayPal Buttons 연동:
        - `@paypal/react-paypal-js`의 `PayPalButtons` 컴포넌트 사용
        - `createOrder`: `/api/payment/create-order` 호출
        - `onApprove`: `/api/payment/capture-order` 호출
        - `onError`, `onCancel`: 에러 처리 및 Toast 알림
    *   결제 성공 후 사용자 크레딧 실시간 업데이트 (React Router의 `useRevalidator` 사용)

### Phase 3: 정기 구독 (Subscription) 구현 (진행 중 90%)
1.  **PayPal Product & Plan 생성**: ✅ (완료)
    *   PayPal 대시보드에서 Product 및 Billing Plan 생성
    *   또는 스크립트로 자동 생성 (`scripts/create-paypal-plans.mjs`)
    *   각 Tier별로 별도의 Plan 생성 (BASIC, PREMIUM, ULTIMATE)

2.  **Backend API**:
    *   `app/routes/api/payment/create-subscription.ts`: ✅ (완료 - activate로 대체)
        - `POST /api/payment/create-subscription` (클라이언트 JS SDK 사용으로 대체됨)
        - `POST /api/payment/activate-subscription`: 구독 승인 및 DB 업데이트 구현 완료
    *   `app/routes/api/payment/cancel-subscription.ts`: (예정)
        - `POST /api/payment/cancel-subscription`
        - 구독 취소 처리
        - PayPal API로 구독 취소 요청
        - `User.subscriptionStatus`를 "CANCELLED"로 업데이트
        - `User.subscriptionTier`는 만료일(`currentPeriodEnd`)까지 유지

3.  **Frontend**: ✅ (완료)
    *   가격 정책 페이지 (`app/routes/pricing.tsx`) UI 구현:
        - 각 Tier별 Pricing Card 컴포넌트 (Stitch Design 적용)
        - 현재 구독 상태 표시
        - 업그레이드/다운그레이드 버튼
    *   구독 버튼 연동:
        - `PayPalButtons`의 `createSubscription` 핸들러 사용
        - 구독 승인 시 `/api/payment/activate-subscription` 호출
        - 성공 시 Toast 알림 및 페이지 리다이렉트

4.  **구독 갱신 로직**:
    *   Webhook에서 `BILLING.SUBSCRIPTION.PAYMENT.SUCCEEDED` 이벤트 처리
    *   `lastTokenRefillAt` 필드로 중복 리필 방지
    *   구독 플랜에 따라 월별 크레딧 지급
    *   `User.credits` 증가 및 `currentPeriodEnd` 업데이트

### Phase 4: Webhook 및 사후 관리 (완료)

1.  [x] **Webhook Endpoint**: `app/routes/api/webhooks/paypal.ts` 생성
    *   `POST /api/webhooks/paypal`
    *   PayPal Webhook 서명 검증 (보안 필수)
    *   이벤트 타입별 분기 처리

2.  [x] **이벤트 처리**:
    *   `PAYMENT.SALE.COMPLETED`: 
        - 단건 결제 성공 -> `Payment` 레코드 생성 및 `User.credits` 증가
        - 트랜잭션으로 처리하여 정합성 보장
    *   `BILLING.SUBSCRIPTION.ACTIVATED`:
        - 구독 활성화 -> `User.subscriptionStatus = "ACTIVE"`, `subscriptionTier` 업데이트
        - 초기 크레딧 지급
    *   `BILLING.SUBSCRIPTION.PAYMENT.SUCCEEDED`:
        - 구독 갱신 성공 -> `lastTokenRefillAt` 확인 후 중복 방지
        - 월별 크레딧 리필 및 `currentPeriodEnd` 업데이트
        - `Payment` 레코드 생성 (type: "SUBSCRIPTION_RENEWAL")
    *   `BILLING.SUBSCRIPTION.CANCELLED`:
        - 구독 취소 -> `User.subscriptionStatus = "CANCELLED"`
        - `currentPeriodEnd`까지는 기존 Tier 유지, 이후 FREE로 다운그레이드
    *   `BILLING.SUBSCRIPTION.SUSPENDED`:
        - 구독 정지 (결제 실패 등) -> `User.subscriptionStatus = "SUSPENDED"`
        - 사용자에게 알림 (이메일 또는 푸시 알림)

3.  [x] **Token Usage Logic** (`app/lib/ai.server.ts` 연동):
    *   `generateAIResponse` 및 `streamAIResponse` 함수 호출 전 크레딧 확인
    *   `app/routes/api/messages/index.ts`에서 메시지 생성 시:
        ```typescript
        // 사용자 크레딧 확인
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.credits < estimatedTokens) {
          return Response.json(
            { error: "Insufficient credits" }, 
            { status: 402 } // Payment Required
          );
        }
        
        // AI 응답 생성
        const response = await generateAIResponse(...);
        
        // 토큰 사용량 계산 (AgentExecution에서 가져오기)
        const tokenUsage = await calculateTokenUsage(messageId);
        
        // 크레딧 차감 (트랜잭션)
        await prisma.$transaction([
          prisma.user.update({
            where: { id: userId },
            data: { credits: { decrement: tokenUsage.totalTokens } }
          })
        ]);
        ```
    *   잔여 토큰 부족 시:
        - 402 Payment Required 응답 반환
        - 프론트엔드에서 Toast 알림 및 토큰 충전 모달 표시
        - `MessageInput` 컴포넌트에 크레딧 부족 상태 표시

4.  [x] **결제 내역 조회**:
    *   `app/routes/profile/subscription.tsx` 페이지 구현:
        - 현재 구독 상태 표시
        - 결제 내역 리스트 (`Payment` 모델 조회)
        - 구독 취소 버튼
    *   `app/routes/api/payment/history.ts`:
        - `GET /api/payment/history`
        - 사용자별 결제 내역 조회 (페이지네이션 지원)

### Phase 5: Toss Payments Integration (KR Local) - **COMPLETED (완료)**

한국 사용자를 위한 토스페이먼츠 연동 단계입니다.

1.  [x] **설정 및 설치**:
    *   패키지 설치: `npm install @tosspayments/payment-sdk` (개별 API 연동 방식 사용)
    *   환경 변수 설정 (`.env`): `TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY`

2.  [x] **Backend (결제 승인 & DB 처리)**:
    *   `app/lib/toss.server.ts`: 토스 API 승인 요청 및 DB 트랜잭션 처리 logic 구현
    *   `app/routes/api.payment.toss.confirm.ts`: 승인 대행 API 엔드포인트
    *   `app/routes/payment.toss.success.tsx`: 결제 성공 후 리다이렉트 랜딩 페이지 (충전/구독 통합 처리)

### Phase 6: Unified Payment Modal & Region Branching - **COMPLETED (완료)**

국가별로 다른 결제 수단을 보여주는 통합 모달 및 멤버십 페이지를 구현했습니다.

1.  [x] **멤버십/충전 통합 모달 구현**:
    *   `TokenTopUpModal.tsx`: 국내(토스) / 해외(PayPal) 탭 시스템 적용
    *   `pricing.tsx`: 멤버십 구독 모달에 국내(토스) / 해외(PayPal) 탭 시스템 적용

2.  [x] **통합 결제 처리 로직**:
    *   결제 성공 시 타입(`TOPUP` vs `SUBSCRIPTION`)에 따른 분기 처리 구현
    *   원화(KRW) 가격 정책 도입 및 표시 로직 완성
    *   Prisma 데이터 무결성 보장을 위한 싱글톤 패턴 적용 및 트랜잭션 처리 완성

    - [x] Phase 7: Exception Handling & Fail Page
        - [x] Toss failure page implementation
        - [x] Global failure handling logic (PayPal cancel/error handlers)
    - [x] Phase 8: Locale-based Auto Selection
        - [x] Auto-detect `navigator.language`
        - [x] Set default tab (TOSS for KR, PAYPAL for Global)
    - [x] Phase 9: Mobile UX Optimization (Session & History Management)
        - [x] Fix "Already Finished Session" error on mobile
        - [x] Implement dynamic `orderId` generation (timestamp based)
        - [x] Add loading state/locking during payment initiation
        - [x] Refine `replace: true` navigation to prevent back-button loops in in-app browsers
        - [x] Implement "Smart Targeting" (Mobile: `self` vs PC: `popup`) to prevent app termination

### Phase 9: Mobile UX Optimization (Analysis)

**Issue**: "Already finished session" error and back-button loop on mobile/in-app browsers.
**Root Cause**:
1. **OrderId Reuse**: Tossing same `orderId` after a cancellation or session expiry.
2. **Double Initiation**: Multiple triggers of payment SDK during page transitions or double clicks.
3. **History Stack**: Back button returns to the JS execution point of the previous session, triggering it again.
4. **App Termination**: In-app browsers (Kakao, Slack) often close the entire webview when a popup-initiated payment is cancelled via the system back button.

**Solution**:
1. **Dynamic OrderId**: Append `Date.now()` to every `orderId` to ensure a fresh session.
2. **Action Locking**: Implement `isProcessing` state to disable buttons during SDK handshake.
3. **Clean Redirection**: Use `replace: true` for all terminal states (Success/Fail) to prune the history stack.
4. **Smart Targeting**: Detect device via User-Agent. Use `windowTarget: 'self'` for Mobile to keep the session in the same stack, and `undefined` for PC to maintain popup stability.


---

## 6. 가격 정책 예시 (Pricing Draft)

| 등급 (Tier) | 월 가격 | 제공 크레딧 | AI 모델 | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| **Free** | $0 | 50 / 일 | Basic (Gemini Flash) | 광고 포함 |
| **Basic** | $4.99 | 2,000 / 월 | Standard | 광고 제거 |
| **Premium** | $14.99 | 10,000 / 월 | Advanced (GPT-4o 등) | 빠른 응답 |
| **Ultimate** | $29.99 | 무제한 (FUP) | Best Available | 컨시어지 서비스 |

*토큰 1개 ≈ 약 75 단어 (100 토큰 ≈ $0.002 예상 - 비용 구조에 따라 조정 필요)*

## 7. 보안 고려사항
1.  **Client-side Validation 금지**: 
    - 결제 완료 처리는 반드시 **서버**에서 PayPal API로 재검증(Verify) 한 후 수행해야 합니다.
    - 클라이언트에서 받은 `orderId`나 `transactionId`를 그대로 신뢰하지 말고, PayPal API로 실제 결제 상태를 확인해야 합니다.

2.  **Webhook 서명 검증**: 
    - PayPal에서 보낸 Webhook이 위조되지 않았는지 헤더의 서명을 검증해야 합니다.
    - `@paypal/checkout-server-sdk`의 `WebhookEvent.verify()` 메서드 사용
    - 검증 실패 시 요청을 거부하고 로그 기록

3.  **트랜잭션 관리**: 
    - DB 업데이트(크레딧 지급, Payment 레코드 생성 등)는 Prisma 트랜잭션으로 처리하여 정합성을 보장해야 합니다.
    - 예: 크레딧 지급과 Payment 레코드 생성을 하나의 트랜잭션으로 처리

4.  **중복 처리 방지**:
    - `Payment.transactionId`에 UNIQUE 제약 조건 추가
    - 동일한 `transactionId`로 결제가 이미 처리되었는지 확인
    - Webhook 이벤트의 `idempotency` 처리

5.  **환경 변수 보안**:
    - `.env` 파일은 절대 Git에 커밋하지 않음
    - 프로덕션 환경에서는 환경 변수 관리 시스템 사용 (Vercel, Railway 등)

## 8. 에러 처리 및 사용자 피드백

### Toast 알림 규칙 (Sonner)
프로젝트의 에러 처리 규칙에 따라 모든 결제 관련 액션에 Toast 알림을 사용합니다:

- **성공 케이스**:
  - 토큰 충전 성공: `toast.success("토큰이 성공적으로 충전되었습니다.")`
  - 구독 활성화: `toast.success("구독이 활성화되었습니다.")`
  - 구독 취소: `toast.success("구독이 취소되었습니다.")`

- **에러 케이스**:
  - 결제 실패: `toast.error("결제 처리 중 오류가 발생했습니다.")`
  - 크레딧 부족: `toast.error("크레딧이 부족합니다. 충전해주세요.")`
  - 구독 갱신 실패: `toast.error("구독 갱신에 실패했습니다. 결제 정보를 확인해주세요.")`

- **정보 케이스**:
  - 구독 만료 예정: `toast.info("구독이 곧 만료됩니다. 갱신해주세요.")`

### API 에러 응답 형식
모든 API는 일관된 에러 응답 형식을 사용합니다:

```typescript
// 성공
Response.json({ success: true, data: {...} })

// 에러
Response.json({ 
  error: "Error message", 
  code?: "ERROR_CODE" 
}, { status: 400 | 401 | 402 | 500 })
```

## 9. 테스트 전략

### Sandbox 환경 테스트
1.  **PayPal Sandbox 계정 생성**:
    - PayPal Developer Dashboard에서 Sandbox 계정 생성
    - 테스트용 구매자/판매자 계정 생성

2.  **테스트 시나리오**:
    - 단건 결제 성공/실패 케이스
    - 구독 생성 및 활성화
    - 구독 갱신 (월별 자동 결제)
    - 구독 취소
    - Webhook 이벤트 처리
    - 크레딧 부족 시 차단 로직

3.  **로컬 Webhook 테스트**:
    - ngrok 또는 Cloudflare Tunnel 사용하여 로컬 서버를 외부에 노출
    - PayPal Webhook URL에 ngrok URL 등록
    - 실제 Webhook 이벤트 수신 테스트

4.  **통합 테스트**:
    - 전체 결제 플로우 테스트 (프론트엔드 → 백엔드 → PayPal → Webhook → DB 업데이트)
    - 토큰 차감 및 크레딧 부족 시나리오 테스트

## 10. 마이그레이션 전략

### 기존 사용자 데이터 처리
1.  **기본값 설정**:
    - 기존 사용자들의 `credits` 필드는 마이그레이션 시 기본값 100으로 설정
    - `subscriptionStatus`는 NULL (무료 사용자)
    - `subscriptionTier`는 이미 존재하므로 변경 없음

2.  **마이그레이션 스크립트** (선택사항):
    - 기존 사용자에게 환영 보너스 크레딧 지급
    - 특정 조건의 사용자에게 프로모션 크레딧 지급

3.  **데이터 무결성**:
    - 마이그레이션 전 백업 권장
    - 마이그레이션 후 데이터 검증 스크립트 실행

## 11. 추가 고려사항

### 환불 및 취소 정책
- 환불 요청 시 PayPal API를 통해 처리
- `Payment.status`를 "REFUNDED"로 업데이트
- 환불된 크레딧은 사용자 계정에서 차감

### 다국어 지원
- PayPal 메시지는 PayPal 자체 다국어 지원 활용
- 앱 내 결제 관련 메시지는 프로젝트의 다국어 시스템과 연동

### 모니터링 및 로깅
- 모든 결제 이벤트를 로그로 기록
- 결제 실패율 모니터링
- Webhook 처리 실패 알림 설정

### 성능 최적화
- Payment 테이블에 적절한 인덱스 추가 (이미 스키마에 포함)
- 결제 내역 조회 시 페이지네이션 적용
- Webhook 처리 시 비동기 처리 고려 (큐 시스템 도입 가능)
