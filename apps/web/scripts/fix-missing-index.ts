import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

// 환경 변수 로드
dotenv.config({ path: ".env.production" });
dotenv.config({ path: ".env" });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
    console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
    process.exit(1);
}

const client = createClient({ url, authToken });

async function fixMissingIndex() {
    try {
        console.log("Connecting to Turso...");

        // 모든 누락된 인덱스 및 unique 제약조건 생성
        const indexes = [
            {
                name: "CharacterStat_totalHearts_idx",
                sql: `CREATE INDEX IF NOT EXISTS "CharacterStat_totalHearts_idx" ON "CharacterStat"("totalHearts")`,
            },
            {
                name: "GiftLog_fromUserId_createdAt_idx",
                sql: `CREATE INDEX IF NOT EXISTS "GiftLog_fromUserId_createdAt_idx" ON "GiftLog"("fromUserId", "createdAt")`,
            },
            {
                name: "GiftLog_toCharacterId_createdAt_idx",
                sql: `CREATE INDEX IF NOT EXISTS "GiftLog_toCharacterId_createdAt_idx" ON "GiftLog"("toCharacterId", "createdAt")`,
            },
            {
                name: "MessageLike_messageId_userId_unique",
                sql: `CREATE UNIQUE INDEX IF NOT EXISTS "MessageLike_messageId_userId_unique" ON "MessageLike"("messageId", "userId")`,
            },
            {
                name: "Payment_transactionId_unique",
                sql: `CREATE UNIQUE INDEX IF NOT EXISTS "Payment_transactionId_unique" ON "Payment"("transactionId") WHERE "transactionId" IS NOT NULL`,
            },
            {
                name: "Payment_txHash_unique",
                sql: `CREATE UNIQUE INDEX IF NOT EXISTS "Payment_txHash_unique" ON "Payment"("txHash") WHERE "txHash" IS NOT NULL`,
            },
            {
                name: "Payment_userId_createdAt_idx",
                sql: `CREATE INDEX IF NOT EXISTS "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt")`,
            },
            {
                name: "Payment_transactionId_idx",
                sql: `CREATE INDEX IF NOT EXISTS "Payment_transactionId_idx" ON "Payment"("transactionId")`,
            },
            {
                name: "Payment_subscriptionId_idx",
                sql: `CREATE INDEX IF NOT EXISTS "Payment_subscriptionId_idx" ON "Payment"("subscriptionId")`,
            },
            {
                name: "Payment_txHash_idx",
                sql: `CREATE INDEX IF NOT EXISTS "Payment_txHash_idx" ON "Payment"("txHash")`,
            },
            {
                name: "Payment_provider_status_idx",
                sql: `CREATE INDEX IF NOT EXISTS "Payment_provider_status_idx" ON "Payment"("provider", "status")`,
            },
            {
                name: "Payment_type_idx",
                sql: `CREATE INDEX IF NOT EXISTS "Payment_type_idx" ON "Payment"("type")`,
            },
            {
                name: "TweetEmbedding_tweetId_unique",
                sql: `CREATE UNIQUE INDEX IF NOT EXISTS "TweetEmbedding_tweetId_unique" ON "TweetEmbedding"("tweetId")`,
            },
            {
                name: "TokenTransfer_txHash_unique",
                sql: `CREATE UNIQUE INDEX IF NOT EXISTS "TokenTransfer_txHash_unique" ON "TokenTransfer"("txHash")`,
            },
            {
                name: "TokenConfig_tokenContract_unique",
                sql: `CREATE UNIQUE INDEX IF NOT EXISTS "TokenConfig_tokenContract_unique" ON "TokenConfig"("tokenContract")`,
            },
            {
                name: "X402Invoice_token_unique",
                sql: `CREATE UNIQUE INDEX IF NOT EXISTS "X402Invoice_token_unique" ON "X402Invoice"("token")`,
            },
            {
                name: "X402Invoice_txHash_unique",
                sql: `CREATE UNIQUE INDEX IF NOT EXISTS "X402Invoice_txHash_unique" ON "X402Invoice"("txHash") WHERE "txHash" IS NOT NULL`,
            },
            {
                name: "TokenTransfer_userId_idx",
                sql: `CREATE INDEX IF NOT EXISTS "TokenTransfer_userId_idx" ON "TokenTransfer"("userId")`,
            },
            {
                name: "TokenTransfer_txHash_idx",
                sql: `CREATE INDEX IF NOT EXISTS "TokenTransfer_txHash_idx" ON "TokenTransfer"("txHash")`,
            },
            {
                name: "X402Invoice_token_idx",
                sql: `CREATE INDEX IF NOT EXISTS "X402Invoice_token_idx" ON "X402Invoice"("token")`,
            },
            {
                name: "X402Invoice_userId_status_idx",
                sql: `CREATE INDEX IF NOT EXISTS "X402Invoice_userId_status_idx" ON "X402Invoice"("userId", "status")`,
            },
            {
                name: "UserInventory_userId_itemId_unique",
                sql: `CREATE UNIQUE INDEX IF NOT EXISTS "UserInventory_userId_itemId_unique" ON "UserInventory"("userId", "itemId")`,
            },
            {
                name: "userContext_user_character_unique",
                sql: `CREATE UNIQUE INDEX IF NOT EXISTS "userContext_user_character_unique" ON "UserContext"("userId", "characterId")`,
            },
            {
                name: "userContext_userId_idx",
                sql: `CREATE INDEX IF NOT EXISTS "userContext_userId_idx" ON "UserContext"("userId")`,
            },
            {
                name: "UserMission_userId_missionId_unique",
                sql: `CREATE UNIQUE INDEX IF NOT EXISTS "UserMission_userId_missionId_unique" ON "UserMission"("userId", "missionId")`,
            },
            {
                name: "multichainAddress_userId_chain_unique",
                sql: `CREATE UNIQUE INDEX IF NOT EXISTS "multichainAddress_userId_chain_unique" ON "MultichainAddress"("userId", "chain")`,
            },
            {
                name: "multichainAddress_userId_idx",
                sql: `CREATE INDEX IF NOT EXISTS "multichainAddress_userId_idx" ON "MultichainAddress"("userId")`,
            },
            {
                name: "multichainAddress_chain_idx",
                sql: `CREATE INDEX IF NOT EXISTS "multichainAddress_chain_idx" ON "MultichainAddress"("chain")`,
            },
            {
                name: "exchangeRate_tokenPair_unique",
                sql: `CREATE UNIQUE INDEX IF NOT EXISTS "exchangeRate_tokenPair_unique" ON "ExchangeRate"("tokenPair")`,
            },
            {
                name: "exchangeRate_tokenPair_idx",
                sql: `CREATE INDEX IF NOT EXISTS "exchangeRate_tokenPair_idx" ON "ExchangeRate"("tokenPair")`,
            },
            {
                name: "exchangeLog_txHash_unique",
                sql: `CREATE UNIQUE INDEX IF NOT EXISTS "exchangeLog_txHash_unique" ON "ExchangeLog"("txHash")`,
            },
            {
                name: "exchangeLog_userId_idx",
                sql: `CREATE INDEX IF NOT EXISTS "exchangeLog_userId_idx" ON "ExchangeLog"("userId")`,
            },
            {
                name: "exchangeLog_txHash_idx",
                sql: `CREATE INDEX IF NOT EXISTS "exchangeLog_txHash_idx" ON "ExchangeLog"("txHash")`,
            },
        ];

        for (const idx of indexes) {
            try {
                console.log(`Creating ${idx.name} index...`);
                await client.execute({ sql: idx.sql });
                console.log(`✓ ${idx.name} index created successfully`);
            } catch (error: any) {
                // 테이블이 존재하지 않는 경우는 무시 (drizzle-kit push가 테이블을 생성할 것임)
                if (error.message?.includes("no such table")) {
                    console.log(`⚠ ${idx.name} skipped (table does not exist yet, will be created by drizzle-kit push)`);
                } else {
                    throw error;
                }
            }
        }

        console.log("\n✅ All indexes fixed!");
        console.log("You can now run: npx drizzle-kit push");
    } catch (error) {
        console.error("❌ Error fixing index:", error);
        process.exit(1);
    }
}

fixMissingIndex().catch(console.error);
