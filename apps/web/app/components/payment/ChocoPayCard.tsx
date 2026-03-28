/**
 * ChocoPayCard — 채팅 인라인 Phantom 결제 카드
 *
 * [PHANTOM:100] 마커를 MessageBubble이 감지하면 이 컴포넌트를 렌더링.
 * 1. "Sign with Phantom" 버튼 클릭
 * 2. /api/payment/solana/create-tx → recipient, lamports, paymentId
 * 3. SystemProgram.transfer 트랜잭션 빌드
 * 4. window.phantom.solana.signAndSendTransaction() → Phantom 팝업
 * 5. signature → /api/payment/solana/verify-sig → CHOCO 충전
 */
import { useState, useEffect } from "react";
import { useRevalidator } from "react-router";
import { toast } from "sonner";
import { PrivyChocoPayCard } from "./PrivyChocoPayCard";

interface Props {
  choco: number;
}

type Status = "idle" | "connecting" | "signing" | "verifying" | "done" | "error";

const CHOCO_SOL: Record<number, string> = {
  100: "0.001",
  500: "0.005",
  1000: "0.010",
  5000: "0.050",
};

function getSolDisplay(choco: number): string {
  const presets = [100, 500, 1000, 5000];
  const nearest = presets.reduce((p, c) =>
    Math.abs(c - choco) < Math.abs(p - choco) ? c : p
  );
  return CHOCO_SOL[nearest] ?? (choco * 0.00001).toFixed(6);
}

export function ChocoPayCard({ choco }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [grantedChoco, setGrantedChoco] = useState(0);
  const [hasPhantom, setHasPhantom] = useState(false);
  const revalidator = useRevalidator();

  useEffect(() => {
    setHasPhantom(!!(window as any).phantom?.solana?.isPhantom);
  }, []);

  async function handlePay() {
    const phantom = (window as any).phantom?.solana;
    if (!phantom?.isPhantom) {
      toast.error("Phantom 지갑이 필요해요! phantom.app 에서 설치해주세요.");
      window.open("https://phantom.app", "_blank");
      return;
    }

    try {
      // 1. Phantom 연결
      setStatus("connecting");
      const connectResult = await phantom.connect();
      const userPubkeyStr: string = connectResult.publicKey.toString();

      // 2. 서버에서 트랜잭션 파라미터 가져오기
      const res = await fetch("/api/payment/solana/create-tx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choco }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `서버 오류 (${res.status})`);
      }
      const { recipient, lamports, paymentId, rpcUrl } = await res.json();

      // 3. @solana/web3.js 동적 import
      const { Transaction, SystemProgram, PublicKey, Connection } =
        await import("@solana/web3.js");

      const connection = new Connection(rpcUrl, "confirmed");
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

      const fromPubkey = new PublicKey(userPubkeyStr);
      const toPubkey = new PublicKey(recipient);

      const tx = new Transaction({
        recentBlockhash: blockhash,
        feePayer: fromPubkey,
      }).add(
        SystemProgram.transfer({ fromPubkey, toPubkey, lamports })
      );

      // 4. Phantom 서명 + 전송
      setStatus("signing");
      const { signature } = await phantom.signAndSendTransaction(tx);

      // 5. verify-sig로 결제 확인 + CHOCO 지급
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
      if (msg.includes("User rejected") || msg.includes("cancelled") || msg.includes("rejected")) {
        toast("결제를 취소했어요.");
        setStatus("idle");
        return;
      }
      console.error("[ChocoPayCard]", err);
      toast.error(msg || "결제 중 오류가 발생했어요.");
      setStatus("error");
    }
  }

  // ── 완료 ─────────────────────────────────────────────────────────────────
  if (status === "done") {
    return (
      <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-sm font-semibold">
        <span className="material-symbols-outlined text-[18px]">check_circle</span>
        {grantedChoco.toLocaleString()} CHOCO 충전 완료! 💕
      </div>
    );
  }

  // ── 에러 ─────────────────────────────────────────────────────────────────
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

  // ── 기본 / 진행 중 ────────────────────────────────────────────────────────
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
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-white">{choco.toLocaleString()} CHOCO</span>
        <span className="text-white/50 text-xs">{getSolDisplay(choco)} SOL (Devnet)</span>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-[#9945FF]">
          <span className="w-3 h-3 border-2 border-[#9945FF]/40 border-t-[#9945FF] rounded-full animate-spin shrink-0" />
          {statusLabel[status]}
        </div>
      )}

      {hasPhantom && (
        <>
          <button
            onClick={handlePay}
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

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] text-white/30">또는</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
        </>
      )}

      <PrivyChocoPayCard choco={choco} />
    </div>
  );
}
