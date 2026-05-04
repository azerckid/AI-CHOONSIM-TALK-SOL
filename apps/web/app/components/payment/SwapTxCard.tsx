/**
 * SwapTxCard — AI가 미리 빌드한 트랜잭션 인라인 서명 카드
 *
 * [SWAP_TX:paymentId:base64tx] 마커를 MessageBubble이 감지하면 렌더링.
 * 서버(buyChoco 도구)가 이미 트랜잭션을 완성해뒀으므로 Phantom은 서명만 하면 됨.
 *
 * 1. "Sign with Phantom" 클릭
 * 2. @solana/web3.js Transaction.from(base64) → 역직렬화
 * 3. phantom.signAndSendTransaction(tx) → Phantom 팝업
 * 4. signature → /api/payment/solana/verify-sig → CHOCO 충전
 */
import { useState, useEffect } from "react";
import { useRevalidator } from "react-router";
import { toast } from "sonner";
import { PrivyChocoPayCard } from "./PrivyChocoPayCard";
import { Component, type ReactNode } from "react";

class PrivyErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

interface Props {
  paymentId: string;
  txBase64: string;
  /** 채팅 메시지에서 파싱한 CHOCO 금액 (표시용) */
  choco: number;
}

type Status = "idle" | "connecting" | "signing" | "verifying" | "done" | "error";

export function SwapTxCard({ paymentId, txBase64, choco }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [grantedChoco, setGrantedChoco] = useState(0);
  const [hasPhantom, setHasPhantom] = useState(false);
  const revalidator = useRevalidator();

  // SOL 금액 계산 (1 CHOCO = 0.00001 SOL)
  const solAmount = (choco * 0.00001).toFixed(6);

  useEffect(() => {
    const phantom = (window as any).phantom?.solana;
    if (!phantom?.isPhantom) return;
    phantom.connect({ onlyIfTrusted: true })
      .then(() => setHasPhantom(true))
      .catch(() => setHasPhantom(false));
  }, []);

  async function handleSign() {
    const phantom = (window as any).phantom?.solana;
    if (!phantom?.isPhantom) {
      toast.error("Phantom 지갑이 필요해요! phantom.app 에서 설치해주세요.");
      window.open("https://phantom.app", "_blank");
      return;
    }

    try {
      // 1. Phantom 연결
      setStatus("connecting");
      await phantom.connect();

      // 2. 트랜잭션 역직렬화
      const { Transaction } = await import("@solana/web3.js");
      const txBytes = Uint8Array.from(atob(txBase64), (c) => c.charCodeAt(0));
      const tx = Transaction.from(txBytes);

      // 3. Phantom 서명 + 전송
      setStatus("signing");
      const { signature } = await phantom.signAndSendTransaction(tx);

      // 4. 온체인 검증 + CHOCO 지급
      setStatus("verifying");
      const verifyRes = await fetch("/api/payment/solana/verify-sig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature, paymentId }),
      });
      const verifyData = await verifyRes.json();

      if (verifyData.status === "COMPLETED") {
        setGrantedChoco(verifyData.chocoGranted ?? choco);
        setStatus("done");
        revalidator.revalidate();
      } else {
        throw new Error(verifyData.error || "결제 확인에 실패했어요.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("User rejected") ||
        msg.includes("cancelled") ||
        msg.includes("rejected")
      ) {
        toast("결제를 취소했어요.");
        setStatus("idle");
        return;
      }
      console.error("[SwapTxCard]", err);
      toast.error(msg || "결제 중 오류가 발생했어요.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-sm font-semibold">
        <span className="material-symbols-outlined text-[18px]">check_circle</span>
        {grantedChoco.toLocaleString()} CHOCO 충전 완료! 💕
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mt-3 flex flex-col gap-2">
        <p className="text-xs text-red-400">오류가 발생했어요. 다시 시도해주세요.</p>
        <button
          onClick={() => setStatus("idle")}
          className="text-xs text-white/50 hover:text-white/80 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const isLoading = status !== "idle";
  const statusLabel: Record<Status, string> = {
    idle: "",
    connecting: "지갑 연결 중…",
    signing: "Phantom에서 승인해주세요…",
    verifying: "온체인 확인 중…",
    done: "",
    error: "",
  };

  return (
    <div className="mt-3 p-3 rounded-xl bg-[#9945FF]/10 border border-[#9945FF]/30 space-y-2.5">
      {/* 금액 요약 */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-white">{choco.toLocaleString()} CHOCO</span>
        <span className="text-white/50 text-xs">{solAmount} SOL (Devnet)</span>
      </div>

      {/* AI 빌드 완료 배지 */}
      <div className="flex items-center gap-1.5 text-[10px] text-[#14F195]/70 font-medium">
        <span className="material-symbols-outlined text-[12px]">auto_fix_high</span>
        트랜잭션 준비 완료 — 서명만 하면 돼요
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-[#9945FF]">
          <span className="w-3 h-3 border-2 border-[#9945FF]/40 border-t-[#9945FF] rounded-full animate-spin shrink-0" />
          {statusLabel[status]}
        </div>
      )}

      {hasPhantom ? (
        <button
          onClick={handleSign}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-[#9945FF] hover:bg-[#7b35d9] disabled:opacity-50 text-white text-sm font-bold py-2.5 px-4 rounded-xl transition-all active:scale-[0.98]"
        >
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
              Sign with Phantom
            </>
          )}
        </button>
      ) : (
        <PrivyErrorBoundary>
          <PrivyChocoPayCard choco={choco} compact />
        </PrivyErrorBoundary>
      )}
    </div>
  );
}
