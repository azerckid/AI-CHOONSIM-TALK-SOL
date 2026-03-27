import { sqliteTable, type AnySQLiteColumn, text, integer, index, uniqueIndex, real, blob } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const account = sqliteTable("account", {
	id: text().primaryKey().notNull(),
	accountId: text().notNull(),
	providerId: text().notNull(),
	userId: text().notNull(),
	accessToken: text(),
	refreshToken: text(),
	idToken: text(),
	accessTokenExpiresAt: integer(),
	refreshTokenExpiresAt: integer(),
	scope: text(),
	password: text(),
	createdAt: integer().notNull(),
	updatedAt: integer().notNull(),
});

export const agentExecution = sqliteTable("AgentExecution", {
	id: text().primaryKey().notNull(),
	messageId: text().notNull(),
	agentName: text().notNull(),
	intent: text().notNull(),
	promptTokens: integer().default(0).notNull(),
	completionTokens: integer().default(0).notNull(),
	totalTokens: integer().default(0).notNull(),
	rawOutput: text(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
});

export const bookmark = sqliteTable("Bookmark", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	tweetId: text().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	collectionId: text(),
});

export const bookmarkCollection = sqliteTable("BookmarkCollection", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	name: text().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().notNull(),
});

export const character = sqliteTable("Character", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	role: text().notNull(),
	bio: text().notNull(),
	personaPrompt: text().notNull(),
	greetingMessage: text(),
	isOnline: integer({ mode: "boolean" }).default(false).notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().notNull(),
});

export const characterMedia = sqliteTable("CharacterMedia", {
	id: text().primaryKey().notNull(),
	characterId: text().notNull(),
	url: text().notNull(),
	type: text().notNull(),
	sortOrder: integer().default(0).notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
},
(table) => [
	index("CharacterMedia_charId_type_idx").on(table.characterId, table.type),
]);

export const characterStat = sqliteTable("CharacterStat", {
	id: text().primaryKey().notNull(),
	characterId: text().notNull(),
	totalHearts: integer().default(0).notNull(),
	totalUniqueGivers: integer().default(0).notNull(),
	currentEmotion: text().default("JOY"),
	emotionExpiresAt: integer(),
	lastGiftAt: integer(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().notNull(),
},
(table) => [
	index("CharacterStat_totalHearts_idx").on(table.totalHearts),
	uniqueIndex("CharacterStat_characterId_unique").on(table.characterId),
]);

export const conversation = sqliteTable("Conversation", {
	id: text().primaryKey().notNull(),
	characterId: text().default("chunsim").notNull(),
	title: text().notNull(),
	userId: text(),
	personaMode: text().default("lover").notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().notNull(),
});

export const dmConversation = sqliteTable("DMConversation", {
	id: text().primaryKey().notNull(),
	isGroup: integer({ mode: "boolean" }).default(false).notNull(),
	groupName: text(),
	lastMessageAt: integer().default(sql`(unixepoch())`).notNull(),
	isAccepted: integer({ mode: "boolean" }).default(false).notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().notNull(),
});

export const dmParticipant = sqliteTable("DMParticipant", {
	id: text().primaryKey().notNull(),
	conversationId: text().notNull(),
	userId: text().notNull(),
	joinedAt: integer().default(sql`(unixepoch())`).notNull(),
	leftAt: integer(),
	isAdmin: integer({ mode: "boolean" }).default(false).notNull(),
});

export const directMessage = sqliteTable("DirectMessage", {
	id: text().primaryKey().notNull(),
	conversationId: text().notNull(),
	senderId: text().notNull(),
	content: text().notNull(),
	isRead: integer({ mode: "boolean" }).default(false).notNull(),
	deletedBySender: integer({ mode: "boolean" }).default(false).notNull(),
	deletedByReceiver: integer({ mode: "boolean" }).default(false).notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().notNull(),
	mediaUrl: text(),
	mediaType: text(),
});

export const exchangeLog = sqliteTable("ExchangeLog", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	fromChain: text().notNull(),
	fromAmount: text().notNull(),
	toToken: text().notNull(),
	toAmount: text().notNull(),
	rate: real().notNull(),
	txHash: text().notNull(),
	sweepTxHash: text(),
	status: text().default("COMPLETED").notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
},
(table) => [
	index("exchangeLog_txHash_idx").on(table.txHash),
	index("exchangeLog_userId_idx").on(table.userId),
	uniqueIndex("ExchangeLog_txHash_unique").on(table.txHash),
]);

export const exchangeRate = sqliteTable("ExchangeRate", {
	id: text().primaryKey().notNull(),
	tokenPair: text().notNull(),
	rate: real().notNull(),
	updatedAt: integer().notNull(),
},
(table) => [
	index("exchangeRate_tokenPair_idx").on(table.tokenPair),
	uniqueIndex("ExchangeRate_tokenPair_unique").on(table.tokenPair),
]);

export const fanPost = sqliteTable("FanPost", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	content: text().notNull(),
	imageUrl: text(),
	likes: integer().default(0).notNull(),
	isApproved: integer({ mode: "boolean" }).default(true).notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().notNull(),
});

export const follow = sqliteTable("Follow", {
	id: text().primaryKey().notNull(),
	followerId: text().notNull(),
	followingId: text().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	status: text().default("ACCEPTED"),
});

export const giftLog = sqliteTable("GiftLog", {
	id: text().primaryKey().notNull(),
	fromUserId: text().notNull(),
	toCharacterId: text().notNull(),
	itemId: text().notNull(),
	amount: integer().notNull(),
	message: text(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
},
(table) => [
	index("GiftLog_toCharacterId_createdAt_idx").on(table.toCharacterId, table.createdAt),
	index("GiftLog_fromUserId_createdAt_idx").on(table.fromUserId, table.createdAt),
]);

export const item = sqliteTable("Item", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	type: text().notNull(),
	priceCredits: integer(),
	priceChoco: integer(),
	priceUsd: real(),
	priceKrw: real(),
	iconUrl: text(),
	description: text(),
	isActive: integer({ mode: "boolean" }).default(true).notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().notNull(),
},
(table) => [
	index("Item_isActive_idx").on(table.isActive),
]);

export const like = sqliteTable("Like", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	tweetId: text().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
});

export const media = sqliteTable("Media", {
	id: text().primaryKey().notNull(),
	tweetId: text().notNull(),
	type: text().notNull(),
	url: text().notNull(),
	thumbnailUrl: text(),
	altText: text(),
	order: integer().default(0).notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	publicId: text(),
});

export const message = sqliteTable("Message", {
	id: text().primaryKey().notNull(),
	role: text().notNull(),
	content: text().notNull(),
	conversationId: text().notNull(),
	mediaUrl: text(),
	mediaType: text(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	type: text().default("TEXT").notNull(),
	senderId: text(),
	roomId: text(),
	read: integer({ mode: "boolean" }).default(false).notNull(),
	isInterrupted: integer({ mode: "boolean" }).default(false).notNull(),
	interruptedAt: integer(),
});

export const messageLike = sqliteTable("MessageLike", {
	id: text().primaryKey().notNull(),
	messageId: text().notNull(),
	userId: text().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
},
(table) => [
	uniqueIndex("MessageLike_messageId_userId_unique").on(table.messageId, table.userId),
]);

export const mission = sqliteTable("Mission", {
	id: text().primaryKey().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	rewardCredits: integer().default(0).notNull(),
	type: text().default("DAILY").notNull(),
	isActive: integer({ mode: "boolean" }).default(true).notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().notNull(),
});

export const multichainAddress = sqliteTable("MultichainAddress", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	chain: text().notNull(),
	address: text().notNull(),
	derivationPath: text(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().notNull(),
},
(table) => [
	uniqueIndex("MultichainAddress_userId_chain_unique").on(table.userId, table.chain),
	index("multichainAddress_chain_idx").on(table.chain),
	index("multichainAddress_userId_idx").on(table.userId),
]);

export const notice = sqliteTable("Notice", {
	id: text().primaryKey().notNull(),
	title: text().notNull(),
	content: text().notNull(),
	type: text().default("NOTICE").notNull(),
	imageUrl: text(),
	isActive: integer({ mode: "boolean" }).default(true).notNull(),
	isPinned: integer({ mode: "boolean" }).default(false).notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().notNull(),
});

export const notification = sqliteTable("Notification", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	type: text().notNull(),
	title: text().notNull(),
	body: text().notNull(),
	isRead: integer({ mode: "boolean" }).default(false).notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
},
(table) => [
	index("Notification_userId_createdAt_idx").on(table.userId, table.createdAt),
	index("Notification_userId_isRead_idx").on(table.userId, table.isRead),
]);

export const payment = sqliteTable("Payment", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	amount: real().notNull(),
	currency: text().default("USD").notNull(),
	status: text().notNull(),
	type: text().notNull(),
	provider: text().notNull(),
	description: text(),
	creditsGranted: integer(),
	metadata: text(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().notNull(),
	transactionId: text(),
	subscriptionId: text(),
	paymentKey: text(),
	txHash: text(),
	walletAddress: text(),
	cryptoCurrency: text(),
	cryptoAmount: real(),
	exchangeRate: real(),
	blockNumber: text(),
	confirmations: integer().default(0),
	network: text(),
},
(table) => [
	index("Payment_type_idx").on(table.type),
	index("Payment_provider_status_idx").on(table.provider, table.status),
	index("Payment_txHash_idx").on(table.txHash),
	index("Payment_subscriptionId_idx").on(table.subscriptionId),
	index("Payment_transactionId_idx").on(table.transactionId),
	index("Payment_userId_createdAt_idx").on(table.userId, table.createdAt),
	uniqueIndex("Payment_txHash_unique").on(table.txHash),
	uniqueIndex("Payment_transactionId_unique").on(table.transactionId),
]);

export const relayerLog = sqliteTable("RelayerLog", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	requestIp: text(),
	txHash: text(),
	error: text(),
	status: text().default("SUCCESS").notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
},
(table) => [
	index("RelayerLog_requestIp_createdAt_idx").on(table.requestIp, table.createdAt),
	index("RelayerLog_userId_createdAt_idx").on(table.userId, table.createdAt),
]);

export const retweet = sqliteTable("Retweet", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	tweetId: text().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
});

export const session = sqliteTable("session", {
	id: text().primaryKey().notNull(),
	expiresAt: integer().notNull(),
	token: text().notNull(),
	createdAt: integer().notNull(),
	updatedAt: integer().notNull(),
	ipAddress: text(),
	userAgent: text(),
	userId: text().notNull(),
},
(table) => [
	uniqueIndex("session_token_unique").on(table.token),
]);

export const systemLog = sqliteTable("SystemLog", {
	id: text().primaryKey().notNull(),
	level: text().default("INFO").notNull(),
	category: text().default("SYSTEM").notNull(),
	message: text().notNull(),
	stackTrace: text(),
	metadata: text(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
});

export const systemSettings = sqliteTable("SystemSettings", {
	key: text().primaryKey().notNull(),
	value: text().notNull(),
	description: text(),
	updatedAt: integer().default(sql`(unixepoch())`).notNull(),
});

export const tokenConfig = sqliteTable("TokenConfig", {
	id: text().primaryKey().notNull(),
	tokenContract: text().notNull(),
	tokenSymbol: text().default("CHOCO").notNull(),
	tokenName: text().default("CHOONSIM Token").notNull(),
	decimals: integer().default(18).notNull(),
	isEnabled: integer({ mode: "boolean" }).default(true).notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
},
(table) => [
	uniqueIndex("TokenConfig_tokenContract_unique").on(table.tokenContract),
]);

export const travelPlan = sqliteTable("TravelPlan", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	title: text().notNull(),
	description: text(),
	startDate: integer(),
	endDate: integer(),
	status: text().default("PLANNING").notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().notNull(),
});

export const travelPlanItem = sqliteTable("TravelPlanItem", {
	id: text().primaryKey().notNull(),
	travelPlanId: text().notNull(),
	title: text().notNull(),
	description: text(),
	date: integer(),
	time: text(),
	locationName: text(),
	latitude: real(),
	longitude: real(),
	order: integer().default(0).notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().notNull(),
	status: text().default("TODO"),
});

export const travelTag = sqliteTable("TravelTag", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	description: text(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
});

export const tweet = sqliteTable("Tweet", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	content: text().notNull(),
	parentId: text(),
	isRetweet: integer({ mode: "boolean" }).default(false).notNull(),
	originalTweetId: text(),
	deletedAt: integer(),
	locationName: text(),
	latitude: real(),
	longitude: real(),
	address: text(),
	travelDate: integer(),
	country: text(),
	city: text(),
	travelPlanId: text(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().notNull(),
	visibility: text().default("PUBLIC"),
});

export const tweetEmbedding = sqliteTable("TweetEmbedding", {
	id: text().primaryKey().notNull(),
	tweetId: text().notNull(),
	vector: blob().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().notNull(),
},
(table) => [
	uniqueIndex("TweetEmbedding_tweetId_unique").on(table.tweetId),
]);

export const tweetTravelTag = sqliteTable("TweetTravelTag", {
	id: text().primaryKey().notNull(),
	tweetId: text().notNull(),
	travelTagId: text().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
});

export const user = sqliteTable("User", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	password: text(),
	name: text(),
	image: text(),
	provider: text().default("local").notNull(),
	snsId: text(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().notNull(),
	emailVerified: integer({ mode: "boolean" }).default(false).notNull(),
	avatarUrl: text(),
	status: text().default("OFFLINE").notNull(),
	bio: text(),
	coverImage: text(),
	isPrivate: integer({ mode: "boolean" }).default(false),
	checkInTime: text(),
	pushSubscription: text(),
	subscriptionTier: text().default("FREE"),
	subscriptionStatus: text(),
	subscriptionId: text(),
	currentPeriodEnd: integer(),
	lastTokenRefillAt: integer(),
	credits: integer().default(0).notNull(),
	role: text().default("USER"),
	chocoBalance: text().default("0").notNull(),
	chocoLastSyncAt: integer(),
	heartsCount: integer().default(0).notNull(),
	lastFreePresendAt: integer(),
	solanaWallet: text(),
},
(table) => [
	uniqueIndex("User_subscriptionId_unique").on(table.subscriptionId),
]);

export const userContext = sqliteTable("UserContext", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	characterId: text().notNull(),
	heartbeatDoc: text(),
	identityDoc: text(),
	soulDoc: text(),
	toolsDoc: text(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().default(sql`(unixepoch())`).notNull(),
},
(table) => [
	uniqueIndex("userContext_user_character_unique").on(table.userId, table.characterId),
	index("userContext_userId_idx").on(table.userId),
]);

export const userInventory = sqliteTable("UserInventory", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	itemId: text().notNull(),
	quantity: integer().default(0).notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().notNull(),
},
(table) => [
	uniqueIndex("UserInventory_userId_itemId_unique").on(table.userId, table.itemId),
]);

export const userMemoryItem = sqliteTable("UserMemoryItem", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	characterId: text().notNull(),
	content: text().notNull(),
	category: text(),
	importance: integer().default(5).notNull(),
	sourceConversationId: text(),
	sourceMessageId: text(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	expiresAt: integer(),
	isArchived: integer({ mode: "boolean" }).default(false).notNull(),
},
(table) => [
	index("userMemoryItem_importance_idx").on(table.importance),
	index("userMemoryItem_category_idx").on(table.category),
	index("userMemoryItem_user_character_idx").on(table.userId, table.characterId),
]);

export const userMission = sqliteTable("UserMission", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	missionId: text().notNull(),
	status: text().default("IN_PROGRESS").notNull(),
	progress: integer().default(0).notNull(),
	lastUpdated: integer().default(sql`(unixepoch())`).notNull(),
},
(table) => [
	uniqueIndex("UserMission_userId_missionId_unique").on(table.userId, table.missionId),
]);

export const verification = sqliteTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: integer().notNull(),
	createdAt: integer(),
	updatedAt: integer(),
});

