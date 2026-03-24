import { type ActionFunctionArgs } from "react-router";
import { db } from "~/lib/db.server";
import { verifyWebhookSignature } from "~/lib/paypal.server";
import { SUBSCRIPTION_PLANS } from "~/lib/subscription-plans";
import { DateTime } from "luxon";
import * as schema from "~/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { BigNumber } from "bignumber.js";
import { logger } from "~/lib/logger.server";

export async function action({ request }: ActionFunctionArgs) {
    if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    // 1. 요청 파싱
    const bodyText = await request.text();
    const body = JSON.parse(bodyText);
    const headers = Object.fromEntries(request.headers);

    // 2. Webhook 서명 검증
    const isValid = await verifyWebhookSignature(headers as any, body);

    if (!isValid) {
        logger.error({ category: "PAYMENT", message: "Invalid Webhook Signature" });
        return new Response("Invalid Signature", { status: 400 });
    }

    const eventType = body.event_type;
    const resource = body.resource;

    logger.info({ category: "PAYMENT", message: `[PayPal Webhook] Received event: ${eventType}` });

    try {
        switch (eventType) {
            case "BILLING.SUBSCRIPTION.PAYMENT.SUCCEEDED": {
                // 구독 갱신 결제 성공
                const subscriptionId = resource.billing_agreement_id;
                const transactionId = resource.id;
                const amount = resource.amount.total;

                // 1. 사용자 찾기
                const user = await db.query.user.findFirst({
                    where: eq(schema.user.subscriptionId, subscriptionId),
                });

                if (!user) {
                    logger.warn({ category: "PAYMENT", message: `User not found for subscription: ${subscriptionId}` });
                    return new Response("User Not Found", { status: 200 });
                }

                // 2. 중복 처리 방지
                const existingPayment = await db.query.payment.findFirst({
                    where: eq(schema.payment.transactionId, transactionId),
                });

                if (existingPayment) {
                    logger.info({ category: "PAYMENT", message: `Transaction ${transactionId} already processed.` });
                    return new Response("Already Processed", { status: 200 });
                }

                // 3. 플랜 정보 가져오기 & CHOCO 계산
                const planKey = user.subscriptionTier as keyof typeof SUBSCRIPTION_PLANS;
                const plan = SUBSCRIPTION_PLANS[planKey];
                const creditsToAdd = plan ? plan.creditsPerMonth : 0;
                const chocoAmount = creditsToAdd.toString(); // 1 Credit = 1 CHOCO

                // 4. 다음 결제일 계산
                const nextBillingDate = DateTime.now().plus({ months: 1 }).toJSDate();

                // 5. 트랜잭션 실행
                await db.transaction(async (tx) => {
                    await tx.insert(schema.payment).values({
                        id: crypto.randomUUID(),
                        userId: user.id,
                        amount: parseFloat(amount),
                        currency: resource.amount.currency,
                        status: "COMPLETED",
                        type: "SUBSCRIPTION_RENEWAL",
                        provider: "PAYPAL",
                        transactionId: transactionId,
                        subscriptionId: subscriptionId,
                        description: `Subscription Renewal: ${user.subscriptionTier}`,
                        creditsGranted: creditsToAdd > 0 ? creditsToAdd : undefined, // 호환성을 위해 유지 (deprecated)
                        metadata: JSON.stringify({
                            ...resource,
                            chocoAmount,
                        }),
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });

                    // 유저 CHOCO 잔액 업데이트
                    const currentChocoBalance = await tx.query.user.findFirst({
                        where: eq(schema.user.id, user.id),
                        columns: { chocoBalance: true },
                    });
                    const newChocoBalance = new BigNumber(currentChocoBalance?.chocoBalance || "0").plus(chocoAmount);

                    await tx.update(schema.user)
                        .set({
                            chocoBalance: newChocoBalance.toString(),
                            lastTokenRefillAt: new Date(),
                            currentPeriodEnd: nextBillingDate,
                            subscriptionStatus: "ACTIVE",
                            updatedAt: new Date(),
                        })
                        .where(eq(schema.user.id, user.id));

                });

                logger.info({ category: "PAYMENT", message: `[Subscription Renewal] Success for user ${user.id}. Added ${chocoAmount} CHOCO.` });
                break;
            }

            case "BILLING.SUBSCRIPTION.CANCELLED": {
                const subscriptionId = resource.id;

                await db.update(schema.user)
                    .set({ subscriptionStatus: "CANCELLED", updatedAt: new Date() })
                    .where(eq(schema.user.subscriptionId, subscriptionId));

                logger.info({ category: "PAYMENT", message: `[Subscription Cancelled] Subscription ${subscriptionId} cancelled.` });
                break;
            }

            case "BILLING.SUBSCRIPTION.SUSPENDED": {
                const subscriptionId = resource.id;

                await db.update(schema.user)
                    .set({ subscriptionStatus: "SUSPENDED", updatedAt: new Date() })
                    .where(eq(schema.user.subscriptionId, subscriptionId));

                logger.info({ category: "PAYMENT", message: `[Subscription Suspended] Subscription ${subscriptionId} suspended.` });
                break;
            }

            default:
                logger.info({ category: "PAYMENT", message: `Unhandled event type: ${eventType}` });
        }
    } catch (error) {
        logger.error({ category: "PAYMENT", message: "Error processing webhook:", stackTrace: (error as Error).stack });
        return new Response("Internal Server Error", { status: 500 });
    }

    return new Response("OK", { status: 200 });
}
