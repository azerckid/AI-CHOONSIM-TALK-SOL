/**
 * Privy 임베디드 지갑 주소를 DB에 1회 저장하는 글로벌 훅.
 * wallet-layout 하위 모든 페이지에서 실행 → 기존 유저 lazy migration 커버.
 * sessionStorage로 세션 내 중복 저장 방지 (DB 조회 불필요).
 */
import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { syncPrivyWallet, findPrivySolanaEmbeddedWallet } from "~/lib/solana/privy-wallet-sync";

const SESSION_KEY = "privyWalletSynced";

export function usePrivyWalletSync() {
  const { user, ready, authenticated } = usePrivy();

  useEffect(() => {
    if (!ready || !authenticated) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const embedded = findPrivySolanaEmbeddedWallet(user);

    if (!embedded?.address) return;

    sessionStorage.setItem(SESSION_KEY, "1");
    syncPrivyWallet(embedded.address).then((result) => {
      if (!result.ok) sessionStorage.removeItem(SESSION_KEY);
    });
  }, [ready, authenticated, user]);
}
