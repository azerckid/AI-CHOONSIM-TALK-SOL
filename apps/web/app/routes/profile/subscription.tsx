import { type LoaderFunctionArgs, useLoaderData, useNavigate, useFetcher, Link } from "react-router";
import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { DateTime } from "luxon";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { TokenTopUpModal } from "~/components/payment/TokenTopUpModal";
import { WalletCard } from "~/components/wallet/WalletCard";
import * as schema from "~/db/schema";
import { eq, desc } from "drizzle-orm";

const TIERS = [
  {
    id: "FREE",
    name: "방문자",
    icon: "person",
    iconBg: "bg-white/10",
    iconColor: "text-white/50",
    price: null as string | null,
    choco: 1_500,
    benefits: ["일 5회 메시지", "기본 텍스트 대화", "월 1,500 CHOCO"],
  },
  {
    id: "BASIC",
    name: "팬",
    icon: "star",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    price: "$4.99/월" as string | null,
    choco: 2_000,
    benefits: ["일 15회 메시지", "선톡 1회/주", "월 2,000 CHOCO"],
  },
  {
    id: "PREMIUM",
    name: "조상신",
    icon: "local_fire_department",
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-400",
    price: "$14.99/월" as string | null,
    choco: 10_000,
    benefits: ["일 30회 메시지", "보이스 3회/월", "월 10,000 CHOCO"],
  },
  {
    id: "ULTIMATE",
    name: "고래",
    icon: "crown",
    iconBg: "bg-yellow-500/10",
    iconColor: "text-yellow-400",
    price: "$29.99/월" as string | null,
    choco: 30_000,
    benefits: ["무제한 메시지", "모든 혜택 포함", "월 30,000 CHOCO"],
  },
] as const;

const TIER_ORDER = ["FREE", "BASIC", "PREMIUM", "ULTIMATE"] as const;

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    throw new Response(null, { status: 302, headers: { Location: "/login" } });
  }

  const userId = session.user.id;

  // 사용자 정보 및 결제 내역 조회
  const [user, payments] = await Promise.all([
    db.query.user.findFirst({
      where: eq(schema.user.id, userId),
      columns: {
        chocoBalance: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        subscriptionId: true,
      },
    }),
    db.query.payment.findMany({
      where: eq(schema.payment.userId, userId),
      orderBy: [desc(schema.payment.createdAt)],
      limit: 20, // 최근 20개 내역
    }),
  ]);

  // 2. Fetch Transaction History (Exchange Logs)
  const history = await db.query.exchangeLog.findMany({
    where: eq(schema.exchangeLog.userId, userId),
    orderBy: [desc(schema.exchangeLog.createdAt)],
    limit: 20,
  });

  const paypalClientId = process.env.PAYPAL_CLIENT_ID;
  const tossClientKey = process.env.TOSS_CLIENT_KEY;

  return Response.json({ user, payments, paypalClientId, tossClientKey, history });
}

type LoaderData = {
  user: {
    chocoBalance: string | null;
    subscriptionTier: string | null;
    subscriptionStatus: string | null;
    currentPeriodEnd: Date | string | null;
    subscriptionId: string | null;
  } | null;
  payments: typeof schema.payment.$inferSelect[];
  paypalClientId?: string;
  tossClientKey?: string;
  history: any[];
};

export default function SubscriptionManagementPage() {
  const { user, payments, paypalClientId, tossClientKey, history } = useLoaderData<typeof loader>() as unknown as LoaderData;
  const navigate = useNavigate();
  const fetcher = useFetcher<{ success: boolean; error?: string }>();

  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  const isActive = user?.subscriptionStatus === "ACTIVE";
  const isCancelled = user?.subscriptionStatus === "CANCELLED";
  const tier = user?.subscriptionTier || "FREE";

  // 날짜 포맷팅
  const formatDate = (dateValue: string | Date | null) => {
    if (!dateValue) return "-";
    let dt;
    if (dateValue instanceof Date) {
      dt = DateTime.fromJSDate(dateValue);
    } else {
      dt = DateTime.fromISO(dateValue.toString());
    }
    return dt.isValid ? dt.setLocale('ko').toFormat('yyyy. MM. dd') : "-";
  };

  const handleCancelSubscription = () => {
    fetcher.submit({}, { method: "POST", action: "/api/payment/cancel-subscription" });
  };

  if (fetcher.data?.success && isActive) {
    toast.success("구독이 취소되었습니다.");
  } else if (fetcher.data?.error) {
    toast.error(fetcher.data.error);
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-foreground flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background-dark/80 backdrop-blur-md border-b border-white/5 px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center text-white/80 hover:text-primary transition-colors size-10 rounded-full hover:bg-white/5"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back_ios_new</span>
        </button>
        <h1 className="text-base font-bold tracking-tight text-white/90">충전 및 결제 관리</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 p-4 space-y-6 pb-24 overflow-y-auto">
        {/* Wallet Card Section */}
        <WalletCard
          chocoBalance={user?.chocoBalance || "0"}
          history={history}
          historyDialogOpen={historyDialogOpen}
          onHistoryDialogChange={setHistoryDialogOpen}
        />

        {/* 1. Subscription Card */}
        <section>
          <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3 ml-2">현재 멤버십</h2>
          <div className={cn(
            "relative rounded-2xl p-6 border overflow-hidden",
            isActive ? "bg-surface-dark border-primary/30" : "bg-surface-dark border-white/5"
          )}>
            {/* Background Gradient */}
            {isActive && (
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-10 translate-x-10 pointer-events-none" />
            )}

            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-white tracking-tight uppercase">
                      {tier} PLAN
                    </h3>
                    {isActive && (
                      <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold border border-green-500/30">
                        ACTIVE
                      </span>
                    )}
                    {isCancelled && (
                      <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold border border-orange-500/30">
                        CANCELLED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      onClick={() => setIsTopUpModalOpen(true)}
                      className="inline-flex items-center justify-center gap-1 px-4 py-1.5 rounded-full bg-primary hover:bg-primary/90 text-white text-[13px] font-extrabold tracking-tight transition-colors cursor-pointer z-20 relative shadow-lg shadow-primary/25"
                    >
                      <span className="material-symbols-outlined text-[14px]">bolt</span>
                      <span>CHOCO 충전하기</span>
                    </div>
                  </div>
                </div>
                <div className="size-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                  <span className="material-symbols-outlined text-white/70">
                    {tier === "ULTIMATE" ? "crown" : (tier === "PREMIUM" ? "diamond" : "bolt")}
                  </span>
                </div>
              </div>

              <div className="h-px bg-white/10" />

              <div className="flex justify-between items-center text-sm">
                <span className="text-white/60">다음 결제일 (만료일)</span>
                <span className="text-white font-medium">{formatDate(user?.currentPeriodEnd ?? null)}</span>
              </div>

              <div className="flex gap-2 mt-2">
                {/* Upgrade/Change Plan Button */}
                <button
                  onClick={() => navigate("/pricing")}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors border border-white/10 cursor-pointer relative z-20"
                >
                  {tier === "FREE" ? "멤버십 시작하기" : "멤버십 변경"}
                </button>

                {/* Cancel Subscription Button (Only if Active) */}
                {isActive && (
                  <AlertDialog>
                    <AlertDialogTrigger>
                      <button className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-medium transition-colors border border-red-500/20 cursor-pointer relative z-20">
                        구독 해지
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-surface-dark border-white/10 text-white rounded-2xl max-w-xs">
                      <AlertDialogHeader>
                        <AlertDialogTitle>정말 구독을 해지하시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription className="text-white/60">
                          구독을 해지하더라도 현재 기간이 끝날 때까지({formatDate(user?.currentPeriodEnd)})는 혜택이 유지됩니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-white/10 hover:bg-white/5 text-white">닫기</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleCancelSubscription}
                          className="bg-red-600 hover:bg-red-700 text-white border-0"
                        >
                          해지 확정
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 2. Relationship Tier Section */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest">관계 등급</h2>
            <Link
              to="/guide#tiers"
              className="text-[11px] text-white/30 hover:text-white/50 transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[12px]">help</span>
              등급 안내
            </Link>
          </div>

          {/* Tier Cards — Horizontal Scroll */}
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {TIERS.map((t) => {
              const isCurrent = tier === t.id;
              const isUnlocked = TIER_ORDER.indexOf(tier as any) >= TIER_ORDER.indexOf(t.id as any);
              return (
                <div
                  key={t.id}
                  className={cn(
                    "shrink-0 w-40 rounded-2xl p-4 flex flex-col gap-3 border transition-all",
                    isCurrent
                      ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20"
                      : isUnlocked
                      ? "bg-surface-dark border-white/10"
                      : "bg-surface-dark border-white/5 opacity-50"
                  )}
                >
                  {/* Icon + Current Badge */}
                  <div className="flex items-start justify-between">
                    <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", t.iconBg)}>
                      <span className={cn("material-symbols-outlined text-[20px]", t.iconColor)}>{t.icon}</span>
                    </div>
                    {isCurrent && (
                      <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[9px] font-bold border border-primary/30 leading-tight">
                        현재
                      </span>
                    )}
                  </div>

                  {/* Name + Price */}
                  <div>
                    <p className={cn("font-bold text-sm", isCurrent ? "text-white" : "text-white/70")}>{t.name}</p>
                    <p className="text-white/40 text-[10px]">{t.price ?? "무료"}</p>
                  </div>

                  {/* Benefits */}
                  <ul className="space-y-1.5 flex-1">
                    {t.benefits.map((b) => (
                      <li key={b} className="flex items-start gap-1.5">
                        <span className={cn(
                          "material-symbols-outlined text-[11px] mt-0.5 shrink-0",
                          isCurrent ? "text-primary" : "text-white/30"
                        )}>
                          check_circle
                        </span>
                        <span className={cn(
                          "text-[10px] leading-tight",
                          isCurrent ? "text-white/80" : "text-white/40"
                        )}>
                          {b}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Monthly CHOCO */}
                  <div className={cn(
                    "flex items-center gap-1 rounded-lg px-2 py-1.5",
                    isCurrent ? "bg-primary/10" : "bg-white/5"
                  )}>
                    <span className="material-symbols-outlined text-[12px] text-[#FFD700]">toll</span>
                    <span className="text-[10px] font-bold text-[#FFD700]">
                      {t.choco.toLocaleString()}/월
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Next Tier Upgrade Banner */}
          {tier !== "ULTIMATE" && (() => {
            const nextIdx = TIER_ORDER.indexOf(tier as any) + 1;
            const next = TIERS[nextIdx];
            if (!next) return null;
            return (
              <div className="mt-3 bg-surface-dark border border-white/8 rounded-2xl p-4">
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-2">
                  다음 등급으로 업그레이드하면?
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", next.iconBg)}>
                    <span className={cn("material-symbols-outlined text-[16px]", next.iconColor)}>{next.icon}</span>
                  </div>
                  <div>
                    <span className="text-white font-bold text-sm">{next.name}</span>
                    {next.price && (
                      <span className="text-white/40 text-xs ml-2">{next.price}</span>
                    )}
                  </div>
                </div>
                <ul className="space-y-2 mb-4">
                  {next.benefits.map((b) => (
                    <li key={b} className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[13px] text-primary">arrow_forward</span>
                      <span className="text-white/60 text-xs">{b}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate("/pricing")}
                  className="w-full py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 active:scale-95 transition-all"
                >
                  {next.name} 등급으로 업그레이드
                </button>
              </div>
            );
          })()}
        </section>

        {/* 3. Payment History */}
        <section>
          <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3 ml-2">결제 내역</h2>
          <div className="bg-surface-dark border border-white/5 rounded-2xl overflow-hidden">
            {payments.length === 0 ? (
              <div className="p-8 text-center text-white/30 text-sm">
                <span className="material-symbols-outlined text-4xl mb-2 block opacity-50">receipt_long</span>
                결제 내역이 없습니다.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {payments.map((payment) => (
                  <div key={payment.id} className="p-4 flex justify-between items-center hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "size-10 rounded-full flex items-center justify-center shrink-0",
                        payment.status === "COMPLETED" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                      )}>
                        <span className="material-symbols-outlined text-[20px]">
                          {payment.type.includes("SUBSCRIPTION") ? "autorenew" : "payments"}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">
                          {(payment.description || "CHOCO Top-up").replace(/Credits/g, "CHOCO")}
                        </p>
                        <p className="text-xs text-white/50">{formatDate(payment.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">
                        {payment.amount > 0 ? `$${payment.amount}` : "Free"}
                      </p>
                      <p className={cn(
                        "text-[10px] font-bold uppercase",
                        payment.status === "COMPLETED" ? "text-green-500" : "text-red-500"
                      )}>
                        {payment.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <TokenTopUpModal
        open={isTopUpModalOpen}
        onOpenChange={setIsTopUpModalOpen}
        paypalClientId={paypalClientId}
        tossClientKey={tossClientKey}
      />
    </div>
  );
}
