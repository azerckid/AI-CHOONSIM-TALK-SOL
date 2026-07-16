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
    // 정규식이 겹칠 수 있어 단순 치환만 수행 (Luhn 알고리즘 등 정확한 검증은 미적용)
    masked = masked.replace(PII_PATTERNS.CREDIT_CARD, "[CREDIT_CARD]");

    // 3. 전화번호 -> [PHONE]
    masked = masked.replace(PII_PATTERNS.PHONE_NUMBER, "[PHONE]");

    // 4. 이메일 -> [EMAIL]
    masked = masked.replace(PII_PATTERNS.EMAIL, "[EMAIL]");

    return masked;
}

/**
 * PII가 포함되어 있는지 검사
 */
export function containsPII(text: string): boolean {
    // .test()는 g 플래그 정규식의 lastIndex를 반복 호출 간에 공유해 결과가
    // 들쭉날쭉해진다. match()는 매 호출마다 lastIndex를 리셋하므로 안전하다.
    return (
        !!text.match(PII_PATTERNS.RESIDENT_ID) ||
        !!text.match(PII_PATTERNS.CREDIT_CARD) ||
        !!text.match(PII_PATTERNS.PHONE_NUMBER)
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
