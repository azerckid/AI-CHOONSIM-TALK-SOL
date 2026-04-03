import { Link } from "react-router";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background-dark text-white font-display antialiased">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/login" className="text-white/40 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </Link>
          <h1 className="text-xl font-black">서비스 이용약관</h1>
        </div>

        <div className="space-y-8 text-white/70 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-bold text-base mb-3">제1조 (목적)</h2>
            <p>본 약관은 춘심톡(이하 "서비스")이 제공하는 AI 컴패니언 서비스의 이용과 관련하여 서비스와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-3">제2조 (서비스 이용)</h2>
            <p>서비스는 AI 기술을 기반으로 한 가상 컴패니언과의 대화 서비스를 제공합니다. 이용자는 서비스 내 AI 캐릭터가 실제 인물이 아님을 인지하고 이용하여야 합니다.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-3">제3조 (CHOCO 및 결제)</h2>
            <p>서비스 내 가상 재화인 CHOCO는 환불이 불가하며, Solana 블록체인 기반으로 발행됩니다. 결제와 관련한 분쟁은 관계 법령에 따라 처리됩니다.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-3">제4조 (금지 행위)</h2>
            <p>이용자는 서비스를 이용하여 타인을 비방하거나, 불법적인 목적으로 활용하거나, 서비스의 정상적인 운영을 방해하는 행위를 하여서는 안 됩니다.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-3">제5조 (면책)</h2>
            <p>서비스는 AI 생성 콘텐츠의 정확성·완전성을 보장하지 않습니다. AI 캐릭터의 발언은 오락 목적의 창작물이며, 전문적인 조언(의료·법률·금융 등)을 대체하지 않습니다.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-3">제6조 (약관 변경)</h2>
            <p>본 약관은 서비스 정책에 따라 변경될 수 있으며, 변경 시 앱 내 공지를 통해 안내합니다.</p>
          </section>

          <p className="text-white/30 text-xs pt-4 border-t border-white/10">
            시행일: 2026년 4월 3일
          </p>
        </div>
      </div>
    </div>
  );
}
