/**
 * POST /api/auth/siws/verify
 * Body: { walletAddress, signature }
 *
 * 1. nonce 검증
 * 2. Ed25519 서명 검증
 * 3-A. solanaWallet로 기존 유저 발견 → 세션 직접 생성 (Better Auth 쿠키 포맷 재현)
 * 3-B. 신규 유저 → Better Auth sign-up/sign-in
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

/**
 * better-call의 signCookieValue와 동일한 알고리즘
 * value → encodeURIComponent(`${value}.${HMAC-SHA256-base64(value, secret)}`)
 */
async function signCookieValue(value: string, secret: string): Promise<string> {
  const algorithm = { name: "HMAC", hash: "SHA-256" } as const;
  const keyData = new TextEncoder().encode(secret);
  const key = await crypto.subtle.importKey("raw", keyData, algorithm, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  const base64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return encodeURIComponent(`${value}.${base64}`);
}

/** 기존 유저에 대해 세션을 DB에 직접 생성하고 Better Auth 쿠키를 설정한 Response 반환 */
async function createSessionResponse(userId: string): Promise<Response> {
  const secret = (auth as any).options?.secret || process.env.BETTER_AUTH_SECRET || "";
  const isProduction = (process.env.BETTER_AUTH_URL || "").startsWith("https://");

  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7일

  await db.insert(schema.session).values({
    id: crypto.randomUUID(),
    token,
    userId,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });

  const signedToken = await signCookieValue(token, secret);
  const cookieName = isProduction
    ? "__Secure-better-auth.session_token"
    : "better-auth.session_token";

  const cookieParts = [
    `${cookieName}=${signedToken}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${expiresAt.toUTCString()}`,
    ...(isProduction ? ["Secure"] : []),
  ];

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookieParts.join("; "),
    },
  });
}

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

  // ── 3-A. 이미 등록된 지갑이면 해당 계정으로 세션 생성 ─────────────────────
  const existingUser = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.solanaWallet, walletAddress))
    .get();

  if (existingUser) {
    return createSessionResponse(existingUser.id);
  }

  // ── 3-B. 신규 유저: Better Auth sign-up → sign-in ──────────────────────────
  const { email, password } = deriveSiwsCredentials(walletAddress);
  const baseUrl = (process.env.BETTER_AUTH_URL || "http://localhost:5173").replace(/\/$/, "");

  // sign-in 먼저 시도 (이미 SIWS 계정이 있을 수도 있음)
  let sessionRes = await auth.handler(
    new Request(`${baseUrl}/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),
  );

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
      console.error("[SIWS] sign-up failed:", await signUpRes.text());
      return Response.json({ error: "계정 생성 실패" }, { status: 500 });
    }

    await db
      .update(schema.user)
      .set({ solanaWallet: walletAddress, provider: "siws" })
      .where(eq(schema.user.email, email));

    sessionRes = signUpRes;
  }

  // ── 4. 세션 쿠키 클라이언트에 전달 ────────────────────────────────────────
  return sessionRes;
}
