/**
 * Route Loader Data Types
 *
 * React Router v7의 useLoaderData<typeof loader>() 타입 추론이
 * Drizzle ORM Date 타입이 포함된 복잡한 쿼리 결과에서 `never`를 반환하는 문제를 우회.
 *
 * Response.json() 직렬화 후 Date 필드 → string 변환을 반영합니다.
 */
import type * as schema from "~/db/schema";
import type { Message } from "~/lib/chat/types";

// JSON 직렬화 후 Date → string 변환을 반영하는 헬퍼
type Serial<T> = {
    [K in keyof T]: T[K] extends Date
        ? string
        : T[K] extends Date | null
        ? string | null
        : T[K];
};

// Drizzle $inferSelect 기반 내부 row 타입
type UserRow = typeof schema.user.$inferSelect;
type CharacterRow = typeof schema.character.$inferSelect;
type CharacterMediaRow = typeof schema.characterMedia.$inferSelect;
type ConversationRow = typeof schema.conversation.$inferSelect;
type MessageRow = typeof schema.message.$inferSelect;
type NoticeRow = typeof schema.notice.$inferSelect;
type MissionRow = typeof schema.mission.$inferSelect;
type CharacterStatRow = typeof schema.characterStat.$inferSelect;
type FanPostRow = typeof schema.fanPost.$inferSelect;
type ItemRow = typeof schema.item.$inferSelect;
type UserInventoryRow = typeof schema.userInventory.$inferSelect;
type ExchangeLogRow = typeof schema.exchangeLog.$inferSelect;

// ─── 공통 직렬화 타입 ─────────────────────────────────────────────────────────

export type SUser = Serial<UserRow>;
export type SCharacterMedia = Serial<CharacterMediaRow>;
export type SCharacter = Serial<CharacterRow> & { media: SCharacterMedia[] };
export type SConversation = Serial<ConversationRow>;
export type SMessage = Serial<MessageRow>;
export type SNotice = Serial<NoticeRow>;
export type SMission = Serial<MissionRow>;
export type SCharacterStat = Serial<CharacterStatRow>;
export type SFanPost = Serial<FanPostRow>;
export type SItem = Serial<ItemRow>;
export type SUserInventory = Serial<UserInventoryRow>;
export type SExchangeLog = Serial<ExchangeLogRow>;

// ─── Route별 Loader Data 타입 ─────────────────────────────────────────────────

export type SettingsLoaderData = {
    user: Pick<SUser, "id" | "name" | "email" | "image" | "chocoBalance"> | undefined;
};

export type ProfileEditLoaderData = {
    user: Pick<SUser, "id" | "name" | "bio" | "avatarUrl" | "image" | "email"> | undefined;
};

export type NoticesLoaderData = {
    notices: SNotice[];
};

export type NoticeDetailLoaderData = {
    notice: SNotice;
};

export type MissionsLoaderData = {
    missions: (SMission & { status: string; progress: number })[];
};

export type ChatListLoaderData = {
    conversations: (SConversation & {
        messages: SMessage[];
        character: SCharacter;
    })[];
    allCharacters: SCharacter[];
};

export type FandomLoaderData = {
    user: unknown;
    allCharacters: SCharacter[];
    selectedCharacter: SCharacter;
    characterStat: SCharacterStat | undefined;
    missions: (SMission & { progress: number; completed: boolean })[];
    notices: SNotice[];
    leaderboard: { rank: number; name: string; points: number; avatar: string }[];
    feedPosts: (SFanPost & {
        user: Pick<SUser, "name" | "image" | "avatarUrl"> | null;
    })[];
    characterId: string;
};

export type HomeLoaderData = {
    user: unknown;
    todaysPick: SCharacter | null | undefined;
    recentConversations: (SConversation & {
        character: SCharacter;
        messages: SMessage[];
    })[];
    trendingIdols: (SCharacter | null | undefined)[];
    notices: SNotice[];
    isAuthenticated: boolean;
    walletStatus: string | null;
    unreadNotificationCount: number;
};

export type ChatDetailLoaderData = {
    messages: Message[];
    user: SUser & {
        inventory: (SUserInventory & { item: SItem })[];
    };
    conversation: SConversation & {
        character: SCharacter;
    };
    characterStat: SCharacterStat | undefined;
    paypalClientId: string | undefined;
    tossClientKey: string | undefined;
    heartItem: SItem | undefined;
};
