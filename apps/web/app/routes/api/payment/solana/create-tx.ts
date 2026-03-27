/**
 * POST /api/payment/solana/create-tx
 *
 * Phantom 브라우저 익스텐션 인라인 결제용 트랜잭션 파라미터 생성.
 * 클라이언트가 @solana/web3.js로 트랜잭션을 직접 빌드해 Phantom에 전달.
 *
 * Body:  { choco: number }
 * Returns: { recipient, lamports, solAmount, reference, paymentId, rpcUrl }
 */
import type { ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { Keypair } from "@solana/web3.js";
import { z } from "zod";
import { logger } from "~/lib/logger.server";

// Devnet 고정 가격: 1,000 CHOCO = 0.01 SOL
const SOL_PER_CHOCO = 0.00001; // 1 CHOCO = 0.00001 SOL → 100 CHOCO = 0.001 SOL

const bodySchema = z.object({
  choco: z.number().int().positive(),
});

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recipient = process.env.SOLANA_RECEIVER_WALLET;
  if (!recipient) {
    logger.error({ category: "PAYMENT", message: "[create-tx] SOLANA_RECEIVER_WALLET is not set" });
    return Response.json({ error: "SOLANA_RECEIVER_WALLET 환경변수가 설정되지 않았어요." }, { status: 500 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: "Invalid body: choco must be a positive integer" }, { status: 400 });
  }

  const { choco } = parsed.data;
  const solAmount = parseFloat((choco * SOL_PER_CHOCO).toFixed(6));
  const lamports = Math.round(solAmount * 1e9);

  // 고유 reference 생성 (findReference로 온체인에서 추적)
  const reference = new Keypair().publicKey.toBase58();
  const paymentId = crypto.randomUUID();

  try {
    await db.insert(schema.payment).values({
      id: paymentId,
      userId: session.user.id,
      amount: choco / 1000, // USD 환산 (1,000 CHOCO = $1)
      currency: "USD",
      status: "PENDING",
      type: "TOPUP",
      provider: "SOLANA",
      transactionId: reference,
      creditsGranted: choco,
      cryptoCurrency: "SOL",
      cryptoAmount: solAmount,
      exchangeRate: 1 / SOL_PER_CHOCO / 1000,
      description: `${choco} CHOCO (Phantom inline)`,
      updatedAt: new Date(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ category: "PAYMENT", message: `[create-tx] DB insert failed: ${msg}` });
    return Response.json({ error: `DB 오류: ${msg}` }, { status: 500 });
  }

  logger.info({
    category: "PAYMENT",
    message: `[create-tx] payment created: id=${paymentId}, choco=${choco}, sol=${solAmount}, user=${session.user.id}`,
  });

  return Response.json({
    recipient,
    lamports,
    solAmount: solAmount.toString(),
    reference,
    paymentId,
    rpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  });
}
