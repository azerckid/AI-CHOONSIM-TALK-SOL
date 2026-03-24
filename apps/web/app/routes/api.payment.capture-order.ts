import { type ActionFunctionArgs, data } from "react-router";
import { z } from "zod";
import { db } from "~/lib/db.server";
import { paypal, paypalClient } from "~/lib/paypal.server";
import { CREDIT_PACKAGES } from "~/lib/subscription-plans";
import { requireUserId } from "~/lib/auth.server";
import * as schema from "~/db/schema";
import { eq, sql } from "drizzle-orm";
import { BigNumber } from "bignumber.js";
import { logger } from "~/lib/logger.server";

const CaptureOrderSchema = z.object({
    orderId: z.string(),
    packageId: z.string(),
});

export async function action({ request }: ActionFunctionArgs) {
    const userId = await requireUserId(request);
    if (!userId) {
        throw data({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const submission = CaptureOrderSchema.safeParse(Object.fromEntries(formData));

    if (!submission.success) {
        return data({ error: "Invalid payload" }, { status: 400 });
    }

    const { orderId, packageId } = submission.data;
    const creditPackage = CREDIT_PACKAGES.find((p) => p.id === packageId);

    if (!creditPackage) {
        return data({ error: "Invalid package ID" }, { status: 400 });
    }

    const requestBody = new paypal.orders.OrdersCaptureRequest(orderId);
    requestBody.requestBody({} as any);

    try {
        const capture = await paypalClient.execute(requestBody);
        const result = capture.result;

        if (result.status !== "COMPLETED") {
            return data({ error: "Payment not completed" }, { status: 400 });
        }

        // 결제 검증 (금액 일치 여부 등)
        const purchaseUnit = result.purchase_units[0];
        const amountPaid = parseFloat(purchaseUnit.payments.captures[0].amount.value);

        if (Math.abs(amountPaid - creditPackage.price) > 0.01) {
            logger.error({ category: "PAYMENT", message: `Amount mismatch: expected ${creditPackage.price}, paid ${amountPaid}` });
            return data({ error: "Payment amount mismatch. Please contact support." }, { status: 400 });
        }

        // 1. 사용자 정보 조회
        const user = await db.query.user.findFirst({
            where: eq(schema.user.id, userId),
            columns: { id: true, chocoBalance: true },
        });

        if (!user) {
            return data({ error: "User not found" }, { status: 404 });
        }

        // 2. USD → CHOCO 계산 (1 USD = 1,000 CHOCO)
        const chocoAmount = Math.floor(creditPackage.price * 1000);

        // 3. 트랜잭션으로 DB 업데이트
        const totalCredits = creditPackage.credits + creditPackage.bonus; // 호환성을 위해 유지

        await db.transaction(async (tx) => {
            // Payment 기록 생성
            await tx.insert(schema.payment).values({
                id: crypto.randomUUID(),
                userId,
                amount: creditPackage.price,
                currency: "USD",
                status: "COMPLETED",
                type: "TOPUP",
                provider: "PAYPAL",
                transactionId: result.id,
                description: creditPackage.name,
                creditsGranted: totalCredits, // 호환성을 위해 유지 (deprecated)
                metadata: JSON.stringify({
                    ...result,
                    chocoAmount,
                }),
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            // 유저 CHOCO 잔액 업데이트
            const newChocoBalance = new BigNumber(user.chocoBalance || "0").plus(chocoAmount);
            await tx.update(schema.user)
                .set({
                    chocoBalance: newChocoBalance.toString(),
                    lastTokenRefillAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(schema.user.id, userId));

            // PAYMENT 알림 생성
            await tx.insert(schema.notification).values({
                id: crypto.randomUUID(),
                userId,
                type: "PAYMENT",
                title: "결제가 완료되었습니다",
                body: `${creditPackage.name} 구매가 완료되었습니다. +${chocoAmount} CHOCO`,
                createdAt: new Date(),
            });
        });

        return data({ success: true, newCredits: totalCredits, chocoAmount });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ category: "PAYMENT", message: "PayPal Capture Error:", stackTrace: (error as Error).stack });
        return data({ error: errorMessage }, { status: 500 });
    }
}
