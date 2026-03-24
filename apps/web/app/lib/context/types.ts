/**
 * User Context 5-Layer System Types
 *
 * 명세서: docs/features/chat/user-context-layers-spec.md (Section 10.3)
 */

// =============================================================================
// Layer 1: Heartbeat (접속 리듬, 빈도)
// =============================================================================

export interface HeartbeatDoc {
    /** 마지막 접속 시각 (ISO timestamp) */
    lastSeenAt: string;
    /** 최근 7일 대화 횟수 */
    recentDaysCount: number;
    /** 누적 대화 수 */
    totalConversations: number;
    /** 평균 대화 시간 (분) */
    avgSessionDuration?: number;
    /** 감정 추이 요약 (예: "요즘 피곤하다고 자주 말함") */
    emotionTrend?: string;
    /** 연속 접속일 */
    streakDays: number;
    /** 최근 감정 키워드 */
    lastEmotionKeywords?: string[];
}

// =============================================================================
// Layer 2: Identity (닉네임, 호칭, 관계)
// =============================================================================

export type Honorific = "반말" | "존댓말" | "혼합";
export type RelationshipType = "팬" | "친구" | "연인" | "동생" | "오빠/언니";

export interface IdentityDoc {
    /** 유저가 불리고 싶은 이름 */
    nickname: string;
    /** 말투 설정 */
    honorific: Honorific;
    /** 관계 유형 */
    relationshipType: RelationshipType;
    /** 유저가 설정한 호칭 (예: "오빠", "자기야") */
    customTitle?: string;
    /** 대화에서 추론한 특성 */
    inferredTraits?: string[];
}

// =============================================================================
// Layer 3: Soul (가치관, 소원, 고민) - PREMIUM/ULTIMATE only
// =============================================================================

export interface SoulDoc {
    /** 중요하게 여기는 가치 */
    values?: string[];
    /** 소원, 목표 */
    dreams?: string[];
    /** 두려움, 걱정 */
    fears?: string[];
    /** 반복되는 고민 */
    recurringWorries?: string[];
    /** 삶의 단계 (예: "취준생", "직장인", "학생") */
    lifePhase?: string;
    /** 전체 요약 문단 */
    summary?: string;
}

// =============================================================================
// Layer 4: Tools (규칙, 특별한 날)
// =============================================================================

export interface SpecialDate {
    /** 날짜 (MM-DD 형식) */
    date: string;
    /** 설명 (예: "생일", "기념일") */
    description: string;
}

export interface CustomRule {
    /** 조건 */
    condition: string;
    /** 동작 */
    action: string;
}

export interface ToolsDoc {
    /** 피할 주제 */
    avoidTopics?: string[];
    /** 특별한 날 (생일, 기념일) */
    specialDates?: SpecialDate[];
    /** 활성화된 기능 */
    enabledFeatures?: string[];
    /** 비활성화된 기능 */
    disabledFeatures?: string[];
    /** 커스텀 규칙 */
    customRules?: CustomRule[];
}

// =============================================================================
// Layer 5: Memory (개별 항목은 DB 테이블로 관리)
// =============================================================================

export type MemoryCategory =
    | "preference"   // 선호도 (좋아하는 음식, 취미 등)
    | "event"        // 이벤트 (특별한 일, 경험)
    | "person"       // 인물 (가족, 친구)
    | "worry"        // 고민
    | "goal"         // 목표
    | "fact"         // 사실 정보
    | "other";       // 기타

export interface MemoryItem {
    id: string;
    content: string;
    category?: MemoryCategory;
    importance: number;  // 1-10
    createdAt: Date;
    expiresAt?: Date;
    isArchived: boolean;
}

// =============================================================================
// Combined Context (5계층 통합)
// =============================================================================

export interface UserContextData {
    characterId: string;
    heartbeat: HeartbeatDoc | null;
    identity: IdentityDoc | null;
    soul: SoulDoc | null;
    tools: ToolsDoc | null;
    memoryCount: number;
}

// =============================================================================
// Default Values
// =============================================================================

export const DEFAULT_HEARTBEAT: HeartbeatDoc = {
    lastSeenAt: new Date().toISOString(),
    recentDaysCount: 0,
    totalConversations: 0,
    streakDays: 0,
};

export const DEFAULT_IDENTITY: IdentityDoc = {
    nickname: "",
    honorific: "존댓말",
    relationshipType: "팬",
};

export const DEFAULT_SOUL: SoulDoc = {};

export const DEFAULT_TOOLS: ToolsDoc = {};
