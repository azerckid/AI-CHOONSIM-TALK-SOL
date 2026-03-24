import type { ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { z } from "zod";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { Keypair, PublicKey } from "@solana/web3.js";
import { encodeURL } from "@solana/pay";
import BigNumber from "bignumber.js";
import axios from "axios";
import { logger } from "~/lib/logger.server";

// SOL 가격 캐싱을 위한 메모리 저장소
let cachedSolPrice: number | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시

const createRequestSchema = z.object({
    amount: z.number().positive(), // USD amount
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

    const recipientAddr = process.env.SOLANA_RECEIVER_WALLET;
    if (!recipientAddr) {
        return Response.json({ error: "Solana receiver wallet is not configured" }, { status: 500 });
    }

    try {
        const body = await request.json();
        const result = createRequestSchema.safeParse(body);

        if (!result.success) {
            return Response.json(
                { error: "Invalid request data", details: result.error.issues },
                { status: 400 }
            );
        }

        const { amount, credits, description } = result.data;
        const userId = session.user.id;

        // 1. SOL 가격 가져오기 (캐싱 적용)
        let solPrice = cachedSolPrice || 150;
        const now = Date.now();

        if (!cachedSolPrice || (now - lastFetchTime > CACHE_DURATION)) {
            try {
                const priceRes = await axios.get("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
                solPrice = priceRes.data.solana.usd;
                cachedSolPrice = solPrice;
                lastFetchTime = now;
                logger.info({ category: "PAYMENT", message: `[SolanaPay] Updated SOL price: $${solPrice}` });
            } catch (e) {
                logger.error({ category: "PAYMENT", message: "Failed to fetch SOL price, using cached/fallback:", stackTrace: (e as Error).stack });
            }
        }

        // 2. SOL 수량 계산 (USD / SOL Price)
        const solAmount = new BigNumber(amount).dividedBy(solPrice).decimalPlaces(6);
        const recipient = new PublicKey(recipientAddr);

        // 3. 고유 Reference 생성 (트랜잭션 확인용)
        const reference = new Keypair().publicKey;

        // 4. Solana Pay URL 생성
        const url = encodeURL({
            recipient,
            amount: solAmount,
            reference,
            label: "Choonsim Credits",
            message: `Top-up ${credits} credits`,
            memo: `USER_ID:${userId}`,
        });

        // 5. Pending Payment 레코드 생성
        const paymentId = crypto.randomUUID();
        await db.insert(schema.payment).values({
            id: paymentId,
            userId,
            amount: amount, // USD
            currency: "USD",
            status: "PENDING",
            type: "TOPUP",
            provider: "SOLANA",
            transactionId: reference.toBase58(),
            creditsGranted: credits,
            cryptoCurrency: "SOL",
            cryptoAmount: solAmount.toNumber(),
            exchangeRate: solPrice,
            description: description || `${credits} Credits Top-up (Solana)`,
            updatedAt: new Date(),
        });

        return Response.json({
            success: true,
            paymentId,
            url: url.toString(),
            reference: reference.toBase58(),
            solAmount: solAmount.toString(),
            solPrice: solPrice.toString(),
        });
    } catch (error) {
        logger.error({ category: "PAYMENT", message: "Solana Pay request creation error:", stackTrace: (error as Error).stack });
        return Response.json(
            { error: "Failed to create Solana Pay request" },
            { status: 500 }
        );
    }
}
