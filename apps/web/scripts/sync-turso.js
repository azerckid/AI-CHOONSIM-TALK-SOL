import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
    console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
    process.exit(1);
}

const client = createClient({ url, authToken });

async function sync() {
    try {
        console.log("Connecting to Turso...");

        // 1. Create Payment table
        console.log("Creating Payment table...");
        await client.execute(`
      CREATE TABLE IF NOT EXISTS "Payment" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "amount" REAL NOT NULL,
        "currency" TEXT NOT NULL DEFAULT 'USD',
        "status" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "provider" TEXT NOT NULL,
        "description" TEXT,
        "creditsGranted" INTEGER,
        "metadata" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        "transactionId" TEXT,
        "subscriptionId" TEXT,
        "paymentKey" TEXT,
        "txHash" TEXT
      );
    `);

        // 2. Create Indexes for Payment
        console.log("Creating indexes for Payment...");
        try { await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS "Payment_transactionId_key" ON "Payment"("transactionId");`); } catch (e) { }
        try { await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS "Payment_txHash_key" ON "Payment"("txHash");`); } catch (e) { }
        try { await client.execute(`CREATE INDEX IF NOT EXISTS "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");`); } catch (e) { }
        try { await client.execute(`CREATE INDEX IF NOT EXISTS "Payment_transactionId_idx" ON "Payment"("transactionId");`); } catch (e) { }
        try { await client.execute(`CREATE INDEX IF NOT EXISTS "Payment_subscriptionId_idx" ON "Payment"("subscriptionId");`); } catch (e) { }
        try { await client.execute(`CREATE INDEX IF NOT EXISTS "Payment_txHash_idx" ON "Payment"("txHash");`); } catch (e) { }
        try { await client.execute(`CREATE INDEX IF NOT EXISTS "Payment_provider_status_idx" ON "Payment"("provider", "status");`); } catch (e) { }

        // 3. Add columns to User and Payment tables
        // SQLite doesn't support adding multiple columns in one ALTER TABLE.
        // We try to add them one by one and ignore errors if they exist.
        const migrations = [
            'ALTER TABLE "User" ADD COLUMN "subscriptionStatus" TEXT',
            'ALTER TABLE "User" ADD COLUMN "subscriptionId" TEXT',
            'ALTER TABLE "User" ADD COLUMN "currentPeriodEnd" DATETIME',
            'ALTER TABLE "User" ADD COLUMN "lastTokenRefillAt" DATETIME',
            'ALTER TABLE "User" ADD COLUMN "credits" INTEGER NOT NULL DEFAULT 100',
            // Payment table missing columns
            'ALTER TABLE "Payment" ADD COLUMN "walletAddress" TEXT',
            'ALTER TABLE "Payment" ADD COLUMN "cryptoCurrency" TEXT',
            'ALTER TABLE "Payment" ADD COLUMN "cryptoAmount" REAL',
            'ALTER TABLE "Payment" ADD COLUMN "exchangeRate" REAL',
            'ALTER TABLE "Payment" ADD COLUMN "blockNumber" TEXT',
            'ALTER TABLE "Payment" ADD COLUMN "confirmations" INTEGER DEFAULT 0',
            'ALTER TABLE "Payment" ADD COLUMN "network" TEXT'
        ];

        console.log("Updating table columns...");
        for (const sql of migrations) {
            try {
                await client.execute(sql);
                console.log(`Executed: ${sql}`);
            } catch (e) {
                console.log(`Skipped or Error: ${sql} (${e.message})`);
            }
        }

        try { await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS "User_subscriptionId_key" ON "User"("subscriptionId");`); } catch (e) { }

        console.log("Turso DB Sync Completed!");
    } catch (error) {
        console.error("Sync failed:", error);
    } finally {
        client.close();
    }
}

sync();
