import { useState, useEffect } from "react";
import { BottomNavigation } from "~/components/layout/BottomNavigation";
import { WalletAddressForm } from "~/components/solana/WalletAddressForm";
import { WalletButton } from "~/components/solana/WalletButton";

/** 프로필 내 지갑 버튼 — SSR에서는 null 반환 (useWallet은 Provider 컨텍스트 필요) */
function WalletButtonInline() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return <WalletButton />;
}
import { db } from "~/lib/db.server";
import { auth } from "~/lib/auth.server";
import { solanaConnection } from "~/lib/solana/connection.server";
import { PublicKey } from "@solana/web3.js";
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
  let mainCharacterName = "Choonsim"; // default
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
        const charId = conv.characterId || "choonsim";
        characterCounts.set(charId, (characterCounts.get(charId) || 0) + 1);
      });

      let maxCount = 0;
      let mostUsedCharId = "choonsim";
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

  // SOL 잔액 조회
  let solBalance: number | null = null;
  if (user?.solanaWallet) {
    try {
      const lamports = await solanaConnection.getBalance(new PublicKey(user.solanaWallet));
      solBalance = lamports / 1e9; // lamports → SOL
    } catch {
      // 잔액 조회 실패해도 페이지는 정상 렌더링
    }
  }

  return Response.json({ user, stats, todayUsage, mainCharacterName, albumTickets: albumInventory?.quantity ?? 0, paypalClientId, tossClientKey, solBalance });
}

export default function ProfileScreen() {
  const { user, stats, todayUsage, mainCharacterName, albumTickets, paypalClientId, tossClientKey, solBalance } = useLoaderData<typeof loader>() as {
    user: any;
    stats: any;
    todayUsage: { totalTokens: number; promptTokens: number; completionTokens: number; messageCount: number };
    mainCharacterName: string;
    albumTickets?: number;
    paypalClientId?: string;
    tossClientKey?: string;
    solBalance: number | null;
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
            toast.success("Logged out");
            navigate("/home");
          },
        },
      });
    } catch (err) {
      toast.error("Failed to log out");
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
        <h1 className="text-base font-bold tracking-tight text-white/90">My Page</h1>
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
              {user?.name || "User"}
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
              "Let's have a great day with {mainCharacterName}! 🌙✨"
            </p>
          </div>
        </section>

        {/* Stats Dashboard */}
        <section className="px-4 mb-8 space-y-4">
          <div className="glass-card rounded-[24px] p-5 shadow-xl">
            <div className="grid grid-cols-3 divide-x divide-white/10">
              <div className="flex flex-col items-center gap-1.5 px-2">
                <span className="text-2xl font-black text-white tracking-tighter">{stats.daysTogether}d</span>
                <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Together</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 px-2">
                <span className="text-2xl font-black text-primary tracking-tighter text-glow-choco">Lv.{stats.affinityLevel}</span>
                <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Affinity</span>
              </div>
              <button
                onClick={() => setIsItemStoreOpen(true)}
                className="flex flex-col items-center gap-1.5 px-2 hover:bg-white/5 rounded-xl transition-all cursor-pointer py-1 -my-1"
              >
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-black text-white tracking-tighter">
                    {stats.hearts >= 1000 ? `${(stats.hearts / 1000).toFixed(1)}k` : stats.hearts}
                  </span>
                  <span className="material-symbols-outlined text-[14px] text-primary translate-y-[2px]">favorite</span>
                </div>
                <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Hearts</span>
              </button>
            </div>
          </div>

          {/* 오늘의 토큰 사용량 */}
          <div className="glass-card rounded-[24px] p-5 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
              <span className="material-symbols-outlined text-4xl">analytics</span>
            </div>
            
            <div className="flex items-center justify-between mb-5">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-sm font-black text-white/90 tracking-tight">System Usage</h3>
                <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.1em]">Daily Analytics</p>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5">
                <span className="text-[10px] font-bold text-white/60">
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <span className="material-symbols-outlined text-[16px] text-blue-400">speed</span>
                  </div>
                  <span className="text-lg font-black text-white tracking-tighter">
                    {formatTokenCount(todayUsage.totalTokens)}
                  </span>
                </div>
                <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-1">Total Tokens</span>
              </div>
              <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-lg bg-green-500/10 flex items-center justify-center border border-green-500/20">
                    <span className="material-symbols-outlined text-[16px] text-green-400">chat_bubble</span>
                  </div>
                  <span className="text-lg font-black text-white tracking-tighter">
                    {todayUsage.messageCount}
                  </span>
                </div>
                <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-1">Messages</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">Input</span>
                <span className="text-[11px] font-bold text-white/80">{formatTokenCount(todayUsage.promptTokens)}</span>
              </div>
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">Output</span>
                <span className="text-[11px] font-bold text-white/80">{formatTokenCount(todayUsage.completionTokens)}</span>
              </div>
            </div>
            
            {/* 상단 미세 선형 그라데이션 */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-linear-to-r from-transparent via-white/10 to-transparent" />
          </div>
        </section>

        {/* Solana Premium Wallet Card */}
        <section className="px-4 mb-8">
          <div 
            className="group relative perspective-1000"
            onMouseMove={(e) => {
              const card = e.currentTarget;
              const rect = card.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              const centerX = rect.width / 2;
              const centerY = rect.height / 2;
              const rotateX = (y - centerY) / 10;
              const rotateY = (centerX - x) / 10;
              
              card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
              
              const shine = card.querySelector(".card-shine") as HTMLElement;
              if (shine) {
                shine.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.2) 0%, transparent 60%)`;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = `rotateX(0deg) rotateY(0deg)`;
              const shine = e.currentTarget.querySelector(".card-shine") as HTMLElement;
              if (shine) shine.style.background = "transparent";
            }}
            style={{ transition: "transform 0.1s ease-out" }}
          >
            {/* 보이지 않는 광원 효과 (Backglow) */}
            <div className="absolute -inset-1 bg-linear-to-r from-primary/30 to-purple-600/30 rounded-[32px] blur-2xl opacity-50 group-hover:opacity-80 transition duration-1000" />
            
            <div className="glass-card relative rounded-[32px] p-6 overflow-hidden border border-white/10 transition-all duration-300 transform-style-3d">
              {/* Dynamic Shine Layer */}
              <div className="card-shine absolute inset-0 pointer-events-none z-10" />
              
              {/* Card Header */}
              <div className="flex justify-between items-start mb-10">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-full bg-linear-to-tr from-[#9945FF] to-[#14F195] p-1.5 shadow-lg shadow-purple-500/20">
                      <svg viewBox="0 0 384 512" className="text-white fill-current">
                        <path d="M384 397.1c0 5.7-2.3 11.2-6.3 15.2L311.2 480c-4 4-9.5 6.3-15.2 6.3H12.5c-9.5 0-14.7-11.1-8.5-18.3l66.5-76.7c4-4.6 9.8-7.3 15.9-7.3h285.1c9.4 0 12.5 11.7 2.5 17.1zM12.5 25.7h283.5c5.7 0 11.2 2.3 15.2 6.3l66.5 76.7c4 4 6.3 9.5 6.3 15.2s-2.3 11.2-6.3 15.2L311.2 216c-4 4-9.5 6.3-15.2 6.3H12.5c-9.5 0-14.7-11.1-8.5-18.3l66.5-76.7c4-4.6 9.8-7.3 15.9-7.3H12.5c-9.5 0-12.5-11.7-2.5-17.1L76.5 33c4-4.6 9.8-7.3 15.9-7.3z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">Solana Network</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <WalletButtonInline />
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">Live</span>
                  </div>
                </div>
              </div>

              {/* Wallet Address Display */}
              <div className="mb-8">
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.1em] mb-1.5 ml-1">Wallet Address</p>
                <div className="flex items-center gap-2 group/addr">
                  <div className="px-4 py-2.5 bg-black/20 rounded-xl border border-white/5 flex-1 overflow-hidden">
                    <code className="text-white/90 font-mono text-sm tracking-tight truncate block">
                      {user?.solanaWallet || "지갑을 먼저 등록해주세요"}
                    </code>
                  </div>
                  {user?.solanaWallet && (
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(user.solanaWallet);
                        toast.success("Address copied");
                      }}
                      className="size-11 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-primary hover:bg-white/10 transition-all active:scale-90"
                    >
                      <span className="material-symbols-outlined text-[20px]">content_copy</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Balance Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-[20px] p-4 border border-white/5">
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">SOL Balance</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-white tracking-tighter">
                      {solBalance !== null ? solBalance.toFixed(3) : "—"}
                    </span>
                    <span className="text-[10px] font-bold text-white/40">SOL</span>
                  </div>
                </div>
                <div className="bg-primary/5 rounded-[20px] p-4 border border-primary/10">
                  <p className="text-[9px] font-bold text-primary/40 uppercase tracking-[0.2em] mb-1">CHOCO Balance</p>
                  <div className="flex items-baseline gap-1 overflow-hidden">
                    <span className="text-xl font-black text-primary tracking-tighter text-glow-choco truncate">
                      {parseInt(user?.chocoBalance ?? "0").toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-primary/60">🍫</span>
                  </div>
                </div>
              </div>
              
              {/* Bottom Decoration & Quick Action */}
              <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
                <button 
                  onClick={() => navigate("/profile/memories")}
                  className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors group"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#9945FF] group-hover:rotate-12 transition-transform">auto_awesome</span>
                  <span className="text-[10px] font-bold underline decoration-white/10 underline-offset-4 tracking-tight">On-chain Memory Album</span>
                </button>
                
                <button 
                  onClick={() => navigate("/missions")}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all active:scale-95 group"
                >
                  <span className="material-symbols-outlined text-[18px] animate-pulse">event_available</span>
                  <span className="text-[11px] font-extrabold uppercase tracking-tight">Daily Check-in</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Account Management Section */}
        <div className="px-4 space-y-6">
          {/* Group 1: Account & Payment */}
          <div>
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3 ml-2">Account</h3>
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
                  <p className="text-base font-semibold text-white truncate">Edit Profile</p>
                  <p className="text-xs text-white/50 truncate">Change nickname & status message</p>
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
                  <p className="text-base font-semibold text-white truncate">Upgrade Membership</p>
                  <p className="text-xs text-white/50 truncate">Unlock higher tier perks</p>
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
                  <p className="text-base font-semibold text-white truncate">Top Up & Payments</p>
                  <p className="text-xs text-white/50 truncate">CHOCO balance & history</p>
                </div>
                <span className="material-symbols-outlined text-white/30">chevron_right</span>
              </button>
            </div>
          </div>

          {/* Group 2: Activity */}
          <div>
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3 ml-2">Activity</h3>
            <div className="bg-surface-dark border border-white/5 rounded-2xl overflow-hidden">
              {/* 내 대화 앨범 (Phase 4-1) */}
              <button
                disabled={isAlbumGenerating || (albumTickets ?? 0) <= 0}
                onClick={async () => {
                  if ((albumTickets ?? 0) <= 0) {
                    toast.error("No Chat Album tickets. Purchase one from the store.");
                    return;
                  }
                  setIsAlbumGenerating(true);
                  try {
                    const res = await fetch("/api/album/generate", { method: "POST" });
                    if (!res.ok) {
                      const data = await res.json().catch(() => ({}));
                      toast.error((data as { error?: string })?.error ?? "Failed to generate album.");
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
                    toast.success("Chat Album downloaded.");
                  } catch (e) {
                    toast.error("Error generating album.");
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
                  <p className="text-base font-semibold text-white truncate">My Chat Album</p>
                  <p className="text-xs text-white/50 truncate">
                    PDF of last 30 days {(albumTickets ?? 0) > 0 ? `(${albumTickets} ticket${albumTickets === 1 ? "" : "s"})` : ""}
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
                  <p className="text-base font-semibold text-white truncate">Saved Moments</p>
                  <p className="text-xs text-white/50 truncate">Liked chats & photos</p>
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
                  <p className="text-base font-semibold text-white truncate">Chat History</p>
                  <p className="text-xs text-white/50 truncate">Review past conversations</p>
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
                  <p className="text-base font-semibold text-white truncate">Notification Settings</p>
                  <p className="text-xs text-white/50 truncate">Character message alerts</p>
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
