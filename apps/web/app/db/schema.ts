import { sqliteTable, text, integer, real, blob, index, unique } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// ---------------------------------------------------------
// User & Auth
// ---------------------------------------------------------

export const user = sqliteTable("User", {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    password: text("password"),
    name: text("name"),
    image: text("image"),
    provider: text("provider").notNull().default("local"),
    snsId: text("snsId"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
    emailVerified: integer("emailVerified", { mode: "boolean" }).notNull().default(false),
    avatarUrl: text("avatarUrl"),
    status: text("status").notNull().default("OFFLINE"),
    /** @deprecated Phase 9: memory는 5계층(UserContext/UserMemoryItem)으로 이전. 읽기 fallback만 유지, 쓰기 중단. */
    bio: text("bio"),
    coverImage: text("coverImage"),
    isPrivate: integer("isPrivate", { mode: "boolean" }).default(false),
    checkInTime: text("checkInTime"),
    pushSubscription: text("pushSubscription"),
    subscriptionTier: text("subscriptionTier").default("FREE"),
    subscriptionStatus: text("subscriptionStatus"),
    subscriptionId: text("subscriptionId").unique(),
    currentPeriodEnd: integer("currentPeriodEnd", { mode: "timestamp" }),
    lastTokenRefillAt: integer("lastTokenRefillAt", { mode: "timestamp" }),
    credits: integer("credits").notNull().default(0),
    role: text("role").default("USER"),
    chocoBalance: text("chocoBalance").notNull().default("0"), // BigNumber string
    chocoLastSyncAt: integer("chocoLastSyncAt", { mode: "timestamp" }),
    heartsCount: integer("heartsCount").notNull().default(0),
    /** Phase 3-1: BASIC+ 주 1회 무료 선톡 쿼터. 해당 주에 무료 선톡 사용한 시각. */
    lastFreePresendAt: integer("lastFreePresendAt", { mode: "timestamp" }),
});

export const account = sqliteTable("account", {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId").notNull(),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
    refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
    id: text("id").primaryKey(),
    expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId").notNull(),
});

export const verification = sqliteTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }),
    updatedAt: integer("updatedAt", { mode: "timestamp" }),
});

// ---------------------------------------------------------
// Character & Items
// ---------------------------------------------------------

export const character = sqliteTable("Character", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    role: text("role").notNull(),
    bio: text("bio").notNull(),
    personaPrompt: text("personaPrompt").notNull(),
    greetingMessage: text("greetingMessage"),
    isOnline: integer("isOnline", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const characterMedia = sqliteTable("CharacterMedia", {
    id: text("id").primaryKey(),
    characterId: text("characterId").notNull(),
    url: text("url").notNull(),
    type: text("type").notNull(),
    sortOrder: integer("sortOrder").notNull().default(0),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => {
    return [
        index("CharacterMedia_charId_type_idx").on(table.characterId, table.type),
    ];
});

export const item = sqliteTable("Item", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    priceCredits: integer("priceCredits"), // Deprecated: 호환성을 위해 유지
    priceChoco: integer("priceChoco"), // 신규: CHOCO 가격 (1 Credit = 1 CHOCO)
    priceUSD: real("priceUSD"),
    priceKRW: real("priceKRW"),
    iconUrl: text("iconUrl"),
    description: text("description"),
    isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
}, (table) => {
    return [
        index("Item_isActive_idx").on(table.isActive),
    ];
});

export const characterStat = sqliteTable("CharacterStat", {
    id: text("id").primaryKey(),
    characterId: text("characterId").notNull().unique(),
    totalHearts: integer("totalHearts").notNull().default(0),
    totalUniqueGivers: integer("totalUniqueGivers").notNull().default(0),
    currentEmotion: text("currentEmotion").default("JOY"),
    emotionExpiresAt: integer("emotionExpiresAt", { mode: "timestamp" }),
    lastGiftAt: integer("lastGiftAt", { mode: "timestamp" }),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
}, (table) => {
    return [
        index("CharacterStat_totalHearts_idx").on(table.totalHearts),
    ];
});

export const giftLog = sqliteTable("GiftLog", {
    id: text("id").primaryKey(),
    fromUserId: text("fromUserId").notNull(),
    toCharacterId: text("toCharacterId").notNull(),
    itemId: text("itemId").notNull(),
    amount: integer("amount").notNull(),
    message: text("message"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => {
    return [
        index("GiftLog_fromUserId_createdAt_idx").on(table.fromUserId, table.createdAt),
        index("GiftLog_toCharacterId_createdAt_idx").on(table.toCharacterId, table.createdAt),
    ];
});

export const userInventory = sqliteTable("UserInventory", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    itemId: text("itemId").notNull(),
    quantity: integer("quantity").notNull().default(0),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
}, (table) => {
    return [
        unique("UserInventory_userId_itemId_unique").on(table.userId, table.itemId),
    ];
});

// ---------------------------------------------------------
// User Context (5-Layer Context System)
// ---------------------------------------------------------

export const userContext = sqliteTable("UserContext", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    characterId: text("characterId").notNull(),

    // heartbeat (JSON) - 접속 리듬, 빈도
    heartbeatDoc: text("heartbeatDoc"),

    // identity (JSON) - 닉네임, 호칭, 관계
    identityDoc: text("identityDoc"),

    // soul (JSON) - 가치관, 소원, 고민
    soulDoc: text("soulDoc"),

    // tools (JSON) - 규칙, 특별한 날
    toolsDoc: text("toolsDoc"),

    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
    unique("userContext_user_character_unique").on(table.userId, table.characterId),
    index("userContext_userId_idx").on(table.userId),
]);

export const userMemoryItem = sqliteTable("UserMemoryItem", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    characterId: text("characterId").notNull(),

    // 기억 내용
    content: text("content").notNull(),
    category: text("category"),  // preference, event, person, worry, etc.
    importance: integer("importance").notNull().default(5),  // 1-10

    // 추출 원본 추적
    sourceConversationId: text("sourceConversationId"),
    sourceMessageId: text("sourceMessageId"),

    // 메타데이터
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    expiresAt: integer("expiresAt", { mode: "timestamp" }),  // 만료일 (선택)
    isArchived: integer("isArchived", { mode: "boolean" }).notNull().default(false),
}, (table) => [
    index("userMemoryItem_user_character_idx").on(table.userId, table.characterId),
    index("userMemoryItem_category_idx").on(table.category),
    index("userMemoryItem_importance_idx").on(table.importance),
]);

// ---------------------------------------------------------
// Chat & Messaging
// ---------------------------------------------------------

export const conversation = sqliteTable("Conversation", {
    id: text("id").primaryKey(),
    characterId: text("characterId").notNull().default("choonsim"),
    title: text("title").notNull(),
    userId: text("userId"),
    personaMode: text("personaMode").notNull().default("lover"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const message = sqliteTable("Message", {
    id: text("id").primaryKey(),
    role: text("role").notNull(),
    content: text("content").notNull(),
    conversationId: text("conversationId").notNull(),
    mediaUrl: text("mediaUrl"),
    mediaType: text("mediaType"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    type: text("type").notNull().default("TEXT"),
    senderId: text("senderId"),
    roomId: text("roomId"),
    read: integer("read", { mode: "boolean" }).notNull().default(false),
    isInterrupted: integer("isInterrupted", { mode: "boolean" }).notNull().default(false),
    interruptedAt: integer("interruptedAt", { mode: "timestamp" }),
});

export const messageLike = sqliteTable("MessageLike", {
    id: text("id").primaryKey(),
    messageId: text("messageId").notNull(),
    userId: text("userId").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => {
    return [
        unique("MessageLike_messageId_userId_unique").on(table.messageId, table.userId),
    ];
});

export const agentExecution = sqliteTable("AgentExecution", {
    id: text("id").primaryKey(),
    messageId: text("messageId").notNull(),
    agentName: text("agentName").notNull(),
    intent: text("intent").notNull(),
    promptTokens: integer("promptTokens").notNull().default(0),
    completionTokens: integer("completionTokens").notNull().default(0),
    totalTokens: integer("totalTokens").notNull().default(0),
    rawOutput: text("rawOutput"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const dMConversation = sqliteTable("DMConversation", {
    id: text("id").primaryKey(),
    isGroup: integer("isGroup", { mode: "boolean" }).notNull().default(false),
    groupName: text("groupName"),
    lastMessageAt: integer("lastMessageAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    isAccepted: integer("isAccepted", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const dMParticipant = sqliteTable("DMParticipant", {
    id: text("id").primaryKey(),
    conversationId: text("conversationId").notNull(),
    userId: text("userId").notNull(),
    joinedAt: integer("joinedAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    leftAt: integer("leftAt", { mode: "timestamp" }),
    isAdmin: integer("isAdmin", { mode: "boolean" }).notNull().default(false),
});

export const directMessage = sqliteTable("DirectMessage", {
    id: text("id").primaryKey(),
    conversationId: text("conversationId").notNull(),
    senderId: text("senderId").notNull(),
    content: text("content").notNull(),
    isRead: integer("isRead", { mode: "boolean" }).notNull().default(false),
    deletedBySender: integer("deletedBySender", { mode: "boolean" }).notNull().default(false),
    deletedByReceiver: integer("deletedByReceiver", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
    mediaUrl: text("mediaUrl"),
    mediaType: text("mediaType"),
});

// ---------------------------------------------------------
// Travel & Feed
// ---------------------------------------------------------

export const travelPlan = sqliteTable("TravelPlan", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    startDate: integer("startDate", { mode: "timestamp" }),
    endDate: integer("endDate", { mode: "timestamp" }),
    status: text("status").notNull().default("PLANNING"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const travelPlanItem = sqliteTable("TravelPlanItem", {
    id: text("id").primaryKey(),
    travelPlanId: text("travelPlanId").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    date: integer("date", { mode: "timestamp" }),
    time: text("time"),
    locationName: text("locationName"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    order: integer("order").notNull().default(0),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
    status: text("status").default("TODO"),
});

export const tweet = sqliteTable("Tweet", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    content: text("content").notNull(),
    parentId: text("parentId"),
    isRetweet: integer("isRetweet", { mode: "boolean" }).notNull().default(false),
    originalTweetId: text("originalTweetId"),
    deletedAt: integer("deletedAt", { mode: "timestamp" }),
    locationName: text("locationName"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    address: text("address"),
    travelDate: integer("travelDate", { mode: "timestamp" }),
    country: text("country"),
    city: text("city"),
    travelPlanId: text("travelPlanId"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
    visibility: text("visibility").default("PUBLIC"),
});

export const tweetEmbedding = sqliteTable("TweetEmbedding", {
    id: text("id").primaryKey(),
    tweetId: text("tweetId").notNull().unique(),
    vector: blob("vector").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const tweetTravelTag = sqliteTable("TweetTravelTag", {
    id: text("id").primaryKey(),
    tweetId: text("tweetId").notNull(),
    travelTagId: text("travelTagId").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const travelTag = sqliteTable("TravelTag", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const bookmark = sqliteTable("Bookmark", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    tweetId: text("tweetId").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    collectionId: text("collectionId"),
});

export const bookmarkCollection = sqliteTable("BookmarkCollection", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    name: text("name").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const like = sqliteTable("Like", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    tweetId: text("tweetId").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const retweet = sqliteTable("Retweet", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    tweetId: text("tweetId").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const media = sqliteTable("Media", {
    id: text("id").primaryKey(),
    tweetId: text("tweetId").notNull(),
    type: text("type").notNull(),
    url: text("url").notNull(),
    thumbnailUrl: text("thumbnailUrl"),
    altText: text("altText"),
    order: integer("order").notNull().default(0),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    publicId: text("publicId"),
});

// ---------------------------------------------------------
// Misc & Others
// ---------------------------------------------------------

// --- NEW SCHEMA FOR SYSTEM SETTINGS ---
export const systemSettings = sqliteTable("SystemSettings", {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
    description: text("description"),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
// --------------------------------------

export const follow = sqliteTable("Follow", {
    id: text("id").primaryKey(),
    followerId: text("followerId").notNull(),
    followingId: text("followingId").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    status: text("status").default("ACCEPTED"),
});

export const payment = sqliteTable("Payment", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    amount: real("amount").notNull(),
    currency: text("currency").notNull().default("USD"),
    status: text("status").notNull(),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    description: text("description"),
    creditsGranted: integer("creditsGranted"),
    metadata: text("metadata"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
    transactionId: text("transactionId").unique(),
    subscriptionId: text("subscriptionId"),
    paymentKey: text("paymentKey"),
    txHash: text("txHash").unique(),
    walletAddress: text("walletAddress"),
    cryptoCurrency: text("cryptoCurrency"),
    cryptoAmount: real("cryptoAmount"),
    exchangeRate: real("exchangeRate"),
    blockNumber: text("blockNumber"),
    confirmations: integer("confirmations").default(0),
    network: text("network"),
}, (table) => {
    return [
        index("Payment_userId_createdAt_idx").on(table.userId, table.createdAt),
        index("Payment_transactionId_idx").on(table.transactionId),
        index("Payment_subscriptionId_idx").on(table.subscriptionId),
        index("Payment_txHash_idx").on(table.txHash),
        index("Payment_provider_status_idx").on(table.provider, table.status),
        index("Payment_type_idx").on(table.type),
    ];
});

export const notice = sqliteTable("Notice", {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    type: text("type").notNull().default("NOTICE"),
    imageUrl: text("imageUrl"),
    isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
    isPinned: integer("isPinned", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const systemLog = sqliteTable("SystemLog", {
    id: text("id").primaryKey(),
    level: text("level").notNull().default("INFO"),
    category: text("category").notNull().default("SYSTEM"),
    message: text("message").notNull(),
    stackTrace: text("stackTrace"),
    metadata: text("metadata"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const tokenConfig = sqliteTable("TokenConfig", {
    id: text("id").primaryKey(),
    tokenContract: text("tokenContract").notNull().unique(),
    tokenSymbol: text("tokenSymbol").notNull().default("CHOCO"),
    tokenName: text("tokenName").notNull().default("CHOONSIM Token"),
    decimals: integer("decimals").notNull().default(18),
    isEnabled: integer("isEnabled", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const mission = sqliteTable("Mission", {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    rewardCredits: integer("rewardCredits").notNull().default(0),
    type: text("type").notNull().default("DAILY"),
    isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const userMission = sqliteTable("UserMission", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    missionId: text("missionId").notNull(),
    status: text("status").notNull().default("IN_PROGRESS"),
    progress: integer("progress").notNull().default(0),
    lastUpdated: integer("lastUpdated", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => {
    return [
        unique("UserMission_userId_missionId_unique").on(table.userId, table.missionId),
    ];
});

export const fanPost = sqliteTable("FanPost", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    content: text("content").notNull(),
    imageUrl: text("imageUrl"),
    likes: integer("likes").notNull().default(0),
    isApproved: integer("isApproved", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const relayerLog = sqliteTable("RelayerLog", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    requestIp: text("requestIp"),
    txHash: text("txHash"),
    error: text("error"),
    status: text("status").notNull().default("SUCCESS"), // SUCCESS, FAILED
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => {
    return [
        index("RelayerLog_userId_createdAt_idx").on(table.userId, table.createdAt),
        index("RelayerLog_requestIp_createdAt_idx").on(table.requestIp, table.createdAt),
    ];
});

// ---------------------------------------------------------
// Multichain & Exchange (Phase 6.5 ~ 9)
// ---------------------------------------------------------

export const multichainAddress = sqliteTable("MultichainAddress", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    chain: text("chain").notNull(), // "LEGACY", "BTC", "ETH", "SOL" 등
    address: text("address").notNull(), // 해당 체인의 주소
    derivationPath: text("derivationPath"), // 파생 경로
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
}, (table) => ({
    userIdChainUnique: unique().on(table.userId, table.chain),
    userIdIdx: index("multichainAddress_userId_idx").on(table.userId),
    chainIdx: index("multichainAddress_chain_idx").on(table.chain),
}));

export const exchangeRate = sqliteTable("ExchangeRate", {
    id: text("id").primaryKey(),
    tokenPair: text("tokenPair").notNull().unique(), // "LEGACY/USD", "ETH/USD" 등
    rate: real("rate").notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
}, (table) => ({
    tokenPairIdx: index("exchangeRate_tokenPair_idx").on(table.tokenPair),
}));

export const exchangeLog = sqliteTable("ExchangeLog", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    fromChain: text("fromChain").notNull(), // "LEGACY", "BTC", "ETH", "SOL" 등
    fromAmount: text("fromAmount").notNull(), // BigNumber string
    toToken: text("toToken").notNull(), // "CHOCO", "CREDIT"
    toAmount: text("toAmount").notNull(), // BigNumber string
    rate: real("rate").notNull(), // 적용된 시세
    txHash: text("txHash").notNull().unique(), // 입금 트랜잭션 해시
    sweepTxHash: text("sweepTxHash"), // 자산 회수 트랜잭션 해시
    status: text("status").notNull().default("COMPLETED"), // COMPLETED, FAILED, PENDING_SWEEP
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
    userIdIdx: index("exchangeLog_userId_idx").on(table.userId),
    txHashIdx: index("exchangeLog_txHash_idx").on(table.txHash),
}));

// ---------------------------------------------------------
// Notifications
// ---------------------------------------------------------

export const notification = sqliteTable("Notification", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    type: text("type").notNull(), // "SYSTEM" | "CHAT" | "PAYMENT" | "PROMO"
    title: text("title").notNull(),
    body: text("body").notNull(),
    isRead: integer("isRead", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
    index("Notification_userId_isRead_idx").on(table.userId, table.isRead),
    index("Notification_userId_createdAt_idx").on(table.userId, table.createdAt),
]);

// ---------------------------------------------------------
// Relations Definitions
// ---------------------------------------------------------

export const userRelations = relations(user, ({ many }) => ({
    inventory: many(userInventory),
    giftLogs: many(giftLog),
    userMissions: many(userMission),
    fanPosts: many(fanPost),
    bookmarks: many(bookmark),
    bookmarkCollections: many(bookmarkCollection),
    conversations: many(conversation),
    dmParticipants: many(dMParticipant),
    directMessages: many(directMessage),
    likes: many(like),
    messageLikes: many(messageLike),
    payments: many(payment),
    relayerLogs: many(relayerLog),
    retweets: many(retweet),
    travelPlans: many(travelPlan),
    tweets: many(tweet),
    following: many(follow, { relationName: "following" }),
    followers: many(follow, { relationName: "followers" }),
    multichainAddresses: many(multichainAddress),
    exchangeLogs: many(exchangeLog),
    userContexts: many(userContext),
    userMemoryItems: many(userMemoryItem),
    notifications: many(notification),
}));

export const userContextRelations = relations(userContext, ({ one, many }) => ({
    user: one(user, {
        fields: [userContext.userId],
        references: [user.id],
    }),
    memoryItems: many(userMemoryItem),
}));

export const userMemoryItemRelations = relations(userMemoryItem, ({ one }) => ({
    user: one(user, {
        fields: [userMemoryItem.userId],
        references: [user.id],
    }),
    context: one(userContext, {
        fields: [userMemoryItem.userId, userMemoryItem.characterId],
        references: [userContext.userId, userContext.characterId],
    }),
    sourceConversation: one(conversation, {
        fields: [userMemoryItem.sourceConversationId],
        references: [conversation.id],
    }),
    sourceMessage: one(message, {
        fields: [userMemoryItem.sourceMessageId],
        references: [message.id],
    }),
}));

export const characterRelations = relations(character, ({ one, many }) => ({
    media: many(characterMedia),
    stats: one(characterStat),
    gifts: many(giftLog),
    conversations: many(conversation),
}));

export const characterStatRelations = relations(characterStat, ({ one }) => ({
    character: one(character, {
        fields: [characterStat.characterId],
        references: [character.id],
    }),
}));

export const characterMediaRelations = relations(characterMedia, ({ one }) => ({
    character: one(character, {
        fields: [characterMedia.characterId],
        references: [character.id],
    }),
}));

export const conversationRelations = relations(conversation, ({ one, many }) => ({
    user: one(user, {
        fields: [conversation.userId],
        references: [user.id],
    }),
    character: one(character, {
        fields: [conversation.characterId],
        references: [character.id],
    }),
    messages: many(message),
}));

export const messageRelations = relations(message, ({ one, many }) => ({
    conversation: one(conversation, {
        fields: [message.conversationId],
        references: [conversation.id],
    }),
    likes: many(messageLike),
    agentExecutions: many(agentExecution),
}));

export const agentExecutionRelations = relations(agentExecution, ({ one }) => ({
    message: one(message, {
        fields: [agentExecution.messageId],
        references: [message.id],
    }),
}));

export const itemRelations = relations(item, ({ many }) => ({
    userInventories: many(userInventory),
    giftLogs: many(giftLog),
}));

export const giftLogRelations = relations(giftLog, ({ one }) => ({
    user: one(user, {
        fields: [giftLog.fromUserId],
        references: [user.id],
    }),
    character: one(character, {
        fields: [giftLog.toCharacterId],
        references: [character.id],
    }),
    item: one(item, {
        fields: [giftLog.itemId],
        references: [item.id],
    }),
}));

export const userInventoryRelations = relations(userInventory, ({ one }) => ({
    user: one(user, {
        fields: [userInventory.userId],
        references: [user.id],
    }),
    item: one(item, {
        fields: [userInventory.itemId],
        references: [item.id],
    }),
}));

export const dMConversationRelations = relations(dMConversation, ({ many }) => ({
    participants: many(dMParticipant),
    messages: many(directMessage),
}));

export const dMParticipantRelations = relations(dMParticipant, ({ one }) => ({
    user: one(user, {
        fields: [dMParticipant.userId],
        references: [user.id],
    }),
    conversation: one(dMConversation, {
        fields: [dMParticipant.conversationId],
        references: [dMConversation.id],
    }),
}));

export const directMessageRelations = relations(directMessage, ({ one }) => ({
    user: one(user, {
        fields: [directMessage.senderId],
        references: [user.id],
    }),
    conversation: one(dMConversation, {
        fields: [directMessage.conversationId],
        references: [dMConversation.id],
    }),
}));

export const tweetRelations = relations(tweet, ({ one, many }) => ({
    user: one(user, {
        fields: [tweet.userId],
        references: [user.id],
    }),
    likes: many(like),
    retweets: many(retweet),
    bookmarks: many(bookmark),
    media: many(media),
    tags: many(tweetTravelTag),
    parent: one(tweet, {
        fields: [tweet.parentId],
        references: [tweet.id],
        relationName: "replies",
    }),
    replies: many(tweet, {
        relationName: "replies",
    }),
    originalTweet: one(tweet, {
        fields: [tweet.originalTweetId],
        references: [tweet.id],
        relationName: "quotedTweets",
    }),
    quotes: many(tweet, {
        relationName: "quotedTweets",
    }),
}));

export const mediaRelations = relations(media, ({ one }) => ({
    tweet: one(tweet, {
        fields: [media.tweetId],
        references: [tweet.id],
    }),
}));

export const likeRelations = relations(like, ({ one }) => ({
    user: one(user, {
        fields: [like.userId],
        references: [user.id],
    }),
    tweet: one(tweet, {
        fields: [like.tweetId],
        references: [tweet.id],
    }),
}));

export const retweetRelations = relations(retweet, ({ one }) => ({
    user: one(user, {
        fields: [retweet.userId],
        references: [user.id],
    }),
    tweet: one(tweet, {
        fields: [retweet.tweetId],
        references: [tweet.id],
    }),
}));

export const travelPlanRelations = relations(travelPlan, ({ one, many }) => ({
    user: one(user, {
        fields: [travelPlan.userId],
        references: [user.id],
    }),
    items: many(travelPlanItem),
}));

export const travelPlanItemRelations = relations(travelPlanItem, ({ one }) => ({
    plan: one(travelPlan, {
        fields: [travelPlanItem.travelPlanId],
        references: [travelPlan.id],
    }),
}));

export const bookmarkRelations = relations(bookmark, ({ one }) => ({
    user: one(user, {
        fields: [bookmark.userId],
        references: [user.id],
    }),
    tweet: one(tweet, {
        fields: [bookmark.tweetId],
        references: [tweet.id],
    }),
}));

export const userMissionRelations = relations(userMission, ({ one }) => ({
    user: one(user, {
        fields: [userMission.userId],
        references: [user.id],
    }),
    mission: one(mission, {
        fields: [userMission.missionId],
        references: [mission.id],
    }),
}));

export const fanPostRelations = relations(fanPost, ({ one }) => ({
    user: one(user, {
        fields: [fanPost.userId],
        references: [user.id],
    }),
}));

export const bookmarkCollectionRelations = relations(bookmarkCollection, ({ one, many }) => ({
    user: one(user, {
        fields: [bookmarkCollection.userId],
        references: [user.id],
    }),
    bookmarks: many(bookmark),
}));

export const followRelations = relations(follow, ({ one }) => ({
    follower: one(user, {
        fields: [follow.followerId],
        references: [user.id],
        relationName: "following",
    }),
    following: one(user, {
        fields: [follow.followingId],
        references: [user.id],
        relationName: "followers",
    }),
}));

export const multichainAddressRelations = relations(multichainAddress, ({ one }) => ({
    user: one(user, {
        fields: [multichainAddress.userId],
        references: [user.id],
    }),
}));

export const exchangeLogRelations = relations(exchangeLog, ({ one }) => ({
    user: one(user, {
        fields: [exchangeLog.userId],
        references: [user.id],
    }),
}));

export const paymentRelations = relations(payment, ({ one }) => ({
    user: one(user, {
        fields: [payment.userId],
        references: [user.id],
    }),
}));

export const relayerLogRelations = relations(relayerLog, ({ one }) => ({
    user: one(user, {
        fields: [relayerLog.userId],
        references: [user.id],
    }),
}));

export const notificationRelations = relations(notification, ({ one }) => ({
    user: one(user, {
        fields: [notification.userId],
        references: [user.id],
    }),
}));
