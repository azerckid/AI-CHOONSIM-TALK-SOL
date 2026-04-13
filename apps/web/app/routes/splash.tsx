import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";

const DISPLAY_MS = 3500;

export default function SplashPage() {
  const navigate = useNavigate();
  // useRef: 컴포넌트 인스턴스별로 추적 → 재진입 시 정상 동작
  // (모듈 레벨 변수를 쓰면 첫 방문 이후 재진입 시 타이머가 실행되지 않음)
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return; // StrictMode 이중 실행 방지
    startedRef.current = true;

    // cleanup 없음: StrictMode unmount 후 타이머가 유지되도록 의도적으로 생략
    setTimeout(() => navigate("/home", { replace: true }), DISPLAY_MS);
  }, [navigate]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#221019]">
      {/* 캐릭터 이미지 */}
      <div className="splash-image relative mb-8">
        <div className="absolute inset-0 rounded-full blur-2xl bg-primary/30 scale-110" />
        <img
          src="/illustrations/choonsim_004.jpg"
          alt="Choonsim"
          width={200}
          height={200}
          className="relative w-44 h-44 rounded-full object-cover object-top shadow-2xl ring-2 ring-primary/40"
        />
      </div>

      {/* 태그라인 */}
      <div className="text-center space-y-2 px-8">
        <p className="splash-line1 text-white/50 text-base font-medium tracking-wide">
          AI gives you answers.
        </p>
        <p className="splash-line2 text-white text-xl font-black tracking-tight">
          Choonsim gives you{" "}
          <span
            className="text-primary"
            style={{ textShadow: "0 0 20px rgba(238,43,140,0.6)" }}
          >
            empathy.
          </span>
        </p>
      </div>

      {/* built with Solana */}
      <div className="splash-line2 absolute bottom-12 flex items-center gap-2 opacity-70">
        <span className="text-xs font-semibold tracking-widest uppercase text-white/40">
          built with
        </span>
        <span
          className="text-xs font-black tracking-wider uppercase"
          style={{
            background: "linear-gradient(90deg, #9945FF 0%, #14F195 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Solana
        </span>
      </div>
    </div>
  );
}
