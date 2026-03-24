import { type ActionFunctionArgs, data } from "react-router";
import { z } from "zod";
import { db } from "~/lib/db.server";
import { SUBSCRIPTION_PLANS } from "~/lib/subscription-plans";
import { requireUserId } from "~/lib/auth.server";
import { DateTime } from "luxon";
import * as schema from "~/db/schema";
import { eq, sql } from "drizzle-orm";
import { BigNumber } from "bignumber.js";
import { logger } from "~/lib/logger.server";

const ActivateSubscriptionSchema = z.object({
    subscriptionId: z.string(),
    planId: z.string(), // PayPal Plan ID
});

export async function action({ request }: ActionFunctionArgs) {
    const userId = await requireUserId(request);
    if (!userId) {
        throw data({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const submission = ActivateSubscriptionSchema.safeParse(Object.fromEntries(formData));

    if (!submission.success) {
        logger.error({ category: "PAYMENT", message: "Invalid payload:", stackTrace: (submission.error as Error).stack });
        return data({ error: "Invalid payload" }, { status: 400 });
    }

    const { subscriptionId, planId } = submission.data;

    // Plan ID로 Tier 찾기
    const planEntry = Object.values(SUBSCRIPTION_PLANS).find(p => p.paypalPlanId === planId);

    if (!planEntry) {
        return data({ error: "Unknown subscription plan" }, { status: 400 });
    }

    try {
        // 이미 사용 중인 Subscription ID인지 확인
        const existingSub = await db.query.user.findFirst({
            where: eq(schema.user.subscriptionId, subscriptionId),
        });

        if (existingSub) {
            // 이미 처리된 요청일 수 있음 (멱등성)
            if (existingSub.id === userId) {
                return data({ success: true, message: "Subscription already active" });
            }
            return data({ error: "Subscription ID already in use" }, { status: 409 });
        }

        // 1. 사용자 정보 조회
        const user = await db.query.user.findFirst({
            where: eq(schema.user.id, userId),
            columns: { id: true, chocoBalance: true },
        });

        if (!user) {
            return data({ error: "User not found" }, { status: 404 });
        }

        // 2. 멤버십 보상 CHOCO 계산 (1 Credit = 1 CHOCO)
        const chocoAmount = planEntry.creditsPerMonth.toString();

        // 3. 트랜잭션으로 DB 업데이트
        const nextMonth = DateTime.now().plus({ months: 1 }).toJSDate();

        await db.transaction(async (tx) => {
            // 사용자 정보 업데이트
            const newChocoBalance = new BigNumber(user.chocoBalance || "0").plus(chocoAmount);

            await tx.update(schema.user)
                .set({
                    subscriptionStatus: "ACTIVE",
                    subscriptionTier: planEntry.tier,
                    subscriptionId: subscriptionId,
                    currentPeriodEnd: nextMonth,
                    chocoBalance: newChocoBalance.toString(),
                    lastTokenRefillAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(schema.user.id, userId));

            // Payment 기록 생성
            await tx.insert(schema.payment).values({
                id: crypto.randomUUID(),
                userId,
                amount: planEntry.monthlyPrice,
                currency: "USD",
                status: "COMPLETED",
                type: "SUBSCRIPTION_ACTIVATION",
                provider: "PAYPAL",
                subscriptionId: subscriptionId,
                description: `Subscription Activation: ${planEntry.name}`,
                creditsGranted: planEntry.creditsPerMonth, // 호환성을 위해 유지 (deprecated)
                metadata: JSON.stringify({
                    tier: planEntry.tier,
                    chocoAmount,
                }),
                createdAt: new Date(),
                updatedAt: new Date(),
            });

        });

        return data({ success: true });

    } catch (error) {
        logger.error({ category: "PAYMENT", message: "Subscription Activation Error:", stackTrace: (error as Error).stack });
        return data({ error: "Failed to activate subscription" }, { status: 500 });
    }
}
