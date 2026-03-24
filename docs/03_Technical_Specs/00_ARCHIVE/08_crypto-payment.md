
> Created: 2026-02-08
> Last Updated: 2026-02-08
# 암호화폐 결제 시스템 구현 계획 (Crypto Payment Implementation Plan)

## 1. 개요 (Overview)
본 문서는 기존 PayPal 결제 시스템에 더해, 블록체인 기반의 암호화폐 결제 수단을 도입하기 위한 기술적인 분석과 구현 계획을 기술합니다.
사용자에게 다양한 결제 옵션을 제공하고, 특히 Web3 친화적인 사용자 층을 포섭하기 위해 **3가지 주요 결제 프로토콜(Coinbase Commerce, Solana Pay, NEAR Protocol)**을 비교 및 분석하여 프로젝트에 통합하는 방안을 제시합니다.

**프로젝트 컨텍스트:**
- **Framework**: React Router v7 (Vite)
- **Database**: Turso (libSQL) with Prisma ORM
- **Authentication**: Better Auth (session-based)
- **AI Integration**: Google Gemini API with LangGraph
- **Current Status**: PayPal 결제 시스템과 통합하여 통합 Payment 모델 사용
- **Payment Model**: PayPal과 크립토 결제를 하나의 Payment 모델로 통합 관리

## 2. 결제 옵션 비교 및 분석

### 2.1 Coinbase Commerce (관리형 결제 게이트웨이)
가장 대중적이고 구현이 쉬운 PG(Payment Gateway) 방식입니다. 기업이 직접 지갑 노드를 관리할 필요 없이 서비스 형태로 이용합니다.

*   **특징**: 비트코인(BTC), 이더리움(ETH), USDC, 라이트코인(LTC) 등 다중 체인 지원.
*   **장점**:
    *   **개발 용이성**: PayPal과 유사한 연동 방식 (Hosted Checkout, Webhook).
    *   **자동 변환**: 결제된 암호화폐를 USDC 등으로 자동 변환하여 정산 가능 (변동성 리스크 최소화).
    *   **신뢰성**: 상장 기업인 Coinbase가 보증하는 안정적인 인프라.
*   **단점**:
    *   **수수료**: 약 1%의 거래 수수료 발생.
    *   **탈중앙화 부족**: 완전한 온체인 경험보다는 "PG사 이용"에 가까움.
*   **적합 대상**: 암호화폐를 보유하고 있지만 기술적 깊이가 깊지 않은 일반 사용자.

### 2.2 Solana Pay (고성능 직접 결제)
Solana 블록체인의 고속/저비용 특성을 활용한 지갑 대 지갑(Wallet-to-Wallet) 직접 결제 표준입니다.

*   **특징**: SOL 및 SPL 토큰(USDC) 지원. QR 코드 기반 결제 인보이스 표준.
*   **장점**:
    *   **초고속/저비용**: 거의 즉각적인 승인 속도 및 0원에 가까운 수수료 ($0.00025 미만).
    *   **직접 결제**: 중개자 없는 P2P 전송.
    *   **프로그래머블**: 결제와 동시에 NFT 민팅 등 추가 로직 실행 가능.
*   **단점**:
    *   **생태계 한정**: Solana 생태계 사용자에게만 유효함.
    *   **구현 난이도**: 트랜잭션 구성 및 검증 로직을 직접 구현해야 함.
*   **적합 대상**: Phantom 지갑 등을 사용하는 Web3 네이티브 사용자.

### 2.3 NEAR Protocol (사용자 친화적 Web3)
"계정 추상화(Account Abstraction)" 개념이 내장되어 있어 가장 사용자 친화적인 블록체인 UX를 제공합니다.

*   **특징**: `user.near`와 같은 사람이 읽을 수 있는 계정 ID 사용. FastAuth를 통한 간편 로그인.
*   **장점**:
    *   **UX 우수성**: 복잡한 주소 대신 ID 사용, 이메일/생체인증 로그인 지원.
    *   **저렴한 비용**: 매우 낮은 가스비.
    *   **개발자 친화적**: JavaScript/TypeScript SDK 지원이 강력함.
*   **단점**: 상대적으로 Solana/Ethereum에 비해 유동성이나 인지도가 낮을 수 있음 (하지만 급성장 중).
*   **적합 대상**: 블록체인의 복잡함은 싫지만 빠르고 저렴한 결제를 원하는 사용자.

---

## 3. 구현 전략 (Implementation Strategy)

초기에는 구현 난이도가 낮고 안정적인 **Coinbase Commerce**를 우선 도입하여 "기반"을 다진 후, 사용자 피드백에 따라 **Solana Pay**와 **NEAR**를 순차적으로 도입하거나, 특정 목적(예: 소액 충전)에 특화하여 도입하는 것을 권장합니다.
하지만, 본 문서에서는 **3가지 모두를 지원**하기 위한 통합 아키텍처를 설계합니다.

### 3.0 PayPal 결제 시스템과의 통합
본 크립토 결제 시스템은 기존 PayPal 결제 시스템과 완전히 통합됩니다:
- **통합 Payment 모델**: PayPal과 크립토 결제를 하나의 `Payment` 모델로 관리
- **통합 결제 모달**: 사용자가 PayPal, Coinbase, Solana, NEAR 중 선택 가능
- **통합 크레딧 시스템**: 모든 결제 방식에서 동일한 크레딧 지급 로직 사용
- **통합 결제 내역**: 프로파일 페이지에서 모든 결제 내역을 통합 조회 가능

## 3.1 구현 단계 (Implementation Phases)

### Phase 1: 데이터베이스 스키마 업데이트
1. **Prisma Schema 업데이트**:
   - Payment 모델에 크립토 전용 필드 추가 (위 3.1 섹션 참조)
   - 마이그레이션 실행: `npx prisma migrate dev --name add_crypto_payment_fields`
   - 기존 PayPal 결제 데이터와의 호환성 확인

2. **환경 변수 설정**:
   - `.env` 파일에 각 프로바이더별 API Key 및 설정 추가 (위 4번 섹션 참조)

### Phase 2: Coinbase Commerce 구현 (우선순위 1)
1. **패키지 설치**: `npm install @coinbase/coinbase-commerce-node`
2. **API 엔드포인트 구현**:
   - `app/routes/api/payment/coinbase/create-charge.ts` 생성
   - `app/routes/api/webhooks/coinbase.ts` 생성
3. **프론트엔드 컴포넌트**:
   - `app/components/payment/CoinbaseCommerceButton.tsx` 생성
4. **테스트**: Sandbox 환경에서 전체 플로우 테스트

### Phase 3: Solana Pay 구현 (우선순위 2)
1. **패키지 설치**:
   ```bash
   npm install @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets qrcode.react
   ```
2. **서버 지갑 설정**:
   - Solana 지갑 생성 및 주소/개인키 환경 변수 설정
3. **API 엔드포인트 구현**:
   - `app/routes/api/payment/solana/create-payment.ts` 생성
   - `app/routes/api/payment/solana/verify.ts` 생성
4. **프론트엔드 컴포넌트**:
   - `app/components/payment/SolanaPayButton.tsx` 생성
   - Wallet Provider 설정 (`app/root.tsx`에 추가)
5. **테스트**: Devnet 환경에서 전체 플로우 테스트

### Phase 4: NEAR Protocol 구현 (우선순위 3)
1. **패키지 설치**:
   ```bash
   npm install near-api-js @near-wallet-selector/core @near-wallet-selector/modal-ui
   ```
2. **서버 계정 설정**:
   - NEAR 계정 생성 및 계정 ID/개인키 환경 변수 설정
3. **API 엔드포인트 구현**:
   - `app/routes/api/payment/near/create-payment.ts` 생성
   - `app/routes/api/payment/near/verify.ts` 생성
4. **프론트엔드 컴포넌트**:
   - `app/components/payment/NearPayButton.tsx` 생성
   - NEAR Wallet Selector 설정
5. **테스트**: Testnet 환경에서 전체 플로우 테스트

### Phase 5: 통합 결제 모달 구현
1. **통합 컴포넌트 생성**:
   - `app/components/payment/PaymentModal.tsx` 생성
   - PayPal, Coinbase, Solana, NEAR 탭 통합
2. **기존 토큰 충전 모달 업데이트**:
   - 통합 PaymentModal 사용하도록 수정
3. **결제 내역 페이지 업데이트**:
   - `app/routes/profile/subscription.tsx`에서 모든 프로바이더 결제 내역 표시

### Phase 6: 테스트 및 최적화
1. **통합 테스트**:
   - 모든 프로바이더별 전체 플로우 테스트
   - 에러 케이스 테스트
   - 동시성 테스트 (여러 결제 동시 처리)
2. **성능 최적화**:
   - 트랜잭션 검증 Polling 최적화
   - 환율 API 캐싱
   - 데이터베이스 쿼리 최적화
3. **모니터링 설정**:
   - 결제 성공률 추적
   - 에러 로깅 및 알림 설정

### 3.1 데이터베이스 확장 (Schema Update)

PayPal 결제 시스템과 통합하여 하나의 `Payment` 모델로 관리합니다. 크립토 결제 전용 필드를 추가하여 다양한 블록체인 결제를 지원합니다.

**PayPal 계획서의 Payment 모델을 확장:**

```prisma
model Payment {
  id              String   @id @default(uuid())
  userId          String
  amount          Float    // USD 기준 금액
  currency        String   @default("USD")
  status          String   // PENDING, COMPLETED, FAILED, REFUNDED, CANCELLED, CONFIRMING
  type            String   // SUBSCRIPTION, TOPUP, SUBSCRIPTION_RENEWAL
  provider        String   @default("PAYPAL") // "PAYPAL", "COINBASE", "SOLANA", "NEAR"
  transactionId   String?  @unique // PayPal Transaction ID 또는 Charge ID
  subscriptionId  String?  // PayPal Subscription ID (구독 결제인 경우)
  description     String?  // "Premium Plan - Monthly" or "500 Credits Top-up"
  creditsGranted  Int?     // 지급된 크레딧 수 (토큰 충전인 경우)
  metadata        String?  // 추가 메타데이터 (JSON string)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // 크립토 전용 필드들
  txHash          String?  @unique // 블록체인 트랜잭션 해시 (유니크)
  walletAddress   String?  // 결제 보낸 지갑 주소
  cryptoCurrency  String?  // "BTC", "ETH", "SOL", "NEAR", "USDC", "USDT"
  cryptoAmount    Float?   // 크립토 기준 결제 금액 (예: 0.05 SOL)
  exchangeRate    Float?   // 결제 당시 환율 (USD 기준, 예: 1 SOL = 150 USD)
  blockNumber     String?  // 블록 번호 (검증용)
  confirmations   Int?      @default(0) // 확인 횟수 (블록체인별 최소 확인 수)
  network         String?  // "mainnet", "testnet", "devnet"
  
  User            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, createdAt]) // 사용자별 결제 내역 조회 최적화
  @@index([transactionId]) // PayPal/Coinbase 트랜잭션 ID로 빠른 조회
  @@index([txHash]) // 블록체인 트랜잭션 해시로 빠른 조회
  @@index([subscriptionId]) // 구독별 결제 내역 조회
  @@index([provider, status]) // 프로바이더별 상태 조회
}
```

**주요 변경사항:**
- `provider` 필드에 "COINBASE", "SOLANA", "NEAR" 추가
- 크립토 전용 필드 추가: `txHash`, `walletAddress`, `cryptoCurrency`, `cryptoAmount`, `exchangeRate`, `blockNumber`, `confirmations`, `network`
- `status`에 "CONFIRMING" 추가 (블록체인 확인 대기 상태)
- `txHash`에 UNIQUE 제약 조건 추가 (중복 트랜잭션 방지)
- 인덱스 추가로 조회 성능 최적화

---

## 4. 기술 스택 및 라이브러리 (Tech Stack)

### Frontend
*   **@coinbase/coinbase-commerce-node**: Coinbase Commerce API 클라이언트
*   **@solana/web3.js**: Solana 블록체인 상호작용
*   **@solana/wallet-adapter-react**: Solana 지갑 연동 (Phantom, Solflare 등)
*   **near-api-js**: NEAR Protocol SDK
*   **@near-wallet-selector/core**: NEAR 지갑 선택기
*   **qrcode.react**: QR 코드 생성 (Solana Pay용)
*   **UI Components**: 기존 디자인 시스템(Tailwind CSS v4, shadcn/ui Nova Preset) 활용
*   **Toast 알림**: Sonner (shadcn/ui)를 사용하여 결제 성공/실패 피드백 제공

### Backend (React Router v7)
*   **@coinbase/coinbase-commerce-node**: Coinbase Commerce 서버 사이드 처리
*   **@solana/web3.js**: Solana 트랜잭션 검증
*   **near-api-js**: NEAR 트랜잭션 검증
*   **axios**: 외부 API 호출 (환율 조회 등)
*   **API Routes**: React Router v7의 파일 기반 라우팅 구조 사용
  - `app/routes/api/payment/coinbase/create-charge.ts`
  - `app/routes/api/payment/solana/create-payment.ts`
  - `app/routes/api/payment/solana/verify.ts`
  - `app/routes/api/payment/near/create-payment.ts`
  - `app/routes/api/payment/near/verify.ts`
  - `app/routes/api/webhooks/coinbase.ts`

### 환경 변수 설정
`.env` 파일에 다음 변수들을 추가해야 합니다:

```env
# Coinbase Commerce
COINBASE_COMMERCE_API_KEY=your_coinbase_commerce_api_key
COINBASE_COMMERCE_WEBHOOK_SECRET=your_webhook_secret

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com  # 또는 https://api.devnet.solana.com (테스트넷)
SOLANA_WALLET_ADDRESS=your_merchant_wallet_address  # 서버 수신 지갑 주소
SOLANA_PRIVATE_KEY=your_private_key  # 서버 지갑 개인키 (환경 변수로 안전하게 관리)

# NEAR
NEAR_NETWORK_ID=mainnet  # 또는 "testnet"
NEAR_NODE_URL=https://rpc.mainnet.near.org  # 또는 https://rpc.testnet.near.org
NEAR_MERCHANT_ACCOUNT_ID=your-merchant.near  # 서버 수신 계정 ID
NEAR_PRIVATE_KEY=your_private_key  # 서버 계정 개인키

# 환율 API (선택사항, 실시간 환율 조회용)
COINGECKO_API_KEY=your_coingecko_api_key  # 또는 무료 사용 가능
```

## 5. 상세 구현 가이드

### 5.1 Coinbase Commerce 구현

#### Phase 1: 설정 및 기본 구조
1.  **Coinbase Commerce 계정 생성**:
    - [Coinbase Commerce Dashboard](https://commerce.coinbase.com/)에서 계정 생성
    - API Key 및 Webhook Secret 발급
    - Webhook URL 등록: `https://yourdomain.com/api/webhooks/coinbase`

2.  **패키지 설치**:
    ```bash
    npm install @coinbase/coinbase-commerce-node
    ```

#### Phase 2: Charge 생성 API
**파일**: `app/routes/api/payment/coinbase/create-charge.ts`

```typescript
import type { ActionFunctionArgs } from "react-router";
import { Client, resources } from "@coinbase/coinbase-commerce-node";
import { auth } from "~/lib/auth.server";
import { z } from "zod";
import { prisma } from "~/lib/db.server";

const { Charge } = resources;

// Coinbase Commerce 클라이언트 초기화
const client = Client.init(process.env.COINBASE_COMMERCE_API_KEY!);

const createChargeSchema = z.object({
  amount: z.number().positive(),
  credits: z.number().int().positive(),
  description: z.string().optional(),
});

export async function action({ request }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const result = createChargeSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        { error: "Invalid request data", details: result.error.errors },
        { status: 400 }
      );
    }

    const { amount, credits, description } = result.data;
    const userId = session.user.id;

    // Charge 생성
    const chargeData = {
      name: description || `${credits} Credits Top-up`,
      description: `Purchase ${credits} credits for $${amount}`,
      local_price: {
        amount: amount.toFixed(2),
        currency: "USD",
      },
      pricing_type: "fixed_price",
      metadata: {
        userId,
        credits,
      },
    };

    const charge = await Charge.create(chargeData);

    // Pending Payment 레코드 생성
    await prisma.payment.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        amount,
        currency: "USD",
        status: "PENDING",
        type: "TOPUP",
        provider: "COINBASE",
        transactionId: charge.id,
        creditsGranted: credits,
        description: chargeData.name,
        metadata: JSON.stringify({
          chargeId: charge.id,
          hostedUrl: charge.hosted_url,
        }),
      },
    });

    return Response.json({
      success: true,
      chargeId: charge.id,
      hostedUrl: charge.hosted_url,
      expiresAt: charge.expires_at,
    });
  } catch (error) {
    console.error("Coinbase charge creation error:", error);
    return Response.json(
      { error: "Failed to create charge" },
      { status: 500 }
    );
  }
}
```

#### Phase 3: Webhook 처리
**파일**: `app/routes/api/webhooks/coinbase.ts`

```typescript
import type { ActionFunctionArgs } from "react-router";
import { Webhook } from "@coinbase/coinbase-commerce-node";
import { prisma } from "~/lib/db.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.text();
    const signature = request.headers.get("X-CC-Webhook-Signature");

    if (!signature) {
      return Response.json(
        { error: "Missing signature" },
        { status: 401 }
      );
    }

    // Webhook 서명 검증
    const event = Webhook.verify(
      body,
      signature,
      process.env.COINBASE_COMMERCE_WEBHOOK_SECRET!
    );

    // charge:confirmed 이벤트 처리
    if (event.type === "charge:confirmed") {
      const charge = event.data;

      // Payment 레코드 찾기
      const payment = await prisma.payment.findUnique({
        where: { transactionId: charge.id },
      });

      if (!payment) {
        console.error(`Payment not found for charge: ${charge.id}`);
        return Response.json({ error: "Payment not found" }, { status: 404 });
      }

      // 이미 처리된 경우 중복 방지
      if (payment.status === "COMPLETED") {
        return Response.json({ success: true, message: "Already processed" });
      }

      // 트랜잭션으로 크레딧 지급 및 Payment 상태 업데이트
      await prisma.$transaction(async (tx) => {
        // Payment 상태 업데이트
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "COMPLETED",
            cryptoCurrency: charge.pricing?.local?.currency || null,
            cryptoAmount: charge.pricing?.local?.amount
              ? parseFloat(charge.pricing.local.amount)
              : null,
            exchangeRate: charge.pricing?.local?.amount
              ? payment.amount / parseFloat(charge.pricing.local.amount)
              : null,
            metadata: JSON.stringify({
              ...JSON.parse(payment.metadata || "{}"),
              confirmedAt: charge.confirmed_at,
              network: charge.network,
            }),
          },
        });

        // 사용자 크레딧 증가
        await tx.user.update({
          where: { id: payment.userId },
          data: {
            credits: {
              increment: payment.creditsGranted || 0,
            },
          },
        });
      });

      return Response.json({ success: true });
    }

    // 다른 이벤트 타입은 로그만 기록
    console.log(`Unhandled event type: ${event.type}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Coinbase webhook error:", error);
    return Response.json(
      { error: "Webhook verification failed" },
      { status: 400 }
    );
  }
}
```

### 5.2 Solana Pay 구현

#### Phase 1: 설정 및 기본 구조
1.  **Solana 지갑 생성**:
    - 서버용 수신 지갑 생성 (Solana CLI 또는 Phantom)
    - 지갑 주소 및 개인키를 환경 변수에 저장

2.  **패키지 설치**:
    ```bash
    npm install @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets qrcode.react
    ```

#### Phase 2: 결제 생성 API
**파일**: `app/routes/api/payment/solana/create-payment.ts`

```typescript
import type { ActionFunctionArgs } from "react-router";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { auth } from "~/lib/auth.server";
import { z } from "zod";
import { prisma } from "~/lib/db.server";
import { createTransferInstruction } from "@solana/web3.js";

const createPaymentSchema = z.object({
  amount: z.number().positive(),
  credits: z.number().int().positive(),
  currency: z.enum(["SOL", "USDC"]).default("USDC"),
});

export async function action({ request }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const result = createPaymentSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        { error: "Invalid request data", details: result.error.errors },
        { status: 400 }
      );
    }

    const { amount, credits, currency } = result.data;
    const userId = session.user.id;

    // Solana 연결 설정
    const connection = new Connection(
      process.env.SOLANA_RPC_URL!,
      "confirmed"
    );

    // 서버 수신 지갑 주소
    const merchantWallet = new PublicKey(process.env.SOLANA_WALLET_ADDRESS!);

    // USDC Mint 주소 (Mainnet: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)
    const USDC_MINT = new PublicKey(
      process.env.SOLANA_NETWORK === "mainnet"
        ? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
        : "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU" // Devnet
    );

    // 환율 조회 (실제 구현 시 CoinGecko API 사용)
    const exchangeRate = await getExchangeRate(currency);

    // 크립토 금액 계산
    const cryptoAmount = amount / exchangeRate;

    // Payment 레코드 생성 (PENDING 상태)
    const payment = await prisma.payment.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        amount,
        currency: "USD",
        status: "PENDING",
        type: "TOPUP",
        provider: "SOLANA",
        creditsGranted: credits,
        description: `${credits} Credits Top-up (${currency})`,
        cryptoCurrency: currency,
        cryptoAmount,
        exchangeRate,
        network: process.env.SOLANA_NETWORK || "mainnet",
        metadata: JSON.stringify({
          merchantWallet: merchantWallet.toString(),
        }),
      },
    });

    // Solana Pay URL 생성 (QR 코드용)
    const solanaPayUrl = `solana:${merchantWallet.toString()}?amount=${cryptoAmount}&reference=${payment.id}&label=${encodeURIComponent(payment.description || "")}`;

    return Response.json({
      success: true,
      paymentId: payment.id,
      merchantWallet: merchantWallet.toString(),
      cryptoAmount,
      currency,
      solanaPayUrl,
      qrCodeData: solanaPayUrl, // QR 코드 생성용
    });
  } catch (error) {
    console.error("Solana payment creation error:", error);
    return Response.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}

// 환율 조회 함수 (CoinGecko API 사용)
async function getExchangeRate(currency: string): Promise<number> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=solana,usd-coin&vs_currencies=usd`
    );
    const data = await response.json();
    
    if (currency === "SOL") {
      return data.solana?.usd || 150; // 기본값
    } else if (currency === "USDC") {
      return 1; // USDC는 항상 $1
    }
    return 1;
  } catch (error) {
    console.error("Exchange rate fetch error:", error);
    // 기본값 반환
    return currency === "SOL" ? 150 : 1;
  }
}
```

#### Phase 3: 트랜잭션 검증 API
**파일**: `app/routes/api/payment/solana/verify.ts`

```typescript
import type { ActionFunctionArgs } from "react-router";
import { Connection, PublicKey } from "@solana/web3.js";
import { auth } from "~/lib/auth.server";
import { z } from "zod";
import { prisma } from "~/lib/db.server";

const verifySchema = z.object({
  paymentId: z.string().uuid(),
  signature: z.string().optional(), // 클라이언트에서 전송한 서명 (선택사항)
});

export async function action({ request }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const result = verifySchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        { error: "Invalid request data", details: result.error.errors },
        { status: 400 }
      );
    }

    const { paymentId, signature } = result.data;

    // Payment 레코드 조회
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment || payment.userId !== session.user.id) {
      return Response.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.status === "COMPLETED") {
      return Response.json({
        success: true,
        status: "COMPLETED",
        message: "Payment already confirmed",
      });
    }

    // Solana 연결 설정
    const connection = new Connection(
      process.env.SOLANA_RPC_URL!,
      "confirmed"
    );

    const merchantWallet = new PublicKey(process.env.SOLANA_WALLET_ADDRESS!);

    // 최근 트랜잭션 조회 (서명이 있는 경우)
    if (signature) {
      const tx = await connection.getTransaction(signature, {
        commitment: "confirmed",
      });

      if (tx && tx.meta?.err === null) {
        // 트랜잭션 확인 성공
        const expectedAmount = payment.cryptoAmount || 0;
        const expectedCurrency = payment.cryptoCurrency || "USDC";

        // 트랜잭션에서 전송 금액 확인 (실제 구현 시 더 정밀한 검증 필요)
        const isValid = await verifyTransaction(
          tx,
          merchantWallet,
          expectedAmount,
          expectedCurrency
        );

        if (isValid) {
          // 트랜잭션으로 크레딧 지급 및 Payment 상태 업데이트
          await prisma.$transaction(async (tx) => {
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: "COMPLETED",
                txHash: signature,
                confirmations: 1,
                blockNumber: tx.slot?.toString() || null,
                metadata: JSON.stringify({
                  ...JSON.parse(payment.metadata || "{}"),
                  verifiedAt: new Date().toISOString(),
                }),
              },
            });

            await tx.user.update({
              where: { id: payment.userId },
              data: {
                credits: {
                  increment: payment.creditsGranted || 0,
                },
              },
            });
          });

          return Response.json({
            success: true,
            status: "COMPLETED",
            txHash: signature,
          });
        }
      }
    }

    // 서명이 없거나 검증 실패 시 Polling 모드
    // 최근 트랜잭션을 조회하여 Payment ID(reference)가 일치하는지 확인
    const recentTxs = await connection.getSignaturesForAddress(
      merchantWallet,
      { limit: 20 }
    );

    for (const txInfo of recentTxs) {
      const tx = await connection.getTransaction(txInfo.signature, {
        commitment: "confirmed",
      });

      if (tx && tx.meta?.err === null) {
        // Payment ID가 메모나 메타데이터에 포함되어 있는지 확인
        // (실제 구현 시 Solana Pay 표준에 따라 reference 필드 확인)
        const isValid = await verifyTransaction(
          tx,
          merchantWallet,
          payment.cryptoAmount || 0,
          payment.cryptoCurrency || "USDC"
        );

        if (isValid) {
          // 트랜잭션으로 크레딧 지급
          await prisma.$transaction(async (tx) => {
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: "COMPLETED",
                txHash: txInfo.signature,
                confirmations: 1,
                blockNumber: tx.slot?.toString() || null,
                walletAddress: tx.transaction.message.accountKeys[0]?.pubkey.toString() || null,
                metadata: JSON.stringify({
                  ...JSON.parse(payment.metadata || "{}"),
                  verifiedAt: new Date().toISOString(),
                }),
              },
            });

            await tx.user.update({
              where: { id: payment.userId },
              data: {
                credits: {
                  increment: payment.creditsGranted || 0,
                },
              },
            });
          });

          return Response.json({
            success: true,
            status: "COMPLETED",
            txHash: txInfo.signature,
          });
        }
      }
    }

    // 아직 확인되지 않음
    return Response.json({
      success: true,
      status: "PENDING",
      message: "Transaction not yet confirmed",
    });
  } catch (error) {
    console.error("Solana verification error:", error);
    return Response.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}

// 트랜잭션 검증 헬퍼 함수
async function verifyTransaction(
  tx: any,
  merchantWallet: PublicKey,
  expectedAmount: number,
  expectedCurrency: string
): Promise<boolean> {
  // 실제 구현 시 트랜잭션의 전송 금액과 수신 주소를 정밀하게 검증
  // 여기서는 간단한 예시만 제공
  try {
    // 트랜잭션의 전송 금액 확인 로직
    // (실제 구현 시 더 정밀한 검증 필요)
    return true; // 임시로 항상 true 반환
  } catch (error) {
    console.error("Transaction verification error:", error);
    return false;
  }
}
```

### 5.3 NEAR Protocol 구현

#### Phase 1: 설정 및 기본 구조
1.  **NEAR 계정 생성**:
    - 서버용 수신 계정 생성 (예: `merchant.near`)
    - 계정 ID 및 개인키를 환경 변수에 저장

2.  **패키지 설치**:
    ```bash
    npm install near-api-js @near-wallet-selector/core @near-wallet-selector/modal-ui
    ```

#### Phase 2: 결제 생성 API
**파일**: `app/routes/api/payment/near/create-payment.ts`

```typescript
import type { ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { z } from "zod";
import { prisma } from "~/lib/db.server";

const createPaymentSchema = z.object({
  amount: z.number().positive(),
  credits: z.number().int().positive(),
});

export async function action({ request }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const result = createPaymentSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        { error: "Invalid request data", details: result.error.errors },
        { status: 400 }
      );
    }

    const { amount, credits } = result.data;
    const userId = session.user.id;

    // NEAR 환율 조회
    const exchangeRate = await getNearExchangeRate();
    const cryptoAmount = amount / exchangeRate;

    // Payment 레코드 생성
    const payment = await prisma.payment.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        amount,
        currency: "USD",
        status: "PENDING",
        type: "TOPUP",
        provider: "NEAR",
        creditsGranted: credits,
        description: `${credits} Credits Top-up (NEAR)`,
        cryptoCurrency: "NEAR",
        cryptoAmount,
        exchangeRate,
        network: process.env.NEAR_NETWORK_ID || "mainnet",
        metadata: JSON.stringify({
          merchantAccount: process.env.NEAR_MERCHANT_ACCOUNT_ID,
        }),
      },
    });

    return Response.json({
      success: true,
      paymentId: payment.id,
      merchantAccount: process.env.NEAR_MERCHANT_ACCOUNT_ID,
      cryptoAmount: cryptoAmount.toFixed(5), // NEAR는 소수점 5자리까지
      currency: "NEAR",
    });
  } catch (error) {
    console.error("NEAR payment creation error:", error);
    return Response.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}

// NEAR 환율 조회
async function getNearExchangeRate(): Promise<number> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=near&vs_currencies=usd`
    );
    const data = await response.json();
    return data.near?.usd || 3.5; // 기본값
  } catch (error) {
    console.error("Exchange rate fetch error:", error);
    return 3.5; // 기본값
  }
}
```

#### Phase 3: 트랜잭션 검증 API
**파일**: `app/routes/api/payment/near/verify.ts`

```typescript
import type { ActionFunctionArgs } from "react-router";
import { connect, keyStores, KeyPair } from "near-api-js";
import { auth } from "~/lib/auth.server";
import { z } from "zod";
import { prisma } from "~/lib/db.server";

const verifySchema = z.object({
  paymentId: z.string().uuid(),
  transactionHash: z.string(),
});

export async function action({ request }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const result = verifySchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        { error: "Invalid request data", details: result.error.errors },
        { status: 400 }
      );
    }

    const { paymentId, transactionHash } = result.data;

    // Payment 레코드 조회
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment || payment.userId !== session.user.id) {
      return Response.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.status === "COMPLETED") {
      return Response.json({
        success: true,
        status: "COMPLETED",
        message: "Payment already confirmed",
      });
    }

    // NEAR 연결 설정
    const keyStore = new keyStores.InMemoryKeyStore();
    const keyPair = KeyPair.fromString(process.env.NEAR_PRIVATE_KEY!);
    await keyStore.setKey(
      process.env.NEAR_NETWORK_ID || "mainnet",
      process.env.NEAR_MERCHANT_ACCOUNT_ID!,
      keyPair
    );

    const near = await connect({
      networkId: process.env.NEAR_NETWORK_ID || "mainnet",
      nodeUrl: process.env.NEAR_NODE_URL!,
      keyStore,
    });

    // 트랜잭션 상태 조회
    const txStatus = await near.connection.provider.txStatus(
      transactionHash,
      process.env.NEAR_MERCHANT_ACCOUNT_ID!
    );

    if (txStatus.status?.SuccessValue) {
      // 트랜잭션 성공 확인
      const transaction = txStatus.transaction;
      const expectedAmount = payment.cryptoAmount || 0;

      // 트랜잭션의 전송 금액 및 수신 계정 확인
      const actions = transaction.actions;
      let isValid = false;

      for (const action of actions) {
        if (action.Transfer) {
          const transferAmount = parseFloat(
            action.Transfer.deposit || "0"
          ) / 1e24; // yoctoNEAR를 NEAR로 변환
          
          if (
            Math.abs(transferAmount - expectedAmount) < 0.001 && // 허용 오차
            transaction.receiver_id === process.env.NEAR_MERCHANT_ACCOUNT_ID
          ) {
            isValid = true;
            break;
          }
        }
      }

      if (isValid) {
        // 트랜잭션으로 크레딧 지급
        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: "COMPLETED",
              txHash: transactionHash,
              confirmations: 1,
              blockNumber: txStatus.transaction_outcome?.block_hash || null,
              walletAddress: transaction.signer_id,
              metadata: JSON.stringify({
                ...JSON.parse(payment.metadata || "{}"),
                verifiedAt: new Date().toISOString(),
              }),
            },
          });

          await tx.user.update({
            where: { id: payment.userId },
            data: {
              credits: {
                increment: payment.creditsGranted || 0,
              },
            },
          });
        });

        return Response.json({
          success: true,
          status: "COMPLETED",
          txHash: transactionHash,
        });
      }
    }

    return Response.json({
      success: true,
      status: "PENDING",
      message: "Transaction verification failed or pending",
    });
  } catch (error) {
    console.error("NEAR verification error:", error);
    return Response.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}
```

---

## 6. 프론트엔드 구현 (Frontend Implementation)

### 6.1 통합 결제 모달 컴포넌트
**파일**: `app/components/payment/PaymentModal.tsx`

사용자가 결제 방식을 선택할 수 있는 통합 모달을 구현합니다.

```typescript
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { PayPalButtons } from "@paypal/react-paypal-js";
import { CoinbaseCommerceButton } from "./CoinbaseCommerceButton";
import { SolanaPayButton } from "./SolanaPayButton";
import { NearPayButton } from "./NearPayButton";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  credits: number;
}

export function PaymentModal({ open, onOpenChange, amount, credits }: PaymentModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>("paypal");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>결제 방법 선택</DialogTitle>
        </DialogHeader>
        
        <Tabs value={selectedProvider} onValueChange={setSelectedProvider}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="paypal">PayPal</TabsTrigger>
            <TabsTrigger value="coinbase">Coinbase</TabsTrigger>
            <TabsTrigger value="solana">Solana</TabsTrigger>
            <TabsTrigger value="near">NEAR</TabsTrigger>
          </TabsList>

          <TabsContent value="paypal">
            <PayPalButtons
              createOrder={async () => {
                const response = await fetch("/api/payment/create-order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ amount, credits }),
                });
                const { orderId } = await response.json();
                return orderId;
              }}
              onApprove={async (data) => {
                const response = await fetch("/api/payment/capture-order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ orderId: data.orderID }),
                });
                if (response.ok) {
                  onOpenChange(false);
                  // Toast 알림은 상위 컴포넌트에서 처리
                }
              }}
            />
          </TabsContent>

          <TabsContent value="coinbase">
            <CoinbaseCommerceButton
              amount={amount}
              credits={credits}
              onSuccess={() => onOpenChange(false)}
            />
          </TabsContent>

          <TabsContent value="solana">
            <SolanaPayButton
              amount={amount}
              credits={credits}
              onSuccess={() => onOpenChange(false)}
            />
          </TabsContent>

          <TabsContent value="near">
            <NearPayButton
              amount={amount}
              credits={credits}
              onSuccess={() => onOpenChange(false)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

### 6.2 Coinbase Commerce 버튼 컴포넌트
**파일**: `app/components/payment/CoinbaseCommerceButton.tsx`

```typescript
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";

interface CoinbaseCommerceButtonProps {
  amount: number;
  credits: number;
  onSuccess: () => void;
}

export function CoinbaseCommerceButton({
  amount,
  credits,
  onSuccess,
}: CoinbaseCommerceButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/payment/coinbase/create-charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, credits }),
      });

      if (!response.ok) {
        throw new Error("Failed to create charge");
      }

      const { hostedUrl } = await response.json();
      
      // 새 창에서 Coinbase Commerce 호스팅 페이지 열기
      window.open(hostedUrl, "_blank", "width=500,height=700");
      
      // Webhook으로 결제 완료를 기다림 (실제 구현 시 Polling 또는 WebSocket 사용)
      toast.info("결제 페이지가 열렸습니다. 결제 완료 후 자동으로 크레딧이 지급됩니다.");
    } catch (error) {
      console.error("Coinbase payment error:", error);
      toast.error("결제 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={loading} className="w-full">
      {loading ? "처리 중..." : `Coinbase Commerce로 결제 ($${amount})`}
    </Button>
  );
}
```

### 6.3 Solana Pay 버튼 컴포넌트
**파일**: `app/components/payment/SolanaPayButton.tsx`

```typescript
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Button } from "~/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

interface SolanaPayButtonProps {
  amount: number;
  credits: number;
  onSuccess: () => void;
}

export function SolanaPayButton({
  amount,
  credits,
  onSuccess,
}: SolanaPayButtonProps) {
  const { publicKey, signTransaction, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [polling, setPolling] = useState(false);

  const handlePayment = async () => {
    if (!connected) {
      setVisible(true);
      return;
    }

    setLoading(true);
    try {
      // 결제 생성
      const response = await fetch("/api/payment/solana/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, credits, currency: "USDC" }),
      });

      if (!response.ok) {
        throw new Error("Failed to create payment");
      }

      const data = await response.json();
      setPaymentData(data);

      // 지갑으로 트랜잭션 전송
      // (실제 구현 시 @solana/web3.js를 사용하여 트랜잭션 구성 및 전송)
      
      // Polling 시작
      setPolling(true);
      pollPaymentStatus(data.paymentId);
    } catch (error) {
      console.error("Solana payment error:", error);
      toast.error("결제 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = async (paymentId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/payment/solana/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId }),
        });

        const data = await response.json();
        
        if (data.status === "COMPLETED") {
          clearInterval(interval);
          setPolling(false);
          toast.success("결제가 완료되었습니다!");
          onSuccess();
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 3000); // 3초마다 확인

    // 5분 후 타임아웃
    setTimeout(() => {
      clearInterval(interval);
      setPolling(false);
    }, 300000);
  };

  if (paymentData) {
    return (
      <div className="space-y-4">
        <div className="flex justify-center">
          <QRCodeSVG value={paymentData.solanaPayUrl} size={200} />
        </div>
        <p className="text-sm text-center text-muted-foreground">
          QR 코드를 스캔하거나 지갑에서 직접 전송하세요
        </p>
        {polling && (
          <p className="text-sm text-center text-blue-500">
            결제 확인 중...
          </p>
        )}
      </div>
    );
  }

  return (
    <Button onClick={handlePayment} disabled={loading} className="w-full">
      {loading
        ? "처리 중..."
        : connected
        ? `Solana로 결제 ($${amount})`
        : "지갑 연결"}
    </Button>
  );
}
```

## 7. 보안 고려사항 (Security Considerations)

### 7.1 Webhook 서명 검증
- **Coinbase Commerce**: `X-CC-Webhook-Signature` 헤더를 사용한 HMAC 검증 필수
- **Solana/NEAR**: 트랜잭션 해시를 서버에서 직접 블록체인 RPC로 검증

### 7.2 트랜잭션 검증
- 모든 크립토 결제는 서버에서 블록체인 상태를 직접 확인해야 함
- 클라이언트에서 받은 트랜잭션 정보를 그대로 신뢰하지 않음
- 최소 확인 횟수(Confirmations) 요구사항:
  - **Solana**: 1 confirmation (약 400ms)
  - **NEAR**: 1 confirmation (약 1-2초)
  - **Bitcoin/Ethereum** (Coinbase Commerce): 자동 처리

### 7.3 중복 처리 방지
- `Payment.txHash`에 UNIQUE 제약 조건으로 중복 트랜잭션 방지
- `Payment.transactionId` (Coinbase Charge ID)도 UNIQUE 제약 조건
- Webhook 이벤트의 idempotency 처리

### 7.4 개인키 관리
- 서버 지갑의 개인키는 절대 클라이언트에 노출하지 않음
- 환경 변수로 관리하고, 프로덕션에서는 Secrets Manager 사용 (AWS Secrets Manager, Vercel Environment Variables 등)
- 읽기 전용 권한이 있는 계정 사용 고려 (가능한 경우)

### 7.5 환율 변동 리스크
- 실시간 환율을 사용하여 크립토 금액 계산
- 결제 시점의 환율을 `exchangeRate` 필드에 저장하여 추적
- 환율 변동이 큰 경우 사용자에게 경고 표시

## 8. 에러 처리 및 사용자 피드백

### Toast 알림 규칙 (Sonner)
프로젝트의 에러 처리 규칙에 따라 모든 결제 관련 액션에 Toast 알림을 사용합니다:

- **성공 케이스**:
  - 토큰 충전 성공: `toast.success("토큰이 성공적으로 충전되었습니다.")`
  - 트랜잭션 확인: `toast.success("결제가 확인되었습니다.")`

- **에러 케이스**:
  - 결제 생성 실패: `toast.error("결제 생성에 실패했습니다.")`
  - 트랜잭션 검증 실패: `toast.error("결제 확인에 실패했습니다. 잠시 후 다시 시도해주세요.")`
  - 지갑 연결 실패: `toast.error("지갑 연결에 실패했습니다.")`
  - 네트워크 오류: `toast.error("네트워크 오류가 발생했습니다.")`

- **정보 케이스**:
  - 결제 대기: `toast.info("결제 확인 중입니다...")`
  - QR 코드 표시: `toast.info("QR 코드를 스캔하여 결제를 완료하세요.")`

### API 에러 응답 형식
모든 API는 일관된 에러 응답 형식을 사용합니다:

```typescript
// 성공
Response.json({ success: true, data: {...} })

// 에러
Response.json({ 
  error: "Error message", 
  code?: "ERROR_CODE",
  details?: {...} 
}, { status: 400 | 401 | 402 | 500 })
```

## 9. 테스트 전략 (Testing Strategy)

### 9.1 Coinbase Commerce 테스트
1. **Sandbox 환경**:
   - Coinbase Commerce Sandbox 계정 생성
   - 테스트용 Charge 생성 및 Webhook 수신 테스트
   - 다양한 결제 상태 시나리오 테스트 (pending, confirmed, failed)

2. **Webhook 테스트**:
   - ngrok 또는 Cloudflare Tunnel로 로컬 서버 노출
   - Coinbase Commerce Webhook URL에 등록
   - 실제 Webhook 이벤트 수신 및 처리 테스트

### 9.2 Solana 테스트
1. **Devnet 환경**:
   - Solana Devnet 사용 (`https://api.devnet.solana.com`)
   - Devnet SOL 받기 (Faucet 사용)
   - Phantom 지갑 Devnet 모드로 테스트

2. **테스트 시나리오**:
   - 트랜잭션 생성 및 전송
   - 트랜잭션 검증 로직 테스트
   - Polling 메커니즘 테스트
   - 실패 케이스 테스트 (잘못된 금액, 타임아웃 등)

### 9.3 NEAR 테스트
1. **Testnet 환경**:
   - NEAR Testnet 사용 (`https://rpc.testnet.near.org`)
   - Testnet NEAR 받기 (Faucet 사용)
   - NEAR Wallet Testnet 모드로 테스트

2. **테스트 시나리오**:
   - 계정 생성 및 로그인
   - 트랜잭션 전송 및 검증
   - 다양한 금액 및 실패 케이스 테스트

### 9.4 통합 테스트
- 전체 결제 플로우 테스트 (프론트엔드 → 백엔드 → 블록체인 → Webhook → DB 업데이트)
- 여러 프로바이더 동시 사용 테스트
- 크레딧 지급 및 차감 로직 테스트

## 10. 마이그레이션 전략 (Migration Strategy)

### 10.1 데이터베이스 마이그레이션
1. **Prisma Schema 업데이트**:
   ```bash
   npx prisma migrate dev --name add_crypto_payment_fields
   ```

2. **기존 데이터 처리**:
   - 기존 PayPal 결제는 `provider = "PAYPAL"`로 유지
   - 크립토 전용 필드는 NULL로 시작 (기존 데이터와 호환)

### 10.2 점진적 롤아웃
1. **Phase 1**: Coinbase Commerce만 도입 (가장 안정적)
2. **Phase 2**: Solana Pay 추가 (Web3 네이티브 사용자 대상)
3. **Phase 3**: NEAR Protocol 추가 (UX 혁신 타겟)

### 10.3 모니터링 및 로깅
- 모든 결제 이벤트를 로그로 기록
- 결제 성공률 모니터링 (프로바이더별)
- 트랜잭션 검증 실패율 추적
- Webhook 처리 실패 알림 설정

## 11. 추가 고려사항 (Additional Considerations)

### 11.1 환율 관리
- **실시간 환율 API**: CoinGecko API 사용 (무료 티어 가능)
- **캐싱**: 환율 데이터를 일정 시간 캐싱하여 API 호출 최소화
- **폴백**: API 실패 시 기본 환율 사용

### 11.2 가스비 처리
- **Solana**: 거의 무료 ($0.00025 미만) - 사용자 부담 가능
- **NEAR**: 매우 저렴 (약 $0.001) - 사용자 부담 가능
- **Coinbase Commerce**: 수수료 포함 (약 1%) - 자동 처리

### 11.3 트랜잭션 모니터링
- 블록체인 트랜잭션 상태 추적 시스템 구축
- 실패한 트랜잭션 재시도 로직 (선택사항)
- 타임아웃 처리 (예: 10분 후 PENDING 상태 자동 취소)

### 11.4 사용자 교육
- 각 결제 방식의 장단점 안내
- 지갑 연결 방법 가이드
- QR 코드 스캔 방법 안내
- 트랜잭션 확인 대기 시간 안내

## 12. 결론 및 추천 (Conclusion & Recommendations)

### 12.1 우선순위
1. **즉시 도입**: **Coinbase Commerce**
   - 인프라 구축이나 블록체인 노드 관리 없이 즉시 암호화폐 결제 지원
   - PayPal과 유사한 개발 경험으로 빠른 통합 가능
   - 안정적이고 신뢰할 수 있는 인프라

2. **차별화 전략**: **Solana Pay**
   - 수수료 제로에 가까운 경험으로 사용자 혜택 제공
   - Web3 네이티브 사용자 층 포섭
   - 빠른 트랜잭션 속도로 우수한 UX

3. **UX 혁신**: **NEAR Protocol**
   - 복잡한 주소 없는 깔끔한 결제 경험
   - 사용자 친화적인 계정 추상화
   - 저렴한 가스비

### 12.2 하이브리드 전략
본 프로젝트에서는 **Coinbase Commerce**를 기본 옵션으로 두고, **NEAR**와 **Solana**를 "Direct Wallet Payment" 옵션으로 추가 제공하여:
- 기술력을 과시하고
- 수수료를 절감하며
- 다양한 사용자 층을 포섭하는 전략을 추천합니다.

### 12.3 구현 순서
1. **Phase 1**: Coinbase Commerce 구현 및 테스트 (1-2주)
2. **Phase 2**: Solana Pay 구현 및 테스트 (2-3주)
3. **Phase 3**: NEAR Protocol 구현 및 테스트 (2-3주)
4. **Phase 4**: 통합 테스트 및 최적화 (1주)

총 예상 기간: **6-9주** (프로바이더별 병렬 개발 가능 시 단축)


## Related Documents
- **Specs**: [Document Management Plan](../01_Concept_Design/09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
