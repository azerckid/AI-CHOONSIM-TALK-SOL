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
import { useState, useEffect, useCallback } from "react";
import { usePrivy, useLoginWithOAuth, useLoginWithEmail, useCreateWallet } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { useRevalidator } from "react-router";
import { toast } from "sonner";
import bs58 from "bs58";
import { QRCodeSVG } from "qrcode.react";

interface Props {
  choco: number;
  /** compact=true 이면 컨테이너/금액 표시 생략 (ChocoPayCard 내부 사용 시) */
  compact?: boolean;
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

const SOLANA_DEVNET_CHAIN = "solana:devnet";
const SOL_PER_CHOCO = 0.00001; // create-tx.ts와 동일
const FEE_BUFFER = 0.000005;   // 트랜잭션 수수료 여유분
const DEVNET_RPC = "https://api.devnet.solana.com";

function PrivyChocoPayCardInner({ choco, compact }: Props) {
  const { authenticated, ready, login } = usePrivy();
  const { wallets } = useWallets();
  const revalidator = useRevalidator();
  const [status, setStatus] = useState<Status>("idle");
  const [grantedChoco, setGrantedChoco] = useState(0);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [checkingBalance, setCheckingBalance] = useState(false);

  const embeddedWallet = wallets.find((w: any) => w.walletClientType === "privy") ?? wallets[0] ?? null;
  const { createWallet } = useCreateWallet();
  const [creatingWallet, setCreatingWallet] = useState(false);

  // 로그인 됐는데 지갑이 없으면 자동 생성
  useEffect(() => {
    if (authenticated && ready && wallets.length === 0 && !creatingWallet) {
      setCreatingWallet(true);
      createWallet().catch(() => {}).finally(() => setCreatingWallet(false));
    }
  }, [authenticated, ready, wallets.length]);

  // 헤드리스 로그인 훅
  const { initOAuth } = useLoginWithOAuth();
  const { sendCode, loginWithCode } = useLoginWithEmail();
  const [emailInput, setEmailInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [emailStep, setEmailStep] = useState<"input" | "otp">("input");
  const [emailLoading, setEmailLoading] = useState(false);

  const requiredSol = parseFloat((choco * SOL_PER_CHOCO + FEE_BUFFER).toFixed(6));

  const checkBalance = useCallback(async () => {
    if (!embeddedWallet?.address) return;
    setCheckingBalance(true);
    try {
      const { Connection, PublicKey, LAMPORTS_PER_SOL } = await import("@solana/web3.js");
      const conn = new Connection(DEVNET_RPC, "confirmed");
      const lamports = await conn.getBalance(new PublicKey(embeddedWallet.address));
      setSolBalance(lamports / LAMPORTS_PER_SOL);
    } catch {
      setSolBalance(null);
    } finally {
      setCheckingBalance(false);
    }
  }, [embeddedWallet?.address]);

  useEffect(() => {
    checkBalance();
  }, [checkBalance]);

  async function handlePay() {
    if (!embeddedWallet) {
      toast.error("No embedded wallet found. Please create one first.");
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
        throw new Error(err.error || `Server error (${res.status})`);
      }
      const { recipient, lamports, paymentId, rpcUrl } = await res.json();

      // 2. @solana/web3.js로 트랜잭션 빌드
      const {
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

      // 3. Privy로 서명만 받고, RPC 제출은 우리가 직접
      setStatus("signing");
      const signResult = await embeddedWallet.signTransaction({
        transaction: tx.serialize(),
        chain: SOLANA_DEVNET_CHAIN,
      });
      // signedTransaction은 Uint8Array (서명된 직렬화 트랜잭션)
      const signedTx = VersionedTransaction.deserialize(signResult.signedTransaction);

      // 4. 우리 RPC로 직접 전송
      console.log("[PrivyPay] sendRawTransaction start");
      const rawSig = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: true,  // preflight 시뮬레이션 skip → public RPC hang 방지
        maxRetries: 3,
      });
      const signature = typeof rawSig === "string" ? rawSig : bs58.encode(rawSig as any);
      console.log("[PrivyPay] signature:", signature);

      // 온체인 확인 대기 — 클라이언트 폴링 (최대 60s)
      setStatus("verifying");
      const deadline = Date.now() + 60_000;
      let pollCount = 0;
      while (Date.now() < deadline) {
        const { value: statuses } = await connection.getSignatureStatuses([signature]);
        const s = statuses?.[0];
        console.log(`[PrivyPay] poll #${++pollCount} status:`, s?.confirmationStatus ?? "null");
        if (s?.err) throw new Error("Transaction failed on-chain.");
        if (s && (s.confirmationStatus === "confirmed" || s.confirmationStatus === "finalized")) break;
        await new Promise((r) => setTimeout(r, 2500));
      }
      console.log("[PrivyPay] confirmed, calling verify-sig");

      // 5. verify-sig → CHOCO 지급 (PENDING이면 최대 3회 재시도)
      let verifyData: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const verifyRes = await fetch("/api/payment/solana/verify-sig", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signature, paymentId }),
        });
        verifyData = await verifyRes.json();
        console.log(`[PrivyPay] verify attempt ${attempt + 1}:`, verifyData.status);
        if (verifyData.status !== "PENDING") break;
        await new Promise((r) => setTimeout(r, 3000));
      }

      if (verifyData.status === "COMPLETED") {
        setGrantedChoco(verifyData.chocoGranted ?? choco);
        setStatus("done");
        revalidator.revalidate();
      } else {
        throw new Error(verifyData.error || "Payment verification failed.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("User rejected") || msg.includes("cancelled") || msg.includes("rejected")) {
        toast("Payment cancelled.");
        setStatus("idle");
        return;
      }
      console.error("[PrivyChocoPayCard]", err);
      toast.error(msg || "Payment failed. Please try again.");
      setStatus("error");
    }
  }

  const isLoading = status !== "idle";
  const statusLabel: Record<Status, string> = {
    idle: "",
    building: "Building transaction…",
    signing: "Signing with wallet…",
    verifying: "Confirming on-chain…",
    done: "",
    error: "",
  };

  const doneUI = (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-sm font-semibold">
      <span className="material-symbols-outlined text-[18px]">check_circle</span>
      {grantedChoco.toLocaleString()} CHOCO topped up! 💕
    </div>
  );

  const errorUI = (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-red-400">Something went wrong. Please try again.</p>
      <button onClick={() => setStatus("idle")} className="text-xs text-white/50 hover:text-white/80 transition-colors">
        Retry
      </button>
    </div>
  );

  // 잔액 부족 → 내장 지갑 주소 QR 표시
  const insufficientUI = embeddedWallet ? (
    <div className="flex flex-col items-center gap-3 py-2">
      <p className="text-xs text-amber-400 text-center">
        Insufficient SOL ({solBalance?.toFixed(4) ?? "?"} / {requiredSol} SOL needed)
      </p>
      <p className="text-xs text-white/50 text-center">
        Send SOL to the address below to top up your embedded wallet
      </p>
      <div className="bg-white p-3 rounded-xl">
        <QRCodeSVG value={embeddedWallet.address} size={140} />
      </div>
      <p className="font-mono text-[10px] text-white/40 break-all text-center px-2">
        {embeddedWallet.address}
      </p>
      <button
        onClick={checkBalance}
        disabled={checkingBalance}
        className="flex items-center gap-1.5 text-xs text-[#9945FF] hover:text-[#7b35d9] transition-colors"
      >
        <span className="material-symbols-outlined text-[14px]">refresh</span>
        {checkingBalance ? "Checking..." : "Refresh Balance"}
      </button>
    </div>
  ) : null;

  // 헤드리스 이메일 OTP 핸들러
  async function handleSendCode() {
    if (!emailInput.trim()) return;
    setEmailLoading(true);
    try {
      await sendCode({ email: emailInput.trim() });
      setEmailStep("otp");
    } catch (e) {
      toast.error("Failed to send code. Please try again.");
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleLoginWithCode() {
    if (!otpInput.trim()) return;
    setEmailLoading(true);
    try {
      await loginWithCode({ code: otpInput.trim() });
    } catch (e) {
      toast.error("Invalid code. Please check and retry.");
    } finally {
      setEmailLoading(false);
    }
  }

  const connectUI = (
    <div className="space-y-2">
      <p className="text-xs text-white/40 text-center mb-3">Connect Embedded Wallet</p>
      {/* Google */}
      <button
        onClick={() => initOAuth({ provider: "google" })}
        className="w-full flex items-center justify-center gap-2 bg-white/8 hover:bg-white/15 border border-white/10 text-white text-sm font-bold py-2.5 px-4 rounded-xl transition-all active:scale-[0.98]"
      >
        <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#EA4335" d="M9 3.48c1.69 0 2.83.73 3.48 1.34l2.54-2.48C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.91 2.26C4.6 5.05 6.62 3.48 9 3.48z"/><path fill="#FBBC05" d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z"/><path fill="#34A853" d="M3.88 10.78A5.54 5.54 0 0 1 3.58 9c0-.62.11-1.22.29-1.78L.96 4.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.92-2.26z"/><path fill="#4285F4" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.4-1.57-5.12-3.74L.97 13.04C2.45 15.98 5.48 18 9 18z"/></svg>
        Continue with Google
      </button>
      {/* Twitter/X */}
      <button
        onClick={() => initOAuth({ provider: "twitter" })}
        className="w-full flex items-center justify-center gap-2 bg-white/8 hover:bg-white/15 border border-white/10 text-white text-sm font-bold py-2.5 px-4 rounded-xl transition-all active:scale-[0.98]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        Continue with X (Twitter)
      </button>
      {/* Divider */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-[10px] text-white/30">or Email</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>
      {/* Email OTP */}
      {emailStep === "input" ? (
        <div className="flex gap-2">
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="Enter your email"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#9945FF]/50"
          />
          <button
            onClick={handleSendCode}
            disabled={emailLoading || !emailInput.trim()}
            className="px-3 py-2 bg-[#9945FF] hover:bg-[#7b35d9] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all"
          >
            {emailLoading ? "..." : "전송"}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-white/50">Code sent to {emailInput}</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value)}
              placeholder="Enter code"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#9945FF]/50"
            />
            <button
              onClick={handleLoginWithCode}
              disabled={emailLoading || !otpInput.trim()}
              className="px-3 py-2 bg-[#9945FF] hover:bg-[#7b35d9] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all"
            >
              {emailLoading ? "..." : "Verify"}
            </button>
          </div>
          <button onClick={() => setEmailStep("input")} className="text-xs text-white/30 hover:text-white/60">
            Change email
          </button>
        </div>
      )}
    </div>
  );

  const buttonUI = ready && !authenticated ? (
    connectUI
  ) : creatingWallet ? (
    <div className="flex items-center justify-center gap-2 text-xs text-white/40 py-2">
      <span className="w-3 h-3 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      Creating embedded wallet...
    </div>
  ) : checkingBalance ? (
    <div className="flex items-center justify-center gap-2 text-xs text-white/40 py-2">
      <span className="w-3 h-3 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      Checking balance...
    </div>
  ) : solBalance !== null && solBalance < requiredSol ? (
    insufficientUI
  ) : (
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
          Pay with Embedded Wallet ({solBalance?.toFixed(4)} SOL)
        </>
      )}
    </button>
  );

  // compact: ChocoPayCard 내부에서 사용 — 컨테이너/금액 없이 버튼만
  if (compact) {
    return (
      <>
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-[#9945FF]">
            <span className="w-3 h-3 border-2 border-[#9945FF]/40 border-t-[#9945FF] rounded-full animate-spin shrink-0" />
            {statusLabel[status]}
          </div>
        )}
        {status === "done" ? doneUI : status === "error" ? errorUI : buttonUI}
      </>
    );
  }

  // standalone: /buy-choco 페이지 등 — 전체 카드
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
      {status === "done" ? doneUI : status === "error" ? errorUI : buttonUI}
    </div>
  );
}

/** SSR-safe wrapper */
export function PrivyChocoPayCard({ choco, compact }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return <PrivyChocoPayCardInner choco={choco} compact={compact} />;
}
