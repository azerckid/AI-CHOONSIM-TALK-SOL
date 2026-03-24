
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { compressToolsForPrompt, updateUserTools } from "../tools";
import * as dbModule from "../db";

// Mock db dependencies
vi.mock("../db", () => ({
    getFullContextData: vi.fn(),
    updateTools: vi.fn(),
}));

describe("Tools Context", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2024-12-25T12:00:00Z")); // Set specific date for testing
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("compressToolsForPrompt", () => {
        it("returns empty string when no tools data exists", async () => {
            (dbModule.getFullContextData as any).mockResolvedValue(null);
            let result = await compressToolsForPrompt("user1", "char1");
            expect(result).toBe("");

            (dbModule.getFullContextData as any).mockResolvedValue({ tools: {} });
            result = await compressToolsForPrompt("user1", "char1");
            expect(result).toBe("");
        });

        it("formats tools data correctly including special date match", async () => {
            // 12-25 is set as today
            (dbModule.getFullContextData as any).mockResolvedValue({
                tools: {
                    avoidTopics: ["정치", "종교"],
                    specialDates: [
                        { date: "12-25", description: "크리스마스" },
                        { date: "01-01", description: "새해" }
                    ],
                    customRules: [
                        { condition: "배고파", action: "밥 먹으라고 하기" }
                    ]
                }
            });

            const result = await compressToolsForPrompt("user1", "char1");

            expect(result).toContain("[GUIDELINES & TOOLS]");
            expect(result).toContain("- 피해야 할 대화 주제: 정치, 종교");
            expect(result).toContain("크리스마스 (12-25) <--- [오늘입니다! 축하/언급 필수]");
            expect(result).toContain("새해 (01-01)");
            expect(result).not.toContain("새해 (01-01) <--- [오늘입니다! 축하/언급 필수]");
            expect(result).toContain("* 조건: \"배고파\" -> 행동: \"밥 먹으라고 하기\"");
        });
    });

    describe("updateUserTools", () => {
        it("merges updates with existing tools", async () => {
            (dbModule.getFullContextData as any).mockResolvedValue({
                tools: {
                    avoidTopics: ["A"]
                }
            });

            await updateUserTools("user1", "char1", { avoidTopics: ["B"] }); // Partial override of array field

            // Note: In logical implementation, arrays might need merge logic, but current implementation does simple object spread override for simplicity as defined in tools.ts
            expect(dbModule.updateTools).toHaveBeenCalledWith(
                "user1",
                "char1",
                expect.objectContaining({
                    avoidTopics: ["B"]
                })
            );
        });
    });
});
