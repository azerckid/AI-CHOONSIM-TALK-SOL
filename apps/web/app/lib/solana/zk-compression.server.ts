/**
 * ZK Compression — Light Protocol 기반 Compressed Token 유틸리티
 *
 * Solana Foundation이 추진하는 ZK Compression으로 CHOCO 보상 배포 비용을 최대 99% 절감.
 * - 일반 SPL Transfer: ~0.002 SOL (ATA 생성 포함)
 * - Compressed Transfer: ~0.00001 SOL (ATA 불필요)
 *
 * 환경 변수:
 * - SOLANA_AGENT_PRIVATE_KEY   서버 키페어 (민트 권한)
 * - SOLANA_RPC_URL             Solana RPC (기본: devnet)
 * - ZK_COMPRESSION_RPC_URL    Light Protocol Photon 인덱서 (없으면 SOLANA_RPC_URL 사용)
 * - CHOCO_COMPRESSED_MINT_ADDRESS  압축 CHOCO 민트 주소 (setup 후 저장)
 */
import { createRpc, type Rpc } from "@lightprotocol/stateless.js";
import {
  createMint,
  mintTo,
  transfer as compressedTransfer,
} from "@lightprotocol/compressed-token";
import { Keypair, PublicKey } from "@solana/web3.js";
import { logger } from "~/lib/logger.server";

const CHOCO_DECIMALS = 6;

function getAgentKeypair(): Keypair {
  const raw = process.env.SOLANA_AGENT_PRIVATE_KEY;
  if (!raw) throw new Error("SOLANA_AGENT_PRIVATE_KEY not set");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
}

export function getZkRpc(): Rpc {
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const compressionUrl = process.env.ZK_COMPRESSION_RPC_URL || rpcUrl;
  return createRpc(rpcUrl, compressionUrl);
}

/**
 * 압축 CHOCO 민트 생성 (일회성 셋업)
 * 반환된 mintAddress를 CHOCO_COMPRESSED_MINT_ADDRESS 환경변수에 저장할 것.
 */
export async function setupCompressedChocoMint(): Promise<{
  mintAddress: string;
  signature: string;
}> {
  const rpc = getZkRpc();
  const agentKeypair = getAgentKeypair();

  const { mint, transactionSignature } = await createMint(
    rpc,
    agentKeypair,         // fee payer
    agentKeypair,         // mint authority
    CHOCO_DECIMALS,
  );

  logger.info({
    category: "ZK_COMPRESSION",
    message: `[setup] Compressed CHOCO mint created: ${mint.toBase58()}, sig: ${transactionSignature}`,
  });

  return { mintAddress: mint.toBase58(), signature: transactionSignature };
}

/**
 * 유저 지갑으로 Compressed CHOCO 민팅 (ATA 불필요)
 * 실패 시 에러를 throw — 호출부에서 try/catch로 graceful fallback 처리.
 */
export async function mintCompressedChoco(
  recipientWallet: string,
  amount: number,
): Promise<{ signature: string }> {
  const mintAddress = process.env.CHOCO_COMPRESSED_MINT_ADDRESS;
  if (!mintAddress) throw new Error("CHOCO_COMPRESSED_MINT_ADDRESS not set");

  const rpc = getZkRpc();
  const agentKeypair = getAgentKeypair();
  const mint = new PublicKey(mintAddress);
  const toPubkey = new PublicKey(recipientWallet);
  const amountRaw = amount * (10 ** CHOCO_DECIMALS);

  const signature = await mintTo(
    rpc,
    agentKeypair,   // fee payer
    mint,
    toPubkey,       // 수신자 공개키 (ATA 불필요!)
    agentKeypair,   // mint authority
    amountRaw,
  );

  logger.info({
    category: "ZK_COMPRESSION",
    message: `[mintTo] ${amount} cCHOCO → ${recipientWallet}, sig: ${signature}`,
  });

  return { signature };
}

/**
 * 압축 CHOCO 전송 (서버 지갑 → 유저 지갑)
 * transferChocoSPL의 ZK Compression 대체 버전.
 */
export async function transferCompressedChoco(
  toWallet: string,
  amount: number,
): Promise<{ signature: string }> {
  const mintAddress = process.env.CHOCO_COMPRESSED_MINT_ADDRESS;
  if (!mintAddress) throw new Error("CHOCO_COMPRESSED_MINT_ADDRESS not set");

  const rpc = getZkRpc();
  const agentKeypair = getAgentKeypair();
  const mint = new PublicKey(mintAddress);
  const toPubkey = new PublicKey(toWallet);
  const amountRaw = amount * (10 ** CHOCO_DECIMALS);

  const signature = await compressedTransfer(
    rpc,
    agentKeypair,   // fee payer
    mint,
    amountRaw,
    agentKeypair,   // sender / owner
    toPubkey,
  );

  logger.info({
    category: "ZK_COMPRESSION",
    message: `[transfer] ${amount} cCHOCO → ${toWallet}, sig: ${signature}`,
  });

  return { signature };
}
