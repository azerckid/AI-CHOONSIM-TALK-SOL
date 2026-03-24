import { type ActionFunctionArgs, data } from "react-router";
import { z } from "zod";
import { db } from "~/lib/db.server";
import { paypal, paypalClient } from "~/lib/paypal.server";
import { HEART_PACKAGES } from "~/lib/items";
import { requireUserId } from "~/lib/auth.server";
import * as schema from "~/db/schema";
import { eq, and, sql } from "drizzle-orm";
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

    const body = await request.json();
    const submission = CaptureOrderSchema.safeParse(body);

    if (!submission.success) {
        return data({ error: "Invalid payload" }, { status: 400 });
    }

    const { orderId, packageId } = submission.data;
    const itemPackage = HEART_PACKAGES.find((p) => p.id === packageId);

    if (!itemPackage) {
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

        if (Math.abs(amountPaid - itemPackage.priceUSD) > 0.01) {
            logger.error({ category: "PAYMENT", message: `Amount mismatch: expected ${itemPackage.priceUSD}, paid ${amountPaid}` });
            return data({ error: "Payment amount mismatch. Please contact support." }, { status: 400 });
        }

        const quantity = itemPackage.quantity;
        const itemId = itemPackage.itemId;

        await db.transaction(async (tx) => {
            // 1. Payment 기록 생성
            await tx.insert(schema.payment).values({
                id: crypto.randomUUID(),
                userId,
                amount: itemPackage.priceUSD,
                currency: "USD",
                status: "COMPLETED",
                type: "ITEM_PURCHASE",
                provider: "PAYPAL",
                transactionId: result.id,
                description: itemPackage.name,
                metadata: JSON.stringify({
                    itemId,
                    quantity,
                    packageId,
                    paypalResult: result
                }),
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            // 2. 인벤토리 업데이트
            await tx.insert(schema.userInventory).values({
                id: crypto.randomUUID(),
                userId,
                itemId,
                quantity,
                updatedAt: new Date(),
            }).onConflictDoUpdate({
                target: [schema.userInventory.userId, schema.userInventory.itemId],
                set: {
                    quantity: sql`${schema.userInventory.quantity} + ${quantity}`,
                    updatedAt: new Date(),
                }
            });
        });

        return data({ success: true, quantityAdded: quantity });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ category: "PAYMENT", message: "PayPal Capture Item Error:", stackTrace: (error as Error).stack });
        return data({ error: errorMessage || "Failed to capture payment" }, { status: 500 });
    }
}
