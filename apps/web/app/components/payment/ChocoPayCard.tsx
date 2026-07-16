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
import { useState, useEffect, Component, type ReactNode } from "react";
import { useRevalidator } from "react-router";
import { toast } from "sonner";
import { PrivyChocoPayCard } from "./PrivyChocoPayCard";
import { getPublicSolanaConfig } from "~/lib/solana/public-config";
import { getSolDisplay } from "~/lib/economics";
import { createSolanaPayment, verifySolanaPayment, payWithPhantomTransfer } from "~/lib/solana/phantom-payment";

/** Privy 임베디드 지갑 에러 시 페이지 전체 크래시 방지 */
class PrivyErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

interface Props {
  choco: number;
}

type Status = "idle" | "connecting" | "signing" | "verifying" | "done" | "error";

export function ChocoPayCard({ choco }: Props) {
  const { cluster: solanaCluster } = getPublicSolanaConfig();
  const [status, setStatus] = useState<Status>("idle");
  const [grantedChoco, setGrantedChoco] = useState(0);
  const [hasPhantom, setHasPhantom] = useState(false);
  const revalidator = useRevalidator();

  useEffect(() => {
    const phantom = (window as any).phantom?.solana;
    if (!phantom?.isPhantom) return;
    // 이 앱에 실제로 연결(authorize)된 Phantom인지 확인
    phantom.connect({ onlyIfTrusted: true })
      .then(() => setHasPhantom(true))
      .catch(() => setHasPhantom(false)); // 연결된 적 없으면 false
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
      const { recipient, lamports, paymentId, rpcUrl, reference } = await createSolanaPayment(choco);

      // 3~4. 트랜잭션 빌드 + Phantom 서명·전송·컨펌 (reference 포함 — verify-sig가 이걸로 결제를 식별)
      setStatus("signing");
      const signature = await payWithPhantomTransfer({
        phantom,
        payer: userPubkeyStr,
        recipient,
        lamports,
        reference,
        rpcUrl,
      });

      // 5. verify-sig로 결제 확인 + CHOCO 지급
      setStatus("verifying");
      const verifyData = await verifySolanaPayment(signature, paymentId);

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
        <span className="text-white/50 text-xs">{getSolDisplay(choco)} SOL ({solanaCluster})</span>
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

      <PrivyErrorBoundary>
        <PrivyChocoPayCard choco={choco} compact />
      </PrivyErrorBoundary>
    </div>
  );
}
