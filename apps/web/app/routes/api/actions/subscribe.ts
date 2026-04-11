/**
 * Solana Action — 춘심 구독 💎
 *
 * GET  /api/actions/subscribe?plan=<monthly|yearly>  → 메타데이터 (라이브 구독자 수)
 * POST /api/actions/subscribe?plan=<monthly|yearly>  → SOL 결제 트랜잭션 + Linked Action (선물하기)
 *
 * Meta-Blinks 고도화:
 *   - 실제 Choonsim Cloudinary 이미지 아이콘
 *   - 현재 구독자 수 (DB 라이브 쿼리)
 *   - POST 완료 후 → gift Blink로 Linked Action 체이닝
 */
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { solanaConnection, ACTIONS_CORS_HEADERS } from "~/lib/solana/connection.server";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { count, ne } from "drizzle-orm";

const TREASURY = process.env.CHOCO_TREASURY_ADDRESS || "";

const PLAN_PRICES: Record<string, { sol: number; label: string; choco: number }> = {
  monthly: { sol: 0.01, label: "월간 구독 (0.01 SOL)", choco: 3000 },
  yearly: { sol: 0.08, label: "연간 구독 (0.08 SOL)", choco: 36000 },
};

const CHOONSIM_ICON =
  "https://res.cloudinary.com/dpmw96p8k/image/upload/v1774674780/choonsim/choonsim.png";

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: ACTIONS_CORS_HEADERS });
  }

  // 현재 구독자 수 (라이브)
  let subscriberCount = 0;
  try {
    const [row] = await db
      .select({ total: count() })
      .from(schema.user)
      .where(ne(schema.user.subscriptionTier, "FREE"));
    subscriberCount = row?.total ?? 0;
  } catch {
    // DB 오류 시 통계 없이 진행
  }

  const payload = {
    icon: CHOONSIM_ICON,
    title: "춘심 구독하기 💎",
    description:
      subscriberCount > 0
        ? `현재 ${subscriberCount}명의 팬이 구독 중! SOL로 구독권을 구매하면 매일 CHOCO 토큰 지급 + 프리미엄 메모리 기능을 이용할 수 있어요.`
        : "SOL로 춘심 구독권을 구매하세요. 구독 중에는 매일 CHOCO 토큰이 지급되며 프리미엄 메모리 기능을 이용할 수 있습니다.",
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

    // Linked Action — 구독 완료 후 CHOCO 선물하기 Blink로 연결 (Interoperable Blinks)
    return Response.json(
      {
        transaction: base64Tx,
        message: `💎 ${planInfo.label} 결제 완료 시 ${planInfo.choco.toLocaleString()} CHOCO가 지급됩니다!`,
        links: {
          next: {
            type: "inline",
            action: {
              type: "action",
              icon: CHOONSIM_ICON,
              title: "Gift CHOCO to a Fan 🍫",
              description:
                "Welcome, subscriber! Celebrate by gifting CHOCO to another fan. Spread the love.",
              label: "Gift CHOCO",
              links: {
                actions: [
                  {
                    label: "Gift 100 CHOCO",
                    href: "/api/actions/gift?amount=100",
                    parameters: [
                      { name: "to", label: "Recipient wallet address", required: true },
                    ],
                  },
                  {
                    label: "Gift 500 CHOCO",
                    href: "/api/actions/gift?amount=500",
                    parameters: [
                      { name: "to", label: "Recipient wallet address", required: true },
                    ],
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
    console.error("[actions/subscribe] error:", err);
    return Response.json(
      { message: "트랜잭션 생성에 실패했습니다." },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}
