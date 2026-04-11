/**
 * Solana Action — 일일 체크인 ✅
 *
 * GET  /api/actions/checkin  → 메타데이터 (라이브 통계 포함)
 * POST /api/actions/checkin  → 체크인 트랜잭션 + Linked Action (구독 안내)
 *
 * Meta-Blinks 고도화:
 *   - 실제 Choonsim Cloudinary 이미지 아이콘
 *   - 오늘 체크인한 팬 수 (DB 라이브 쿼리)
 *   - POST 완료 후 → subscribe Blink로 Linked Action 체이닝
 */
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { solanaConnection, ACTIONS_CORS_HEADERS } from "~/lib/solana/connection.server";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { count, eq, and, gte } from "drizzle-orm";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const DAILY_CHOCO_REWARD = 50;

const CHOONSIM_ICON =
  "https://res.cloudinary.com/dpmw96p8k/image/upload/v1774674780/choonsim/choonsim.png";

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: ACTIONS_CORS_HEADERS });
  }

  // 오늘 체크인 완료한 유저 수 (라이브)
  let todayCheckins = 0;
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartUnix = Math.floor(todayStart.getTime() / 1000);

    const [row] = await db
      .select({ total: count() })
      .from(schema.userMission)
      .where(
        and(
          eq(schema.userMission.status, "COMPLETED"),
          gte(schema.userMission.lastUpdated, todayStart)
        )
      );
    todayCheckins = row?.total ?? 0;
  } catch {
    // DB 오류 시 통계 없이 진행
  }

  const payload = {
    icon: CHOONSIM_ICON,
    title: "Choonsim Daily Check-in ✅",
    description:
      todayCheckins > 0
        ? `Today ${todayCheckins} fans already checked in! Join them and earn ${DAILY_CHOCO_REWARD} CHOCO. Attendance is permanently recorded on-chain.`
        : `Check in every day to earn ${DAILY_CHOCO_REWARD} CHOCO. Your attendance is recorded on-chain forever.`,
    label: `Claim ${DAILY_CHOCO_REWARD} CHOCO`,
  };

  return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: ACTIONS_CORS_HEADERS });
  }

  try {
    const body = await request.json();
    const senderAddress: string = body.account;

    if (!senderAddress) {
      return Response.json(
        { message: "account parameter is required." },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const senderPubkey = new PublicKey(senderAddress);
    const memoText = `CHOONSIM_CHECKIN:${senderAddress}:${Date.now()}`;

    const tx = new Transaction();
    const { blockhash, lastValidBlockHeight } = await solanaConnection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = senderPubkey;

    // Memo instruction — 온체인 체크인 증명
    tx.add(
      new TransactionInstruction({
        keys: [{ pubkey: senderPubkey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memoText, "utf-8"),
      })
    );

    // 0-lamport 자기자신 전송 (트랜잭션 수수료 지불 트리거)
    tx.add(
      SystemProgram.transfer({
        fromPubkey: senderPubkey,
        toPubkey: senderPubkey,
        lamports: 0,
      })
    );

    const serialized = tx.serialize({ requireAllSignatures: false });
    const base64Tx = Buffer.from(serialized).toString("base64");

    // Linked Action — 체크인 완료 후 구독 Blink로 연결 (Interoperable Blinks)
    return Response.json(
      {
        transaction: base64Tx,
        message: `✅ Check-in recorded on-chain! ${DAILY_CHOCO_REWARD} CHOCO will be credited after confirmation.`,
        links: {
          next: {
            type: "inline",
            action: {
              type: "action",
              icon: CHOONSIM_ICON,
              title: "Subscribe to Choonsim 💎",
              description:
                "Great job checking in! Subscribe now to unlock daily CHOCO rewards and premium memory features.",
              label: "Subscribe 0.01 SOL",
              links: {
                actions: [
                  {
                    label: "Monthly (0.01 SOL)",
                    href: "/api/actions/subscribe?plan=monthly",
                  },
                  {
                    label: "Yearly (0.08 SOL)",
                    href: "/api/actions/subscribe?plan=yearly",
                  },
                ],
              },
            },
          },
        },
      },
      { headers: ACTIONS_CORS_HEADERS }
    );
  } catch (err) {
    console.error("[actions/checkin] error:", err);
    return Response.json(
      { message: "Failed to create transaction." },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}
