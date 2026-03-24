
import { describe, it, expect, vi, beforeEach } from "vitest";
import { compressIdentityForPrompt, updateUserIdentity } from "../identity";
import * as dbModule from "../db";

// Mock db dependencies
vi.mock("../db", () => ({
    getFullContextData: vi.fn(),
    updateIdentity: vi.fn(),
}));

describe("Identity Context", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("compressIdentityForPrompt", () => {
        it("returns default formatting when no identity exists", async () => {
            (dbModule.getFullContextData as any).mockResolvedValue(null);

            const result = await compressIdentityForPrompt("user1", "char1");

            expect(result).toContain("이름/호칭: 이름 모름");
            expect(result).toContain("관계: 팬"); // Default value
            expect(result).toContain("말투: 존댓말 사용"); // Default value
        });

        it("formats custom identity correctly", async () => {
            (dbModule.getFullContextData as any).mockResolvedValue({
                identity: {
                    nickname: "지훈",
                    customTitle: "오빠",
                    relationshipType: "연인",
                    honorific: "반말",
                    inferredTraits: ["다정함"]
                }
            });

            const result = await compressIdentityForPrompt("user1", "char1");

            expect(result).toContain("이름/호칭: 지훈 (\"오빠\"라고 부름)");
            expect(result).toContain("관계: 연인");
            expect(result).toContain("말투: 반말 사용");
            expect(result).toContain("특이사항: 다정함");
        });
    });

    describe("updateUserIdentity", () => {
        it("merges updates with existing identity", async () => {
            (dbModule.getFullContextData as any).mockResolvedValue({
                identity: {
                    nickname: "OldName",
                    honorific: "존댓말"
                }
            });

            await updateUserIdentity("user1", "char1", { nickname: "NewName" });

            expect(dbModule.updateIdentity).toHaveBeenCalledWith(
                "user1",
                "char1",
                expect.objectContaining({
                    nickname: "NewName",
                    honorific: "존댓말" // Should be preserved
                })
            );
        });
    });
});
