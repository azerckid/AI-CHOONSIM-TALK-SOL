import { Connection, type VersionedTransactionResponse } from "@solana/web3.js";
import { getSolanaRpcUrl } from "~/lib/solana/config.server";

export const solanaConnection = new Connection(getSolanaRpcUrl(), "confirmed");

/**
 * getTransaction을 재시도와 함께 호출한다. 방금 컨펌된 트랜잭션이 RPC
 * 인덱싱 지연으로 즉시 조회되지 않는 경우를 흡수하기 위함.
 * (checkin/subscribe/verify-sig 등 온체인 결제 검증 경로가 공유)
 */
export async function getTransactionWithRetry(
  connection: Connection,
  signature: string,
  { retries = 5, delayMs = 2000 }: { retries?: number; delayMs?: number } = {}
): Promise<VersionedTransactionResponse | null> {
  for (let i = 0; i < retries; i++) {
    const tx = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (tx) return tx;
    if (i < retries - 1) await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

/** CORS 헤더 — Solana Actions 스펙 필수 */
export const ACTIONS_CORS_HEADERS: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type,Accept,Authorization,x-action-version,x-blockchain-ids",
  "X-Action-Version": "2.4",
  "X-Blockchain-Ids": "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
};
