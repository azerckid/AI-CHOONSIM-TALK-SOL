/**
 * Solana Action — Gift CHOCO 🍫
 *
 * GET  /api/actions/gift            → 메타데이터 (라이브 팬 지갑 수)
 * POST /api/actions/gift?to=<addr>  → 선물 트랜잭션 + Linked Action (체크인 유도)
 *
 * Meta-Blinks 고도화:
 *   - 실제 Choonsim Cloudinary 이미지 아이콘
 *   - Solana 지갑 등록 팬 수 (DB 라이브 쿼리)
 *   - POST 완료 후 → checkin Blink로 Linked Action 체이닝
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
import { count, isNotNull } from "drizzle-orm";

const CHOCO_DECIMALS = 6;

const CHOONSIM_ICON =
  "https://res.cloudinary.com/dpmw96p8k/image/upload/v1774674780/choonsim/choonsim.png";

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: ACTIONS_CORS_HEADERS });
  }

  // Solana 지갑 등록 팬 수 (라이브)
  let walletFanCount = 0;
  try {
    const [row] = await db
      .select({ total: count() })
      .from(schema.user)
      .where(isNotNull(schema.user.solanaWallet));
    walletFanCount = row?.total ?? 0;
  } catch {
    // DB 오류 시 통계 없이 진행
  }

  const payload = {
    icon: CHOONSIM_ICON,
    title: "Gift CHOCO to a Fan 🍫",
    description:
      walletFanCount > 0
        ? `${walletFanCount} fans have Solana wallets — send them CHOCO! The recipient can enjoy more conversations with Choonsim.`
        : "Send CHOCO tokens to another fan. The recipient can enjoy more conversations with Choonsim.",
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

    const senderAta = getAssociatedTokenAddressSync(mintPubkey, senderPubkey);
    const recipientAta = getAssociatedTokenAddressSync(mintPubkey, recipientPubkey);

    const tx = new Transaction();
    const { blockhash, lastValidBlockHeight } = await solanaConnection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = senderPubkey;

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

    // Linked Action — 선물 완료 후 체크인 Blink로 연결 (Interoperable Blinks)
    return Response.json(
      {
        transaction: base64Tx,
        message: `🍫 ${amount.toLocaleString()} CHOCO gift transaction is ready!`,
        links: {
          next: {
            type: "inline",
            action: {
              type: "action",
              icon: CHOONSIM_ICON,
              title: "Choonsim Daily Check-in ✅",
              description:
                "You gifted CHOCO — now check in to earn your own 50 CHOCO reward!",
              label: "Claim 50 CHOCO",
              href: "/api/actions/checkin",
            },
          },
        },
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
      message: `🍫 [DEMO] ${amount} CHOCO gift — live after CHOCO token is deployed.`,
      links: {
        next: {
          type: "inline",
          action: {
            type: "action",
            icon: CHOONSIM_ICON,
            title: "Choonsim Daily Check-in ✅",
            description: "Now check in to earn your own 50 CHOCO reward!",
            label: "Claim 50 CHOCO",
            href: "/api/actions/checkin",
          },
        },
      },
    },
    { headers: ACTIONS_CORS_HEADERS }
  );
}
