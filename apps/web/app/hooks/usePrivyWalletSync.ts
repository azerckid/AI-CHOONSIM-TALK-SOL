/**
 * Privy 임베디드 지갑 주소를 DB에 1회 저장하는 글로벌 훅.
 * wallet-layout 하위 모든 페이지에서 실행 → 기존 유저 lazy migration 커버.
 * sessionStorage로 세션 내 중복 저장 방지 (DB 조회 불필요).
 */
import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";

const SESSION_KEY = "privyWalletSynced";

export function usePrivyWalletSync() {
  const { user, ready, authenticated } = usePrivy();

  useEffect(() => {
    if (!ready || !authenticated) return;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_KEY)) return;

    const embedded = (user?.linkedAccounts as Array<{ chainType: string; walletClientType: string; address: string }> | undefined)
      ?.find((a) => a.chainType === "solana" && a.walletClientType === "privy");

    if (!embedded?.address) return;

    fetch("/api/user/privy-wallet", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ privyWallet: embedded.address }),
    })
      .then(() => sessionStorage.setItem(SESSION_KEY, "1"))
      .catch(() => {
        // 저장 실패 시 무시 — 다음 방문 시 재시도
      });
  }, [ready, authenticated, user]);
}
