import type { ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { z } from "zod";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { logger } from "~/lib/logger.server";

const COINBASE_API_KEY = process.env.COINBASE_COMMERCE_API_KEY || "";

const createChargeSchema = z.object({
    amount: z.number().positive(),
    credits: z.number().int().positive(),
    description: z.string().optional(),
});

export async function action({ request }: ActionFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (request.method !== "POST") {
        return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    if (!COINBASE_API_KEY) {
        return Response.json({ error: "Coinbase API Key is not configured" }, { status: 500 });
    }

    try {
        const body = await request.json();
        const result = createChargeSchema.safeParse(body);

        if (!result.success) {
            return Response.json(
                { error: "Invalid request data", details: result.error.flatten() },
                { status: 400 }
            );
        }

        const { amount, credits, description } = result.data;
        const userId = session.user.id;

        // Coinbase API를 사용하여 Charge 생성 (Fetch 방식)
        const response = await fetch("https://api.commerce.coinbase.com/charges", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CC-Api-Key": COINBASE_API_KEY,
                "X-CC-Version": "2018-03-22",
            },
            body: JSON.stringify({
                name: description || `${credits} Credits Top-up`,
                description: `Purchase ${credits} credits for $${amount}`,
                local_price: {
                    amount: amount.toFixed(2),
                    currency: "USD",
                },
                pricing_type: "fixed_price",
                metadata: {
                    userId,
                    credits: credits.toString(),
                },
                redirect_url: `${new URL(request.url).origin}/profile/subscription`,
                cancel_url: `${new URL(request.url).origin}/profile/subscription`,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            logger.error({ category: "PAYMENT", message: "Coinbase API Error Response:" });
            return Response.json(
                { error: data.error?.message || "Failed to create charge from Coinbase" },
                { status: response.status }
            );
        }

        const charge = data.data;

        // Pending Payment 레코드 생성
        await db.insert(schema.payment).values({
            id: crypto.randomUUID(),
            userId,
            amount: amount,
            currency: "USD",
            status: "PENDING",
            type: "TOPUP",
            provider: "COINBASE",
            transactionId: charge.id,
            creditsGranted: credits,
            description: charge.name,
            metadata: JSON.stringify({
                chargeId: charge.id,
                hostedUrl: charge.hosted_url,
            }),
            updatedAt: new Date(),
        });

        return Response.json({
            success: true,
            chargeId: charge.id,
            hostedUrl: charge.hosted_url,
            expiresAt: charge.expires_at,
        });
    } catch (error) {
        logger.error({ category: "PAYMENT", message: "Coinbase charge creation error:", stackTrace: (error as Error).stack });
        return Response.json(
            { error: "Internal Server Error during charge creation" },
            { status: 500 }
        );
    }
}
