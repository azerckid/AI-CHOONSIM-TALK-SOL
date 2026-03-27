/**
 * CHOCO 구매 페이지
 *
 * /buy-choco?choco=100  → Solana Pay QR + 폴링으로 100 CHOCO 구매
 *
 * 쿼리 파라미터:
 *   choco  — 구매할 CHOCO 수량 (기본값: 100)
 */
import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import { useLoaderData } from "react-router";
import { SolanaPayButton } from "~/components/payment/SolanaPayButton";
import { CheckCircle, ArrowLeft } from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return redirect("/login");

  const user = await db.query.user.findFirst({
    where: eq(schema.user.id, session.user.id),
    columns: { id: true, solanaWallet: true, chocoBalance: true },
  });

  return { solanaWallet: user?.solanaWallet ?? null };
}

const CHOCO_PACKAGES = [
  { choco: 100, label: "100 CHOCO" },
  { choco: 500, label: "500 CHOCO" },
  { choco: 1000, label: "1,000 CHOCO", badge: "인기" },
  { choco: 5000, label: "5,000 CHOCO", badge: "Best" },
] as const;

export default function BuyChocoPage() {
  const { solanaWallet } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialChoco = Math.max(100, parseInt(searchParams.get("choco") || "100", 10));
  const [selectedChoco, setSelectedChoco] = useState(
    CHOCO_PACKAGES.find((p) => p.choco === initialChoco)?.choco ?? 100
  );
  const [done, setDone] = useState(false);

  // 1,000 CHOCO = $1 기준
  const usdAmount = selectedChoco / 1000;

  if (done) {
    return (
      <div className="min-h-screen bg-[#0B0A10] flex flex-col items-center justify-center px-6 text-white">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-black">{selectedChoco.toLocaleString()} CHOCO 충전 완료!</h2>
          <p className="text-white/50 text-sm">지갑으로도 SPL 토큰이 전송됐어 💕</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-6 py-3 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/30"
          >
            채팅으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0A10] text-white font-display antialiased">
      {/* 배경 그라디언트 */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-md mx-auto px-5 pb-12">
        {/* 헤더 */}
        <div className="flex items-center gap-3 pt-6 pb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-black">CHOCO 구매</h1>
        </div>

        {/* 지갑 없으면 안내 */}
        {!solanaWallet && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm leading-relaxed">
            <p className="font-bold mb-1">⚠️ Phantom 지갑 미등록</p>
            <p>
              프로필 → Wallet 메뉴에서 지갑 주소를 등록하면 CHOCO가 지갑으로 자동 전송돼요.
            </p>
          </div>
        )}

        {/* 수량 선택 */}
        <div className="mb-6">
          <p className="text-white/50 text-xs mb-3 uppercase tracking-widest">수량 선택</p>
          <div className="grid grid-cols-2 gap-3">
            {CHOCO_PACKAGES.map((pkg) => (
              <button
                key={pkg.choco}
                onClick={() => setSelectedChoco(pkg.choco)}
                className={`relative p-4 rounded-2xl border text-left transition-all ${
                  selectedChoco === pkg.choco
                    ? "bg-primary/20 border-primary shadow-lg shadow-primary/20"
                    : "bg-white/5 border-white/10 hover:bg-white/8"
                }`}
              >
                {"badge" in pkg && (
                  <span className="absolute top-2 right-2 text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full">
                    {pkg.badge}
                  </span>
                )}
                <p className="text-lg font-black">{pkg.label}</p>
                <p className="text-xs text-white/40 mt-0.5">
                  ${(pkg.choco / 1000).toFixed(pkg.choco < 1000 ? 2 : 1)} USD
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* 결제 요약 */}
        <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-white/50">구매 수량</span>
            <span className="font-bold">{selectedChoco.toLocaleString()} CHOCO</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">가격 (USD 기준)</span>
            <span className="font-bold">${usdAmount.toFixed(usdAmount < 1 ? 2 : 1)}</span>
          </div>
          {solanaWallet && (
            <div className="flex justify-between">
              <span className="text-white/50">수신 지갑</span>
              <span className="font-mono text-xs text-primary">
                {solanaWallet.slice(0, 6)}…{solanaWallet.slice(-4)}
              </span>
            </div>
          )}
        </div>

        {/* Solana Pay 버튼 */}
        <SolanaPayButton
          amount={usdAmount}
          credits={selectedChoco}
          description={`${selectedChoco} CHOCO 구매`}
          onSuccess={() => setDone(true)}
        />

        <p className="text-center text-xs text-white/30 mt-4">
          Devnet 기준 · SOL 시세 자동 반영 · 결제 후 자동 충전
        </p>
      </div>
    </div>
  );
}
