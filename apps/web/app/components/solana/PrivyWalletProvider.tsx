/**
 * Privy Embedded Wallet Provider — SSR-safe
 * PrivyProvider는 클라이언트에서만 렌더링합니다.
 */
import { useState, useEffect, type ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";

interface Props {
  children: ReactNode;
}

export function PrivyWalletProvider({ children }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <>{children}</>;

  return (
    <PrivyProvider
      appId="cmna1dkit01d70cju3sygcjvd"
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#9945FF",
          logo: "https://res.cloudinary.com/dpmw96p8k/image/upload/v1/choonsim/choonsim.png",
        },
        embeddedWallets: {
          solana: {
            createOnLogin: "all-users",
          },
        },
        solana: {
          rpcs: {
            "solana:devnet": {
              rpc: createSolanaRpc("https://api.devnet.solana.com"),
              rpcSubscriptions: createSolanaRpcSubscriptions("wss://api.devnet.solana.com"),
            },
          },
        },
        loginMethods: ["email", "google", "twitter"],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
