export type PublicSolanaCluster = "devnet" | "testnet" | "mainnet-beta";

const DEFAULT_DEMO_PRIVY_APP_ID = "cmna1dkit01d70cju3sygcjvd";
const DEFAULT_CLUSTER: PublicSolanaCluster = "devnet";
const DEFAULT_RPC_BY_CLUSTER: Record<PublicSolanaCluster, string> = {
  devnet: "https://api.devnet.solana.com",
  testnet: "https://api.testnet.solana.com",
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
};
const PRIVY_CHAIN_BY_CLUSTER: Record<PublicSolanaCluster, string> = {
  devnet: "solana:devnet",
  testnet: "solana:testnet",
  "mainnet-beta": "solana:mainnet",
};

function readPublicEnv(name: string): string | undefined {
  const value = import.meta.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function parseCluster(value: string | undefined): PublicSolanaCluster {
  if (value === "devnet" || value === "testnet" || value === "mainnet-beta") return value;
  return DEFAULT_CLUSTER;
}

function toWebSocketRpcUrl(rpcUrl: string): string {
  if (rpcUrl.startsWith("https://")) return rpcUrl.replace("https://", "wss://");
  if (rpcUrl.startsWith("http://")) return rpcUrl.replace("http://", "ws://");
  return rpcUrl;
}

export function getPrivyAppId(): string {
  const appId = readPublicEnv("VITE_PRIVY_APP_ID");
  if (appId) return appId;
  if (import.meta.env.PROD) {
    throw new Error("VITE_PRIVY_APP_ID is required in production.");
  }
  return DEFAULT_DEMO_PRIVY_APP_ID;
}

export function getPublicSolanaConfig() {
  const cluster = parseCluster(readPublicEnv("VITE_SOLANA_CLUSTER"));
  const rpcUrl = readPublicEnv("VITE_SOLANA_RPC_URL") ?? DEFAULT_RPC_BY_CLUSTER[cluster];
  const rpcSubscriptionsUrl =
    readPublicEnv("VITE_SOLANA_RPC_WS_URL") ?? toWebSocketRpcUrl(rpcUrl);

  return {
    cluster,
    chain: PRIVY_CHAIN_BY_CLUSTER[cluster],
    rpcUrl,
    rpcSubscriptionsUrl,
  };
}

export function getPublicSolanaExplorerSuffix(): string {
  const { cluster } = getPublicSolanaConfig();
  return cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
}
