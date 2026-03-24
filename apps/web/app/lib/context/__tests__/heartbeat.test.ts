
import { formatHeartbeatForPrompt } from "../heartbeat";
import { DateTime } from "luxon";
import assert from "assert";

async function runTests() {
    console.log("Running Heartbeat Logic Tests...");

    try {
        // Test 1
        console.log("- Test 1: First meeting");
        let result = formatHeartbeatForPrompt(null);
        assert.strictEqual(result, "첫 만남이다.", "Should return first meeting message");

        // Test 2
        console.log("- Test 2: Minutes ago");
        const now = DateTime.now();
        const tenMinutesAgo = now.minus({ minutes: 10 }).toISO();
        result = formatHeartbeatForPrompt({ lastSeenAt: tenMinutesAgo } as any);
        assert.ok(result.includes("10분 만에"), "Should mention 10 minutes");

        // Test 3
        console.log("- Test 3: Streak and Count");
        const yesterday = now.minus({ days: 1 }).toISO();
        result = formatHeartbeatForPrompt({
            lastSeenAt: yesterday,
            streakDays: 3,
            totalConversations: 10
        } as any);

        assert.ok(result.includes("1일 만에"), "Should mention 1 day");
        assert.ok(result.includes("3일째 연속 만남"), "Should mention 3 day streak");
        assert.ok(result.includes("총 11번째 대화"), "Should mention 11th conversation");

        console.log("✅ All Logic Tests Passed!");
    } catch (e) {
        console.error("❌ Test Failed:", e);
        process.exit(1);
    }
}

runTests();
