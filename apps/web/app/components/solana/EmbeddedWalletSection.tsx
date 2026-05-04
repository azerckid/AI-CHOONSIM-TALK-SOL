/**
 * EmbeddedWalletSection — Profile 페이지용 Privy 임베디드 지갑 정보
 * - 주소 표시 + 복사
 * - Export Private Key (Privy 보안 UI)
 * SSR-safe wrapper 포함
 */
import { useState, useEffect } from "react";
import { usePrivy, useExportWallet } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { toast } from "sonner";

function EmbeddedWalletSectionInner() {
  const { authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const { exportWallet } = useExportWallet();

  const embeddedWallet = wallets.find((w: any) => w.walletClientType === "privy") ?? null;
  const hasPhantom = !!(window as any).phantom?.solana?.isPhantom;

  if (!ready || !authenticated || !embeddedWallet || hasPhantom) return null;

  const address = embeddedWallet.address;
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;

  return (
    <div className="mt-6 p-4 rounded-2xl bg-[#9945FF]/10 border border-[#9945FF]/20 space-y-3">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-[#9945FF]">account_balance_wallet</span>
        <p className="text-[10px] font-bold text-[#9945FF] uppercase tracking-widest">Embedded Wallet</p>
      </div>

      {/* 주소 */}
      <div className="flex items-center gap-2">
        <div className="flex-1 px-3 py-2 bg-black/20 rounded-xl border border-white/5 overflow-hidden">
          <code className="text-white/80 font-mono text-xs truncate block">{address}</code>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(address);
            toast.success("Address copied");
          }}
          className="size-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-[#9945FF] hover:border-[#9945FF]/30 transition-all active:scale-90"
        >
          <span className="material-symbols-outlined text-[18px]">content_copy</span>
        </button>
      </div>

      {/* Export Private Key */}
      <button
        onClick={() => exportWallet({ address })}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#9945FF]/30 text-[#9945FF] text-sm font-bold hover:bg-[#9945FF]/10 transition-all active:scale-[0.98]"
      >
        <span className="material-symbols-outlined text-[16px]">key</span>
        Export Private Key
      </button>

      <p className="text-[10px] text-white/30 text-center">
        Private key is shown in a secure Privy iframe — your app cannot access it.
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
