/**
 * 채팅 관련 상수
 * - 결제 임계값, X402 금액 등 서버/클라이언트 공용 상수
 */

/** 채팅 1회 분량 최소 CHOCO 잔액 */
export const MIN_REQUIRED_CHOCO = 10;

/** CHOCO ↔ USD 환율 (1 USD = 1,000 CHOCO) */
export const CHOCO_PER_USD = 1_000;

/**
 * 페이월 아이템별 CHOCO 가격
 * chat/$id.tsx PAYWALL_TRIGGER_CONFIG 및 서버 검증에 동일하게 사용
 */
export const PAYWALL_ITEM_PRICES = {
  memory_ticket: 500,
  secret_episode: 3_000,
  memory_album: 2_000,
  voice_ticket: 500,
} as const;
