import { Keypair } from "@solana/web3.js";

/**
 * 서버 Agent 지갑 키페어 — SOLANA_AGENT_PRIVATE_KEY(JSON 바이트 배열) 파싱.
 * cNFT 민팅, ZK 압축, SPL 전송, 온보딩 SOL 지급 등 서버 지갑을 쓰는 모든 경로가 공유한다.
 */
export function getAgentKeypair(): Keypair {
    const raw = process.env.SOLANA_AGENT_PRIVATE_KEY;
    if (!raw) throw new Error("SOLANA_AGENT_PRIVATE_KEY is not set");
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw) as number[]));
}
