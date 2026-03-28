/**
 * Solana Wallet Connect 버튼
 * Phantom 지갑 연결 시 DB에 자동 저장
 */
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "~/components/ui/button";
import { Wallet, LogOut, Copy, Check } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

export function WalletButton() {
  const { publicKey, connected, connecting, connect, disconnect, wallet } =
    useWallet();
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  // 지갑 연결 시 DB에 자동 저장
  useEffect(() => {
    if (!connected || !publicKey) return;
    const address = publicKey.toBase58();
    fetch("/api/user/wallet", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ solanaWallet: address }),
    })
      .then((res) => {
        if (res.ok) {
          setSaved(true);
          toast.success("Wallet connected and saved!");
        }
      })
      .catch(() => {});
  }, [connected, publicKey]);

  const shortAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : null;

  const copyAddress = useCallback(async () => {
    if (!publicKey) return;
    await navigator.clipboard.writeText(publicKey.toBase58());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [publicKey]);

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={copyAddress}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/10 text-green-400 text-xs font-mono hover:bg-green-500/20 transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {shortAddress}
        </button>
        <button
          onClick={() => disconnect()}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
          title="Disconnect Wallet"
        >
          <LogOut className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => connect()}
      disabled={connecting}
      className="h-8 text-xs gap-1.5 rounded-xl border-white/10 bg-white/5 hover:bg-white/10"
    >
      <Wallet className="w-3 h-3" />
      {connecting ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
}
