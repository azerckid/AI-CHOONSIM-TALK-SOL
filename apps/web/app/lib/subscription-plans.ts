
/**
 * 구독 플랜 정의
 * PAYMENT_IMPLEMENTATION_PLAN.md 및 PRICING_AND_MARGIN_ANALYSIS.md 기준
 */

export interface SubscriptionPlan {
    tier: "FREE" | "BASIC" | "PREMIUM" | "ULTIMATE";
    name: string;
    monthlyPrice: number;
    monthlyPriceKRW: number;
    creditsPerMonth: number;
    aiModel: string;
    features: string[];
    description: string;
    paypalPlanId?: string; // PayPal Plan ID (Sandbox/Production)
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
    FREE: {
        tier: "FREE",
        name: "Free Starter",
        monthlyPrice: 0,
        monthlyPriceKRW: 0,
        creditsPerMonth: 1500, // 일 50회 * 30일
        aiModel: "gemini-2.5-flash",
        features: [
            "기본 AI 대화 (Gemini 2.5 Flash)",
            "일일 50 CHOCO",
            "광고 포함",
            "커뮤니티 지원"
        ],
        description: "AI 챗봇을 가볍게 체험해보고 싶은 분들을 위한 플랜입니다."
    },
    BASIC: {
        tier: "BASIC",
        name: "Basic Fan",
        monthlyPrice: 4.99,
        monthlyPriceKRW: 6900,
        creditsPerMonth: 2000,
        aiModel: "gemini-2.5-flash",
        features: [
            "모든 Free 기능 포함",
            "광고 제거",
            "월 2,000 CHOCO",
            "표준 응답 속도"
        ],
        description: "광고 없이 쾌적하게 대화를 즐기고 싶은 분들에게 적합합니다.",
        paypalPlanId: "P-5K454582VA7953222NFNKGFA"
    },
    PREMIUM: {
        tier: "PREMIUM",
        name: "Premium Lover",
        monthlyPrice: 14.99,
        monthlyPriceKRW: 19900,
        creditsPerMonth: 10000,
        aiModel: "gpt-4o", // 예시: UI 표시용
        features: [
            "모든 Basic 기능 포함",
            "월 10,000 CHOCO 대용량",
            "고급 모델(GPT-4o, Claude 3.5) 접근 가능",
            "이미지 생성 기능",
            "빠른 응답 속도"
        ],
        description: "고성능 AI와 다양한 기능을 마음껏 사용하고 싶은 분들을 위한 베스트셀러 플랜입니다.",
        paypalPlanId: "P-41T04774YU1463158NFNKGFI"
    },
    ULTIMATE: {
        tier: "ULTIMATE",
        name: "Ultimate Soulmate",
        monthlyPrice: 29.99,
        monthlyPriceKRW: 39900,
        creditsPerMonth: 30000, // FUP 적용 (사실상 무제한급)
        aiModel: "gpt-4o",
        features: [
            "모든 Premium 기능 포함",
            "무제한 CHOCO (FUP 적용)",
            "우선 처리 (Priority Queue)",
            "전용 컨시어지 서비스",
            "우선 서포트 지원"
        ],
        description: "한계 없는 대화와 최고의 서비스를 경험하고 싶은 분들을 위한 궁극의 플랜입니다.",
        paypalPlanId: "P-39869672589972749NFNKGFI"
    }
} as const;

/**
 * 단건 토큰 충전 패키지 정의
 */
export const CREDIT_PACKAGES = [
    {
        id: "credit_pack_small",
        price: 5.00,
        priceKRW: 6900,
        credits: 5000,
        bonus: 0,
        name: "Starter Pack",
        isPopular: false
    },
    {
        id: "credit_pack_medium",
        price: 10.00,
        priceKRW: 13900,
        credits: 12000,
        bonus: 2000,
        name: "Value Pack",
        isPopular: true
    },
    {
        id: "credit_pack_large",
        price: 20.00,
        priceKRW: 27900,
        credits: 26000,
        bonus: 6000,
        name: "Pro Pack",
        isPopular: false
    },
    {
        id: "credit_pack_mega",
        price: 50.00,
        priceKRW: 69000,
        credits: 70000,
        bonus: 20000,
        name: "Mega Pack",
        isPopular: false
    }
] as const;
