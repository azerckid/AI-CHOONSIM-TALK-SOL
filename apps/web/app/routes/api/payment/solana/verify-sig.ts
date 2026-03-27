/**
 * POST /api/payment/solana/verify-sig
 *
 * Phantom signAndSendTransaction 완료 후 signature로 결제를 검증하고 CHOCO를 지급.
 *
 * Body: { signature: string, paymentId: string }
 */
import type { ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq, sql } from "drizzle-orm";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { logger } from "~/lib/logger.server";
import { transferChocoSPL } from "~/lib/solana/agent-kit.server";

const connection = new Connection(
  process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  "confirmed"
);

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { signature, paymentId } = await request.json();
  if (!signature || !paymentId) {
    return Response.json({ error: "Missing signature or paymentId" }, { status: 400 });
  }

  // 1. DB에서 결제 레코드 확인
  const payment = await db.query.payment.findFirst({
    where: eq(schema.payment.id, paymentId),
  });
  if (!payment || payment.userId !== session.user.id) {
    return Response.json({ error: "Payment not found" }, { status: 404 });
  }
  if (payment.status === "COMPLETED") {
    return Response.json({ status: "COMPLETED", chocoGranted: payment.creditsGranted });
  }

  // 2. 온체인 트랜잭션 확인 (최대 5회 재시도)
  let txInfo = null;
  for (let i = 0; i < 5; i++) {
    txInfo = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (txInfo) break;
    await new Promise((r) => setTimeout(r, 2000));
  }

  if (!txInfo) {
    return Response.json({ status: "PENDING", message: "Transaction not confirmed yet" });
  }

  if (txInfo.meta?.err) {
    return Response.json({ error: "Transaction failed on-chain" }, { status: 400 });
  }

  // 3. 수신 지갑으로 SOL이 전송됐는지 확인
  const recipient = process.env.SOLANA_RECEIVER_WALLET!;
  const recipientPubkey = new PublicKey(recipient);
  const accountKeys = txInfo.transaction.message.staticAccountKeys ??
    (txInfo.transaction.message as any).accountKeys ?? [];
  const recipientIdx = accountKeys.findIndex(
    (k: PublicKey) => k.toBase58() === recipientPubkey.toBase58()
  );

  if (recipientIdx === -1) {
    logger.error({ category: "PAYMENT", message: `[verify-sig] recipient not in tx: ${signature}` });
    return Response.json({ error: "Recipient not found in transaction" }, { status: 400 });
  }

  const preBalance = txInfo.meta!.preBalances[recipientIdx];
  const postBalance = txInfo.meta!.postBalances[recipientIdx];
  const receivedLamports = postBalance - preBalance;
  const expectedLamports = Math.round((payment.cryptoAmount ?? 0) * LAMPORTS_PER_SOL);

  // 허용 오차 5% (슬리피지 대응)
  const tolerance = expectedLamports * 0.05;
  if (receivedLamports < expectedLamports - tolerance) {
    logger.error({
      category: "PAYMENT",
      message: `[verify-sig] amount mismatch: expected=${expectedLamports}, got=${receivedLamports}`,
    });
    return Response.json({ error: "SOL amount mismatch" }, { status: 400 });
  }

  // 4. DB 업데이트 + CHOCO 지급
  const chocoGranted = payment.creditsGranted ?? 0;
  await db.transaction(async (tx) => {
    await tx.update(schema.payment)
      .set({ status: "COMPLETED", txHash: signature, updatedAt: new Date() })
      .where(eq(schema.payment.id, paymentId));

    await tx.update(schema.user)
      .set({
        credits: sql`${schema.user.credits} + ${chocoGranted}`,
        chocoBalance: sql`CAST(CAST(${schema.user.chocoBalance} AS REAL) + ${chocoGranted} AS TEXT)`,
        updatedAt: new Date(),
      })
      .where(eq(schema.user.id, session.user.id));
  });

  logger.info({
    category: "PAYMENT",
    message: `[verify-sig] COMPLETED: user=${session.user.id}, choco=${chocoGranted}, sig=${signature}`,
  });

  // 5. SPL CHOCO 전송 (지갑 등록된 경우)
  try {
    const user = await db.query.user.findFirst({
      where: eq(schema.user.id, session.user.id),
      columns: { solanaWallet: true },
    });
    if (user?.solanaWallet) {
      const splResult = await transferChocoSPL(user.solanaWallet, chocoGranted);
      logger.info({ category: "PAYMENT", message: `[verify-sig] SPL sent: ${splResult.signature}` });
    }
  } catch (splErr) {
    logger.error({ category: "PAYMENT", message: `[verify-sig] SPL failed (payment still ok): ${splErr}` });
  }

  return Response.json({ status: "COMPLETED", chocoGranted });
}
