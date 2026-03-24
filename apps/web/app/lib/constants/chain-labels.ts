/**
 * 사용자에게 노출되는 온체인/지갑 관련 라벨.
 * 체인 기술명을 사용자에게 노출하지 않고 일반화된 용어를 사용합니다.
 *
 * Created: 2026-02-11
 * Last Updated: 2026-02-11
 */

export const CHAIN_LABELS = {
    /** 지갑 연결 요청 문구 */
    WALLET_CONNECT_PROMPT: "지갑을 연결해 주세요",

    /** 지갑 연결 버튼 */
    WALLET_CONNECT_BUTTON: "지갑 연결하기",

    /** 네이티브 자산 잔액 단위 (빈 문자열이면 숫자만 표시) */
    NATIVE_BALANCE_UNIT: "",

    /** 입금 다이얼로그 제목 */
    DEPOSIT_DIALOG_TITLE: "입금 받기",

    /** 입금 안내 문구 */
    DEPOSIT_INSTRUCTION: "아래 QR 코드를 스캔하거나 주소를 복사하여 입금하세요.",

    /** 환전 비율 라벨 (예: CHOCO/NEAR → CHOCO 단위) */
    EXCHANGE_RATE_LABEL: "CHOCO",

    /** 환전 다이얼로그 설명 */
    SWAP_DESCRIPTION: "입금된 자산을 감지하여 CHOCO로 변환합니다.",

    /** 현재 환율 표시 (좌측 단위) */
    RATE_FROM_UNIT: "1",

    /** 입금 확인 문구 */
    DEPOSIT_CONFIRM_PROMPT: "입금하셨나요?",

    /** 결제 완료 메시지 */
    PAYMENT_SUCCESS_MESSAGE: "온체인 결제가 성공적으로 확인되었습니다.",

    /** 결제 방법 버튼 라벨 */
    PAYMENT_METHOD_BUTTON: "온체인 결제",

    /** 계정 ID 플레이스홀더 */
    ACCOUNT_ID_PLACEHOLDER: "본인 계정 ID (예: user.example)",

    /** 지갑 키 관리 다이얼로그 설명 */
    WALLET_KEY_DESCRIPTION: "지갑의 프라이빗 키를 확인하고 내보낼 수 있습니다.",

    /** 히스토리에서 체인 표시 시 (환전 건) */
    HISTORY_LABEL_SWAP: "환전 (Swap)",

    /** 히스토리에서 체인 표시 시 (사용 건) */
    HISTORY_LABEL_USE: "사용",

    /** 히스토리 금액 표시 시 fromChain 대체용 */
    HISTORY_AMOUNT_UNIT: "입금",
} as const;

/**
 * 백엔드/DB에서 반환되는 fromChain 값을 사용자 표시용으로 변환합니다.
 * LEGACY/NEAR(과거 데이터) -> HISTORY_LABEL_SWAP 등
 */
export function formatChainForDisplay(chain: string | null | undefined): string {
    if (!chain) return CHAIN_LABELS.HISTORY_LABEL_USE;
    const upper = String(chain).toUpperCase();
    if (upper === "LEGACY" || upper === "NEAR") return CHAIN_LABELS.HISTORY_LABEL_SWAP;
    return chain;
}

/** 히스토리 등에서 금액+체인 표시용 (레거시 체인명 숨김) */
export function formatChainUnitForDisplay(chain: string | null | undefined): string {
    if (!chain) return CHAIN_LABELS.HISTORY_AMOUNT_UNIT;
    const upper = String(chain).toUpperCase();
    if (upper === "LEGACY" || upper === "NEAR") return CHAIN_LABELS.HISTORY_AMOUNT_UNIT;
    return chain;
}
