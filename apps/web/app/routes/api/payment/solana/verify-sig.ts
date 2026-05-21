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
import { z } from "zod";
import { getSolanaRpcUrl } from "~/lib/solana/config.server";

const connection = new Connection(getSolanaRpcUrl(), "confirmed");

const bodySchema = z.object({
  signature: z.string().min(1),
  paymentId: z.string().min(1),
});

function keyToBase58(key: unknown): string {
  if (key instanceof PublicKey) return key.toBase58();
  if (typeof key === "string") return key;
  if (key && typeof (key as { toBase58?: () => string }).toBase58 === "function") {
    return (key as { toBase58: () => string }).toBase58();
  }
  return "";
}

function timestampToMs(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value < 1e12 ? value * 1000 : value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function parseMetadata(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsedBody = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsedBody.success) {
    return Response.json({ error: "Missing signature or paymentId" }, { status: 400 });
  }
  const { signature, paymentId } = parsedBody.data;

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
  if (payment.status !== "PENDING") {
    return Response.json({ error: `Payment is not pending: ${payment.status}` }, { status: 409 });
  }
  if (!payment.transactionId) {
    return Response.json({ error: "Payment reference is missing" }, { status: 400 });
  }

  const duplicatePayment = await db.query.payment.findFirst({
    where: eq(schema.payment.txHash, signature),
  });
  if (duplicatePayment && duplicatePayment.id !== paymentId) {
    logger.error({
      category: "PAYMENT",
      message: `[verify-sig] duplicate signature attempted: sig=${signature}, payment=${paymentId}, existing=${duplicatePayment.id}`,
    });
    return Response.json({ error: "Transaction signature already used" }, { status: 409 });
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

  if (!txInfo.blockTime) {
    return Response.json({ error: "Transaction block time unavailable" }, { status: 400 });
  }

  // 3. 결제 레코드와 온체인 트랜잭션 연결성 검증
  const recipient = process.env.SOLANA_RECEIVER_WALLET!;
  const recipientPubkey = new PublicKey(recipient);
  const referencePubkey = new PublicKey(payment.transactionId);
  const message = txInfo.transaction.message as unknown as {
    staticAccountKeys?: unknown[];
    accountKeys?: unknown[];
  };
  const accountKeys = message.staticAccountKeys ?? message.accountKeys ?? [];
  const accountKeyStrings = accountKeys.map(keyToBase58);
  const payerAddress = accountKeyStrings[0];
  const recipientIdx = accountKeyStrings.findIndex((key) => key === recipientPubkey.toBase58());
  const referenceIdx = accountKeyStrings.findIndex((key) => key === referencePubkey.toBase58());

  if (recipientIdx === -1) {
    logger.error({ category: "PAYMENT", message: `[verify-sig] recipient not in tx: ${signature}` });
    return Response.json({ error: "Recipient not found in transaction" }, { status: 400 });
  }
  if (referenceIdx === -1) {
    logger.error({ category: "PAYMENT", message: `[verify-sig] reference not in tx: payment=${paymentId}, sig=${signature}` });
    return Response.json({ error: "Payment reference not found in transaction" }, { status: 400 });
  }

  const user = await db.query.user.findFirst({
    where: eq(schema.user.id, session.user.id),
    columns: { solanaWallet: true, privyWallet: true },
  });
  const expectedPayer = payment.walletAddress ?? user?.solanaWallet ?? null;
  if (expectedPayer && payerAddress !== expectedPayer) {
    logger.error({
      category: "PAYMENT",
      message: `[verify-sig] payer mismatch: expected=${expectedPayer}, got=${payerAddress}, payment=${paymentId}`,
    });
    return Response.json({ error: "Payer wallet mismatch" }, { status: 400 });
  }

  const paymentCreatedAtMs = timestampToMs(payment.createdAt);
  const txBlockTimeMs = txInfo.blockTime * 1000;
  if (paymentCreatedAtMs && txBlockTimeMs + 120_000 < paymentCreatedAtMs) {
    logger.error({
      category: "PAYMENT",
      message: `[verify-sig] tx is older than payment: payment=${paymentId}, sig=${signature}, paymentCreatedAt=${paymentCreatedAtMs}, blockTime=${txBlockTimeMs}`,
    });
    return Response.json({ error: "Transaction is older than payment request" }, { status: 400 });
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
  const verificationMetadata = {
    ...parseMetadata(payment.metadata),
    solanaVerification: {
      signature,
      reference: payment.transactionId,
      payer: payerAddress,
      recipient,
      expectedLamports,
      receivedLamports,
      blockTime: txInfo.blockTime,
      slot: txInfo.slot,
      verifiedAt: new Date().toISOString(),
    },
  };

  await db.transaction(async (tx) => {
    await tx.update(schema.payment)
      .set({
        status: "COMPLETED",
        txHash: signature,
        walletAddress: payment.walletAddress ?? payerAddress,
        metadata: JSON.stringify(verificationMetadata),
        blockNumber: String(txInfo.slot),
        confirmations: 1,
        updatedAt: new Date(),
      })
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
  let splTransferMetadata: Record<string, unknown>;
  try {
    const payoutWallet = user?.solanaWallet ?? user?.privyWallet ?? null;
    if (payoutWallet) {
      const splResult = await transferChocoSPL(payoutWallet, chocoGranted);
      splTransferMetadata = {
        status: "COMPLETED",
        signature: splResult.signature,
        walletAddress: payoutWallet,
        completedAt: new Date().toISOString(),
      };
      logger.info({ category: "PAYMENT", message: `[verify-sig] SPL sent: ${splResult.signature}` });
    } else {
      splTransferMetadata = {
        status: "SKIPPED",
        reason: "USER_PAYOUT_WALLET_NOT_REGISTERED",
        completedAt: new Date().toISOString(),
      };
    }
  } catch (splErr) {
    splTransferMetadata = {
      status: "FAILED",
      error: splErr instanceof Error ? splErr.message : String(splErr),
      completedAt: new Date().toISOString(),
    };
    logger.error({ category: "PAYMENT", message: `[verify-sig] SPL failed (payment still ok): ${splErr}` });
  }

  await db.update(schema.payment)
    .set({
      metadata: JSON.stringify({
        ...verificationMetadata,
        splTransfer: splTransferMetadata,
      }),
      updatedAt: new Date(),
    })
    .where(eq(schema.payment.id, paymentId));

  return Response.json({ status: "COMPLETED", chocoGranted });
}
