/**
 * EmbeddedWalletSection — Profile 페이지용 Privy 임베디드 지갑 정보
 * - 주소 표시 + 복사
 * - Export Private Key (Privy 보안 UI)
 * SSR-safe wrapper 포함
 */
import { useState, useEffect } from "react";
import { useRevalidator } from "react-router";
import { usePrivy, useExportWallet } from "@privy-io/react-auth";
import { useCreateWallet } from "@privy-io/react-auth/solana";
import { toast } from "sonner";

function EmbeddedWalletSectionInner() {
  const { user, authenticated, ready, login } = usePrivy();
  const { exportWallet } = useExportWallet();
  const { createWallet } = useCreateWallet();
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // 1. user 객체의 linkedAccounts에서 직접 찾기 (안전한 방식)
  const embeddedWallet = (user?.linkedAccounts as any[])?.find(
    (a) => a.chainType === "solana" && a.walletClientType === "privy"
  ) || null;

  const { revalidate } = useRevalidator();

  // 2. 자동 DB 동기화 로직
  useEffect(() => {
    if (authenticated && embeddedWallet?.address && !syncing) {
      const syncWallet = async () => {
        setSyncing(true);
        try {
          const res = await fetch("/api/user/wallet", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ solanaWallet: embeddedWallet.address }),
          });

          if (res.ok) {
            const data = await res.json();
            console.log("Internal wallet synced to DB:", embeddedWallet.address);
            if (data.isNew) {
              toast.success("내부 지갑 등록 완료! 테스트 SOL 0.5개가 지급되었습니다 🎉");
              revalidate();
            }
          }
        } catch (e) {
          console.error("Wallet sync failed:", e);
        } finally {
          setSyncing(false);
        }
      };

      syncWallet();
    }
  }, [authenticated, embeddedWallet?.address]);

  if (!ready) return null;

  // 1. 미인증 상태일 때 (로그인 유도)
  if (!authenticated) {
    return (
      <div className="mt-6 p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-white/40">account_balance_wallet</span>
          <p className="text-xs font-bold text-white/60">Internal Wallet Inactive</p>
        </div>
        <p className="text-[11px] text-white/40 leading-relaxed">
          Activate your internal wallet to pay safely without extensions.
        </p>
        <button
          onClick={() => login()}
          className="w-full py-2.5 rounded-xl bg-white/10 text-white text-sm font-bold hover:bg-white/20 transition-all active:scale-[0.98]"
        >
          Activate Internal Wallet
        </button>
      </div>
    );
  }

  // 지갑이 없는 경우 생성 UI
  if (!embeddedWallet) {
    return (
      <div className="mt-6 p-5 rounded-2xl bg-primary/5 border border-primary/10 space-y-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-primary">add_card</span>
          <p className="text-xs font-bold text-white/90">No Embedded Wallet</p>
        </div>
        <p className="text-[11px] text-white/50 leading-relaxed">
          Create an internal wallet to pay even without browser extensions.
        </p>
        <button
          disabled={creating}
          onClick={async () => {
            setCreating(true);
            try {
              await createWallet();
              toast.success("Embedded wallet created!");
            } catch (err) {
              console.error(err);
              toast.error("Failed to create wallet");
            } finally {
              setCreating(false);
            }
          }}
          className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create Internal Wallet"}
        </button>
      </div>
    );
  }

  const address = embeddedWallet.address;

  return (
    <div className="mt-6 p-5 rounded-2xl bg-[#9945FF]/10 border border-[#9945FF]/20 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[#9945FF]">account_balance_wallet</span>
          <p className="text-[10px] font-black text-[#9945FF] uppercase tracking-[0.2em]">Internal Privy Wallet</p>
        </div>
        <div className="px-2 py-0.5 rounded-full bg-[#9945FF]/20 border border-[#9945FF]/30">
          <span className="text-[9px] font-bold text-[#9945FF] uppercase">Active</span>
        </div>
      </div>

      {/* 주소 */}
      <div className="space-y-1.5">
        <p className="text-[9px] font-bold text-white/30 uppercase ml-1">Wallet Address</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2.5 bg-black/40 rounded-xl border border-white/5 overflow-hidden">
            <code className="text-white/90 font-mono text-xs truncate block">{address}</code>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(address);
              toast.success("Address copied");
            }}
            className="size-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-[#9945FF] hover:border-[#9945FF]/30 transition-all active:scale-90"
          >
            <span className="material-symbols-outlined text-[18px]">content_copy</span>
          </button>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="grid grid-cols-1 gap-2 pt-2">
        <button
          onClick={() => exportWallet({ address })}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#9945FF]/30 text-[#9945FF] text-xs font-bold hover:bg-[#9945FF]/10 transition-all active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[16px]">key</span>
          Export Private Key
        </button>
      </div>

      <p className="text-[9px] text-white/30 text-center italic">
        Managed securely by Privy infrastructure
      </p>
    </div>
  );
}

export function EmbeddedWalletSection() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return <EmbeddedWalletSectionInner />;
}
