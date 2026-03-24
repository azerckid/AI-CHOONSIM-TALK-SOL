/**
 * 온보딩 CHOCO 소개 슬라이드
 * 가입 직후 CHOCO 개념을 1장으로 소개하고 /guide 링크를 제공합니다.
 *
 * Created: 2026-02-11
 * Related: docs/03_Technical_Specs/23_choco-guide-page-spec.md
 */
import { useNavigate, Link } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { redirect } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return redirect("/login");
  }
  return null;
}

export default function OnboardingChocoSlide() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0B0A10] text-white font-display antialiased flex flex-col items-center justify-center px-6 max-w-md mx-auto">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full flex flex-col items-center text-center space-y-8">
        <div className="w-24 h-24 rounded-3xl bg-primary/20 border-2 border-primary/40 flex items-center justify-center shadow-[0_0_40px_rgba(238,43,140,0.3)]">
          <span className="material-symbols-outlined text-[48px] text-primary">toll</span>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-black italic uppercase tracking-tight text-white">
            CHOCO
          </h1>
          <p className="text-white/60 text-base leading-relaxed max-w-[280px] mx-auto">
            춘심이 앱의 대화 화폐예요.
            <br />
            대화, 아이템 구매, 선물까지 앱 곳곳에서 사용할 수 있어요.
          </p>
        </div>

        <div className="w-full space-y-3 text-sm text-white/50">
          <div className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary">currency_exchange</span>
            <span>1,000 CHOCO = $1</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary">card_giftcard</span>
            <span>가입 시 100 CHOCO 보너스 지급</span>
          </div>
        </div>

        <div className="w-full pt-4 space-y-3">
          <button
            onClick={() => navigate("/home")}
            className="w-full py-4 rounded-2xl bg-primary text-white font-black text-base hover:bg-primary/90 active:scale-[0.98] transition-all"
          >
            시작하기
          </button>
          <Link
            to="/guide"
            className="block w-full py-3 rounded-2xl border border-white/10 text-white/70 font-bold text-sm hover:bg-white/5 hover:border-white/20 transition-colors"
          >
            CHOCO 자세히 보기
          </Link>
        </div>
      </div>
    </div>
  );
}
