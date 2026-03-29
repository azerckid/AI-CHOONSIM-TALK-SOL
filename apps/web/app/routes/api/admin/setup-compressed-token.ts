/**
 * POST /api/admin/setup-compressed-token
 *
 * 압축 CHOCO 민트를 Solana Devnet에 일회성으로 생성.
 * 반환된 mintAddress를 Vercel 환경변수 CHOCO_COMPRESSED_MINT_ADDRESS에 저장할 것.
 *
 * 인증: CRON_SECRET 헤더 필요 (관리자 전용)
 */
import type { ActionFunctionArgs } from "react-router";
import { setupCompressedChocoMint } from "~/lib/solana/zk-compression.server";

export async function action({ request }: ActionFunctionArgs) {
  const secret = request.headers.get("x-cron-secret") || request.headers.get("authorization");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { mintAddress, signature } = await setupCompressedChocoMint();
    return Response.json({
      ok: true,
      mintAddress,
      signature,
      note: "CHOCO_COMPRESSED_MINT_ADDRESS 환경변수에 mintAddress를 저장하세요.",
      explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    });
  } catch (err) {
    console.error("[setup-compressed-token]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
