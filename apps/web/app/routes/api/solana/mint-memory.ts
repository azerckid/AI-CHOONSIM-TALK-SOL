/**
 * POST /api/solana/mint-memory
 *
 * 사용자 요청 → 서버 Agent가 cNFT 발행 → 사용자 지갑으로 전송
 * CHOCO 소모: 200 CHOCO per minting
 */
import type { ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq, sql } from "drizzle-orm";
import { mintMemoryNFT } from "~/lib/solana/cnft.server";
import { z } from "zod";

const MINT_COST_CHOCO = 200;

const mintSchema = z.object({
  ownerAddress: z.string().min(32).max(44),
  name: z.string().min(1).max(32),
  description: z.string().max(200).optional().default(""),
  imageUri: z.string().url().optional().default(""),
  characterId: z.string(),
});

export async function action({ request }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // 잔액 확인
  const user = await db.query.user.findFirst({
    where: eq(schema.user.id, userId),
    columns: { chocoBalance: true },
  });

  const balance = parseFloat(user?.chocoBalance ?? "0");
  if (balance < MINT_COST_CHOCO) {
    return Response.json(
      { error: `cNFT 각인에는 ${MINT_COST_CHOCO} CHOCO가 필요합니다. (현재: ${balance})` },
      { status: 402 }
    );
  }

  const body = await request.json();
  const parsed = mintSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 });
  }

  const { ownerAddress, name, description, imageUri, characterId } = parsed.data;

  try {
    // cNFT 발행
    const result = await mintMemoryNFT({
      ownerAddress,
      name,
      description,
      imageUri,
      characterId,
      userId,
    });

    // CHOCO 차감
    await db
      .update(schema.user)
      .set({
        chocoBalance: sql`CAST(CAST(${schema.user.chocoBalance} AS REAL) - ${MINT_COST_CHOCO} AS TEXT)`,
        updatedAt: new Date(),
      })
      .where(eq(schema.user.id, userId));

    return Response.json({
      success: true,
      signature: result.signature,
      message: `🎖️ 메모리 NFT가 온체인에 각인되었습니다! (${MINT_COST_CHOCO} CHOCO 소모)`,
    });
  } catch (err) {
    console.error("[mint-memory] error:", err);
    return Response.json(
      { error: "NFT 발행 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
