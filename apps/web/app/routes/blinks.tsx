/**
 * /blinks — Solana Blinks 데모 페이지
 *
 * Seoulana 해커톤 심사위원을 위한 Blinks Actions 체험 페이지.
 * 지갑 연결 → 트랜잭션 서명 → 온체인 실행 전 과정을 보여줍니다.
 */
import { useState, useCallback } from "react";
import { Link } from "react-router";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  Transaction,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { WalletButton } from "~/components/solana/WalletButton";
import { Button } from "~/components/ui/button";
import {
  CheckCircle,
  ExternalLink,
  Loader2,
  Gift,
  Calendar,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

type ActionState = "idle" | "loading" | "signing" | "success" | "error";

interface ActionCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  label: string;
  href: string;
  color: string;
}

const ACTION_CARDS: ActionCard[] = [
  {
    id: "checkin",
    icon: <Calendar className="w-5 h-5" />,
    title: "일일 체크인",
    description: "매일 체크인하면 50 CHOCO 지급. 온체인 Memo로 출석이 영구 기록됩니다.",
    label: "체크인 → 50 CHOCO",
    href: "/api/actions/checkin",
    color: "from-blue-600 to-cyan-600",
  },
  {
    id: "gift",
    icon: <Gift className="w-5 h-5" />,
    title: "CHOCO 선물하기",
    description: "다른 팬에게 CHOCO 토큰을 선물. X(Twitter)에서 바로 선물 가능한 Blink URL 생성.",
    label: "100 CHOCO 선물",
    href: "/api/actions/gift?amount=100",
    color: "from-pink-600 to-rose-600",
  },
  {
    id: "subscribe",
    icon: <Zap className="w-5 h-5" />,
    title: "SOL 구독",
    description: "0.01 SOL로 월간 구독권 구매. 구독 시 매일 CHOCO 지급 + 프리미엄 기능 활성화.",
    label: "0.01 SOL 구독",
    href: "/api/actions/subscribe?plan=monthly",
    color: "from-violet-600 to-purple-600",
  },
];

export default function BlinksPage() {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [states, setStates] = useState<Record<string, ActionState>>({});
  const [sigs, setSigs] = useState<Record<string, string>>({});

  const setActionState = (id: string, state: ActionState) => {
    setStates((prev) => ({ ...prev, [id]: state }));
  };

  const executeAction = useCallback(
    async (card: ActionCard) => {
      if (!publicKey || !signTransaction) {
        toast.error("먼저 지갑을 연결하세요.");
        return;
      }

      setActionState(card.id, "loading");

      try {
        // 1. GET — Action 메타데이터 로드 (verify)
        const metaRes = await fetch(card.href);
        if (!metaRes.ok) throw new Error("Action 메타데이터 로드 실패");

        // 2. POST — 트랜잭션 생성 요청
        setActionState(card.id, "signing");
        const txRes = await fetch(card.href, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ account: publicKey.toBase58() }),
        });

        if (!txRes.ok) {
          const err = await txRes.json();
          throw new Error(err.message || "트랜잭션 생성 실패");
        }

        const { transaction, message } = await txRes.json();

        // 3. Base64 → Transaction 역직렬화
        const txBuf = Buffer.from(transaction, "base64");
        const tx = Transaction.from(txBuf);
        tx.feePayer = publicKey;

        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;

        // 4. 지갑 서명
        const signedTx = await signTransaction(tx);

        // 5. 온체인 전송
        const sig = await connection.sendRawTransaction(
          signedTx.serialize()
        );

        await connection.confirmTransaction(sig, "confirmed");

        setSigs((prev) => ({ ...prev, [card.id]: sig }));
        setActionState(card.id, "success");
        toast.success(message || "트랜잭션 성공! 🎉");

        // 체크인이면 서버 보상 지급 요청
        if (card.id === "checkin") {
          await fetch("/api/actions/checkin/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ txSignature: sig }),
          });
        }
      } catch (err) {
        setActionState(card.id, "error");
        toast.error((err as Error).message || "실행 실패");
      }
    },
    [publicKey, signTransaction, connection]
  );

  const explorerUrl = (sig: string) =>
    `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

  return (
    <div className="min-h-screen bg-[#0B0A10] text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0B0A10]/80 backdrop-blur-xl border-b border-white/5 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link to="/home" className="flex items-center gap-2">
            <span className="text-xl font-black italic tracking-tighter text-primary">
              춘심
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/20 text-primary font-bold">
              BLINKS
            </span>
          </Link>
          <WalletButton />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Hero */}
        <div className="text-center space-y-2 py-4">
          <h1 className="text-2xl font-black italic tracking-tighter">
            Solana Actions & Blinks
          </h1>
          <p className="text-white/50 text-sm leading-relaxed">
            X(Twitter) 포스트에서 직접 실행 가능한 온체인 액션.
            <br />
            지갑 연결 후 아래 버튼을 눌러 체험하세요.
          </p>
        </div>

        {/* Wallet Status */}
        {!connected && (
          <div className="flex flex-col items-center gap-3 py-6 px-4 rounded-3xl border border-dashed border-white/10 bg-white/2">
            <p className="text-white/40 text-sm">Phantom 지갑을 연결하세요</p>
            <WalletButton />
          </div>
        )}

        {/* Action Cards */}
        <div className="space-y-4">
          {ACTION_CARDS.map((card) => {
            const state = states[card.id] || "idle";
            const sig = sigs[card.id];
            const isLoading = state === "loading" || state === "signing";

            return (
              <div
                key={card.id}
                className="rounded-3xl border border-white/8 bg-white/3 overflow-hidden"
              >
                {/* Card Header */}
                <div className={`bg-linear-to-r ${card.color} p-4 flex items-center gap-3`}>
                  <div className="p-2 rounded-xl bg-white/20">
                    {card.icon}
                  </div>
                  <div>
                    <h3 className="font-black text-sm">{card.title}</h3>
                    <p className="text-white/70 text-xs">{card.description}</p>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  {/* Blink URL */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/30 border border-white/5">
                    <code className="text-[10px] text-primary/70 truncate flex-1">
                      {typeof window !== "undefined"
                        ? `${window.location.origin}${card.href}`
                        : card.href}
                    </code>
                    <button
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          navigator.clipboard.writeText(
                            `${window.location.origin}${card.href}`
                          );
                          toast.success("복사됨!");
                        }
                      }}
                      className="text-white/30 hover:text-white/60 transition-colors text-[10px]"
                    >
                      복사
                    </button>
                  </div>

                  {/* Execute Button */}
                  {state === "success" && sig ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-green-400 text-xs font-medium">
                        <CheckCircle className="w-4 h-4" />
                        트랜잭션 성공!
                      </div>
                      <a
                        href={explorerUrl(sig)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/70 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Solana Explorer에서 확인
                      </a>
                    </div>
                  ) : (
                    <Button
                      onClick={() => executeAction(card)}
                      disabled={!connected || isLoading}
                      className="w-full h-10 rounded-2xl font-black text-sm"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          {state === "signing" ? "서명 중..." : "처리 중..."}
                        </>
                      ) : (
                        card.label
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Info */}
        <div className="rounded-3xl border border-white/5 bg-white/2 p-4 space-y-2">
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest">
            온체인 정보 (Devnet)
          </p>
          <div className="space-y-1.5 text-[11px] text-white/30 font-mono">
            <div className="flex justify-between">
              <span>CHOCO Token</span>
              <a
                href="https://explorer.solana.com/address/E2o1MKpnwh5vELG4FDgiX2NA33L11hXPVfAPD3ai4GWf?cluster=devnet"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary/60 hover:text-primary flex items-center gap-1"
              >
                E2o1...4GWf <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <div className="flex justify-between">
              <span>Merkle Tree</span>
              <a
                href="https://explorer.solana.com/address/AJxCqbFdWLmQ7xMqBQN3AXja9paZJZ9qrqvwViXVkXGF?cluster=devnet"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary/60 hover:text-primary flex items-center gap-1"
              >
                AJxC...kXGF <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
