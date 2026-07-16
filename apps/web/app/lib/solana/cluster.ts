/**
 * Solana 클러스터 공용 상수 — config.server.ts(서버 env)와
 * public-config.ts(클라이언트 Vite env)가 공유하는 순수 값/함수.
 */
export type SolanaCluster = "devnet" | "testnet" | "mainnet-beta";

export const DEFAULT_SOLANA_CLUSTER: SolanaCluster = "devnet";

export const DEFAULT_RPC_BY_CLUSTER: Record<SolanaCluster, string> = {
    devnet: "https://api.devnet.solana.com",
    testnet: "https://api.testnet.solana.com",
    "mainnet-beta": "https://api.mainnet-beta.solana.com",
};

export function parseSolanaCluster(value: string | undefined): SolanaCluster {
    if (value === "devnet" || value === "testnet" || value === "mainnet-beta") return value;
    return DEFAULT_SOLANA_CLUSTER;
}
