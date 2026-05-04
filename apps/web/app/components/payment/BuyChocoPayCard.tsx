/**
 * BuyChocoPayCard — /buy-choco 페이지 전용 결제 카드
 *
 * Phantom 감지 여부에 따라 자동 분기:
 *   Phantom 있음 → sign with Phantom (SwapTxCard와 동일 방식)
 *   Phantom 없음 → PrivyChocoPayCard (임베디드 지갑)
 */
import { useState, useEffect } from "react";
import { useRevalidator } from "react-router";
import { toast } from "sonner";
import { PrivyChocoPayCard } from "./PrivyChocoPayCard";

type Status = "idle" | "building" | "connecting" | "signing" | "verifying" | "done" | "error";

interface Props {
  choco: number;
  onSuccess?: () => void;
}

const SOL_PER_CHOCO = 0.00001;

const STATUS_LABEL: Record<Status, string> = {
  idle: "",
  building: "Building transaction…",
  connecting: "Connecting Phantom…",
  signing: "Please approve in Phantom…",
  verifying: "Confirming on-chain…",
  done: "",
  error: "",
};

export function BuyChocoPayCard({ choco, onSuccess }: Props) {
  // Phantom 설치 여부만 확인 (연결 여부와 분리)
  const [hasPhantom, setHasPhantom] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [grantedChoco, setGrantedChoco] = useState(0);
  const revalidator = useRevalidator();

  const solAmount = (choco * SOL_PER_CHOCO).toFixed(6);

  useEffect(() => {
    const phantom = (window as any).phantom?.solana;
    setHasPhantom(!!phantom?.isPhantom);
  }, []);

  async function handlePhantomPay() {
    const phantom = (window as any).phantom?.solana;
    if (!phantom?.isPhantom) {
      toast.error("Phantom wallet required! Install it at phantom.app");
      window.open("https://phantom.app", "_blank");
      return;
    }

    try {
      // 1. 서버에서 트랜잭션 파라미터 생성
      setStatus("building");
      const res = await fetch("/api/payment/solana/create-tx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choco }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || `서버 오류 (${res.status})`);
      }
      const { recipient, lamports, paymentId, rpcUrl } = await res.json();

      // 2. Phantom 연결
      setStatus("connecting");
      await phantom.connect();

      // 3. 트랜잭션 빌드
      const {
        SystemProgram,
        PublicKey,
        Connection,
        VersionedTransaction,
        TransactionMessage,
      } = await import("@solana/web3.js");

      const connection = new Connection(rpcUrl, "confirmed");
      const { blockhash } = await connection.getLatestBlockhash();
      const fromPubkey = new PublicKey(phantom.publicKey.toString());
      const toPubkey = new PublicKey(recipient);

      const message = new TransactionMessage({
        payerKey: fromPubkey,
        recentBlockhash: blockhash,
        instructions: [
          SystemProgram.transfer({ fromPubkey, toPubkey, lamports }),
        ],
      }).compileToV0Message();

      const tx = new VersionedTransaction(message);

      // 4. Phantom 서명 + 전송
      setStatus("signing");
      const { signature } = await phantom.signAndSendTransaction(tx);

      // 5. 온체인 확인 + CHOCO 지급
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
        onSuccess?.();
      } else {
        throw new Error(verifyData.error || "결제 확인에 실패했어요.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("User rejected") || msg.includes("cancelled") || msg.includes("rejected")) {
        toast("Payment cancelled.");
        setStatus("idle");
        return;
      }
      toast.error(msg || "Payment failed. Please try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-sm font-semibold">
        <span className="material-symbols-outlined text-[18px]">check_circle</span>
        {grantedChoco.toLocaleString()} CHOCO topped up! 💕
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col gap-2 py-2">
        <p className="text-xs text-red-400">Something went wrong. Please try again.</p>
        <button
          onClick={() => setStatus("idle")}
          className="text-xs text-white/50 hover:text-white/80 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const isLoading = status !== "idle";

  return (
    <div className="space-y-3">
      {/* Phantom 결제 (감지된 경우 우선 표시) */}
      {hasPhantom && (
        <div className="p-4 rounded-2xl bg-[#9945FF]/10 border border-[#9945FF]/30 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#9945FF]">account_balance_wallet</span>
              <span className="font-bold text-white">Pay with Phantom</span>
            </div>
            <span className="text-white/40 text-xs">{solAmount} SOL</span>
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-[#9945FF]">
              <span className="w-3 h-3 border-2 border-[#9945FF]/40 border-t-[#9945FF] rounded-full animate-spin shrink-0" />
              {STATUS_LABEL[status]}
            </div>
          )}

          <button
            onClick={handlePhantomPay}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-[#9945FF] hover:bg-[#7b35d9] disabled:opacity-50 text-white text-sm font-bold py-3 px-4 rounded-xl transition-all active:scale-[0.98]"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">bolt</span>
                Sign with Phantom
              </>
            )}
          </button>
        </div>
      )}

      {/* Phantom 없는 유저에게만 임베디드 지갑 표시 */}
      {!hasPhantom && <PrivyChocoPayCard choco={choco} />}
    </div>
  );
}
