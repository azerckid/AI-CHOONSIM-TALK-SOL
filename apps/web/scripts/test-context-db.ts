import { createClient } from "@libsql/client";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const testFile = process.argv[2];

if (!testFile) {
    console.error("Usage: tsx scripts/test-context-db.ts <test-file>");
    process.exit(1);
}

const schemaStatements = [
    `CREATE TABLE "User" (
        "id" text PRIMARY KEY NOT NULL,
        "subscriptionTier" text DEFAULT 'FREE'
    )`,
    `CREATE TABLE "UserContext" (
        "id" text PRIMARY KEY NOT NULL,
        "userId" text NOT NULL,
        "characterId" text NOT NULL,
        "heartbeatDoc" text,
        "identityDoc" text,
        "soulDoc" text,
        "toolsDoc" text,
        "createdAt" integer DEFAULT (unixepoch()) NOT NULL,
        "updatedAt" integer DEFAULT (unixepoch()) NOT NULL
    )`,
    `CREATE UNIQUE INDEX "userContext_user_character_unique"
        ON "UserContext" ("userId", "characterId")`,
    `CREATE INDEX "userContext_userId_idx"
        ON "UserContext" ("userId")`,
    `CREATE TABLE "UserMemoryItem" (
        "id" text PRIMARY KEY NOT NULL,
        "userId" text NOT NULL,
        "characterId" text NOT NULL,
        "content" text NOT NULL,
        "category" text,
        "importance" integer DEFAULT 5 NOT NULL,
        "sourceConversationId" text,
        "sourceMessageId" text,
        "createdAt" integer DEFAULT (unixepoch()) NOT NULL,
        "expiresAt" integer,
        "isArchived" integer DEFAULT false NOT NULL
    )`,
    `CREATE INDEX "userMemoryItem_user_character_idx"
        ON "UserMemoryItem" ("userId", "characterId")`,
    `CREATE INDEX "userMemoryItem_category_idx"
        ON "UserMemoryItem" ("category")`,
    `CREATE INDEX "userMemoryItem_importance_idx"
        ON "UserMemoryItem" ("importance")`,
    `CREATE TABLE "SystemLog" (
        "id" text PRIMARY KEY NOT NULL,
        "level" text DEFAULT 'INFO' NOT NULL,
        "category" text DEFAULT 'SYSTEM' NOT NULL,
        "message" text NOT NULL,
        "stackTrace" text,
        "metadata" text,
        "createdAt" integer DEFAULT (unixepoch()) NOT NULL
    )`,
];

async function prepareDatabase(url: string): Promise<void> {
    const client = createClient({ url });

    try {
        for (const sql of schemaStatements) {
            await client.execute(sql);
        }
    } finally {
        client.close();
    }
}

async function run(): Promise<void> {
    const tempDir = await mkdtemp(join(tmpdir(), "choonsim-context-test-"));
    const dbUrl = `file:${join(tempDir, "test.db")}`;

    await prepareDatabase(dbUrl);

    process.env.NODE_ENV = "test";
    process.env.TURSO_DATABASE_URL = dbUrl;
    process.env.TURSO_AUTH_TOKEN = "";
    process.env.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY ?? "test-key";
    process.env.CONTEXT_TEST_DB_WRAPPER = "1";

    try {
        const moduleUrl = pathToFileURL(resolve(testFile)).href;
        const module = await import(moduleUrl);
        const runner = module.runAllTests ?? module.runTests;

        if (typeof runner !== "function") {
            throw new Error(`${testFile} does not export runAllTests or runTests`);
        }

        await runner();
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
