/**
 * CHOCO 차감 서버 유틸리티
 */
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "~/lib/logger.server";
import type { TokenUsage } from "~/lib/ai/stream";

/**
 * 토큰 사용량에 따라 사용자 CHOCO 잔액을 차감하고 소비 로그를 기록합니다.
 * 공식: deduction = totalTokens / 100 (1,000 토큰 = 10 CHOCO)
 */
export async function deductChocoForTokens(
    userId: string,
    characterId: string,
    tokenUsage: TokenUsage
): Promise<void> {
    if (!tokenUsage || tokenUsage.totalTokens <= 0) return;

    const { BigNumber } = await import("bignumber.js");
    const chocoToDeduct = new BigNumber(tokenUsage.totalTokens)
        .dividedBy(100)
        .toFixed(0);

    const userForDeduction = await db.query.user.findFirst({
        where: eq(schema.user.id, userId),
        columns: { chocoBalance: true },
    });

    if (!userForDeduction) {
        throw new Error("User not found");
    }

    const currentBalance = userForDeduction.chocoBalance ? parseFloat(userForDeduction.chocoBalance) : 0;
    const newBalance = new BigNumber(currentBalance).minus(chocoToDeduct).toString();

    await db.update(schema.user)
        .set({ chocoBalance: newBalance, updatedAt: new Date() })
        .where(eq(schema.user.id, userId));

    logger.info({
        category: "API",
        message: `Deducted ${chocoToDeduct} CHOCO for user ${userId}`,
        metadata: { tokenUsage, chocoDeducted: chocoToDeduct }
    });
}
