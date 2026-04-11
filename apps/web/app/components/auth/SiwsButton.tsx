/**
 * SiwsButton — Sign In With Solana (Phantom)
 *
 * 1. Phantom 연결
 * 2. GET /api/auth/siws/nonce → 서명할 메시지
 * 3. phantom.signMessage() → signature
 * 4. POST /api/auth/siws/verify → 세션 생성 → /home 이동
 */
import { useState } from "react";
import { useNavigate } from "react-router";
import bs58 from "bs58";

interface Props {
  onError?: (msg: string) => void;
  onSuccess?: () => void;
}

type Status = "idle" | "connecting" | "signing" | "verifying";

const PhantomIcon = () => (
  <svg width="18" height="18" viewBox="0 0 128 128" fill="none">
    <rect width="128" height="128" rx="24" fill="#AB9FF2" />
    <path d="M110 50H40.5C37.5 50 35 47.5 35 44.5V40.5C35 37.5 37.5 35 40.5 35H110C113 35 115.5 37.5 115.5 40.5V44.5C115.5 47.5 113 50 110 50Z" fill="white" />
    <path d="M72 93H18C15 93 12.5 90.5 12.5 87.5V83.5C12.5 80.5 15 78 18 78H72C75 78 77.5 80.5 77.5 83.5V87.5C77.5 90.5 75 93 72 93Z" fill="white" />
    <path d="M91 71.5H18C15 71.5 12.5 69 12.5 66V62C12.5 59 15 56.5 18 56.5H91C94 56.5 96.5 59 96.5 62V66C96.5 69 94 71.5 91 71.5Z" fill="white" />
  </svg>
);

export function SiwsButton({ onError, onSuccess }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const navigate = useNavigate();
  const isLoading = status !== "idle";

  async function handleSignIn() {
    const phantom = (window as any).phantom?.solana;
    if (!phantom?.isPhantom) {
      onError?.("Phantom 지갑이 필요해요. phantom.app에서 설치해주세요.");
      window.open("https://phantom.app", "_blank");
      return;
    }

    try {
      // 1. 연결
      setStatus("connecting");
      const { publicKey } = await phantom.connect();
      const walletAddress: string = publicKey.toString();

      // 2. nonce + 서명 메시지 받기
      setStatus("signing");
      const nonceRes = await fetch(`/api/auth/siws/nonce?wallet=${walletAddress}`);
      if (!nonceRes.ok) throw new Error("Nonce 발급 실패");
      const { message } = await nonceRes.json();

      // 3. Phantom 서명
      const messageBytes = new TextEncoder().encode(message);
      const { signature: signatureBytes } = await phantom.signMessage(messageBytes, "utf8");
      const signature = bs58.encode(signatureBytes);

      // 4. 검증 + 세션 생성
      setStatus("verifying");
      const verifyRes = await fetch("/api/auth/siws/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, signature }),
      });

      if (!verifyRes.ok) {
        const err = await verifyRes.json().catch(() => ({}));
        throw new Error(err.error || "인증 실패");
      }

      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/home");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("User rejected") || msg.includes("cancelled") || msg.includes("rejected")) {
        setStatus("idle");
        return;
      }
      onError?.(msg);
      setStatus("idle");
    }
  }

  const labels: Record<Status, string> = {
    idle: "Sign in with Phantom",
    connecting: "지갑 연결 중…",
    signing: "서명 중…",
    verifying: "인증 중…",
  };

  return (
    <button
      onClick={handleSignIn}
      disabled={isLoading}
      className="w-full flex items-center justify-center gap-3 bg-[#AB9FF2]/15 hover:bg-[#AB9FF2]/25 border border-[#AB9FF2]/30 disabled:opacity-50 text-white text-sm font-bold py-3 px-4 rounded-2xl transition-all active:scale-[0.98]"
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <PhantomIcon />
      )}
      {labels[status]}
    </button>
  );
}
