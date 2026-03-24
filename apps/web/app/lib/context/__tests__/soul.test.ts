
import { describe, it, expect, vi, beforeEach } from "vitest";
import { compressSoulForPrompt, updateUserSoul } from "../soul";
import * as dbModule from "../db";

// Mock db dependencies
vi.mock("../db", () => ({
    getFullContextData: vi.fn(),
    updateSoul: vi.fn(),
}));

describe("Soul Context", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("compressSoulForPrompt", () => {
        it("returns empty string when no soul exists or is empty", async () => {
            (dbModule.getFullContextData as any).mockResolvedValue(null);
            let result = await compressSoulForPrompt("user1", "char1");
            expect(result).toBe("");

            (dbModule.getFullContextData as any).mockResolvedValue({ soul: {} });
            result = await compressSoulForPrompt("user1", "char1");
            expect(result).toBe("");
        });

        it("formats soul data correctly", async () => {
            (dbModule.getFullContextData as any).mockResolvedValue({
                soul: {
                    lifePhase: "취준생",
                    values: ["성장", "자유"],
                    dreams: ["세계일주"],
                    fears: ["실패"],
                    recurringWorries: ["돈"],
                    summary: "열정적이나 현실적 고민이 많음"
                }
            });

            const result = await compressSoulForPrompt("user1", "char1", "PREMIUM");

            expect(result).toContain("[SOUL & DEEP MIND]");
            expect(result).toContain("- 현재 삶의 단계: 취준생");
            expect(result).toContain("- 핵심 가치관: 성장, 자유");
            expect(result).toContain("- 꿈과 소망: 세계일주");
            expect(result).toContain("- 두려움/약점: 실패");
            expect(result).toContain("- 마음의 짐(고민): 돈");
            expect(result).toContain("- 내면 요약: 열정적이나 현실적 고민이 많음");
        });
    });

    describe("updateUserSoul", () => {
        it("merges updates with existing soul", async () => {
            (dbModule.getFullContextData as any).mockResolvedValue({
                soul: {
                    values: ["기존가치"]
                }
            });

            await updateUserSoul("user1", "char1", { dreams: ["새꿈"] });

            expect(dbModule.updateSoul).toHaveBeenCalledWith(
                "user1",
                "char1",
                expect.objectContaining({
                    values: ["기존가치"],
                    dreams: ["새꿈"]
                })
            );
        });
    });
});
