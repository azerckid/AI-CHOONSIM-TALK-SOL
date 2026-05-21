/**
 * PATCH /api/user/wallet
 * 유저의 Solana identity 지갑 주소(Phantom)를 SIWS 서명 검증 후 저장합니다.
 */
import type { ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { PublicKey } from "@solana/web3.js";
import { sendOnboardingSol } from "~/lib/solana/airdrop.server";
import { buildSiwsMessage, verifySignature } from "~/lib/solana/siws.server";

async function verifyWalletProof(walletAddress: string, signature: string): Promise<Response | null> {
  const stored = await db
    .select()
    .from(schema.verification)
    .where(eq(schema.verification.identifier, `siws:${walletAddress}`))
    .get();

  if (!stored || stored.expiresAt < new Date()) {
    return Response.json({ error: "Wallet signature nonce expired. Please reconnect your wallet." }, { status: 401 });
  }

  let nonce: string;
  let issuedAt: string;
  try {
    ({ nonce, issuedAt } = JSON.parse(stored.value));
  } catch {
    return Response.json({ error: "Invalid wallet signature nonce" }, { status: 500 });
  }

  const message = buildSiwsMessage(walletAddress, nonce, issuedAt);
  if (!verifySignature(message, signature, walletAddress)) {
    return Response.json({ error: "Wallet signature verification failed" }, { status: 401 });
  }

  await db
    .delete(schema.verification)
    .where(eq(schema.verification.identifier, `siws:${walletAddress}`));

  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "PATCH") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { solanaWallet?: string; signature?: string } | null;
  const { solanaWallet, signature } = body ?? {};

  if (!solanaWallet) {
    return Response.json({ error: "solanaWallet is required" }, { status: 400 });
  }

  let normalizedWallet: string;
  try {
    normalizedWallet = new PublicKey(solanaWallet).toBase58();
  } catch {
    return Response.json({ error: "Invalid Solana wallet address" }, { status: 400 });
  }

  if (!signature) {
    return Response.json({ error: "Wallet signature is required" }, { status: 401 });
  }

  const proofError = await verifyWalletProof(normalizedWallet, signature);
  if (proofError) return proofError;

  const walletOwner = await db.query.user.findFirst({
    where: and(
      eq(schema.user.solanaWallet, normalizedWallet),
      ne(schema.user.id, session.user.id)
    ),
    columns: { id: true },
  });

  if (walletOwner) {
    return Response.json({ error: "Wallet is already linked to another account" }, { status: 409 });
  }

  // 기존 지갑 주소 확인 (신규 등록인 경우에만 SOL 지급)
  const existing = await db.query.user.findFirst({
    where: eq(schema.user.id, session.user.id),
    columns: { solanaWallet: true },
  });

  await db
    .update(schema.user)
    .set({ solanaWallet: normalizedWallet, updatedAt: new Date() })
    .where(eq(schema.user.id, session.user.id));

  const isNew = !existing?.solanaWallet;

  // 신규 지갑 등록 시 테스트 SOL 지급
  if (isNew) {
    await sendOnboardingSol(normalizedWallet);
  }

  return Response.json({ success: true, solanaWallet: normalizedWallet, isNew });
}
