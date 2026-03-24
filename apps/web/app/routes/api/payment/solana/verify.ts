import type { ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { Connection, PublicKey } from "@solana/web3.js";
import { findReference, validateTransfer } from "@solana/pay";
import { eq, sql } from "drizzle-orm";
import BigNumber from "bignumber.js";
import { logger } from "~/lib/logger.server";

// Solana RPC Connection (기본적으로 메인넷 사용, 테스트 시 devnet으로 변경 가능)
const SOLANA_RPC_ENDPOINT = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const connection = new Connection(SOLANA_RPC_ENDPOINT, "confirmed");

export async function action({ request }: ActionFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (request.method !== "POST") {
        return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    try {
        const { reference, paymentId } = await request.json();

        if (!reference || !paymentId) {
            return Response.json({ error: "Missing reference or paymentId" }, { status: 400 });
        }

        // 1. DB에서 해당 결제 정보 조회
        const paymentRecord = await db.query.payment.findFirst({
            where: eq(schema.payment.id, paymentId),
        });

        if (!paymentRecord || paymentRecord.userId !== session.user.id) {
            return Response.json({ error: "Payment record not found" }, { status: 404 });
        }

        if (paymentRecord.status === "COMPLETED") {
            return Response.json({ success: true, message: "Already completed" });
        }

        // 2. Solana 블록체인에서 해당 Reference를 가진 트랜잭션 찾기
        const referencePubkey = new PublicKey(reference);
        let signatureInfo;
        try {
            signatureInfo = await findReference(connection, referencePubkey, { finality: "confirmed" });
        } catch (e) {
            // 아직 트랜잭션을 찾지 못한 경우 (사용자가 아직 송금하지 않음)
            return Response.json({ success: false, status: "PENDING" });
        }

        // 3. 트랜잭션 상세 정보 및 유효성 검증
        try {
            const recipient = new PublicKey(process.env.SOLANA_RECEIVER_WALLET!);
            const amount = new BigNumber(paymentRecord.cryptoAmount || "0");

            await validateTransfer(connection, signatureInfo.signature, {
                recipient,
                amount,
                reference: referencePubkey,
            });

            // 4. 검증 성공 시 DB 업데이트 및 크레딧 지급
            await db.transaction(async (tx) => {
                // 결제 상태 업데이트
                await tx.update(schema.payment)
                    .set({
                        status: "COMPLETED",
                        txHash: signatureInfo.signature,
                        updatedAt: new Date(),
                    })
                    .where(eq(schema.payment.id, paymentId));

                // 유저 크레딧 충전
                await tx.update(schema.user)
                    .set({
                        credits: sql`${schema.user.credits} + ${paymentRecord.creditsGranted}`
                    })
                    .where(eq(schema.user.id, paymentRecord.userId));
            });

            logger.info({ category: "PAYMENT", message: `[SolanaPay] Payment COMPLETED: user=${paymentRecord.userId}, signature=${signatureInfo.signature}` });

            return Response.json({
                success: true,
                status: "COMPLETED",
                signature: signatureInfo.signature
            });

        } catch (validationError) {
            logger.error({ category: "PAYMENT", message: "Solana Pay validation error:", stackTrace: (validationError as Error).stack });
            return Response.json({ error: "Transaction validation failed" }, { status: 400 });
        }

    } catch (error) {
        logger.error({ category: "PAYMENT", message: "Solana Pay verification error:", stackTrace: (error as Error).stack });
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
