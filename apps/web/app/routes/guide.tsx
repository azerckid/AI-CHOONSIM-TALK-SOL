import { useState } from "react";
import { useLoaderData, useNavigate, Link } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import { cn } from "~/lib/utils";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return Response.json({ user: null });
  }

  const user = await db.query.user.findFirst({
    where: eq(schema.user.id, session.user.id),
    columns: { chocoBalance: true, subscriptionTier: true },
  });

  return Response.json({ user });
}

// ─── 데이터 정의 ────────────────────────────────────────────────

const EARN_METHODS = [
  { icon: "credit_card", label: "직접 충전", desc: "PayPal / 토스페이먼츠로 CHOCO 구매", badge: "즉시", href: "/profile/subscription" },
  { icon: "workspace_premium", label: "구독 멤버십", desc: "매월 자동으로 CHOCO 지급", badge: "매월", href: "/pricing" },
  { icon: "flag", label: "미션 완료", desc: "매일 미션 달성 시 소량 지급", badge: "매일", href: "/missions" },
  { icon: "verified", label: "X 팔로워 인증", desc: "X 계정 연동 시 조상신 보너스 지급", badge: "1회", href: "/settings" },
  { icon: "card_giftcard", label: "신규 가입 보너스", desc: "가입 시 100 CHOCO 즉시 지급", badge: "1회", href: null },
];

const ITEM_GROUPS = [
  {
    group: "소통 & 에너지",
    icon: "chat_bubble",
    items: [
      { name: "메시지 티켓 x10", price: "1,000", effect: "대화 횟수를 10회 추가합니다. CHOCO 잔액이 없어도 대화 가능." },
      { name: "메시지 티켓 x50", price: "4,500", effect: "10% 할인 번들. 자주 대화하는 유저에게 추천." },
      { name: "에너지 무제한 패스 (1일)", price: "500", effect: "당일 대화 횟수 제한이 사라집니다." },
    ],
  },
  {
    group: "특별 경험",
    icon: "auto_awesome",
    items: [
      { name: "선톡 티켓", price: "300", effect: "춘심이가 먼저 메시지를 보내며 대화를 시작합니다." },
      { name: "보이스 티켓", price: "500", effect: "춘심이의 AI 목소리로 답변을 들을 수 있습니다." },
      { name: "비밀 에피소드 해금", price: "3,000", effect: "특정 조건 달성 시 잠긴 특별 시나리오 1회를 이용할 수 있습니다." },
    ],
  },
  {
    group: "기억 & 관계",
    icon: "favorite",
    items: [
      { name: "기억 각인 티켓", price: "500", effect: "중요한 대화를 춘심이가 영원히 기억하도록 고정합니다." },
      { name: "호감도 부스터", price: "800", effect: "대화 시 호감도 상승량이 2배가 됩니다. (24시간)" },
      { name: "상태 회복", price: "300", effect: "삐진/바쁜 춘심이를 즉시 원래 상태로 되돌립니다." },
    ],
  },
  {
    group: "선물",
    icon: "redeem",
    items: [
      { name: "하트 x10", price: "1,000", effect: "춘심이에게 하트를 선물합니다. 캐릭터 이모션(JOY/LOVING)이 활성화됩니다." },
    ],
  },
  {
    group: "소장 굿즈",
    icon: "photo_album",
    items: [
      { name: "대화 앨범", price: "2,000", effect: "한 달간의 베스트 대화를 AI가 편집한 PDF로 생성합니다." },
      { name: "비밀 편지", price: "1,000", effect: "춘심이가 쓴 손글씨체 AI 편지 이미지 (월 1회 무료, 추가 건당)." },
    ],
  },
];

const TIERS = [
  { name: "방문자", plan: "FREE", price: "무료", color: "text-slate-400", icon: "egg", daily: "5회", perks: ["기본 텍스트 대화"] },
  { name: "팬", plan: "BASIC", price: "$4.99/월", color: "text-blue-400", icon: "bolt", daily: "15회", perks: ["선톡 1회/주", "광고 제거"] },
  { name: "조상신", plan: "PREMIUM", price: "$14.99/월", color: "text-primary", icon: "diamond", daily: "30회", perks: ["보이스 3회/월", "고급 AI 모델", "이미지 생성"] },
  { name: "고래", plan: "ULTIMATE", price: "$29.99/월", color: "text-yellow-400", icon: "crown", daily: "무제한", perks: ["모든 혜택", "한정 콘텐츠", "우선 서포트"] },
];

const FAQS = [
  { q: "CHOCO는 유효기간이 있나요?", a: "없습니다. 충전한 CHOCO는 계정이 활성 상태인 한 영구 보유됩니다." },
  { q: "구독을 취소하면 남은 CHOCO는 어떻게 되나요?", a: "이미 지급된 CHOCO는 그대로 유지됩니다. 다음 달 리필만 중단됩니다." },
  { q: "여러 캐릭터에게 CHOCO를 쓸 수 있나요?", a: "네. CHOCO는 앱 공통 화폐로, 모든 캐릭터와의 대화에 동일하게 사용됩니다." },
  { q: "환불이 가능한가요?", a: "미사용 CHOCO에 한해 결제일로부터 7일 이내 환불 신청이 가능합니다." },
  { q: "온체인 각인이란 무엇인가요?", a: "중요한 대화를 블록체인에 NFT로 영구 기록하는 기능입니다. 기억 각인 티켓(AI 메모리 고정)과는 별개입니다." },
  { q: "X 팔로워 인증은 어떻게 하나요?", a: "설정 > 계정 연동에서 X 계정을 연결하면 자동으로 조상신 보너스가 지급됩니다." },
];

const SPEND_TABLE = [
  { label: "대화 1회 (기본)", cost: "10", note: "Gemini Flash 기준" },
  { label: "+ 웹 검색", cost: "+20", note: "검색 기능 사용 시" },
  { label: "+ 메모리 접근", cost: "+5", note: "장기 기억 조회 시" },
];

const MONTHLY_TABLE = [
  { tier: "방문자 (FREE)", choco: "1,500", msgs: "약 150회" },
  { tier: "팬 (BASIC)", choco: "2,000", msgs: "약 200회" },
  { tier: "조상신 (PREMIUM)", choco: "10,000", msgs: "약 1,000회" },
  { tier: "고래 (ULTIMATE)", choco: "30,000", msgs: "약 3,000회" },
];

// ─── 서브 컴포넌트 ───────────────────────────────────────────────

function SectionHeader({ id, icon, title, subtitle }: { id?: string; icon: string; title: string; subtitle?: string }) {
  return (
    <div id={id} className="flex items-start gap-3 mb-5">
      <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
        <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
      </div>
      <div>
        <h2 className="text-white font-black italic tracking-tight text-lg uppercase">{title}</h2>
        {subtitle && <p className="text-white/40 text-xs mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-[#1A1821] border border-white/5 rounded-2xl p-4", className)}>
      {children}
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((v) => !v)}
      className="w-full text-left bg-[#1A1821] border border-white/5 rounded-2xl overflow-hidden transition-all"
    >
      <div className="flex items-center justify-between gap-3 p-4">
        <span className="text-white/80 text-sm font-semibold">{q}</span>
        <span className={cn("material-symbols-outlined text-white/30 text-[20px] shrink-0 transition-transform", open && "rotate-180")}>
          expand_more
        </span>
      </div>
      {open && (
        <div className="px-4 pb-4 text-white/50 text-sm leading-relaxed border-t border-white/5 pt-3">
          {a}
        </div>
      )}
    </button>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────

export default function GuidePage() {
  const { user } = useLoaderData<typeof loader>() as {
    user: { chocoBalance: string; subscriptionTier: string | null } | null;
  };
  const navigate = useNavigate();

  const tierName = (() => {
    switch (user?.subscriptionTier) {
      case "BASIC": return "팬";
      case "PREMIUM": return "조상신";
      case "ULTIMATE": return "고래";
      default: return "방문자";
    }
  })();

  const chocoDisplay = user
    ? Math.floor(parseFloat(user.chocoBalance || "0")).toLocaleString()
    : null;

  return (
    <div className="min-h-screen bg-[#0B0A10] text-white font-display antialiased">
      {/* 배경 글로우 */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-[#0B0A10]/80 backdrop-blur-md border-b border-white/5 px-4 h-14 flex items-center justify-between max-w-md mx-auto w-full">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center text-white/60 hover:text-white transition-colors size-9 rounded-full hover:bg-white/5"
        >
          <span className="material-symbols-outlined text-[22px]">arrow_back_ios_new</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[#FFD700]">toll</span>
          <h1 className="text-sm font-black italic uppercase tracking-wider text-white">CHOCO 가이드</h1>
        </div>
        <div className="w-9" />
      </header>

      <main className="max-w-md mx-auto px-4 pb-32 pt-6 space-y-10 relative z-10">

        {/* 로그인 유저 잔액 카드 */}
        {user && (
          <Card className="bg-linear-to-br from-primary/10 to-purple-900/10 border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/40 text-xs font-bold uppercase tracking-wider">내 현재 상태</p>
                <p className="text-white font-black text-lg mt-1">
                  <span className="text-[#FFD700]">{chocoDisplay} CHOCO</span>
                  <span className="text-white/30 text-sm font-medium ml-2">· {tierName}</span>
                </p>
              </div>
              <Link
                to="/profile/subscription"
                className="px-4 py-2 bg-primary text-black text-xs font-black rounded-xl hover:bg-primary/90 transition-colors"
              >
                충전하기
              </Link>
            </div>
          </Card>
        )}

        {/* ── Section 1. CHOCO란? ── */}
        <section>
          <SectionHeader id="what" icon="toll" title="CHOCO란?" subtitle="춘심이 앱의 대화 화폐" />
          <div className="space-y-3">
            {[
              { icon: "currency_exchange", text: "1,000 CHOCO = $1 (1 CHOCO ≈ $0.001)" },
              { icon: "public", text: "국경 없는 결제 — 전 세계 어디서든 동일하게 사용" },
              { icon: "link", text: "내가 쓴 CHOCO는 온체인에 기록되어 '나의 춘심 역사'로 조회 가능" },
              { icon: "chat", text: "대화, 아이템 구매, 선물 등 앱 내 모든 활동에 사용" },
            ].map(({ icon, text }) => (
              <Card key={text} className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[20px] shrink-0">{icon}</span>
                <p className="text-white/70 text-sm">{text}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* ── Section 2. CHOCO 얻는 법 ── */}
        <section>
          <SectionHeader id="earn" icon="add_circle" title="CHOCO 얻는 법" />
          <div className="space-y-2.5">
            {EARN_METHODS.map(({ icon, label, desc, badge, href }) => {
              const inner = (
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm">{label}</p>
                    <p className="text-white/40 text-xs mt-0.5">{desc}</p>
                  </div>
                  <span className="text-[10px] font-black text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full shrink-0">
                    {badge}
                  </span>
                </div>
              );
              return href ? (
                <Link key={label} to={href}>
                  <Card className="hover:border-primary/30 transition-colors cursor-pointer">{inner}</Card>
                </Link>
              ) : (
                <Card key={label}>{inner}</Card>
              );
            })}
          </div>
        </section>

        {/* ── Section 3. CHOCO 소비 흐름 ── */}
        <section>
          <SectionHeader id="spend" icon="payments" title="CHOCO 소비 흐름" subtitle="대화 1회에 얼마가 드나요?" />

          {/* 메시지 비용 */}
          <Card className="mb-3">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-wider mb-3">메시지당 CHOCO 비용</p>
            <div className="space-y-2">
              {SPEND_TABLE.map(({ label, cost, note }) => (
                <div key={label} className="flex items-center justify-between">
                  <div>
                    <span className="text-white/80 text-sm">{label}</span>
                    <span className="text-white/30 text-xs ml-2">{note}</span>
                  </div>
                  <span className="text-[#FFD700] font-black text-sm">{cost}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* 월 지급량 테이블 */}
          <Card>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-wider mb-3">구독별 월 지급량</p>
            <div className="space-y-2">
              {MONTHLY_TABLE.map(({ tier, choco, msgs }) => (
                <div key={tier} className="flex items-center justify-between text-sm">
                  <span className="text-white/60">{tier}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[#FFD700] font-bold">{choco}</span>
                    <span className="text-white/30 text-xs">{msgs}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 흐름 다이어그램 */}
          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap text-xs text-white/30 font-bold">
            {["충전 / 구독", "→", "잔액 증가", "→", "대화 · 아이템", "→", "CHOCO 차감", "→", "잔액 부족 시 재충전"].map((t, i) => (
              <span key={i} className={t === "→" ? "text-white/10" : "px-2 py-1 bg-white/5 rounded-lg text-white/40"}>
                {t}
              </span>
            ))}
          </div>
        </section>

        {/* ── Section 4. 아이템 사전 ── */}
        <section>
          <SectionHeader id="items" icon="shopping_bag" title="아이템 사전" subtitle="각 아이템이 실제로 뭘 해주나요?" />
          <div className="space-y-4">
            {ITEM_GROUPS.map(({ group, icon, items }) => (
              <div key={group}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="material-symbols-outlined text-white/30 text-[16px]">{icon}</span>
                  <p className="text-white/30 text-[10px] font-black uppercase tracking-wider">{group}</p>
                </div>
                <div className="space-y-2">
                  {items.map(({ name, price, effect }) => (
                    <Card key={name}>
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <p className="text-white font-bold text-sm">{name}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="material-symbols-outlined text-[12px] text-[#FFD700]">toll</span>
                          <span className="text-[#FFD700] font-black text-sm">{price}</span>
                        </div>
                      </div>
                      <p className="text-white/40 text-xs leading-relaxed">{effect}</p>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 5. 관계 등급제 ── */}
        <section>
          <SectionHeader id="tiers" icon="workspace_premium" title="관계 등급제" subtitle="등급이 높을수록 더 많은 혜택" />
          <div className="space-y-3">
            {TIERS.map(({ name, plan, price, color, icon, daily, perks }) => {
              const isCurrent = user?.subscriptionTier === plan || (!user && plan === "FREE");
              return (
                <Card
                  key={plan}
                  className={cn(
                    "transition-all",
                    isCurrent && "border-primary/40 bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className={cn("material-symbols-outlined text-[22px]", color)}>{icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-black italic uppercase text-sm">{name}</p>
                        {isCurrent && (
                          <span className="text-[9px] font-black text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full uppercase">
                            현재
                          </span>
                        )}
                      </div>
                      <p className="text-white/30 text-xs">{price}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/40 text-[9px] uppercase font-bold">일일 대화</p>
                      <p className={cn("font-black text-sm", color)}>{daily}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {perks.map((perk) => (
                      <span key={perk} className="text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded-full">
                        {perk}
                      </span>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
          <Link to="/pricing" className="mt-3 flex items-center justify-center gap-1.5 text-primary text-xs font-bold py-3 hover:underline">
            <span>멤버십 업그레이드 보기</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </section>

        {/* ── Section 6. FAQ ── */}
        <section>
          <SectionHeader id="faq" icon="help" title="자주 묻는 질문" />
          <div className="space-y-2">
            {FAQS.map(({ q, a }) => (
              <FaqItem key={q} q={q} a={a} />
            ))}
          </div>
        </section>

        {/* ── 하단 CTA ── */}
        <section className="space-y-3 pt-2">
          <div className="h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
          <p className="text-center text-white/30 text-xs font-bold uppercase tracking-wider">지금 바로 시작하기</p>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/profile/subscription"
              className="flex flex-col items-center gap-1.5 py-4 bg-[#1A1821] border border-white/10 rounded-2xl hover:border-primary/40 transition-colors"
            >
              <span className="material-symbols-outlined text-[#FFD700] text-[24px]">toll</span>
              <span className="text-white font-bold text-sm">CHOCO 충전</span>
              <span className="text-white/30 text-[10px]">잔액 바로 추가</span>
            </Link>
            <Link
              to="/pricing"
              className="flex flex-col items-center gap-1.5 py-4 bg-primary/10 border border-primary/30 rounded-2xl hover:bg-primary/20 transition-colors"
            >
              <span className="material-symbols-outlined text-primary text-[24px]">workspace_premium</span>
              <span className="text-white font-bold text-sm">멤버십 구독</span>
              <span className="text-white/30 text-[10px]">매월 CHOCO 자동 지급</span>
            </Link>
          </div>
          <Link
            to="/shop"
            className="flex items-center justify-center gap-2 py-3.5 bg-[#1A1821] border border-white/5 rounded-2xl hover:border-white/20 transition-colors"
          >
            <span className="material-symbols-outlined text-white/40 text-[20px]">storefront</span>
            <span className="text-white/60 font-bold text-sm">아이템 상점 바로가기</span>
          </Link>
        </section>

      </main>
    </div>
  );
}
