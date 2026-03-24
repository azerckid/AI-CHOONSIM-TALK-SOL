/**
 * Solana Wallet Adapter Provider
 * SSR-safe: 브라우저 환경에서만 렌더링
 */
import { useMemo, useEffect, useState } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";

interface Props {
  children: React.ReactNode;
}

export function SolanaWalletProvider({ children }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const endpoint =
    typeof window !== "undefined"
      ? (window as typeof window & { ENV?: { SOLANA_RPC_URL?: string } }).ENV
          ?.SOLANA_RPC_URL || "https://api.devnet.solana.com"
      : "https://api.devnet.solana.com";

  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  if (!mounted) return <>{children}</>;

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
