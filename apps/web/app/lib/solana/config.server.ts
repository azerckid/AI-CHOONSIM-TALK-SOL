import { type SolanaCluster, DEFAULT_RPC_BY_CLUSTER, parseSolanaCluster } from "./cluster";

export type { SolanaCluster };

export function getSolanaCluster(): SolanaCluster {
  return parseSolanaCluster(process.env.SOLANA_CLUSTER || process.env.VITE_SOLANA_CLUSTER);
}

export function getSolanaRpcUrl(): string {
  return process.env.SOLANA_RPC_URL || DEFAULT_RPC_BY_CLUSTER[getSolanaCluster()];
}

export function getSolanaExplorerSuffix(): string {
  const cluster = getSolanaCluster();
  return cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
}
