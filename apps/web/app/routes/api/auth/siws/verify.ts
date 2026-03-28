/**
 * POST /api/auth/siws/verify
 * Body: { walletAddress, signature }
 *
 * 1. nonce 검증
 * 2. Ed25519 서명 검증
 * 3. 신규 유저면 sign-up, 기존 유저면 sign-in (Better Auth 내부 호출)
 * 4. Set-Cookie 그대로 클라이언트에 전달
 */
import type { ActionFunctionArgs } from "react-router";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { auth } from "~/lib/auth.server";
import {
  verifySignature,
  buildSiwsMessage,
  deriveSiwsCredentials,
} from "~/lib/solana/siws.server";
import { eq } from "drizzle-orm";

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.json().catch(() => null);
  const { walletAddress, signature } = body ?? {};

  if (!walletAddress || !signature) {
    return Response.json({ error: "walletAddress, signature 필요" }, { status: 400 });
  }

  // ── 1. nonce 조회 ──────────────────────────────────────────────────────────
  const stored = await db
    .select()
    .from(schema.verification)
    .where(eq(schema.verification.identifier, `siws:${walletAddress}`))
    .get();

  if (!stored || stored.expiresAt < new Date()) {
    return Response.json({ error: "Nonce 만료 또는 없음. 다시 시도해주세요." }, { status: 401 });
  }

  let nonce: string, issuedAt: string;
  try {
    ({ nonce, issuedAt } = JSON.parse(stored.value));
  } catch {
    return Response.json({ error: "잘못된 nonce 형식" }, { status: 500 });
  }

  // ── 2. 서명 검증 ───────────────────────────────────────────────────────────
  const message = buildSiwsMessage(walletAddress, nonce, issuedAt);
  const valid = verifySignature(message, signature, walletAddress);
  if (!valid) return Response.json({ error: "서명 검증 실패" }, { status: 401 });

  // nonce 소비 (단일 사용)
  await db
    .delete(schema.verification)
    .where(eq(schema.verification.identifier, `siws:${walletAddress}`));

  // ── 3. Better Auth sign-in / sign-up ───────────────────────────────────────
  const { email, password } = deriveSiwsCredentials(walletAddress);
  const baseUrl = (process.env.BETTER_AUTH_URL || "http://localhost:5173").replace(/\/$/, "");

  // sign-in 먼저 시도
  let sessionRes = await auth.handler(
    new Request(`${baseUrl}/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),
  );

  // 계정이 없으면 sign-up
  if (!sessionRes.ok) {
    const shortAddr = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    const signUpRes = await auth.handler(
      new Request(`${baseUrl}/auth/sign-up/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: shortAddr }),
      }),
    );

    if (!signUpRes.ok) {
      const errText = await signUpRes.text();
      console.error("[SIWS] sign-up failed:", errText);
      return Response.json({ error: "계정 생성 실패" }, { status: 500 });
    }

    // solanaWallet 저장
    await db
      .update(schema.user)
      .set({ solanaWallet: walletAddress, provider: "siws" })
      .where(eq(schema.user.email, email));

    sessionRes = signUpRes;
  }

  // ── 4. 세션 쿠키 클라이언트에 전달 ────────────────────────────────────────
  return sessionRes;
}
