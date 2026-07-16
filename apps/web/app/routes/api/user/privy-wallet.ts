/**
 * PATCH /api/user/privy-wallet
 * Privy 임베디드 지갑 주소를 DB에 저장합니다.
 * 클라이언트(usePrivyWalletSync)에서 sessionStorage 플래그로 1회만 호출됩니다.
 *
 * 보안 참고: /api/user/wallet(Phantom)과 달리 이 엔드포인트는 서명 기반
 * 소유권 증명을 요구하지 않는다 — 인증된 사용자라면 임의의 유효한 Solana
 * 주소를 자신의 privyWallet으로 등록할 수 있다(다른 계정에 이미 연결된
 * 주소만 차단). 따라서 CHOCO SPL payout 등 자금 이동 경로에서는 이 필드를
 * 신뢰하지 않고 SIWS로 검증된 solanaWallet만 사용해야 한다
 * (routes/api/payment/solana/verify.ts, verify-sig.ts 참고).
 */
import type { ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { PublicKey } from "@solana/web3.js";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "PATCH") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { privyWallet?: string } | null;
  const { privyWallet } = body ?? {};

  if (!privyWallet) {
    return Response.json({ error: "privyWallet is required" }, { status: 400 });
  }

  let normalizedWallet: string;
  try {
    normalizedWallet = new PublicKey(privyWallet).toBase58();
  } catch {
    return Response.json({ error: "Invalid Solana wallet address" }, { status: 400 });
  }

  const currentUser = await db.query.user.findFirst({
    where: eq(schema.user.id, session.user.id),
    columns: { privyWallet: true },
  });

  if (currentUser?.privyWallet && currentUser.privyWallet !== normalizedWallet) {
    return Response.json({ error: "Privy wallet is already set for this account" }, { status: 409 });
  }

  const walletOwner = await db.query.user.findFirst({
    where: and(
      eq(schema.user.privyWallet, normalizedWallet),
      ne(schema.user.id, session.user.id)
    ),
    columns: { id: true },
  });

  if (walletOwner) {
    return Response.json({ error: "Privy wallet is already linked to another account" }, { status: 409 });
  }

  const isNew = !currentUser?.privyWallet;

  await db
    .update(schema.user)
    .set({ privyWallet: normalizedWallet, updatedAt: new Date() })
    .where(eq(schema.user.id, session.user.id));

  return Response.json({ success: true, privyWallet: normalizedWallet, isNew });
}
