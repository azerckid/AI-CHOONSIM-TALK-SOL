import { Link } from "react-router";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-background-dark text-white font-display antialiased flex items-center justify-center px-5">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-primary text-[28px]">lock_reset</span>
        </div>
        <div>
          <h1 className="text-xl font-black mb-2">비밀번호 재설정</h1>
          <p className="text-white/50 text-sm leading-relaxed">
            소셜 로그인(Google·Kakao·Twitter)을 사용 중이라면<br />
            해당 소셜 계정에서 비밀번호를 변경해 주세요.
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left space-y-2">
          <p className="text-xs text-white/40 font-bold uppercase tracking-wide">이메일 계정 문의</p>
          <p className="text-sm text-white/60 leading-relaxed">
            이메일·비밀번호로 가입한 경우 X(Twitter) <span className="text-primary">@choonsim_talk</span> 으로 문의해 주시면 도와드리겠습니다.
          </p>
        </div>
        <Link
          to="/login"
          className="block w-full py-3.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors"
        >
          로그인으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
