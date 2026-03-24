/**
 * Solana Action — 일일 체크인 ✅
 *
 * GET  /api/actions/checkin  → 메타데이터
 * POST /api/actions/checkin  → 체크인 트랜잭션 (on-chain proof + 서버 CHOCO 지급)
 *
 * 흐름:
 *   1. 사용자가 Blink를 통해 서명
 *   2. 서버가 트랜잭션에 Memo instruction 포함 (USER_CHECKIN:<address>)
 *   3. 트랜잭션 확인 후 서버에서 CHOCO 지급 (/api/actions/checkin/verify)
 *
 * Blink URL 예시:
 *   https://dial.to/?action=solana-action:https://<host>/api/actions/checkin
 */
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { solanaConnection, ACTIONS_CORS_HEADERS } from "~/lib/solana/connection.server";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const DAILY_CHOCO_REWARD = 50;

export function loader({ request }: LoaderFunctionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: ACTIONS_CORS_HEADERS });
  }

  const payload = {
    icon: "https://res.cloudinary.com/dpmw96p8k/image/upload/v1/choonsim/checkin-action-icon.png",
    title: "오늘의 춘심 체크인 ✅",
    description: `매일 체크인하면 ${DAILY_CHOCO_REWARD} CHOCO를 받을 수 있습니다. 온체인으로 출석이 기록됩니다.`,
    label: `${DAILY_CHOCO_REWARD} CHOCO 받기`,
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
        { message: "account 파라미터가 필요합니다." },
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

    return Response.json(
      {
        transaction: base64Tx,
        message: `✅ 체크인 완료! 트랜잭션 확인 후 ${DAILY_CHOCO_REWARD} CHOCO가 지급됩니다.`,
      },
      { headers: ACTIONS_CORS_HEADERS }
    );
  } catch (err) {
    console.error("[actions/checkin] error:", err);
    return Response.json(
      { message: "트랜잭션 생성에 실패했습니다." },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}
