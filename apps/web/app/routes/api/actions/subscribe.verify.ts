/**
 * POST /api/actions/subscribe/verify
 *
 * 구독 SOL 결제 트랜잭션 확인 후 subscriptionTier 업데이트 + CHOCO 지급
 */
import type { ActionFunctionArgs } from "react-router";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq, sql } from "drizzle-orm";
import { solanaConnection, ACTIONS_CORS_HEADERS } from "~/lib/solana/connection.server";

const PLAN_CHOCO: Record<string, { choco: number; tier: string; months: number; lamports: number }> = {
  monthly: { choco: 3000, tier: "BASIC", months: 1, lamports: Math.round(0.01 * LAMPORTS_PER_SOL) },
  yearly: { choco: 36000, tier: "BASIC", months: 12, lamports: Math.round(0.08 * LAMPORTS_PER_SOL) },
};

export async function action({ request }: ActionFunctionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: ACTIONS_CORS_HEADERS });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: ACTIONS_CORS_HEADERS });
  }

  const userId = session.user.id;
  const { txSignature, plan = "monthly" } = await request.json();

  if (!txSignature) {
    return Response.json(
      { error: "txSignature가 필요합니다." },
      { status: 400, headers: ACTIONS_CORS_HEADERS }
    );
  }

  const planInfo = PLAN_CHOCO[plan];
  if (!planInfo) {
    return Response.json(
      { error: "유효하지 않은 플랜입니다." },
      { status: 400, headers: ACTIONS_CORS_HEADERS }
    );
  }

  try {
    // Replay 방지: 이미 처리된 tx 서명인지 확인
    const usedTx = await db.query.payment.findFirst({
      where: eq(schema.payment.txHash, txSignature),
      columns: { id: true },
    });
    if (usedTx) {
      return Response.json(
        { error: "이미 처리된 트랜잭션입니다." },
        { status: 409, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // 유저 지갑 조회
    const user = await db.query.user.findFirst({
      where: eq(schema.user.id, userId),
      columns: { solanaWallet: true },
    });

    // 온체인 트랜잭션 확인
    const tx = await solanaConnection.getTransaction(txSignature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return Response.json(
        { error: "트랜잭션을 찾을 수 없습니다. 잠시 후 다시 시도하세요." },
        { status: 404, headers: ACTIONS_CORS_HEADERS }
      );
    }

    if (tx.meta?.err) {
      return Response.json(
        { error: "트랜잭션이 실패했습니다." },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const accountKeys =
      tx.transaction.message.staticAccountKeys?.map((k) => k.toBase58()) ?? [];
    const feePayer = accountKeys[0];

    // 서명자(payer) 검증 — 지갑 미등록 계정은 구독 verify 불가
    if (!user?.solanaWallet) {
      return Response.json(
        { error: "등록된 Solana 지갑이 없습니다. 지갑을 먼저 연결해주세요." },
        { status: 403, headers: ACTIONS_CORS_HEADERS }
      );
    }
    if (feePayer !== new PublicKey(user.solanaWallet).toBase58()) {
      return Response.json(
        { error: "트랜잭션 서명자가 로그인한 지갑과 일치하지 않습니다." },
        { status: 403, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Treasury 수신 및 결제 금액 검증 — env 없으면 fail-closed
    const treasury = process.env.CHOCO_TREASURY_ADDRESS;
    if (!treasury) {
      return Response.json(
        { error: "서버 설정 오류입니다." },
        { status: 500, headers: ACTIONS_CORS_HEADERS }
      );
    }
    const treasuryBase58 = new PublicKey(treasury).toBase58();
    const treasuryIndex = accountKeys.indexOf(treasuryBase58);
    if (treasuryIndex === -1) {
      return Response.json(
        { error: "treasury 수신 내역이 없습니다." },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }
    const balanceDelta =
      (tx.meta?.postBalances[treasuryIndex] ?? 0) -
      (tx.meta?.preBalances[treasuryIndex] ?? 0);
    if (balanceDelta < planInfo.lamports) {
      return Response.json(
        { error: "SOL 결제 금액이 맞지 않습니다." },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // 구독 만료일 계산
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + planInfo.months);

    // subscriptionTier 업데이트 + CHOCO 지급 + payment 기록 (원자적)
    await db.transaction(async (tx_) => {
      await tx_
        .update(schema.user)
        .set({
          subscriptionTier: planInfo.tier,
          subscriptionStatus: "active",
          currentPeriodEnd: periodEnd,
          chocoBalance: sql`CAST(CAST(${schema.user.chocoBalance} AS REAL) + ${planInfo.choco} AS TEXT)`,
          updatedAt: now,
        })
        .where(eq(schema.user.id, userId));

      await tx_.insert(schema.payment).values({
        id: crypto.randomUUID(),
        userId,
        amount: planInfo.lamports / LAMPORTS_PER_SOL,
        currency: "SOL",
        status: "COMPLETED",
        type: "SUBSCRIPTION",
        provider: "solana",
        description: `구독 ${plan} - ${planInfo.tier}`,
        txHash: txSignature,
        walletAddress: feePayer,
        cryptoCurrency: "SOL",
        cryptoAmount: planInfo.lamports / LAMPORTS_PER_SOL,
        network: "devnet",
        updatedAt: now,
      });
    });

    return Response.json(
      {
        success: true,
        message: `💎 구독 완료! ${planInfo.choco} CHOCO가 지급되었습니다.`,
        plan,
        tier: planInfo.tier,
        periodEnd: periodEnd.toISOString(),
        chocoGranted: planInfo.choco,
        signature: txSignature,
      },
      { headers: ACTIONS_CORS_HEADERS }
    );
  } catch (err) {
    console.error("[subscribe/verify] error:", err);
    return Response.json(
      { error: "구독 처리 중 오류가 발생했습니다." },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}
