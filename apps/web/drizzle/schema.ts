import { sqliteTable, type AnySQLiteColumn, text, integer, index, real, uniqueIndex, blob } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"

export const character = sqliteTable("Character", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	role: text().notNull(),
	bio: text().notNull(),
	personaPrompt: text().notNull(),
	greetingMessage: text(),
	isOnline: integer({ mode: 'boolean' }).notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().notNull(),
});

export const item = sqliteTable("Item", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	type: text().notNull(),
	priceCredits: integer(),
	priceUsd: real(),
	priceKrw: real(),
	iconUrl: text(),
	description: text(),
	isActive: integer({ mode: 'boolean' }).default(true).notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().notNull(),
},
	(table) => [
		index("Item_isActive_idx").on(table.isActive),
	]);

export const dmConversation = sqliteTable("DMConversation", {
	id: text().primaryKey().notNull(),
	isGroup: integer({ mode: 'boolean' }).notNull(),
	groupName: text(),
	lastMessageAt: integer().default(sql`(unixepoch())`).notNull(),
	isAccepted: integer({ mode: 'boolean' }).notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().notNull(),
});

export const travelTag = sqliteTable("TravelTag", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	description: text(),
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
	emailVerified: integer({ mode: 'boolean' }).notNull(),
	avatarUrl: text(),
	status: text().default("OFFLINE").notNull(),
	bio: text(),
	coverImage: text(),
	isPrivate: integer({ mode: 'boolean' }),
	checkInTime: text(),
	pushSubscription: text(),
	subscriptionTier: text().default("FREE"),
	subscriptionStatus: text(),
	subscriptionId: text(),
	currentPeriodEnd: integer(),
	lastTokenRefillAt: integer(),
	credits: integer().default(100).notNull(),
	role: text().default("USER"),
	nearAccountId: text(),
	nearPublicKey: text(),
	chocoBalance: text().default("0"),
	chocoLastSyncAt: integer(),
	heartsCount: integer().default(0),
	allowanceAmount: real(),
	allowanceCurrency: text().default("USD"),
	allowanceExpiresAt: integer(),
	nearPrivateKey: text(),
},
	(table) => [
		uniqueIndex("User_nearAccountId_unique").on(table.nearAccountId),
		uniqueIndex("User_subscriptionId_unique").on(table.subscriptionId),
	]);

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

export const verification = sqliteTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: integer().notNull(),
	createdAt: integer(),
	updatedAt: integer(),
});

export const notice = sqliteTable("Notice", {
	id: text().primaryKey().notNull(),
	title: text().notNull(),
	content: text().notNull(),
	type: text().default("NOTICE").notNull(),
	imageUrl: text(),
	isActive: integer({ mode: 'boolean' }).default(true).notNull(),
	isPinned: integer({ mode: 'boolean' }).notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().notNull(),
});

export const systemLog = sqliteTable("SystemLog", {
	id: text().primaryKey().notNull(),
	level: text().default("INFO").notNull(),
	category: text().default("SYSTEM").notNull(),
	message: text().notNull(),
	stackTrace: text(),
	metadata: text(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
});

export const mission = sqliteTable("Mission", {
	id: text().primaryKey().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	rewardCredits: integer().default(0).notNull(),
	type: text().default("DAILY").notNull(),
	isActive: integer({ mode: 'boolean' }).default(true).notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
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

export const conversation = sqliteTable("Conversation", {
	id: text().primaryKey().notNull(),
	characterId: text().default("chunsim").notNull(),
	title: text().notNull(),
	userId: text(),
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
});

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
});

export const giftLog = sqliteTable("GiftLog", {
	id: text().primaryKey().notNull(),
	fromUserId: text().notNull(),
	toCharacterId: text().notNull(),
	itemId: text().notNull(),
	amount: integer().notNull(),
	message: text(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
});

export const userInventory = sqliteTable("UserInventory", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	itemId: text().notNull(),
	quantity: integer().default(0).notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().notNull(),
});

export const dmParticipant = sqliteTable("DMParticipant", {
	id: text().primaryKey().notNull(),
	conversationId: text().notNull(),
	userId: text().notNull(),
	joinedAt: integer().default(sql`(unixepoch())`).notNull(),
	leftAt: integer(),
	isAdmin: integer({ mode: 'boolean' }).default(false).notNull(),
});

export const directMessage = sqliteTable("DirectMessage", {
	id: text().primaryKey().notNull(),
	conversationId: text().notNull(),
	senderId: text().notNull(),
	content: text().notNull(),
	isRead: integer({ mode: 'boolean' }).default(false).notNull(),
	deletedBySender: integer({ mode: 'boolean' }).default(false).notNull(),
	deletedByReceiver: integer({ mode: 'boolean' }).default(false).notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().notNull(),
	mediaUrl: text(),
	mediaType: text(),
});

export const follow = sqliteTable("Follow", {
	id: text().primaryKey().notNull(),
	followerId: text().notNull(),
	followingId: text().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	status: text().default("ACCEPTED"),
});

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
	read: integer({ mode: 'boolean' }).default(false).notNull(),
	isInterrupted: integer({ mode: 'boolean' }).default(false).notNull(),
	interruptedAt: integer(),
});

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
});

export const messageLike = sqliteTable("MessageLike", {
	id: text().primaryKey().notNull(),
	messageId: text().notNull(),
	userId: text().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
});

export const retweet = sqliteTable("Retweet", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	tweetId: text().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
});

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

export const tweet = sqliteTable("Tweet", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	content: text().notNull(),
	parentId: text(),
	isRetweet: integer({ mode: 'boolean' }).default(false).notNull(),
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
});

export const tweetTravelTag = sqliteTable("TweetTravelTag", {
	id: text().primaryKey().notNull(),
	tweetId: text().notNull(),
	travelTagId: text().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
});

export const userMission = sqliteTable("UserMission", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	missionId: text().notNull(),
	status: text().default("IN_PROGRESS").notNull(),
	progress: integer().default(0).notNull(),
	lastUpdated: integer().default(sql`(unixepoch())`).notNull(),
});

export const fanPost = sqliteTable("FanPost", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	content: text().notNull(),
	imageUrl: text(),
	likes: integer().default(0).notNull(),
	isApproved: integer({ mode: 'boolean' }).default(true).notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	updatedAt: integer().notNull(),
});

export const tokenTransfer = sqliteTable("TokenTransfer", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	txHash: text().notNull(),
	amount: text().notNull(),
	tokenContract: text().notNull(),
	status: text().default("PENDING").notNull(),
	purpose: text().notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
},
	(table) => [
		index("TokenTransfer_txHash_idx").on(table.txHash),
		index("TokenTransfer_userId_idx").on(table.userId),
		uniqueIndex("TokenTransfer_txHash_unique").on(table.txHash),
	]);

export const tokenConfig = sqliteTable("TokenConfig", {
	id: text().primaryKey().notNull(),
	tokenContract: text().notNull(),
	tokenSymbol: text().default("CHOCO").notNull(),
	tokenName: text().default("CHOONSIM Token").notNull(),
	decimals: integer().default(18).notNull(),
	isEnabled: integer({ mode: 'boolean' }).default(true).notNull(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
},
	(table) => [
		uniqueIndex("TokenConfig_tokenContract_unique").on(table.tokenContract),
	]);

export const x402Invoice = sqliteTable("X402Invoice", {
	id: text().primaryKey().notNull(),
	token: text().notNull(),
	userId: text().notNull(),
	amount: real().notNull(),
	currency: text().default("USD").notNull(),
	chocoAmount: text().notNull(),
	recipientAddress: text().notNull(),
	status: text().default("PENDING").notNull(),
	txHash: text(),
	expiresAt: integer(),
	createdAt: integer().default(sql`(unixepoch())`).notNull(),
	paidAt: integer(),
},
	(table) => [
		index("X402Invoice_userId_status_idx").on(table.userId, table.status),
		index("X402Invoice_token_idx").on(table.token),
		uniqueIndex("X402Invoice_txHash_unique").on(table.txHash),
		uniqueIndex("X402Invoice_token_unique").on(table.token),
	]);

export const relayerLog = sqliteTable("RelayerLog", {
	id: text().primaryKey(),
	userId: text().notNull(),
	requestIp: text(),
	txHash: text(),
	error: text(),
	status: text().default("SUCCESS").notNull(),
	createdAt: integer().notNull(),
},
	(table) => [
		index("RelayerLog_requestIp_createdAt_idx").on(table.requestIp, table.createdAt),
		index("RelayerLog_userId_createdAt_idx").on(table.userId, table.createdAt),
	]);

