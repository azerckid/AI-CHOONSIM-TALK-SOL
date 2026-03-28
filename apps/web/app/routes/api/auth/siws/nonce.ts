/**
 * GET /api/auth/siws/nonce?wallet=<address>
 * SIWS nonce 발급 → verification 테이블에 5분 TTL로 저장
 */
import type { LoaderFunctionArgs } from "react-router";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import { generateNonce, buildSiwsMessage } from "~/lib/solana/siws.server";
import { PublicKey } from "@solana/web3.js";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const wallet = url.searchParams.get("wallet");
  if (!wallet) return Response.json({ error: "wallet required" }, { status: 400 });

  try {
    new PublicKey(wallet); // 유효한 주소인지 검증
  } catch {
    return Response.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const nonce = generateNonce();
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5분 TTL

  // 기존 nonce 삭제 후 새로 저장
  await db
    .delete(schema.verification)
    .where(eq(schema.verification.identifier, `siws:${wallet}`));

  await db.insert(schema.verification).values({
    id: crypto.randomUUID(),
    identifier: `siws:${wallet}`,
    value: JSON.stringify({ nonce, issuedAt }),
    expiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const message = buildSiwsMessage(wallet, nonce, issuedAt);
  return Response.json({ nonce, issuedAt, message });
}
