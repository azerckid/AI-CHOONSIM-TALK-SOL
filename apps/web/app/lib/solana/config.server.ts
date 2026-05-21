export type SolanaCluster = "devnet" | "testnet" | "mainnet-beta";

const DEFAULT_CLUSTER: SolanaCluster = "devnet";
const DEFAULT_RPC_BY_CLUSTER: Record<SolanaCluster, string> = {
  devnet: "https://api.devnet.solana.com",
  testnet: "https://api.testnet.solana.com",
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
};

function parseCluster(value: string | undefined): SolanaCluster {
  if (value === "devnet" || value === "testnet" || value === "mainnet-beta") return value;
  return DEFAULT_CLUSTER;
}

export function getSolanaCluster(): SolanaCluster {
  return parseCluster(process.env.SOLANA_CLUSTER || process.env.VITE_SOLANA_CLUSTER);
}

export function getSolanaRpcUrl(): string {
  return process.env.SOLANA_RPC_URL || DEFAULT_RPC_BY_CLUSTER[getSolanaCluster()];
}

export function getSolanaExplorerSuffix(): string {
  const cluster = getSolanaCluster();
  return cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
}
