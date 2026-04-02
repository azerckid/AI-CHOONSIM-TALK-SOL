/**
 * 신규 테스트 유저에게 서버 지갑에서 Devnet SOL을 전송합니다.
 *
 * - 이미 SOL이 있으면 스킵 (중복 지급 방지)
 * - 실패해도 호출부에 영향 없도록 내부에서 catch
 */
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { logger } from "~/lib/logger.server";

/** 신규 유저에게 지급할 SOL 양 (Devnet 테스트용) */
const ONBOARDING_SOL = 0.5;

/** 이미 이 이상 SOL이 있으면 지급 스킵 */
const SKIP_THRESHOLD_SOL = 0.1;

function getServerKeypair(): Keypair {
  const raw = process.env.SOLANA_AGENT_PRIVATE_KEY;
  if (!raw) throw new Error("SOLANA_AGENT_PRIVATE_KEY is not set");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw) as number[]));
}

function getConnection(): Connection {
  return new Connection(
    process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
    "confirmed"
  );
}

/**
 * 신규 유저 지갑에 테스트 SOL을 전송합니다.
 * fire-and-forget 용도 — await 없이 호출해도 됩니다.
 */
export async function sendOnboardingSol(recipientAddress: string): Promise<void> {
  try {
    const connection = getConnection();
    const recipient = new PublicKey(recipientAddress);

    // 잔액 확인 — 이미 SOL이 있으면 스킵
    const balance = await connection.getBalance(recipient);
    if (balance >= SKIP_THRESHOLD_SOL * LAMPORTS_PER_SOL) {
      logger.info({
        category: "SYSTEM",
        message: `[Onboarding] Skipped — already has ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL: ${recipientAddress}`,
      });
      return;
    }

    const serverKeypair = getServerKeypair();

    // 서버 지갑 잔액 확인
    const serverBalance = await connection.getBalance(serverKeypair.publicKey);
    const requiredLamports = (ONBOARDING_SOL + 0.001) * LAMPORTS_PER_SOL; // tx fee 여유분 포함
    if (serverBalance < requiredLamports) {
      logger.error({
        category: "SYSTEM",
        message: `[Onboarding] Server wallet insufficient: ${(serverBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL. Run: npx tsx scripts/fund-agent-wallet.ts`,
      });
      return;
    }

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = serverKeypair.publicKey;
    tx.add(
      SystemProgram.transfer({
        fromPubkey: serverKeypair.publicKey,
        toPubkey: recipient,
        lamports: ONBOARDING_SOL * LAMPORTS_PER_SOL,
      })
    );

    tx.sign(serverKeypair);
    const sig = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight });

    logger.info({
      category: "SYSTEM",
      message: `[Onboarding] Sent ${ONBOARDING_SOL} SOL to ${recipientAddress} | tx: ${sig}`,
    });
  } catch (err) {
    // 실패해도 회원가입/지갑 등록 흐름에 영향 없음
    logger.error({
      category: "SYSTEM",
      message: `[Onboarding] Failed to send SOL to ${recipientAddress}: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}
