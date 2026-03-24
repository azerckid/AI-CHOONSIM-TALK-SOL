/**
 * Solana Action — 춘심 구독 💎
 *
 * GET  /api/actions/subscribe?plan=<monthly|yearly>  → 메타데이터
 * POST /api/actions/subscribe?plan=<monthly|yearly>  → SOL 결제 트랜잭션 생성
 *
 * Blink URL 예시:
 *   https://dial.to/?action=solana-action:https://<host>/api/actions/subscribe
 */
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { solanaConnection, ACTIONS_CORS_HEADERS } from "~/lib/solana/connection.server";

// SOL 결제 수취 주소 (Treasury)
const TREASURY = process.env.CHOCO_TREASURY_ADDRESS || "";

// 플랜별 SOL 가격 (Devnet 테스트용 — 실제 배포 시 수정)
const PLAN_PRICES: Record<string, { sol: number; label: string; choco: number }> = {
  monthly: { sol: 0.01, label: "월간 구독 (0.01 SOL)", choco: 3000 },
  yearly: { sol: 0.08, label: "연간 구독 (0.08 SOL)", choco: 36000 },
};

export function loader({ request }: LoaderFunctionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: ACTIONS_CORS_HEADERS });
  }

  const payload = {
    icon: "https://res.cloudinary.com/dpmw96p8k/image/upload/v1/choonsim/subscribe-action-icon.png",
    title: "춘심 구독하기 💎",
    description:
      "SOL로 춘심 구독권을 구매하세요. 구독 중에는 매일 CHOCO 토큰이 지급되며 프리미엄 메모리 기능을 이용할 수 있습니다.",
    label: "구독",
    links: {
      actions: [
        {
          label: "월간 구독 (0.01 SOL)",
          href: "/api/actions/subscribe?plan=monthly",
        },
        {
          label: "연간 구독 (0.08 SOL)",
          href: "/api/actions/subscribe?plan=yearly",
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
    const plan = url.searchParams.get("plan") || "monthly";

    const planInfo = PLAN_PRICES[plan];
    if (!planInfo) {
      return Response.json(
        { message: "유효하지 않은 플랜입니다. (monthly | yearly)" },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const body = await request.json();
    const senderAddress: string = body.account;
    if (!senderAddress) {
      return Response.json(
        { message: "account 파라미터가 필요합니다." },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    if (!TREASURY) {
      return Response.json(
        { message: "Treasury 주소가 설정되지 않았습니다." },
        { status: 500, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const senderPubkey = new PublicKey(senderAddress);
    const treasuryPubkey = new PublicKey(TREASURY);
    const lamports = Math.round(planInfo.sol * LAMPORTS_PER_SOL);

    const tx = new Transaction();
    const { blockhash, lastValidBlockHeight } = await solanaConnection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = senderPubkey;

    tx.add(
      SystemProgram.transfer({
        fromPubkey: senderPubkey,
        toPubkey: treasuryPubkey,
        lamports,
      })
    );

    const serialized = tx.serialize({ requireAllSignatures: false });
    const base64Tx = Buffer.from(serialized).toString("base64");

    return Response.json(
      {
        transaction: base64Tx,
        message: `💎 ${planInfo.label} 결제 완료 시 ${planInfo.choco} CHOCO가 지급됩니다!`,
      },
      { headers: ACTIONS_CORS_HEADERS }
    );
  } catch (err) {
    console.error("[actions/subscribe] error:", err);
    return Response.json(
      { message: "트랜잭션 생성에 실패했습니다." },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}
