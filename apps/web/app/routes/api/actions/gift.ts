/**
 * Solana Action — Gift CHOCO 🍫
 *
 * GET  /api/actions/gift            → Action 메타데이터 반환
 * POST /api/actions/gift?to=<addr>  → 선물 트랜잭션 생성 (서명 대기)
 *
 * Blink URL 예시:
 *   https://dial.to/?action=solana-action:https://<host>/api/actions/gift?to=<addr>
 */
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { solanaConnection, ACTIONS_CORS_HEADERS } from "~/lib/solana/connection.server";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";

// CHOCO Token-2022 상수
const CHOCO_DECIMALS = 6;
const CHOCO_PER_SOL_LAMPORTS = 0.001 * LAMPORTS_PER_SOL; // 0.001 SOL = 최소 수수료

/** OPTIONS preflight */
export function loader({ request }: LoaderFunctionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: ACTIONS_CORS_HEADERS });
  }

  // GET — Action 메타데이터
  const payload = {
    icon: "https://res.cloudinary.com/dpmw96p8k/image/upload/v1/choonsim/gift-action-icon.png",
    title: "춘심에게 초코 선물하기 🍫",
    description:
      "다른 팬에게 CHOCO 토큰을 선물하세요. 선물받은 팬은 춘심과 더 많은 대화를 나눌 수 있습니다.",
    label: "CHOCO 선물",
    links: {
      actions: [
        {
          label: "100 CHOCO 선물",
          href: "/api/actions/gift?amount=100",
          parameters: [
            {
              name: "to",
              label: "받는 사람 지갑 주소",
              required: true,
            },
          ],
        },
        {
          label: "500 CHOCO 선물",
          href: "/api/actions/gift?amount=500",
          parameters: [
            {
              name: "to",
              label: "받는 사람 지갑 주소",
              required: true,
            },
          ],
        },
        {
          label: "1000 CHOCO 선물",
          href: "/api/actions/gift?amount=1000",
          parameters: [
            {
              name: "to",
              label: "받는 사람 지갑 주소",
              required: true,
            },
          ],
        },
      ],
    },
  };

  return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });
}

/** POST — 트랜잭션 생성 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: ACTIONS_CORS_HEADERS });
  }

  try {
    const url = new URL(request.url);
    const amount = parseInt(url.searchParams.get("amount") || "100", 10);
    const toAddress = url.searchParams.get("to");

    const body = await request.json();
    const senderAddress: string = body.account;

    if (!senderAddress) {
      return Response.json(
        { message: "account 파라미터가 필요합니다." },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const mintAddress = process.env.CHOCO_TOKEN_MINT_ADDRESS;
    if (!mintAddress) {
      // CHOCO 토큰이 아직 배포되지 않은 경우 — SOL 더미 트랜잭션으로 데모
      return buildDemoTransaction(senderAddress, amount);
    }

    if (!toAddress) {
      return Response.json(
        { message: "to 파라미터(받는 사람 지갑 주소)가 필요합니다." },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const mintPubkey = new PublicKey(mintAddress);
    const senderPubkey = new PublicKey(senderAddress);
    const recipientPubkey = new PublicKey(toAddress);

    // ATA 주소 계산
    const senderAta = getAssociatedTokenAddressSync(mintPubkey, senderPubkey);
    const recipientAta = getAssociatedTokenAddressSync(mintPubkey, recipientPubkey);

    const tx = new Transaction();
    const { blockhash, lastValidBlockHeight } = await solanaConnection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = senderPubkey;

    // 받는 사람 ATA 계정 없으면 생성
    const recipientAtaInfo = await solanaConnection.getAccountInfo(recipientAta);
    if (!recipientAtaInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          senderPubkey,
          recipientAta,
          recipientPubkey,
          mintPubkey
        )
      );
    }

    // CHOCO 전송 instruction
    tx.add(
      createTransferCheckedInstruction(
        senderAta,
        mintPubkey,
        recipientAta,
        senderPubkey,
        amount * Math.pow(10, CHOCO_DECIMALS),
        CHOCO_DECIMALS
      )
    );

    const serialized = tx.serialize({ requireAllSignatures: false });
    const base64Tx = Buffer.from(serialized).toString("base64");

    return Response.json(
      {
        transaction: base64Tx,
        message: `🍫 ${amount} CHOCO 선물 트랜잭션이 준비되었습니다!`,
      },
      { headers: ACTIONS_CORS_HEADERS }
    );
  } catch (err) {
    console.error("[actions/gift] error:", err);
    return Response.json(
      { message: "트랜잭션 생성에 실패했습니다." },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

/** CHOCO 미배포 시 SOL 더미 트랜잭션 (데모용) */
async function buildDemoTransaction(senderAddress: string, amount: number) {
  const senderPubkey = new PublicKey(senderAddress);
  const treasuryPubkey = new PublicKey(
    process.env.CHOCO_TREASURY_ADDRESS || senderAddress
  );

  const tx = new Transaction();
  const { blockhash, lastValidBlockHeight } = await solanaConnection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = senderPubkey;

  // 0 lamport 더미 전송 (서명만 연습)
  tx.add(
    SystemProgram.transfer({
      fromPubkey: senderPubkey,
      toPubkey: treasuryPubkey,
      lamports: 0,
    })
  );

  const serialized = tx.serialize({ requireAllSignatures: false });
  const base64Tx = Buffer.from(serialized).toString("base64");

  return Response.json(
    {
      transaction: base64Tx,
      message: `🍫 [DEMO] ${amount} CHOCO 선물 — CHOCO 토큰 배포 후 실제 전송됩니다.`,
    },
    { headers: ACTIONS_CORS_HEADERS }
  );
}
