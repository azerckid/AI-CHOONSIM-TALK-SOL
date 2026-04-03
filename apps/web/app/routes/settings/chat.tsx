import { Link } from "react-router";

export default function ChatSettingsPage() {
  return (
    <div className="min-h-screen bg-background-dark text-white font-display antialiased flex items-center justify-center px-5">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-white/30 text-[28px]">chat_settings</span>
        </div>
        <div>
          <h1 className="text-xl font-black mb-2">채팅 환경설정</h1>
          <p className="text-white/50 text-sm leading-relaxed">
            이 기능은 서비스 준비 중입니다.<br />곧 업데이트될 예정이에요.
          </p>
        </div>
        <Link
          to="/settings"
          className="block w-full py-3.5 rounded-xl border border-white/10 text-white/70 font-bold text-sm hover:bg-white/5 transition-colors"
        >
          설정으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
