/**
 * PrivyChocoPayCard — Privy 임베디드 지갑으로 CHOCO 구매
 *
 * Phantom 없이 이메일 로그인 지갑으로 결제:
 * 1. /api/payment/solana/create-tx → recipient, lamports, paymentId
 * 2. VersionedTransaction 빌드 → Uint8Array 직렬화
 * 3. wallet.signAndSendTransaction() → Privy 서명 (팝업 없음)
 * 4. /api/payment/solana/verify-sig → CHOCO 지급
 *
 * 반드시 PrivyWalletProvider 하위에서 사용해야 합니다.
 */
import { useState, useEffect } from "react";
import { useWallets } from "@privy-io/react-auth/solana";
import { useRevalidator } from "react-router";
import { toast } from "sonner";

interface Props {
  choco: number;
}

type Status = "idle" | "building" | "signing" | "verifying" | "done" | "error";

const CHOCO_SOL: Record<number, string> = {
  100: "0.001",
  500: "0.005",
  1000: "0.010",
  5000: "0.050",
};
function getSolDisplay(choco: number): string {
  const nearest = [100, 500, 1000, 5000].reduce((p, c) =>
    Math.abs(c - choco) < Math.abs(p - choco) ? c : p
  );
  return CHOCO_SOL[nearest] ?? (choco * 0.00001).toFixed(6);
}

// Devnet genesis hash (CAIP-2 chain ID)
const SOLANA_DEVNET_CHAIN = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";

function PrivyChocoPayCardInner({ choco }: Props) {
  const { wallets } = useWallets();
  const revalidator = useRevalidator();
  const [status, setStatus] = useState<Status>("idle");
  const [grantedChoco, setGrantedChoco] = useState(0);

  // Privy 임베디드 Solana 지갑 찾기
  const embeddedWallet = wallets[0] ?? null;

  async function handlePay() {
    if (!embeddedWallet) {
      toast.error("Privy 임베디드 지갑이 없어요. 먼저 지갑을 생성해주세요.");
      return;
    }

    try {
      // 1. 서버에서 트랜잭션 파라미터 가져오기
      setStatus("building");
      const res = await fetch("/api/payment/solana/create-tx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choco }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `서버 오류 (${res.status})`);
      }
      const { recipient, lamports, paymentId, rpcUrl } = await res.json();

      // 2. @solana/web3.js로 트랜잭션 빌드
      const {
        Transaction,
        SystemProgram,
        PublicKey,
        Connection,
        VersionedTransaction,
        TransactionMessage,
      } = await import("@solana/web3.js");

      const connection = new Connection(rpcUrl, "confirmed");
      const { blockhash } = await connection.getLatestBlockhash();

      const fromPubkey = new PublicKey(embeddedWallet.address);
      const toPubkey = new PublicKey(recipient);

      const message = new TransactionMessage({
        payerKey: fromPubkey,
        recentBlockhash: blockhash,
        instructions: [
          SystemProgram.transfer({ fromPubkey, toPubkey, lamports }),
        ],
      }).compileToV0Message();

      const tx = new VersionedTransaction(message);
      const serialized = tx.serialize();

      // 3. Privy 서명 + 전송
      setStatus("signing");
      const { signature } = await embeddedWallet.signAndSendTransaction({
        transaction: serialized,
        chain: SOLANA_DEVNET_CHAIN,
        options: { commitment: "confirmed" },
      });
      // Privy는 이미 base58 문자열로 signature를 반환함

      // 4. verify-sig → CHOCO 지급
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
      console.error("[PrivyChocoPayCard]", err);
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
        <button onClick={() => setStatus("idle")} className="text-xs text-white/50 hover:text-white/80 transition-colors">
          다시 시도
        </button>
      </div>
    );
  }

  const isLoading = status !== "idle";
  const statusLabel: Record<Status, string> = {
    idle: "",
    building: "트랜잭션 생성 중…",
    signing: "지갑 서명 중…",
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

      <button
        onClick={handlePay}
        disabled={isLoading || !embeddedWallet}
        className="w-full flex items-center justify-center gap-2 bg-[#9945FF] hover:bg-[#7b35d9] disabled:opacity-50 text-white text-sm font-bold py-2.5 px-4 rounded-xl transition-all active:scale-[0.98]"
      >
        {isLoading ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <span className="material-symbols-outlined text-[18px]">bolt</span>
            {embeddedWallet ? "임베디드 지갑으로 결제" : "지갑 없음"}
          </>
        )}
      </button>
    </div>
  );
}

/** SSR-safe wrapper */
export function PrivyChocoPayCard({ choco }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return <PrivyChocoPayCardInner choco={choco} />;
}
