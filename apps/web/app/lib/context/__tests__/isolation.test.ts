/**
 * User Context Isolation Verification Tests
 *
 * 캐릭터별/유저별 데이터 격리 검증 테스트
 * 실행: npx tsx app/lib/context/__tests__/isolation.test.ts
 *
 * 테스트 항목:
 * 1. 동일 유저, 다른 캐릭터 간 컨텍스트 격리
 * 2. 다른 유저 간 컨텍스트 격리
 * 3. 메모리 아이템 격리
 */

import { eq, and } from "drizzle-orm";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import {
    getOrCreateUserContext,
    getUserContext,
    updateHeartbeat,
    updateIdentity,
    addMemoryItem,
    getMemoryItems,
    getMemoryItemCount,
    deleteUserContext,
} from "../db";
import type { HeartbeatDoc, IdentityDoc } from "../types";

// =============================================================================
// Test Configuration
// =============================================================================

const TEST_PREFIX = "__TEST__";
const TEST_USERS = {
    USER_A: `${TEST_PREFIX}user_a_${Date.now()}`,
    USER_B: `${TEST_PREFIX}user_b_${Date.now()}`,
};
const TEST_CHARACTERS = {
    CHAR_1: `${TEST_PREFIX}char_1`,
    CHAR_2: `${TEST_PREFIX}char_2`,
};

// =============================================================================
// Test Utilities
// =============================================================================

function assert(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(`ASSERTION FAILED: ${message}`);
    }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
    if (actual !== expected) {
        throw new Error(
            `ASSERTION FAILED: ${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual: ${JSON.stringify(actual)}`
        );
    }
}

function assertNull<T>(value: T | null, message: string): void {
    if (value !== null) {
        throw new Error(`ASSERTION FAILED: ${message}\n  Expected null but got: ${JSON.stringify(value)}`);
    }
}

function assertNotNull<T>(value: T | null, message: string): asserts value is T {
    if (value === null) {
        throw new Error(`ASSERTION FAILED: ${message}\n  Expected non-null value`);
    }
}

async function cleanupTestData(): Promise<void> {
    console.log("🧹 Cleaning up test data...");

    // Delete test memory items
    await db
        .delete(schema.userMemoryItem)
        .where(
            eq(
                schema.userMemoryItem.userId,
                TEST_USERS.USER_A
            )
        );
    await db
        .delete(schema.userMemoryItem)
        .where(
            eq(
                schema.userMemoryItem.userId,
                TEST_USERS.USER_B
            )
        );

    // Delete test contexts
    await db
        .delete(schema.userContext)
        .where(
            eq(
                schema.userContext.userId,
                TEST_USERS.USER_A
            )
        );
    await db
        .delete(schema.userContext)
        .where(
            eq(
                schema.userContext.userId,
                TEST_USERS.USER_B
            )
        );

    console.log("✅ Cleanup completed\n");
}

// =============================================================================
// Test Cases
// =============================================================================

/**
 * Test 1: 동일 유저, 다른 캐릭터 간 컨텍스트 격리
 */
async function testSameUserDifferentCharacterIsolation(): Promise<void> {
    console.log("📋 Test 1: Same User, Different Character Isolation");
    console.log("─".repeat(50));

    const userId = TEST_USERS.USER_A;
    const char1 = TEST_CHARACTERS.CHAR_1;
    const char2 = TEST_CHARACTERS.CHAR_2;

    // Create contexts for same user with different characters
    const ctx1 = await getOrCreateUserContext(userId, char1);
    const ctx2 = await getOrCreateUserContext(userId, char2);

    // Verify different context IDs
    assert(ctx1.id !== ctx2.id, "Context IDs should be different");
    console.log(`  ✓ Created separate contexts: ${ctx1.id}, ${ctx2.id}`);

    // Update heartbeat for char1 only
    const heartbeat1: HeartbeatDoc = {
        lastSeenAt: new Date().toISOString(),
        recentDaysCount: 5,
        totalConversations: 10,
        streakDays: 3,
        emotionTrend: "요즘 기분 좋음",
    };
    await updateHeartbeat(userId, char1, heartbeat1);

    // Verify char1 has heartbeat, char2 does not
    const fetchedCtx1 = await getUserContext(userId, char1);
    const fetchedCtx2 = await getUserContext(userId, char2);

    assertNotNull(fetchedCtx1, "Context 1 should exist");
    assertNotNull(fetchedCtx2, "Context 2 should exist");

    assertNotNull(fetchedCtx1.heartbeatDoc, "Context 1 should have heartbeat");
    assertNull(fetchedCtx2.heartbeatDoc, "Context 2 should NOT have heartbeat");

    const parsedHeartbeat = JSON.parse(fetchedCtx1.heartbeatDoc);
    assertEqual(parsedHeartbeat.streakDays, 3, "Heartbeat streakDays should match");

    console.log(`  ✓ Heartbeat isolated: char1 has data, char2 is null`);

    // Add memory items to char1
    await addMemoryItem(userId, char1, "Memory for character 1");
    await addMemoryItem(userId, char1, "Another memory for character 1");

    // Add memory item to char2
    await addMemoryItem(userId, char2, "Memory for character 2");

    // Verify memory counts
    const memCount1 = await getMemoryItemCount(userId, char1);
    const memCount2 = await getMemoryItemCount(userId, char2);

    assertEqual(memCount1, 2, "Char1 should have 2 memory items");
    assertEqual(memCount2, 1, "Char2 should have 1 memory item");

    console.log(`  ✓ Memory items isolated: char1=${memCount1}, char2=${memCount2}`);

    // Verify memory content isolation
    const memories1 = await getMemoryItems(userId, char1);
    const memories2 = await getMemoryItems(userId, char2);

    assert(
        memories1.every((m) => m.characterId === char1),
        "All char1 memories should have char1 ID"
    );
    assert(
        memories2.every((m) => m.characterId === char2),
        "All char2 memories should have char2 ID"
    );
    assert(
        memories1.every((m) => m.content.includes("character 1")),
        "Char1 memories should contain correct content"
    );
    assert(
        memories2.every((m) => m.content.includes("character 2")),
        "Char2 memories should contain correct content"
    );

    console.log(`  ✓ Memory content verified: no cross-character leakage`);
    console.log("✅ Test 1 PASSED\n");
}

/**
 * Test 2: 다른 유저 간 컨텍스트 격리
 */
async function testDifferentUserIsolation(): Promise<void> {
    console.log("📋 Test 2: Different User Isolation");
    console.log("─".repeat(50));

    const userA = TEST_USERS.USER_A;
    const userB = TEST_USERS.USER_B;
    const char = TEST_CHARACTERS.CHAR_1;

    // Create contexts for different users with same character
    const ctxA = await getOrCreateUserContext(userA, char);
    const ctxB = await getOrCreateUserContext(userB, char);

    assert(ctxA.id !== ctxB.id, "Context IDs for different users should be different");
    console.log(`  ✓ Created separate contexts for different users`);

    // Update identity for userA only
    const identityA: IdentityDoc = {
        nickname: "Test User A",
        honorific: "반말",
        relationshipType: "친구",
        inferredTraits: ["friendly"],
    };
    await updateIdentity(userA, char, identityA);

    // Verify userA has identity, userB does not
    const fetchedCtxA = await getUserContext(userA, char);
    const fetchedCtxB = await getUserContext(userB, char);

    assertNotNull(fetchedCtxA, "Context A should exist");
    assertNotNull(fetchedCtxB, "Context B should exist");

    assertNotNull(fetchedCtxA.identityDoc, "User A should have identity");
    assertNull(fetchedCtxB.identityDoc, "User B should NOT have identity");

    console.log(`  ✓ Identity isolated: userA has data, userB is null`);

    // Add memory items
    await addMemoryItem(userA, char, "Secret memory for user A");
    await addMemoryItem(userB, char, "Secret memory for user B");

    // Verify memory isolation
    const memoriesA = await getMemoryItems(userA, char);
    const memoriesB = await getMemoryItems(userB, char);

    assert(
        memoriesA.every((m) => m.userId === userA),
        "All userA memories should have userA ID"
    );
    assert(
        memoriesB.every((m) => m.userId === userB),
        "All userB memories should have userB ID"
    );
    // Verify no cross-user contamination (userB content should not appear in userA results)
    assert(
        !memoriesA.some((m) => m.content.includes("user B")),
        "UserA memories should not contain userB content"
    );
    assert(
        !memoriesB.some((m) => m.content.includes("user A")),
        "UserB memories should not contain userA content"
    );
    // Verify the specific memory we just added exists
    assert(
        memoriesA.some((m) => m.content === "Secret memory for user A"),
        "UserA should have the secret memory we added"
    );
    assert(
        memoriesB.some((m) => m.content === "Secret memory for user B"),
        "UserB should have the secret memory we added"
    );

    console.log(`  ✓ Memory content verified: no cross-user leakage`);
    console.log("✅ Test 2 PASSED\n");
}

/**
 * Test 3: 컨텍스트 삭제 시 격리 유지
 */
async function testDeletionIsolation(): Promise<void> {
    console.log("📋 Test 3: Deletion Isolation");
    console.log("─".repeat(50));

    const userA = TEST_USERS.USER_A;
    const userB = TEST_USERS.USER_B;
    const char1 = TEST_CHARACTERS.CHAR_1;
    const char2 = TEST_CHARACTERS.CHAR_2;

    // Ensure contexts exist
    await getOrCreateUserContext(userA, char1);
    await getOrCreateUserContext(userA, char2);
    await getOrCreateUserContext(userB, char1);

    // Get counts before deletion
    const beforeCountA1 = await getMemoryItemCount(userA, char1);
    const beforeCountA2 = await getMemoryItemCount(userA, char2);
    const beforeCountB1 = await getMemoryItemCount(userB, char1);

    console.log(`  Before deletion - A/char1: ${beforeCountA1}, A/char2: ${beforeCountA2}, B/char1: ${beforeCountB1}`);

    // Delete userA + char1 context
    await deleteUserContext(userA, char1);

    // Verify only that context was deleted
    const afterCtxA1 = await getUserContext(userA, char1);
    const afterCtxA2 = await getUserContext(userA, char2);
    const afterCtxB1 = await getUserContext(userB, char1);

    assertNull(afterCtxA1, "UserA + Char1 context should be deleted");
    assertNotNull(afterCtxA2, "UserA + Char2 context should still exist");
    assertNotNull(afterCtxB1, "UserB + Char1 context should still exist");

    console.log(`  ✓ Context deletion isolated: only A/char1 deleted`);

    // Verify memory counts
    const afterCountA1 = await getMemoryItemCount(userA, char1);
    const afterCountA2 = await getMemoryItemCount(userA, char2);
    const afterCountB1 = await getMemoryItemCount(userB, char1);

    assertEqual(afterCountA1, 0, "A/char1 memories should be 0 after deletion");
    assertEqual(afterCountA2, beforeCountA2, "A/char2 memory count unchanged");
    assertEqual(afterCountB1, beforeCountB1, "B/char1 memory count unchanged");

    console.log(`  ✓ Memory deletion isolated: A/char1=${afterCountA1}, A/char2=${afterCountA2}, B/char1=${afterCountB1}`);
    console.log("✅ Test 3 PASSED\n");
}

/**
 * Test 4: Unique constraint 검증
 */
async function testUniqueConstraint(): Promise<void> {
    console.log("📋 Test 4: Unique Constraint Verification");
    console.log("─".repeat(50));

    const userId = TEST_USERS.USER_A;
    const charId = TEST_CHARACTERS.CHAR_1;

    // Create initial context
    const ctx1 = await getOrCreateUserContext(userId, charId);

    // Try to get or create again - should return same context
    const ctx2 = await getOrCreateUserContext(userId, charId);

    assertEqual(ctx1.id, ctx2.id, "getOrCreateUserContext should return same context for same user+character");
    console.log(`  ✓ Same context returned: ${ctx1.id}`);

    // Verify only one record exists in DB
    const records = await db
        .select()
        .from(schema.userContext)
        .where(
            and(
                eq(schema.userContext.userId, userId),
                eq(schema.userContext.characterId, charId)
            )
        )
        .all();

    assertEqual(records.length, 1, "Should have exactly one record for user+character pair");
    console.log(`  ✓ Single record in DB confirmed`);
    console.log("✅ Test 4 PASSED\n");
}

// =============================================================================
// Main Test Runner
// =============================================================================

async function runAllTests(): Promise<void> {
    console.log("\n");
    console.log("═".repeat(60));
    console.log(" User Context Isolation Tests");
    console.log("═".repeat(60));
    console.log("\n");

    try {
        await cleanupTestData();

        await testSameUserDifferentCharacterIsolation();
        await testDifferentUserIsolation();
        await testDeletionIsolation();
        await testUniqueConstraint();

        console.log("═".repeat(60));
        console.log(" ✅ ALL TESTS PASSED");
        console.log("═".repeat(60));
        console.log("\n");
    } catch (error) {
        console.error("\n");
        console.error("═".repeat(60));
        console.error(" ❌ TEST FAILED");
        console.error("═".repeat(60));
        console.error(error);
        process.exit(1);
    } finally {
        await cleanupTestData();
    }
}

// Run tests if this file is executed directly
runAllTests();
