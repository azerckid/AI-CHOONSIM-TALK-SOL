import { useState } from "react";
import { BottomNavigation } from "~/components/layout/BottomNavigation";
import { WalletButton } from "~/components/solana/WalletButton";

/** 프로필 내 지갑 버튼 — useWallet이 없으면 조용히 null 반환 */
function WalletButtonInline() {
  try {
    return <WalletButton />;
  } catch {
    return null;
  }
}
import { db } from "~/lib/db.server";
import { auth } from "~/lib/auth.server";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate, useRevalidator } from "react-router";
import { signOut } from "~/lib/auth-client";
import { toast } from "sonner";
import { DateTime } from "luxon";
import { TokenTopUpModal } from "~/components/payment/TokenTopUpModal";
import { ItemStoreModal } from "~/components/payment/ItemStoreModal";
import * as schema from "~/db/schema";
import { eq, asc, desc, inArray, and, gte, lt } from "drizzle-orm";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    throw new Response(null, { status: 302, headers: { Location: "/login" } });
  }

  const user = await db.query.user.findFirst({
    where: eq(schema.user.id, session.user.id),
  });

  // 함께한 날 계산: 사용자의 첫 번째 대화 시작일부터 오늘까지의 일수
  let daysTogether = 0;
  let mainCharacterName = "춘심"; // 기본값
  try {
    const firstConversation = await db.query.conversation.findFirst({
      where: eq(schema.conversation.userId, session.user.id),
      orderBy: [asc(schema.conversation.createdAt)],
      columns: { createdAt: true, characterId: true },
    });

    if (firstConversation) {
      const now = DateTime.now().setZone("Asia/Seoul");
      const firstDay = DateTime.fromJSDate(firstConversation.createdAt).setZone("Asia/Seoul").startOf("day");
      const today = now.startOf("day");
      daysTogether = Math.max(0, Math.floor(today.diff(firstDay, "days").days)) + 1; // +1은 시작일 포함

      // 가장 많이 대화한 캐릭터 찾기
      const conversations = await db.query.conversation.findMany({
        where: eq(schema.conversation.userId, session.user.id),
        columns: { characterId: true },
      });

      const characterCounts = new Map<string, number>();
      conversations.forEach(conv => {
        const charId = conv.characterId || "chunsim";
        characterCounts.set(charId, (characterCounts.get(charId) || 0) + 1);
      });

      let maxCount = 0;
      let mostUsedCharId = "chunsim";
      characterCounts.forEach((count, charId) => {
        if (count > maxCount) {
          maxCount = count;
          mostUsedCharId = charId;
        }
      });

      const character = await db.query.character.findFirst({
        where: eq(schema.character.id, mostUsedCharId)
      });
      if (character) {
        mainCharacterName = character.name;
      }
    }
  } catch (error) {
    console.error("Error calculating days together:", error);
  }

  // 하트 보유량 조회
  const heartInventory = await db.query.userInventory.findFirst({
    where: and(
      eq(schema.userInventory.userId, session.user.id),
      eq(schema.userInventory.itemId, "heart")
    ),
  });

  // 대화 앨범 티켓 보유량 (Phase 4-1)
  const albumInventory = await db.query.userInventory.findFirst({
    where: and(
      eq(schema.userInventory.userId, session.user.id),
      eq(schema.userInventory.itemId, "memory_album")
    ),
  });

  // 통계 데이터
  const stats = {
    daysTogether,
    affinityLevel: 0, // 정책 정해지기 전까지 모두 0레벨
    hearts: heartInventory?.quantity || 0,
  };

  // 오늘의 토큰 사용량 계산
  let todayUsage = {
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    messageCount: 0,
  };

  try {
    // 사용자의 모든 메시지 ID 조회
    const userConversations = await db.query.conversation.findMany({
      where: eq(schema.conversation.userId, session.user.id),
      columns: { id: true },
    });

    if (userConversations.length > 0) {
      const conversationIds = userConversations.map((c) => c.id);

      const userMessages = await db.query.message.findMany({
        where: and(
          inArray(schema.message.conversationId, conversationIds),
          eq(schema.message.role, "assistant")
        ),
        columns: { id: true },
      });

      const messageIds = userMessages.map((m) => m.id);

      if (messageIds.length > 0) {
        // 오늘 날짜 계산 (한국 시간 기준)
        // 프로필 페이지 방문 시점까지의 오늘 사용량을 조회
        const now = DateTime.now().setZone("Asia/Seoul");
        const todayStart = now.startOf("day").toJSDate();
        const tomorrowStart = now.plus({ days: 1 }).startOf("day").toJSDate();

        // 오늘 생성된 AgentExecution 조회 (프로필 페이지 방문 시점까지)
        const todayExecutions = await db.query.agentExecution.findMany({
          where: and(
            inArray(schema.agentExecution.messageId, messageIds),
            gte(schema.agentExecution.createdAt, todayStart),
            lt(schema.agentExecution.createdAt, tomorrowStart)
          ),
          columns: {
            promptTokens: true,
            completionTokens: true,
            totalTokens: true,
          },
        });

        todayUsage = todayExecutions.reduce<{
          promptTokens: number;
          completionTokens: number;
          totalTokens: number;
          messageCount: number;
        }>(
          (acc, exec) => ({
            promptTokens: acc.promptTokens + exec.promptTokens,
            completionTokens: acc.completionTokens + exec.completionTokens,
            totalTokens: acc.totalTokens + exec.totalTokens,
            messageCount: acc.messageCount + 1,
          }),
          {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            messageCount: 0,
          }
        );
      }
    }
  } catch (error) {
    console.error("Error fetching today's token usage:", error);
    // 에러가 발생해도 기본값(0)을 사용하여 계속 진행
  }

  const paypalClientId = process.env.PAYPAL_CLIENT_ID;
  const tossClientKey = process.env.TOSS_CLIENT_KEY;

  return Response.json({ user, stats, todayUsage, mainCharacterName, albumTickets: albumInventory?.quantity ?? 0, paypalClientId, tossClientKey });
}

export default function ProfileScreen() {
  const { user, stats, todayUsage, mainCharacterName, albumTickets, paypalClientId, tossClientKey } = useLoaderData<typeof loader>() as {
    user: any;
    stats: any;
    todayUsage: { totalTokens: number; promptTokens: number; completionTokens: number; messageCount: number };
    mainCharacterName: string;
    albumTickets?: number;
    paypalClientId?: string;
    tossClientKey?: string;
  };
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [isItemStoreOpen, setIsItemStoreOpen] = useState(false);
  const [isAlbumGenerating, setIsAlbumGenerating] = useState(false);

  // 토큰 수를 읽기 쉬운 형식으로 포맷팅 (예: 1.2K, 5.3M)
  const formatTokenCount = (count: number): string => {
    if (count >= 1_000_000) {
      return `${(count / 1_000_000).toFixed(1)}M`;
    }
    if (count >= 1_000) {
      return `${(count / 1_000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const handleLogout = async () => {
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            toast.success("로그아웃되었습니다");
            navigate("/home");
          },
        },
      });
    } catch (err) {
      toast.error("로그아웃 중 오류가 발생했습니다");
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto shadow-2xl overflow-hidden bg-background-light dark:bg-background-dark">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-[400px] bg-linear-to-b from-primary/20 via-primary/5 to-transparent pointer-events-none z-0" />

      {/* Top App Bar */}
      <header className="sticky top-0 z-50 bg-background-dark/70 backdrop-blur-md border-b border-white/5 px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center text-white/80 hover:text-primary transition-colors size-10 rounded-full hover:bg-white/5"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back_ios_new</span>
        </button>
        <h1 className="text-base font-bold tracking-tight text-white/90">마이페이지</h1>
        <button
          onClick={() => navigate("/settings")}
          className="flex items-center justify-center text-white/80 hover:text-primary transition-colors size-10 rounded-full hover:bg-white/5"
        >
          <span className="material-symbols-outlined text-[24px]">settings</span>
        </button>
      </header>

      <main className="flex-1 flex flex-col z-10 pb-24">
        {/* Profile Header */}
        <section className="flex flex-col items-center pt-8 pb-6 px-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-linear-to-tr from-primary to-purple-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-500" />
            <div className="relative w-28 h-28 rounded-full p-[3px] bg-background-dark">
              <div
                className="w-full h-full rounded-full bg-cover bg-center overflow-hidden border-2 border-surface-highlight"
                style={{
                  backgroundImage: `url(${user?.avatarUrl || user?.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCutVt4neD3mw-fGim_WdODfouQz3b0aaqpPfx1sNTt8N75jfKec3kNioEoZugl2D0eqVP5833PF21_hTqlDz38aVNUICprwHAM45vTdJeUPcA0mj_wzSgkMVSzYiv-RCJhNyAAZ0RlWSJQxzSa8Mi-yYPu-czB9WEbQsDFEjcAQwezmcZqtAbSB5bwyRhTTfr1y2rrxDHIFNN2G2fVmkHcCWo7uvVNjtAehxS8fgGKMbJgQ59q1ClGgD--3EuZR6f_esg0NbdGCao'})`,
                }}
              />
              {/* Edit Badge */}
              <button onClick={() => navigate("/profile/edit")} className="absolute bottom-0 right-0 p-2 bg-surface-highlight border-4 border-background-dark rounded-full text-white hover:bg-primary transition-colors shadow-lg">
                <span className="material-symbols-outlined text-[16px] block">edit</span>
              </button>
            </div>
          </div>
          <div className="mt-4 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white mb-1">
              {user?.name || "사용자"}
            </h2>
            {/* Badges */}
            <div className="flex flex-wrap gap-2 justify-center items-center mt-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider">
                <span className="material-symbols-outlined text-[14px]">favorite</span>
                {mainCharacterName}'s Fan
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  diamond
                </span>
                Lv. {stats.affinityLevel} Soulmate
              </span>
            </div>
            <p className="text-white/60 text-sm mt-3 px-4 line-clamp-2">
              "오늘도 {mainCharacterName}와 함께 힘내자! 🌙✨"
            </p>
          </div>
        </section>

        {/* Stats Dashboard */}
        <section className="px-4 mb-6 space-y-4">
          <div className="bg-surface-dark/50 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
            <div className="grid grid-cols-3 divide-x divide-white/10">
              <div className="flex flex-col items-center gap-1 px-2">
                <span className="text-2xl font-bold text-white tracking-tight">{stats.daysTogether}일</span>
                <span className="text-xs text-white/50 font-medium">함께한 날</span>
              </div>
              <div className="flex flex-col items-center gap-1 px-2">
                <span className="text-2xl font-bold text-primary tracking-tight">Lv.{stats.affinityLevel}</span>
                <span className="text-xs text-white/50 font-medium">친밀도</span>
              </div>
              <button
                onClick={() => setIsItemStoreOpen(true)}
                className="flex flex-col items-center gap-1 px-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer py-1 -my-1"
              >
                <span className="text-2xl font-bold text-white tracking-tight">
                  {stats.hearts >= 1000 ? `${(stats.hearts / 1000).toFixed(1)}k` : stats.hearts}
                </span>
                <span className="text-xs text-white/50 font-medium flex items-center gap-1">
                  보유 하트
                  <span className="material-symbols-outlined text-[10px] text-primary">add_circle</span>
                </span>
              </button>
            </div>
          </div>

          {/* 오늘의 토큰 사용량 */}
          <div className="bg-surface-dark/50 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white/90">오늘 사용량</h3>
              <span className="text-xs text-white/50">
                {new Date().toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-blue-400">speed</span>
                  <span className="text-lg font-bold text-white tracking-tight">
                    {formatTokenCount(todayUsage.totalTokens)}
                  </span>
                </div>
                <span className="text-xs text-white/50 font-medium ml-7">총 토큰</span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-green-400">chat_bubble</span>
                  <span className="text-lg font-bold text-white tracking-tight">
                    {todayUsage.messageCount}
                  </span>
                </div>
                <span className="text-xs text-white/50 font-medium ml-7">메시지 수</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-white/60">입력 토큰</span>
                <span className="text-white/90 font-medium">{formatTokenCount(todayUsage.promptTokens)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">출력 토큰</span>
                <span className="text-white/90 font-medium">{formatTokenCount(todayUsage.completionTokens)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Solana Section */}
        <section className="px-4 mb-6">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3 ml-2">Solana</h3>
          <div className="bg-surface-dark/50 border border-white/5 rounded-2xl p-4 backdrop-blur-sm space-y-3">
            {/* Wallet Connect */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#9945FF]">account_balance_wallet</span>
                <span className="text-sm font-semibold text-white/90">지갑 연결</span>
              </div>
              <WalletButtonInline />
            </div>
            <div className="h-px bg-white/5" />
            {/* Blinks 바로가기 */}
            <button
              onClick={() => navigate("/blinks")}
              className="w-full flex items-center justify-between hover:bg-white/5 rounded-xl p-2 -mx-2 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#9945FF]">bolt</span>
                <span className="text-sm font-medium text-white/80">Blinks 체험하기</span>
              </div>
              <span className="material-symbols-outlined text-[16px] text-white/30">chevron_right</span>
            </button>
            {/* CHOCO Token 정보 */}
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/50">보유 CHOCO</span>
              </div>
              <span className="text-sm font-bold text-primary">
                {parseInt(user?.chocoBalance ?? "0").toLocaleString()} 🍫
              </span>
            </div>
          </div>
        </section>

        {/* Account Management Section */}
        <div className="px-4 space-y-6">
          {/* Group 1: Account & Payment */}
          <div>
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3 ml-2">계정 관리</h3>
            <div className="bg-surface-dark border border-white/5 rounded-2xl overflow-hidden">
              {/* List Item */}
              <button
                onClick={() => navigate("/profile/edit")}
                className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors group text-left"
              >
                <div className="flex items-center justify-center shrink-0 size-10 rounded-xl bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined">badge</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-white truncate">프로필 수정</p>
                  <p className="text-xs text-white/50 truncate">닉네임, 상태메시지 변경</p>
                </div>
                <span className="material-symbols-outlined text-white/30">chevron_right</span>
              </button>
              <div className="h-px bg-white/5 mx-4" />
              {/* List Item */}
              <button
                onClick={() => navigate("/pricing")}
                className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors group text-left"
              >
                <div className="flex items-center justify-center shrink-0 size-10 rounded-xl bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined">diamond</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-white truncate">멤버십 업그레이드</p>
                  <p className="text-xs text-white/50 truncate">더 높은 등급의 혜택 받기</p>
                </div>
                <span className="material-symbols-outlined text-white/30">chevron_right</span>
              </button>
              <div className="h-px bg-white/5 mx-4" />
              {/* List Item */}
              <button
                onClick={() => navigate("/profile/subscription")}
                className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors group text-left"
              >
                <div className="flex items-center justify-center shrink-0 size-10 rounded-xl bg-primary/20 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined">credit_card</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-white truncate">충전 및 결제 관리</p>
                  <p className="text-xs text-white/50 truncate">CHOCO 충전 및 사용 내역</p>
                </div>
                <span className="material-symbols-outlined text-white/30">chevron_right</span>
              </button>
            </div>
          </div>

          {/* Group 2: Activity */}
          <div>
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3 ml-2">나의 활동</h3>
            <div className="bg-surface-dark border border-white/5 rounded-2xl overflow-hidden">
              {/* 내 대화 앨범 (Phase 4-1) */}
              <button
                disabled={isAlbumGenerating || (albumTickets ?? 0) <= 0}
                onClick={async () => {
                  if ((albumTickets ?? 0) <= 0) {
                    toast.error("대화 앨범 티켓이 없습니다. 상점에서 구매해 주세요.");
                    return;
                  }
                  setIsAlbumGenerating(true);
                  try {
                    const res = await fetch("/api/album/generate", { method: "POST" });
                    if (!res.ok) {
                      const data = await res.json().catch(() => ({}));
                      toast.error((data as { error?: string })?.error ?? "앨범 생성에 실패했습니다.");
                      return;
                    }
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `album-${new Date().toISOString().slice(0, 10)}.pdf`;
                    a.click();
                    URL.revokeObjectURL(url);
                    revalidator.revalidate();
                    toast.success("대화 앨범이 다운로드되었습니다.");
                  } catch (e) {
                    toast.error("앨범 생성 중 오류가 발생했습니다.");
                  } finally {
                    setIsAlbumGenerating(false);
                  }
                }}
                className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors group text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-center shrink-0 size-10 rounded-xl bg-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined">photo_album</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-white truncate">내 대화 앨범</p>
                  <p className="text-xs text-white/50 truncate">
                    최근 30일 대화 PDF 생성 {(albumTickets ?? 0) > 0 ? `(보유 ${albumTickets}장)` : ""}
                  </p>
                </div>
                {isAlbumGenerating ? (
                  <span className="material-symbols-outlined text-white/50 animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-white/30">download</span>
                )}
              </button>
              <div className="h-px bg-white/5 mx-4" />
              {/* List Item */}
              <button
                onClick={() => navigate("/profile/saved")}
                className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors group text-left"
              >
                <div className="flex items-center justify-center shrink-0 size-10 rounded-xl bg-pink-500/20 text-pink-400 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined">favorite</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-white truncate">저장된 순간들</p>
                  <p className="text-xs text-white/50 truncate">좋아요한 대화 및 사진</p>
                </div>
                <span className="material-symbols-outlined text-white/30">chevron_right</span>
              </button>
              <div className="h-px bg-white/5 mx-4" />
              {/* List Item */}
              <button
                onClick={() => navigate("/chats")}
                className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors group text-left"
              >
                <div className="flex items-center justify-center shrink-0 size-10 rounded-xl bg-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined">history</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-white truncate">대화 기록</p>
                  <p className="text-xs text-white/50 truncate">지난 대화 다시보기</p>
                </div>
                <span className="material-symbols-outlined text-white/30">chevron_right</span>
              </button>
              <div className="h-px bg-white/5 mx-4" />
              {/* List Item */}
              <button
                onClick={() => navigate("/settings")}
                className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors group text-left"
              >
                <div className="flex items-center justify-center shrink-0 size-10 rounded-xl bg-teal-500/20 text-teal-400 group-hover:bg-teal-500 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined">notifications</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-white truncate">알림 설정</p>
                  <p className="text-xs text-white/50 truncate">캐릭터 메시지 알림</p>
                </div>
                <span className="material-symbols-outlined text-white/30">chevron_right</span>
              </button>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full py-4 text-center text-sm font-medium text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            로그아웃
          </button>
        </div>
      </main>

      <BottomNavigation />
      <TokenTopUpModal
        open={isTopUpModalOpen}
        onOpenChange={setIsTopUpModalOpen}
        paypalClientId={paypalClientId}
      />
      <ItemStoreModal
        open={isItemStoreOpen}
        onOpenChange={setIsItemStoreOpen}
        itemId="heart"
        paypalClientId={paypalClientId}
        tossClientKey={tossClientKey}
      />
    </div>
  );
}
