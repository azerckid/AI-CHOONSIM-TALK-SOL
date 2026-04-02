/**
 * POST /api/actions/subscribe/verify
 *
 * 구독 SOL 결제 트랜잭션 확인 후 subscriptionTier 업데이트 + CHOCO 지급
 */
import type { ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq, sql } from "drizzle-orm";
import { solanaConnection, ACTIONS_CORS_HEADERS } from "~/lib/solana/connection.server";

const PLAN_CHOCO: Record<string, { choco: number; tier: string; months: number }> = {
  monthly: { choco: 3000, tier: "BASIC", months: 1 },
  yearly: { choco: 36000, tier: "BASIC", months: 12 },
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

    // 구독 만료일 계산
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + planInfo.months);

    // subscriptionTier 업데이트 + CHOCO 지급 (트랜잭션)
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
