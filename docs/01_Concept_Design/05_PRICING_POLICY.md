
> Created: 2026-02-08
> Last Updated: 2026-02-08
# 요금제 및 마진 분석 보고서 (Pricing & Margin Analysis)

## 1. 개요 (Overview)
본 문서는 '바이춘심' 서비스의 요금제 구조, 원가 분석, 그리고 수익성 확보를 위한 전략을 기술합니다.
기본 AI 모델로 **Gemini 2.0 Flash (추후 3.0)**를 채택하여 높은 마진율을 확보하고, 고성능 모델(GPT-4o 등) 사용 시에는 **가중치 기반 크레딧 차감(Weighted Credit Deduction)** 방식을 적용하여 적자를 방지하는 것이 핵심입니다.

**프로젝트 컨텍스트:**
- **Framework**: React Router v7 (Vite)
- **Database**: Turso (libSQL) with Prisma ORM
- **Authentication**: Better Auth (session-based)
- **AI Integration**: Google Gemini API with LangGraph
- **Payment Systems**: PayPal, Coinbase Commerce, Solana Pay
- **Current Status**: User 모델에 `subscriptionTier` 필드가 이미 존재 (기본값: "FREE")
- **Credit System**: User 모델에 `credits` 필드 추가 예정 (기본값: 100)

---

## 2. 요금제 구성 (Pricing Tiers)

총 4단계의 요금제로 구성되며, 각 등급별로 월 제공 크레딧과 접근 가능한 모델/기능이 차등 적용됩니다.
**참고**: 본 요금제는 PayPal 구현 계획서와 일관성을 유지합니다.

| 등급 (Tier) | 월 가격 | 제공 크레딧 | 일일 크레딧 | 주요 혜택 |
| :--- | :--- | :--- | :--- | :--- |
| **FREE** | **$0** | **1,500** / 월 | **50** / 일 | • Gemini Flash 모델 사용<br>• 기본 대화 기능<br>• 광고 포함 |
| **BASIC** | **$4.99** | **2,000** / 월 | **약 67** / 일 | • Gemini Flash 모델 사용<br>• 광고 제거<br>• 표준 응답 속도 |
| **PREMIUM** | **$14.99** | **10,000** / 월 | **약 333** / 일 | • **모든 모델 접근 가능** (가중치 차감)<br>• 이미지 생성 가능<br>• 빠른 응답 속도 |
| **ULTIMATE** | **$29.99** | **무제한** (FUP) | **무제한** (FUP) | • **모든 기능 우선 처리**<br>• 컨시어지 서비스<br>• 우선 서포트 |

**크레딧 가치 기준**: 
- **1 Credit = $0.0001** (약 0.1원)
- **10 Credits = 1 Gemini Flash 대화** (약 $0.00024 원가 기준)
- 크레딧은 구독 갱신 시 월별로 리필되며, 이전 달 잔여 크레딧은 소멸됩니다 (또는 일정 비율만 이월 가능)

---

## 3. 원가 및 마진 분석 (Cost Analysis)

### 3.1 기준 원가 (Unit Cost)

#### AI 모델 원가 (2024년 기준)
*   **Gemini 2.0 Flash**:
    *   입력: $0.075 / 1M token
    *   출력: $0.30 / 1M token
    *   **1회 대화 비용 (평균 User 2k + AI 300 token)**: 약 **$0.00024** (약 0.3원)
    *   **크레딧 차감**: **10 Credits** (사용자 체감가 약 1원)

*   **Gemini Pro** (향후 도입):
    *   입력: $0.50 / 1M token
    *   출력: $1.50 / 1M token
    *   **1회 대화 비용 (평균)**: 약 **$0.002** (약 2.5원)
    *   **크레딧 차감**: **50 Credits**

*   **GPT-4o** (향후 도입):
    *   입력: $2.50 / 1M token
    *   출력: $10.00 / 1M token
    *   **1회 대화 비용 (평균)**: 약 **$0.03** (약 40원)
    *   **크레딧 차감**: **500 Credits**

*   **이미지 생성** (DALL-E 3 또는 Midjourney API):
    *   **1장 생성 비용**: 약 **$0.04** (약 50원)
    *   **크레딧 차감**: **600 Credits**

#### 결제 수수료 (프로바이더별)
*   **PayPal**: 3.5% + $0.30 (국제 거래)
*   **Coinbase Commerce**: 약 1% (암호화폐 자동 변환 포함)
*   **Solana Pay**: 거의 무료 ($0.00025 미만, 사용자 부담)

**평균 결제 수수료**: 소액 결제($4.99) 기준 약 **$0.47** (9.4%), 대액 결제($29.99) 기준 약 **$1.35** (4.5%)

### 3.2 등급별 예상 마진 분석 (Gemini Flash 기준)

기본 모델(Gemini Flash)만 사용했을 때의 수익성 분석입니다.
**크레딧 기준**: 10 Credits = 1 Gemini Flash 대화

#### BASIC 등급 ($4.99/월)
*   **제공 크레딧**: 2,000 Credits
*   **예상 사용량**: 200회 대화 (2,000 ÷ 10)
*   **API 원가**: $0.048 (200회 × $0.00024)
*   **결제 수수료**: $0.47 (PayPal 기준, 3.5% + $0.30)
*   **총 원가**: $0.52
*   **예상 이익**: **$4.47**
*   **마진율**: **89.6%**

#### PREMIUM 등급 ($14.99/월)
*   **제공 크레딧**: 10,000 Credits
*   **예상 사용량**: 1,000회 대화 (10,000 ÷ 10)
*   **API 원가**: $0.24 (1,000회 × $0.00024)
*   **결제 수수료**: $0.82 (PayPal 기준)
*   **총 원가**: $1.06
*   **예상 이익**: **$13.93**
*   **마진율**: **92.9%**

#### ULTIMATE 등급 ($29.99/월)
*   **제공 크레딧**: 무제한 (FUP 적용)
*   **예상 사용량**: 3,000회 대화 (FUP 기준)
*   **API 원가**: $0.72 (3,000회 × $0.00024)
*   **결제 수수료**: $1.35 (PayPal 기준)
*   **총 원가**: $2.07
*   **예상 이익**: **$27.92**
*   **마진율**: **93.1%**

#### FREE 등급 ($0/월)
*   **제공 크레딧**: 1,500 Credits
*   **예상 사용량**: 150회 대화 (1,500 ÷ 10)
*   **API 원가**: $0.036 (150회 × $0.00024)
*   **결제 수수료**: $0
*   **총 원가**: $0.036
*   **예상 이익**: **-$0.036** (적자)
*   **마진율**: **N/A** (무료 서비스)

> **분석**: 
> - Gemini Flash 모델을 주력으로 사용할 경우, **유료 등급에서 90% 이상의 매우 높은 마진율**을 기대할 수 있습니다.
> - FREE 등급은 마케팅 비용으로 간주하며, 광고 수익으로 일부 상쇄 가능합니다.
> - ULTIMATE 등급은 FUP(Fair Usage Policy)를 적용하여 과도한 사용을 제한할 수 있습니다.

---

## 4. 수익성 방어 전략 (Profit Protection Strategy)

고가의 모델(GPT-4o, Claude 3.5 Sonnet)이나 고비용 기능(이미지 생성)을 도입할 경우, 원가가 급격히 상승하여 적자가 발생할 수 있습니다. 이를 방지하기 위해 **"크레딧 가중치 시스템"**을 도입합니다.

### 4.1 크레딧 차감 가중치 시스템 (Credit Weight System)

**기준**: **10 Credits = 1 Gemini Flash 대화** (원가 $0.00024, 사용자 체감가 약 1원)
고비용 모델은 원가 비율에 따라 배수를 적용하여 차감합니다.

| 기능/모델 | 실제 원가 | **차감 크레딧** | 사용자 체감가 | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| **Gemini Flash (기본)** | $0.00024 (0.3원) | **10 Credits** | 1원 | 기본 대화, 모든 등급 사용 가능 |
| **Gemini Pro** | $0.002 (2.5원) | **50 Credits** | 5원 | 향상된 성능, PREMIUM 이상 |
| **GPT-4o** | $0.03 (40원) | **500 Credits** | 50원 | 최고 성능, PREMIUM 이상 |
| **Claude 3.5 Sonnet** | $0.03 (40원) | **500 Credits** | 50원 | 최고 성능, PREMIUM 이상 |
| **이미지 생성** | $0.04 (50원) | **600 Credits** | 60원 | DALL-E 3 등, PREMIUM 이상 |

### 4.2 등급별 사용 시뮬레이션

#### PREMIUM 등급 ($14.99/월, 10,000 Credits)
다양한 모델을 섞어서 사용할 경우:

*   **Case A (안전형): Gemini Flash만 사용**
    *   1,000회 대화 가능 (10,000 ÷ 10)
    *   API 원가: $0.24
    *   마진: $14.75 (98.4%)

*   **Case B (균형형): 80% Flash + 20% GPT-4o**
    *   Flash: 800회 (8,000 Credits)
    *   GPT-4o: 4회 (2,000 Credits)
    *   API 원가: $0.192 + $0.12 = $0.312
    *   마진: $14.68 (97.9%)

*   **Case C (고성능형): 50% Flash + 50% GPT-4o**
    *   Flash: 100회 (1,000 Credits)
    *   GPT-4o: 18회 (9,000 Credits)
    *   API 원가: $0.024 + $0.54 = $0.564
    *   마진: $14.43 (96.2%)

*   **Case D (극단형): GPT-4o만 사용**
    *   20회 대화 가능 (10,000 ÷ 500)
    *   API 원가: $0.60
    *   마진: $14.39 (95.9%)

> **분석**: PREMIUM 등급은 어떤 조합으로 사용하더라도 **95% 이상의 마진율**을 유지할 수 있습니다.

#### ULTIMATE 등급 ($29.99/월, 무제한 FUP)
FUP(Fair Usage Policy) 적용: 월 3,000회 대화 또는 30,000 Credits까지 무료, 초과 시 추가 과금 또는 속도 제한

*   **FUP 범위 내 (30,000 Credits)**:
    *   Gemini Flash만: 3,000회 대화
    *   API 원가: $0.72
    *   마진: $29.27 (97.6%)

*   **FUP 초과 시**: 추가 크레딧 충전 필요 또는 다음 달까지 대기

### 4.3 크레딧 가치 기준 (Credit Valuation Standard)

**최종 확정 기준**:
*   **1 Credit = $0.0001** (약 0.1원)
*   **10 Credits = 1 Gemini Flash 대화** (원가 $0.00024, 사용자 체감가 약 1원)
*   **크레딧 환산**: $1 = 10,000 Credits

**등급별 크레딧 가치**:
*   **FREE**: 1,500 Credits = $0.15 가치
*   **BASIC**: 2,000 Credits = $0.20 가치 (월 $4.99 → 약 25배 마진)
*   **PREMIUM**: 10,000 Credits = $1.00 가치 (월 $14.99 → 약 15배 마진)
*   **ULTIMATE**: 무제한 (FUP 적용, 월 30,000 Credits까지 = $3.00 가치)

---

## 5. 단계별 구현 계획 (Implementation Steps)

### Phase 1: 데이터베이스 스키마 업데이트
1.  **User 모델 확장** (PayPal 구현 계획서와 일관성 유지):
    ```prisma
    model User {
      // ... 기존 필드들
      subscriptionTier   String?   @default("FREE")
      credits            Int       @default(100) // 현재 보유 크레딧
      // ... 기타 필드
    }
    ```

2.  **마이그레이션 실행**:
    ```bash
    npx prisma migrate dev --name add_user_credits
    ```

### Phase 2: 크레딧 정책 파일 생성
**파일**: `app/lib/credit-policy.ts`

```typescript
/**
 * 구독 플랜 정의
 * PayPal 구현 계획서와 일관성 유지
 */
export const SUBSCRIPTION_PLANS = {
  FREE: {
    tier: "FREE",
    monthlyPrice: 0,
    creditsPerMonth: 1500, // 일 50회 × 30일
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
    features: ["고급 AI 모델", "빠른 응답", "이미지 생성"],
  },
  ULTIMATE: {
    tier: "ULTIMATE",
    monthlyPrice: 29.99,
    creditsPerMonth: -1, // 무제한 (FUP 적용)
    aiModel: "gemini-2.0-flash-exp", // 향후 최고급 모델
    features: ["무제한 토큰", "컨시어지 서비스", "우선 서포트"],
  },
} as const;

/**
 * 모델별 크레딧 차감 비용
 * 기준: 10 Credits = 1 Gemini Flash 대화
 */
export const MODEL_CREDIT_COSTS = {
  "gemini-2.0-flash-exp": 10,  // 기본 모델
  "gemini-2.0-flash": 10,      // 기본 모델
  "gemini-pro": 50,            // 향상된 성능
  "gpt-4o": 500,               // 최고 성능
  "claude-3-5-sonnet": 500,    // 최고 성능
  "image-generation": 600,     // 이미지 생성
} as const;

/**
 * 등급별 사용 가능한 모델
 */
export const TIER_MODEL_ACCESS: Record<string, string[]> = {
  FREE: ["gemini-2.0-flash-exp"],
  BASIC: ["gemini-2.0-flash-exp"],
  PREMIUM: ["gemini-2.0-flash-exp", "gemini-pro", "gpt-4o", "claude-3-5-sonnet", "image-generation"],
  ULTIMATE: ["gemini-2.0-flash-exp", "gemini-pro", "gpt-4o", "claude-3-5-sonnet", "image-generation"],
};

/**
 * 크레딧 차감 함수
 */
export function calculateCreditCost(
  model: string,
  tokenUsage?: { promptTokens: number; completionTokens: number }
): number {
  const baseCost = MODEL_CREDIT_COSTS[model as keyof typeof MODEL_CREDIT_COSTS] || 10;
  
  // 토큰 사용량이 제공되면 정밀 계산 가능 (향후 구현)
  // 현재는 기본 비용 반환
  return baseCost;
}
```

### Phase 3: AI 서버 로직 연동
**파일**: `app/lib/ai.server.ts` 수정

1.  **크레딧 확인 및 차감 로직 추가**:
    ```typescript
    import { calculateCreditCost } from "./credit-policy";
    import { prisma } from "./db.server";

    export async function generateAIResponse(
      // ... 기존 파라미터
      userId: string | null = null,
      // ...
    ) {
      // 크레딧 확인 (userId가 있는 경우)
      if (userId) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.credits < 10) { // 최소 크레딧 확인
          throw new Error("Insufficient credits");
        }
      }

      // AI 응답 생성
      const result = await graph.invoke({...});

      // 크레딧 차감 (userId가 있는 경우)
      if (userId && result.messages) {
        const model = "gemini-2.0-flash-exp"; // 실제 사용 모델
        const creditCost = calculateCreditCost(model);
        
        await prisma.user.update({
          where: { id: userId },
          data: { credits: { decrement: creditCost } }
        });
      }

      return result;
    }
    ```

### Phase 4: API 엔드포인트 수정
**파일**: `app/routes/api/messages/index.ts` 수정

1.  **메시지 생성 시 크레딧 확인 및 차감**:
    ```typescript
    import { calculateCreditCost } from "~/lib/credit-policy";
    import { generateAIResponse } from "~/lib/ai.server";

    export async function action({ request }: ActionFunctionArgs) {
      // ... 기존 코드

      // 사용자 크레딧 확인
      const user = await prisma.user.findUnique({ 
        where: { id: session.user.id } 
      });

      if (!user || user.credits < 10) {
        return Response.json(
          { error: "Insufficient credits" }, 
          { status: 402 } // Payment Required
        );
      }

      // AI 응답 생성
      const response = await generateAIResponse(...);

      // 크레딧 차감 (트랜잭션)
      await prisma.$transaction(async (tx) => {
        const creditCost = calculateCreditCost("gemini-2.0-flash-exp");
        await tx.user.update({
          where: { id: session.user.id },
          data: { credits: { decrement: creditCost } }
        });
      });

      // ... 기존 코드
    }
    ```

### Phase 5: 프론트엔드 UI 구현
1.  **크레딧 잔액 표시**: `app/components/chat/ChatHeader.tsx` 수정
    ```typescript
    // 사용자 크레딧 표시
    <div className="text-sm text-muted-foreground">
      잔여 크레딧: {user.credits.toLocaleString()}
    </div>
    ```

2.  **크레딧 부족 경고**: `app/components/chat/MessageInput.tsx` 수정
    ```typescript
    {user.credits < 10 && (
      <div className="text-sm text-yellow-600">
        크레딧이 부족합니다. 충전이 필요합니다.
      </div>
    )}
    ```

3.  **모델 선택 시 비용 표시**: 고급 모델 선택 시 크레딧 소모량 안내

### Phase 6: 구독 갱신 시 크레딧 리필
**파일**: Webhook 핸들러에서 처리 (PayPal 구현 계획서 참조)

1.  **월별 크레딧 리필 로직**:
    ```typescript
    // 구독 갱신 시 크레딧 리필
    const plan = SUBSCRIPTION_PLANS[user.subscriptionTier as keyof typeof SUBSCRIPTION_PLANS];
    if (plan && plan.creditsPerMonth > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { 
          credits: plan.creditsPerMonth, // 매월 리필 (이전 잔액 대체)
          // 또는: credits: { increment: plan.creditsPerMonth } // 누적
        }
      });
    }
    ```

---

## 6. 추가 고려사항 (Additional Considerations)

### 6.1 크레딧 충전 패키지 (Token Top-up)
단건 결제로 크레딧을 추가 충전할 수 있는 패키지를 제공합니다.

| 패키지 | 가격 | 제공 크레딧 | 크레딧/달러 | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| **소액** | $5 | 5,000 | 1,000 | 기본 충전 |
| **표준** | $10 | 12,000 | 1,200 | 20% 보너스 |
| **대량** | $20 | 26,000 | 1,300 | 30% 보너스 |
| **프리미엄** | $50 | 70,000 | 1,400 | 40% 보너스 |

**구독자 할인**: 구독 중인 사용자는 추가 10% 보너스 크레딧 제공

### 6.2 크레딧 소멸 정책
*   **구독 크레딧**: 월별 리필 시 이전 달 잔여 크레딧은 소멸 (또는 20%만 이월)
*   **충전 크레딧**: 구매한 크레딧은 소멸되지 않음 (영구 보유)
*   **무료 크레딧**: 매일 리필되는 무료 크레딧은 당일 미사용 시 소멸

### 6.3 사용량 모니터링
*   **실시간 추적**: `AgentExecution` 모델을 활용하여 실제 토큰 사용량 추적
*   **사용량 통계**: `app/routes/api/stats/usage.ts` API로 사용자별 사용량 제공
*   **알림 시스템**: 크레딧이 10% 이하로 떨어지면 사용자에게 알림

### 6.4 FUP (Fair Usage Policy) 적용
ULTIMATE 등급의 무제한 크레딧은 FUP를 적용합니다:
*   **월 기본 제공**: 30,000 Credits (약 3,000회 대화)
*   **초과 사용 시**: 다음 달까지 대기 또는 추가 충전 필요
*   **우선 처리**: ULTIMATE 등급 사용자는 항상 우선 처리

### 6.5 환불 및 취소 정책
*   **구독 취소**: 현재 기간 종료 시까지 크레딧 사용 가능
*   **환불**: 미사용 크레딧에 대해서만 환불 가능 (결제 수수료 제외)
*   **크레딧 환불**: 충전 크레딧은 환불 불가 (서비스 이용 약관)

## 7. 결론 (Conclusion)

### 7.1 핵심 요약
1.  **높은 마진율**: Gemini Flash 모델을 주력으로 사용할 경우, **유료 등급에서 90% 이상의 매우 높은 마진율**을 기대할 수 있습니다.
2.  **가중치 시스템**: 고성능 모델(GPT-4o 등) 사용 시에도 **크레딧 가중치 시스템**으로 수익성을 유지할 수 있습니다.
3.  **확장 가능성**: **"10 Credits = 1 Gemini Flash 대화"** 기준으로 시스템을 구축하면, 어떤 모델을 연동하더라도 흑자를 유지할 수 있습니다.

### 7.2 수익성 보장 전략
*   **기본 모델 우선**: 대부분의 사용자가 Gemini Flash를 사용하도록 유도
*   **고급 모델 선택적 제공**: PREMIUM 이상 등급에서만 고급 모델 접근 가능
*   **FUP 적용**: 무제한 크레딧은 FUP로 과도한 사용 방지
*   **크레딧 소멸**: 월별 리필 시 잔여 크레딧 소멸로 사용 유도

### 7.3 향후 개선 방향
*   **동적 가격 조정**: 사용량이 예상보다 높을 경우 경고 및 가격 조정
*   **프로모션**: 사용량이 낮을 경우 보너스 크레딧 제공
*   **번들 패키지**: 구독 + 크레딧 충전 조합 할인
*   **기업용 플랜**: 대량 사용자를 위한 전용 플랜 제공


## Related Documents
- **Foundation**: [Document Management Plan](./09_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조
