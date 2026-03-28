/**
 * PrivyEmbeddedWalletButton
 *
 * Phantom 없이 이메일/소셜 로그인으로 Solana 임베디드 지갑 생성.
 * 지갑 생성 시 자동으로 DB에 저장합니다.
 *
 * 반드시 PrivyWalletProvider 하위에서 사용해야 합니다.
 */
import { useEffect, useState } from "react";
import { usePrivy, useWallets, useCreateWallet } from "@privy-io/react-auth";
import { toast } from "sonner";
import { Wallet, Loader2, Check } from "lucide-react";

interface Props {
  onSaved?: (address: string) => void;
}

export function PrivyEmbeddedWalletButton({ onSaved }: Props) {
  const { login, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Solana 임베디드 지갑 (Privy가 생성한 것)
  const embeddedWallet = wallets.find(
    (w) => w.walletClientType === "privy" &&
      (w as unknown as { chainType?: string }).chainType === "solana"
  );

  // 로그인 후 임베디드 지갑이 생성되면 자동으로 DB 저장
  useEffect(() => {
    if (!authenticated || !embeddedWallet || done) return;

    fetch("/api/user/wallet", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ solanaWallet: embeddedWallet.address }),
    }).then((res) => {
      if (res.ok) {
        setDone(true);
        toast.success("Embedded wallet saved!");
        onSaved?.(embeddedWallet.address);
        setTimeout(() => window.location.reload(), 1200);
      }
    }).catch(() => {});
  }, [authenticated, embeddedWallet, done, onSaved]);

  const handleClick = async () => {
    if (!authenticated) {
      login();
      return;
    }
    if (embeddedWallet) {
      toast.info(`Wallet already active: ${embeddedWallet.address.slice(0, 6)}...`);
      return;
    }
    setLoading(true);
    try {
      await createWallet();
    } catch {
      toast.error("Failed to create wallet. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <button disabled className="flex items-center gap-2 w-full bg-[#9945FF]/20 text-[#9945FF]/50 text-xs font-semibold px-3 py-2.5 rounded-xl">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading...
      </button>
    );
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 w-full bg-green-500/10 text-green-400 text-xs font-semibold px-3 py-2.5 rounded-xl">
        <Check className="w-3.5 h-3.5" />
        Embedded wallet connected!
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-2 w-full bg-[#9945FF] hover:bg-[#7b35d9] text-white text-xs font-semibold px-3 py-2.5 rounded-xl transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wallet className="w-3.5 h-3.5" />}
      {authenticated ? "Create Embedded Wallet" : "Create Wallet — No Phantom needed"}
    </button>
  );
}
