/**
 * Wallet Layout
 * Privy + Solana Wallet Provider를 지갑 기능이 필요한 페이지에만 로드합니다.
 * root.tsx에서 전체 앱에 적용하던 것을 이 레이아웃으로 이동하여 번들 크기를 줄입니다.
 */
import { Outlet } from "react-router";
import { PrivyWalletProvider } from "~/components/solana/PrivyWalletProvider";
import { SolanaWalletProvider } from "~/components/solana/SolanaWalletProvider";

export default function WalletLayout() {
  return (
    <PrivyWalletProvider>
      <SolanaWalletProvider>
        <Outlet />
      </SolanaWalletProvider>
    </PrivyWalletProvider>
  );
}
