/**
 * PII (Personal Identifiable Information) Filter
 *
 * 명세 7.2에 따라 민감 정보를 탐지하여 마스킹 처리한다.
 * - 신용카드 번호
 * - 주민등록번호/외국인등록번호
 * - 전화번호
 * - 이메일 (선택적)
 * - 계좌번호 (일반적인 패턴)
 */

export const PII_PATTERNS = {
    // 신용카드: 13~19자리 숫자, 대시/공백 허용
    CREDIT_CARD: /\b(?:\d{4}[-\s]?){3}\d{1,4}\b/g,

    // 주민등록번호 (한국): 6자리-7자리
    RESIDENT_ID: /\b\d{6}[-\s]?[1-4]\d{6}\b/g,

    // 전화번호 (한국/국제): 010-1234-5678, +82-10...
    PHONE_NUMBER: /\b(?:\+?82|0)1[0-9]{1}[-\s]?[0-9]{3,4}[-\s]?[0-9]{4}\b/g,

    // 이메일: basic email pattern
    EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

    // 계좌번호 (관대항 패턴): 10~14자리 숫자, 대시 포함
    BANK_ACCOUNT: /\b\d{3,6}[-\s]?\d{2,6}[-\s]?\d{3,6}\b/g
};

/**
 * 텍스트 내 PII를 마스킹 처리
 * @param text 원본 텍스트
 * @returns 마스킹된 텍스트
 */
export function maskPII(text: string): string {
    let masked = text;

    // 1. 주민등록번호 -> [RESIDENT_ID]
    masked = masked.replace(PII_PATTERNS.RESIDENT_ID, "[RESIDENT_ID]");

    // 2. 신용카드 -> [CREDIT_CARD]
    // 주민번호와 겹칠 수 있으므로 순서 중요 (주민번호 먼저)
    markedCreditCard: {
        // 정규식이 겹칠 수 있어 단순 치환만 수행
        // 실제로는 Luhn 알고리즘 등을 써야 정확하나, 여기서는 패턴 매칭만 수행
        masked = masked.replace(PII_PATTERNS.CREDIT_CARD, match => {
            // 1년(YYYY) 등 단순 숫자는 제외하기 위해 길이 체크 등 추가 가능하나
            // 일단 패턴 매칭되면 마스킹
            // 4자리 숫자 3개 이상 반복되는 경우만 필터링하도록 정규식이 되어 있음
            return "[CREDIT_CARD]";
        });
    }

    // 3. 전화번호 -> [PHONE]
    masked = masked.replace(PII_PATTERNS.PHONE_NUMBER, "[PHONE]");

    // 4. 계좌번호 -> [ACCOUNT]
    // 전화번호/카드번호랑 겹칠 수 있어 가장 나중에, 그리고 매우 보수적으로 적용 필요
    // 여기서는 간단히 10자리 이상 연속된 숫자에 대시 섞인 경우 등을 처리
    // (현재 정규식은 오탐 가능성이 있어 실제 서비스에선 제외하거나 개선 필요)
    // 안전을 위해 이메일 먼저
    masked = masked.replace(PII_PATTERNS.EMAIL, "[EMAIL]");

    // 계좌번호 패턴은 오탐이 많아 일단 주석 처리 또는 매우 명확한 경우만
    // masked = masked.replace(PII_PATTERNS.BANK_ACCOUNT, "[ACCOUNT]");

    return masked;
}

/**
 * PII가 포함되어 있는지 검사
 */
export function containsPII(text: string): boolean {
    return (
        PII_PATTERNS.RESIDENT_ID.test(text) ||
        PII_PATTERNS.CREDIT_CARD.test(text) ||
        PII_PATTERNS.PHONE_NUMBER.test(text)
    );
}

/**
 * memory 저장용: PII를 마스킹한 문자열 반환. 빈 문자열이면 null.
 * 명세 7.2 - 저장 직전 마스킹 적용 (extractAndSaveMemoriesFromConversation 등에서 사용)
 */
export function sanitizeForMemory(text: string): string | null {
    if (text == null || typeof text !== "string") return null;
    const trimmed = text.trim();
    if (trimmed.length === 0) return null;
    return maskPII(trimmed);
}
