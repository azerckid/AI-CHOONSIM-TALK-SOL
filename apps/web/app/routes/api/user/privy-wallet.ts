/**
 * PATCH /api/user/privy-wallet
 * Privy 임베디드 지갑 주소를 DB에 저장합니다.
 * 클라이언트에서 Privy ready 시 1회 호출 (이미 저장된 경우 스킵).
 */
import type { ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import { PublicKey } from "@solana/web3.js";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "PATCH") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as { privyWallet?: string };
  const { privyWallet } = body;

  if (!privyWallet) {
    return Response.json({ error: "privyWallet is required" }, { status: 400 });
  }

  try {
    new PublicKey(privyWallet);
  } catch {
    return Response.json({ error: "Invalid Solana wallet address" }, { status: 400 });
  }

  await db
    .update(schema.user)
    .set({ privyWallet, updatedAt: new Date() })
    .where(eq(schema.user.id, session.user.id));

  return Response.json({ success: true });
}
