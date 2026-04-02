/**
 * PATCH /api/user/wallet
 * 유저의 Solana 지갑 주소(Phantom)를 저장합니다.
 */
import type { ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import { PublicKey } from "@solana/web3.js";
import { sendOnboardingSol } from "~/lib/solana/airdrop.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "PATCH") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { solanaWallet } = body as { solanaWallet: string };

  if (!solanaWallet) {
    return Response.json({ error: "solanaWallet is required" }, { status: 400 });
  }

  // Base58 주소 유효성 검증
  try {
    new PublicKey(solanaWallet);
  } catch {
    return Response.json({ error: "Invalid Solana wallet address" }, { status: 400 });
  }

  // 기존 지갑 주소 확인 (신규 등록인 경우에만 SOL 지급)
  const existing = await db.query.user.findFirst({
    where: eq(schema.user.id, session.user.id),
    columns: { solanaWallet: true },
  });

  await db
    .update(schema.user)
    .set({ solanaWallet, updatedAt: new Date() })
    .where(eq(schema.user.id, session.user.id));

  // 신규 지갑 등록 시 테스트 SOL 지급 (fire-and-forget)
  if (!existing?.solanaWallet) {
    sendOnboardingSol(solanaWallet);
  }

  return Response.json({ success: true, solanaWallet });
}
