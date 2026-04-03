import { Link } from "react-router";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background-dark text-white font-display antialiased">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/login" className="text-white/40 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </Link>
          <h1 className="text-xl font-black">개인정보처리방침</h1>
        </div>

        <div className="space-y-8 text-white/70 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-bold text-base mb-3">수집하는 개인정보</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>이메일 주소 (회원가입 및 로그인)</li>
              <li>소셜 계정 정보 (Google·Kakao·Twitter OAuth)</li>
              <li>Solana 지갑 주소 (온체인 기능 사용 시)</li>
              <li>대화 내용 (AI 응답 품질 향상 및 개인화)</li>
              <li>결제 내역 (환불·분쟁 처리 목적)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-3">개인정보 이용 목적</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>서비스 제공 및 계정 관리</li>
              <li>AI 캐릭터 개인화 및 컨텍스트 유지</li>
              <li>결제 처리 및 CHOCO 잔액 관리</li>
              <li>서비스 개선 및 통계 분석</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-3">개인정보 보관 및 파기</h2>
            <p>회원 탈퇴 시 개인정보는 즉시 삭제됩니다. 단, 관계 법령에 따라 일정 기간 보관이 필요한 정보는 해당 기간 동안 보관 후 파기합니다.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-3">제3자 제공</h2>
            <p>서비스는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 단, AI 응답 생성을 위해 Google Gemini API와 연동되며, 대화 내용이 API 처리에 사용될 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-3">이용자 권리</h2>
            <p>이용자는 언제든지 개인정보 열람, 수정, 삭제를 요청할 수 있습니다. 설정 → 계정 삭제를 통해 모든 데이터를 삭제할 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-3">문의</h2>
            <p>개인정보 관련 문의는 서비스 내 고객센터(/help)를 통해 접수해 주세요.</p>
          </section>

          <p className="text-white/30 text-xs pt-4 border-t border-white/10">
            시행일: 2026년 4월 3일
          </p>
        </div>
      </div>
    </div>
  );
}
