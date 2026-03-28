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

// CHOCO Token-2022 상수
const CHOCO_DECIMALS = 6;

/** OPTIONS preflight */
export function loader({ request }: LoaderFunctionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: ACTIONS_CORS_HEADERS });
  }

  // GET — Action 메타데이터
  const payload = {
    icon: "https://res.cloudinary.com/dpmw96p8k/image/upload/v1/choonsim/gift-action-icon.png",
    title: "Gift CHOCO to a Fan 🍫",
    description:
      "Send CHOCO tokens to another fan. The recipient can enjoy more conversations with Choonsim.",
    label: "Gift CHOCO",
    links: {
      actions: [
        {
          label: "Gift 100 CHOCO",
          href: "/api/actions/gift?amount=100",
          parameters: [
            {
              name: "to",
              label: "Recipient wallet address",
              required: true,
            },
          ],
        },
        {
          label: "Gift 500 CHOCO",
          href: "/api/actions/gift?amount=500",
          parameters: [
            {
              name: "to",
              label: "Recipient wallet address",
              required: true,
            },
          ],
        },
        {
          label: "Gift 1000 CHOCO",
          href: "/api/actions/gift?amount=1000",
          parameters: [
            {
              name: "to",
              label: "Recipient wallet address",
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
        { message: "account parameter is required." },
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
        { message: "to parameter (recipient wallet address) is required." },
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
        message: `🍫 ${amount} CHOCO gift transaction is ready!`,
      },
      { headers: ACTIONS_CORS_HEADERS }
    );
  } catch (err) {
    console.error("[actions/gift] error:", err);
    return Response.json(
      { message: "Failed to create transaction." },
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
      message: `🍫 [DEMO] ${amount} CHOCO gift — will be sent for real after CHOCO token is deployed.`,
    },
    { headers: ACTIONS_CORS_HEADERS }
  );
}
