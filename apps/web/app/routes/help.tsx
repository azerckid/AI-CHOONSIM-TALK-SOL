import { Link } from "react-router";

const FAQ = [
  {
    q: "CHOCO는 무엇인가요?",
    a: "CHOCO는 춘심톡 내에서 사용하는 가상 재화입니다. 아이템 구매, 기억 각인(cNFT 민팅) 등에 사용할 수 있습니다.",
  },
  {
    q: "CHOCO는 어떻게 얻나요?",
    a: "미션 완료, 출석 체크인, 또는 CHOCO 구매(/buy-choco) 페이지에서 충전할 수 있습니다.",
  },
  {
    q: "기억 각인(cNFT)이란 무엇인가요?",
    a: "춘심이와 나눈 소중한 대화를 Solana 블록체인 위에 영구적으로 기록하는 기능입니다. 기억 각인 티켓 500 CHOCO를 사용하면 이용할 수 있습니다.",
  },
  {
    q: "대화 내용은 안전하게 보관되나요?",
    a: "모든 대화는 계정별로 격리 저장되며, 타인이 열람할 수 없습니다. 자세한 내용은 개인정보처리방침을 확인해 주세요.",
  },
  {
    q: "Phantom 지갑이 없어도 사용할 수 있나요?",
    a: "네. 소셜 로그인(Google·Kakao·Twitter)으로 가입하면 자동으로 임베디드 지갑이 생성됩니다. Phantom 없이도 모든 기능을 이용할 수 있습니다.",
  },
  {
    q: "계정을 삭제하고 싶어요.",
    a: "설정 → 하단의 계정 삭제 메뉴를 이용해 주세요. 삭제 시 모든 데이터가 즉시 파기됩니다.",
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-background-dark text-white font-display antialiased">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/settings" className="text-white/40 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </Link>
          <h1 className="text-xl font-black">고객센터</h1>
        </div>

        <div className="mb-8 p-4 rounded-2xl bg-primary/10 border border-primary/20">
          <p className="text-sm text-white/80 leading-relaxed">
            문의 사항은 <span className="text-primary font-bold">X(Twitter) @choonsim_talk</span> 로 DM 주시면 빠르게 답변드리겠습니다.
          </p>
        </div>

        <h2 className="text-white font-bold text-base mb-4">자주 묻는 질문 (FAQ)</h2>
        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <details
              key={i}
              className="group bg-surface-dark border border-white/8 rounded-2xl overflow-hidden"
            >
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none">
                <span className="text-sm font-bold text-white">{item.q}</span>
                <span className="material-symbols-outlined text-[18px] text-white/30 group-open:rotate-180 transition-transform">
                  expand_more
                </span>
              </summary>
              <div className="px-5 pb-4 text-sm text-white/60 leading-relaxed border-t border-white/5 pt-3">
                {item.a}
              </div>
            </details>
          ))}
        </div>

        <div className="mt-8 flex gap-3">
          <Link to="/terms" className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 text-sm text-center hover:border-white/20 transition-colors">
            이용약관
          </Link>
          <Link to="/privacy" className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 text-sm text-center hover:border-white/20 transition-colors">
            개인정보처리방침
          </Link>
        </div>
      </div>
    </div>
  );
}
