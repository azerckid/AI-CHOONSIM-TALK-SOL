/**
 * Memory layer tests: 한도 초과 시 정리, 압축, PII
 * 실행: npx tsx app/lib/context/__tests__/memory.test.ts
 */

import { eq } from "drizzle-orm";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { addMemoryItem, getMemoryItemCount } from "../db";
import { evictOldMemoriesIfOverLimit } from "../memory";
import { compressMemoryForPrompt } from "../compress";
import { maskPII, sanitizeForMemory } from "../pii-filter";

const TEST_PREFIX = "__TEST_MEMORY__";
const TEST_USER = `${TEST_PREFIX}user_${Date.now()}`;
const TEST_CHAR = `${TEST_PREFIX}char`;

function assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

async function cleanup(): Promise<void> {
    await db.delete(schema.userMemoryItem).where(eq(schema.userMemoryItem.userId, TEST_USER));
    await db.delete(schema.userContext).where(eq(schema.userContext.userId, TEST_USER));
}

async function runTests(): Promise<void> {
    console.log("Memory layer tests\n");

    try {
        await cleanup();

        // Test: 한도 초과 시 eviction (미존재 유저 = FREE, 한도 20)
        for (let i = 0; i < 25; i++) {
            await addMemoryItem(TEST_USER, TEST_CHAR, `Memory item ${i}`, { importance: 3 + (i % 5) });
        }
        let count = await getMemoryItemCount(TEST_USER, TEST_CHAR);
        assert(count === 25, `Expected 25 items, got ${count}`);

        await evictOldMemoriesIfOverLimit(TEST_USER, TEST_CHAR);
        count = await getMemoryItemCount(TEST_USER, TEST_CHAR);
        assert(count === 20, `After eviction expected 20 (FREE limit), got ${count}`);

        console.log("  Eviction (FREE limit 20): PASS");

        // Test: compressMemoryForPrompt returns non-empty string when items exist
        const compressed = await compressMemoryForPrompt(TEST_USER, TEST_CHAR, 500);
        assert(compressed.length > 0 && compressed.includes("이전에 알아둔 것"), `Expected compressed string, got: ${compressed.slice(0, 50)}`);
        console.log("  compressMemoryForPrompt: PASS");

        // Test: PII mask (maskPII uses [CREDIT_CARD], [PHONE] 등 토큰)
        const masked = maskPII("카드 1234-5678-9012-3456 번입니다.");
        assert(!masked.includes("1234") && masked.includes("[CREDIT_CARD]"), "PII should be masked");
        const sanitized = sanitizeForMemory("전화 010-1234-5678 로 연락");
        assert(sanitized !== null && !sanitized.includes("010-1234-5678") && sanitized.includes("[PHONE]"), "sanitizeForMemory should mask");
        console.log("  PII mask/sanitize: PASS");

        await cleanup();
        console.log("\nAll memory tests PASSED");
    } catch (err) {
        await cleanup();
        console.error(err);
        process.exit(1);
    }
}

runTests();
