import { type SolanaCluster, DEFAULT_RPC_BY_CLUSTER, parseSolanaCluster } from "./cluster";

export type PublicSolanaCluster = SolanaCluster;

const DEFAULT_DEMO_PRIVY_APP_ID = "cmna1dkit01d70cju3sygcjvd";
const PRIVY_CHAIN_BY_CLUSTER: Record<PublicSolanaCluster, string> = {
  devnet: "solana:devnet",
  testnet: "solana:testnet",
  "mainnet-beta": "solana:mainnet",
};

function readPublicEnv(name: string): string | undefined {
  const value = import.meta.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
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
  const cluster = parseSolanaCluster(readPublicEnv("VITE_SOLANA_CLUSTER"));
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
