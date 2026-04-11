/**
 * POST /api/actions/checkin/verify
 *
 * 체크인 트랜잭션 서명 확인 후 CHOCO 지급 (하루 1회)
 */
import type { ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq, sql } from "drizzle-orm";
import { solanaConnection } from "~/lib/solana/connection.server";
import { mintCompressedChoco } from "~/lib/solana/zk-compression.server";
import { PublicKey } from "@solana/web3.js";

const CHECKIN_CHOCO_REWARD = 50;
const MISSION_ID = "daily_checkin_solana";
const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

export async function action({ request }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { txSignature } = await request.json();

  if (!txSignature) {
    return Response.json({ error: "txSignature가 필요합니다." }, { status: 400 });
  }

  try {
    // 유저의 등록된 Solana 지갑 확인
    const user = await db.query.user.findFirst({
      where: eq(schema.user.id, userId),
      columns: { solanaWallet: true },
    });

    if (!user?.solanaWallet) {
      return Response.json(
        { error: "등록된 Solana 지갑이 없습니다. 지갑을 먼저 연결해주세요." },
        { status: 403 }
      );
    }

    // 오늘 체크인 여부 확인 — lastUpdated가 오늘이면 이미 완료
    const todayEpoch = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);

    const existing = await db.query.userMission.findFirst({
      where: eq(schema.userMission.userId, userId),
      columns: { id: true, lastUpdated: true, status: true, missionId: true },
    });

    const existingCheckin = existing && existing.missionId === MISSION_ID;
    const lastUpdatedEpoch = existingCheckin
      ? Math.floor(
          (existing.lastUpdated instanceof Date
            ? existing.lastUpdated.getTime()
            : Number(existing.lastUpdated) * 1000) / 1000
        )
      : 0;

    if (existingCheckin && lastUpdatedEpoch >= todayEpoch) {
      return Response.json(
        { error: "오늘은 이미 체크인했습니다. 내일 다시 도전하세요!" },
        { status: 409 }
      );
    }

    // 온체인 트랜잭션 확인
    const tx = await solanaConnection.getTransaction(txSignature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return Response.json(
        { error: "트랜잭션을 찾을 수 없습니다. 잠시 후 다시 시도하세요." },
        { status: 404 }
      );
    }

    // Memo instruction 확인
    const accountKeys =
      tx.transaction.message.staticAccountKeys?.map((k) => k.toBase58()) ?? [];

    if (!accountKeys.includes(MEMO_PROGRAM_ID)) {
      return Response.json(
        { error: "유효하지 않은 체크인 트랜잭션입니다." },
        { status: 400 }
      );
    }

    // CHOCO 지급 + 체크인 미션 기록 (upsert)
    await db.transaction(async (tx_) => {
      await tx_
        .update(schema.user)
        .set({
          chocoBalance: sql`CAST(CAST(${schema.user.chocoBalance} AS REAL) + ${CHECKIN_CHOCO_REWARD} AS TEXT)`,
          updatedAt: new Date(),
        })
        .where(eq(schema.user.id, userId));

      if (existingCheckin && existing?.id) {
        await tx_
          .update(schema.userMission)
          .set({ status: "COMPLETED", lastUpdated: new Date() })
          .where(eq(schema.userMission.id, existing.id));
      } else {
        await tx_.insert(schema.userMission).values({
          id: crypto.randomUUID(),
          userId,
          missionId: MISSION_ID,
          status: "COMPLETED",
          progress: 1,
          lastUpdated: new Date(),
        });
      }
    });

    // ZK Compression — 지갑이 등록된 유저에게 압축 CHOCO 온체인 민팅
    let zkSignature: string | null = null;
    try {
      const user = await db.query.user.findFirst({
        where: eq(schema.user.id, userId),
        columns: { solanaWallet: true },
      });
      if (user?.solanaWallet) {
        const zkResult = await mintCompressedChoco(user.solanaWallet, CHECKIN_CHOCO_REWARD);
        zkSignature = zkResult.signature;
      }
    } catch (zkErr) {
      // ZK 민팅 실패는 체크인 성공에 영향 없음
      console.warn("[checkin/verify] ZK compression mint failed (non-critical):", zkErr);
    }

    return Response.json({
      success: true,
      message: `✅ 체크인 완료! ${CHECKIN_CHOCO_REWARD} CHOCO가 지급되었습니다.`,
      reward: CHECKIN_CHOCO_REWARD,
      signature: txSignature,
      ...(zkSignature && {
        zkCompression: {
          signature: zkSignature,
          explorer: `https://explorer.solana.com/tx/${zkSignature}?cluster=devnet`,
        },
      }),
    });
  } catch (err) {
    console.error("[checkin/verify] error:", err);
    return Response.json(
      { error: "체크인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
