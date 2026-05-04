import { useState, useEffect } from "react";
import { useNavigate, useLoaderData, redirect } from "react-router";
import type { HomeLoaderData, SCharacter } from "~/lib/types/routes";
import { useTranslation } from "react-i18next";
import { useLocalizedCharacter } from "~/lib/useLocalizedCharacter";
import { toast } from "sonner";
import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import type { LoaderFunctionArgs } from "react-router";
import type { Route } from "./+types/home";
import { BottomNavigation } from "~/components/layout/BottomNavigation";
import { DateTime } from "luxon";
import { cn, stripMessageMarkers } from "~/lib/utils";
import * as schema from "~/db/schema";
import { eq, desc, asc, count, and } from "drizzle-orm";
import { Confetti } from "~/components/effects/confetti";

function CharacterNameDisplay({ name, className }: { name?: string | null; className?: string }) {
  if (!name) return null;
  const parts = name.split(' ');
  if (parts.length > 1) {
    const ko = parts[0];
    const en = parts.slice(1).join(' ');
    // 영문 부분만 절반 크기로 표시
    return (
      <span className={className}>
        {ko} <span className="text-[0.5em] opacity-80 font-bold ml-1 align-middle">{en}</span>
      </span>
    );
  }
  return <span className={className}>{name}</span>;
}

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "AI Chat - Home" },
    { name: "description", content: "Special everyday conversations with your AI idol" },
  ];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });

  const [recentConversations, unreadResult, allCharacters, notices] = await Promise.all([
    session
      ? db.query.conversation.findMany({
          where: eq(schema.conversation.userId, session.user.id),
          with: {
            character: {
              with: {
                media: {
                  orderBy: [asc(schema.characterMedia.sortOrder)],
                },
              },
            },
            messages: {
              orderBy: [desc(schema.message.createdAt)],
              limit: 1,
            },
          },
          orderBy: [desc(schema.conversation.updatedAt)],
          limit: 5,
        })
      : Promise.resolve([]),
    session
      ? db
          .select({ count: count() })
          .from(schema.notification)
          .where(
            and(
              eq(schema.notification.userId, session.user.id),
              eq(schema.notification.isRead, false)
            )
          )
      : Promise.resolve([{ count: 0 }]),
    db.query.character.findMany({
      with: {
        media: {
          orderBy: [asc(schema.characterMedia.sortOrder)],
        },
      },
    }),
    db.query.notice.findMany({
      where: eq(schema.notice.isActive, true),
      orderBy: [desc(schema.notice.isPinned), desc(schema.notice.createdAt)],
      limit: 3,
    }),
  ]);

  const unreadNotificationCount = unreadResult[0]?.count ?? 0;

  // 서비스 중인 캐릭터만 (isOnline=true)
  const serviceCharacters = allCharacters.filter((c: { isOnline: boolean }) => c.isOnline);

  // Today's Pick: 서비스 중인 첫 번째 캐릭터
  const todaysPick = serviceCharacters[0] || allCharacters[0];

  // Trending Idols: 순서 유지
  const trendingIdols = allCharacters.slice(0, 6);

  return Response.json({
    user: session?.user || null,
    todaysPick,
    recentConversations,
    trendingIdols,
    notices,
    isAuthenticated: !!session,
    unreadNotificationCount,
  });
}

function ContinueChatCard({ conversation, formatTimeAgo }: { conversation: HomeLoaderData['recentConversations'][number]; formatTimeAgo: (d: Date | string) => string }) {
  const navigate = useNavigate();
  const character = conversation.character;
  const { name } = useLocalizedCharacter(character?.id ?? "", character?.name ?? "AI", character?.role ?? "");
  const lastMessage = conversation.messages?.[0];

  return (
    <button
      onClick={() => navigate(`/chat/${conversation.id}`)}
      className="w-full flex items-center gap-4 rounded-xl bg-surface-dark p-4 border border-white/5 active:bg-white/5 transition-colors text-left"
    >
      <div className="relative">
        <img
          alt={`Avatar of ${name}`}
          className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/50"
          src={
            character.media
              ?.filter((m) => m.type === "AVATAR")
              ?.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0]?.url
            || character.media?.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0]?.url
          }
        />
        {character.isOnline && (
          <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 ring-2 ring-surface-dark"></span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1">
          <h3 className="text-white font-bold truncate">
            <CharacterNameDisplay name={name} />
          </h3>
          {lastMessage && (
            <span className="text-xs text-gray-500">
              {formatTimeAgo(lastMessage.createdAt)}
            </span>
          )}
        </div>
        {lastMessage && (
          <p className="text-gray-400 text-sm truncate">
            {stripMessageMarkers(lastMessage.content)}
          </p>
        )}
      </div>
      <span className="material-symbols-outlined text-gray-500 text-sm">chevron_right</span>
    </button>
  );
}

function TrendingIdolCard({ character, index }: { character: SCharacter; index: number }) {
  const navigate = useNavigate();
  const { name, role } = useLocalizedCharacter(character.id, character.name, character.role);
  const { t } = useTranslation();

  return (
    <button
      onClick={() => navigate(`/character/${character.id}`)}
      className="snap-center shrink-0 w-[140px] flex flex-col gap-2 group cursor-pointer"
    >
      <div className="relative h-[180px] w-full rounded-xl overflow-hidden">
        <img
          alt={name}
          className={cn(
            "h-full w-full object-cover transition-all duration-500 group-hover:scale-110",
            !character.isOnline && "grayscale opacity-70"
          )}
          src={
            character.media
              ?.filter((m) => m.type === "COVER")
              ?.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0]?.url
            || character.media?.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0]?.url
          }
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent opacity-60"></div>
        <div className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#FFD700] text-black text-xs font-bold">
          {index + 1}
        </div>
        <div className="absolute bottom-2 left-2 right-2">
          <div className="flex items-center gap-1 text-xs text-white/80 mb-0.5">
            <span className="material-symbols-outlined text-[12px] text-primary">favorite</span>
            {/* TODO: 실제 팔로워 수를 loader에서 조회하여 표시 */}
            {/* 결정론적인 가짜 팔로워 수 (ID 기반) */}
            <span>{5000 + (parseInt(character.id.slice(0, 4), 16) % 5000 || index * 100)}</span>
          </div>
        </div>
      </div>
      <div>
        <h3 className={cn("font-bold text-base leading-tight truncate", character.isOnline ? "text-white" : "text-gray-500")}>
          <CharacterNameDisplay name={name} />
        </h3>
        <p className="text-gray-500 text-xs">
          {character.isOnline ? role : t("home.comingSoon")}
        </p>
      </div>
    </button>
  );
}

export default function HomeScreen() {
  const { user, todaysPick, recentConversations, trendingIdols, notices, isAuthenticated, walletStatus, unreadNotificationCount } = useLoaderData<typeof loader>() as HomeLoaderData;
  const navigate = useNavigate();
  const { t } = useTranslation();
  const todaysPickLocalized = todaysPick ? useLocalizedCharacter(todaysPick.id, todaysPick.name, todaysPick.role) : null;
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // 소셜 로그인 완료 후 홈으로 리다이렉트 되었을 때 폭죽 트리거
    const shouldShowConfetti = localStorage.getItem("show_login_confetti");
    if (shouldShowConfetti === "true") {
      setShowConfetti(true);
      localStorage.removeItem("show_login_confetti");
    }
  }, []);

  const handleStartChat = async (characterId: string) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    try {
      const response = await fetch("/api/chat/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || t("home.cannotStartChat"));
        return;
      }
      navigate(`/chat/${data.conversationId}`);
    } catch (error) {
      console.error("Chat creation error:", error);
      toast.error(t("chat.chatStartError"));
    }
  };

  const formatTimeAgo = (date: Date | string) => {
    const now = DateTime.now();
    const messageTime = DateTime.fromJSDate(new Date(date));
    const diff = now.diff(messageTime, ["minutes", "hours", "days"]);

    if (diff.minutes < 1) return "just now";
    if (diff.minutes < 60) return `${Math.floor(diff.minutes)}m ago`;
    if (diff.hours < 24) return `${Math.floor(diff.hours)}h ago`;
    if (diff.days < 7) return `${Math.floor(diff.days)}d ago`;
    return messageTime.toFormat("MM/dd");
  };

  const getCharacterFromConversation = (conversation: HomeLoaderData['recentConversations'][number]) => {
    return conversation.character;
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display antialiased min-h-screen pb-24 max-w-md mx-auto shadow-2xl overflow-hidden">
      {/* Confetti Overlay */}
      {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}
      
      {/* Top App Bar */}
      <div className="sticky top-0 z-50 flex items-center bg-background-dark/80 backdrop-blur-md p-4 justify-between border-b border-white/5">
        <div className="flex flex-col">
          <h2 className="text-white text-xl font-extrabold leading-tight tracking-[-0.015em]">AI Chat</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/chats")}
            className="text-white hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">search</span>
          </button>
          <button
            onClick={() => navigate("/notifications")}
            className="relative text-white hover:text-primary transition-colors mr-1"
          >
            <span className="material-symbols-outlined text-[24px]">notifications</span>
            {unreadNotificationCount > 0 && (
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-primary ring-2 ring-background-dark"></span>
            )}
          </button>
          <button
            onClick={() => navigate(isAuthenticated ? "/profile" : "/login")}
            className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors border border-white/10"
          >
            {isAuthenticated ? "Profile" : "Login"}
          </button>
        </div>
      </div>

      {/* Hero Section - Today's Pick */}
      <div className="p-4 pt-2">
        <div className="relative w-full overflow-hidden rounded-2xl bg-surface-dark shadow-lg">
          {(() => {
            const heroUrl = todaysPick?.media
              ?.filter((m) => m.type === "COVER")
              ?.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0]?.url
              || todaysPick?.media?.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0]?.url;
            return heroUrl ? (
              <img
                src={heroUrl}
                alt=""
                fetchPriority="high"
                loading="eager"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null;
          })()}
          <div className="absolute inset-0 bg-linear-to-t from-background-dark via-background-dark/40 to-transparent"></div>
          <div className="relative flex min-h-[420px] flex-col justify-end p-6">
            <span className="mb-2 inline-flex w-fit items-center rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary backdrop-blur-sm border border-primary/30">
              ✨ Today's Pick
            </span>
            <h1 className="text-4xl font-black leading-tight tracking-tight text-white mb-1">
              <CharacterNameDisplay name={todaysPickLocalized?.name ?? todaysPick?.name} />
            </h1>
            <p className="text-base text-gray-200 font-medium mb-6 line-clamp-2">
              "{todaysPick?.bio}"
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleStartChat(todaysPick?.id ?? "")}
                className="flex-1 cursor-pointer items-center justify-center rounded-xl h-12 bg-primary text-white text-base font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all"
              >
                {t("home.chatNow")}
              </button>
              <button className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-md hover:bg-white/20 transition-all">
                <span className="material-symbols-outlined">favorite</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Buttons */}
      <div className="px-4 py-2">
        <div className="grid grid-cols-4 gap-4">
          <button
            onClick={() => navigate("/chats")}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-dark border border-white/10 group-active:scale-95 transition-all text-primary">
              <span className="material-symbols-outlined text-[28px]">chat_bubble</span>
            </div>
            <span className="text-xs font-medium text-gray-300">New Chat</span>
          </button>
          <button
            onClick={() => navigate("/missions")}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-dark border border-white/10 group-active:scale-95 transition-all text-[#FFD700]">
              <span className="material-symbols-outlined text-[28px]">redeem</span>
            </div>
            <span className="text-xs font-medium text-gray-300">Missions</span>
          </button>
          <button
            onClick={() => navigate("/shop")}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-dark border border-white/10 group-active:scale-95 transition-all text-[#2196F3]">
              <span className="material-symbols-outlined text-[28px]">storefront</span>
            </div>
            <span className="text-xs font-medium text-gray-300">Shop</span>
          </button>
        </div>
      </div>

      {/* Continue Chatting */}
      {recentConversations.length > 0 && (
        <div className="px-4 py-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white text-lg font-bold">{t("home.continueChatting")}</h2>
            <button
              onClick={() => navigate("/chats")}
              className="text-primary text-sm font-semibold"
            >
              {t("common.viewAll")}
            </button>
          </div>
          {recentConversations.slice(0, 1).map((conversation) => (
            <ContinueChatCard key={conversation.id} conversation={conversation} formatTimeAgo={formatTimeAgo} />
          ))}
        </div>
      )}

      {/* Trending Idols */}
      <div className="pb-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-white text-lg font-bold">Trending Idols</h2>
          <span className="material-symbols-outlined text-gray-400">trending_up</span>
        </div>
        <div className="flex overflow-x-auto px-4 gap-4 pb-4 scrollbar-hide snap-x">
          {trendingIdols.filter((c): c is SCharacter => c != null).map((character, index) => (
            <TrendingIdolCard key={character.id} character={character} index={index} />
          ))}
        </div>
      </div>

      {/* News & Events */}
      <div className="px-4 pb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white text-lg font-bold">News & Events</h2>
          <button
            onClick={() => navigate("/notices")}
            className="text-primary text-xs font-bold uppercase tracking-widest"
          >
            See All
          </button>
        </div>
        <div className="space-y-4">
          {notices.length === 0 ? (
            <div className="py-8 text-center bg-white/5 rounded-2xl border border-white/5">
              <p className="text-white/20 text-xs font-bold uppercase tracking-[0.2em]">No official updates yet</p>
            </div>
          ) : (
            notices.map((notice) => (
              <div
                key={notice.id}
                onClick={() => navigate(`/notices/${notice.id}`)}
                className="relative overflow-hidden rounded-xl bg-surface-dark border border-white/5 active:bg-white/10 transition-colors cursor-pointer group"
              >
                <div className="flex flex-col sm:flex-row">
                  <div className="h-28 w-full sm:w-28 shrink-0 bg-cover bg-center bg-linear-to-br from-primary/30 to-purple-600/30">
                    {notice.imageUrl && <img src={notice.imageUrl} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 p-4 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white",
                        notice.type === "EVENT" ? "bg-emerald-500" : notice.type === "NEWS" ? "bg-blue-600" : "bg-primary"
                      )}>
                        {notice.type}
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium">
                        {DateTime.fromJSDate(new Date(notice.createdAt)).toFormat("LLL dd")}
                      </span>
                    </div>
                    <h3 className="text-white font-bold text-sm mb-1 group-hover:text-primary transition-colors truncate">{notice.title}</h3>
                    <p className="text-gray-400 text-[11px] line-clamp-1 leading-relaxed">{notice.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
