import type { ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { z } from "zod";
import * as schema from "~/db/schema";
import { eq, sql } from "drizzle-orm";
import { BigNumber } from "bignumber.js";

const purchaseSchema = z.object({
    itemId: z.string(),
    quantity: z.number().min(1),
});

export async function action({ request }: ActionFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const result = purchaseSchema.safeParse(body);

    if (!result.success) {
        return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { itemId, quantity } = result.data;

    // Check if the item exists in the database
    const item = await db.query.item.findFirst({
        where: eq(schema.item.id, itemId),
    });

    if (!item) {
        return Response.json({ error: "Item not found" }, { status: 404 });
    }

    if (!item.isActive) {
        return Response.json({ error: "Item is not currently available for purchase" }, { status: 400 });
    }

    const totalCost = (item.priceChoco || 0) * quantity;

    // Check user CHOCO balance
    const user = await db.query.user.findFirst({
        where: eq(schema.user.id, session.user.id),
        columns: { chocoBalance: true },
    });

    const userChocoBalance = user?.chocoBalance ? parseFloat(user.chocoBalance) : 0;
    if (!user || userChocoBalance < totalCost) {
        return Response.json({ error: "Insufficient CHOCO balance" }, { status: 400 });
    }

    try {
        // DB 트랜잭션
        await db.transaction(async (tx) => {
            // CHOCO 차감
            const newChocoBalance = new BigNumber(userChocoBalance).minus(totalCost).toString();
            await tx.update(schema.user)
                .set({ chocoBalance: newChocoBalance, updatedAt: new Date() })
                .where(eq(schema.user.id, session.user.id));

            // 인벤토리 추가
            await tx.insert(schema.userInventory).values({
                id: crypto.randomUUID(),
                userId: session.user.id,
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

            // Payment 기록
            await tx.insert(schema.payment).values({
                id: crypto.randomUUID(),
                userId: session.user.id,
                amount: totalCost,
                currency: "CHOCO",
                status: "COMPLETED",
                provider: "CHOCO",
                type: "ITEM_PURCHASE",
                description: `${item.name} ${quantity}개 구매`,
                metadata: JSON.stringify({ itemId, quantity, chocoSpent: totalCost }),
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        });

        return Response.json({ success: true, chocoSpent: totalCost });
    } catch (error: unknown) {
        const { logger } = await import("~/lib/logger.server");
        logger.error({
            category: "PAYMENT",
            message: "Purchase transaction error",
            stackTrace: (error as Error).stack,
            metadata: { userId: session.user.id, itemId, quantity }
        });
        return Response.json({ error: "Purchase failed" }, { status: 500 });
    }
}
