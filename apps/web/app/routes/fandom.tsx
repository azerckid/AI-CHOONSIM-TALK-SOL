import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocalizedCharacter } from "~/lib/useLocalizedCharacter";
import { BottomNavigation } from "~/components/layout/BottomNavigation";
import { db } from "~/lib/db.server";
import { auth } from "~/lib/auth.server";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useNavigate, useFetcher } from "react-router";
import type { FandomLoaderData, SCharacter } from "~/lib/types/routes";
import { cn } from "~/lib/utils";
import { DateTime } from "luxon";
import { toast } from "sonner";
import * as schema from "~/db/schema";
import { eq, desc, and, like, sql, inArray, asc } from "drizzle-orm";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    throw new Response(null, { status: 302, headers: { Location: "/login" } });
  }

  const url = new URL(request.url);
  const characterId = url.searchParams.get("characterId") || "choonsim";

  // 0. All Characters for Selector
  const allCharacters = await db.query.character.findMany({
    with: {
      media: {
        orderBy: [asc(schema.characterMedia.sortOrder)]
      }
    }
  });

  const selectedCharacter = allCharacters.find(c => c.id === characterId) || allCharacters[0];

  // 1. Character Stats (Hearts)
  const characterStat = await db.query.characterStat.findFirst({
    where: eq(schema.characterStat.characterId, selectedCharacter.id)
  });

  // 2. 공지사항 (Official Updates)
  const notices = await db.query.notice.findMany({
    where: eq(schema.notice.isActive, true),
    orderBy: [desc(schema.notice.createdAt)],
    limit: 5
  });

  // 3. 미션 (Daily Missions)
  const allMissions = await db.query.mission.findMany({
    where: eq(schema.mission.isActive, true),
    limit: 3
  });

  const userMissions = await db.query.userMission.findMany({
    where: eq(schema.userMission.userId, session.user.id)
  });

  const missions = allMissions.map(m => {
    const um = userMissions.find(u => u.missionId === m.id);
    return {
      ...m,
      progress: um?.progress || 0,
      completed: um?.status === "COMPLETED" || um?.status === "CLAIMED"
    };
  });

  // 4. 팬 피드 (Fan Feed)
  const feedPosts = await db.query.fanPost.findMany({
    where: eq(schema.fanPost.isApproved, true),
    with: {
      user: {
        columns: { name: true, image: true, avatarUrl: true }
      }
    },
    orderBy: [desc(schema.fanPost.createdAt)],
    limit: 20
  });

  // 5. 리더보드 (누적 하트 기준)
  const topGivers = await db
    .select({
      userId: schema.giftLog.fromUserId,
      totalHearts: sql<number>`sum(${schema.giftLog.amount})`,
    })
    .from(schema.giftLog)
    .where(eq(schema.giftLog.itemId, "heart"))
    .groupBy(schema.giftLog.fromUserId)
    .orderBy(desc(sql`sum(${schema.giftLog.amount})`))
    .limit(5);

  const userIds = topGivers.map((t) => t.userId);

  let users: { id: string; name: string | null; image: string | null; avatarUrl: string | null }[] = [];

  if (userIds.length > 0) {
    users = await db.query.user.findMany({
      where: inArray(schema.user.id, userIds),
      columns: { id: true, name: true, avatarUrl: true, image: true },
    });
  }

  const leaderboard = topGivers.map((giver, i) => {
    const user = users.find((u) => u.id === giver.userId);
    return {
      rank: i + 1,
      name: user?.name || "Anonymous",
      points: giver.totalHearts, // 실제 하트 수
      avatar: user?.avatarUrl || user?.image || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + giver.userId,
    };
  });

  return Response.json({
    user: session.user,
    allCharacters,
    selectedCharacter,
    characterStat,
    missions,
    notices,
    leaderboard,
    feedPosts,
    characterId
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "createPost") {
    const content = formData.get("content") as string;
    if (!content || content.length < 5) {
      return Response.json({ error: "Content too short" }, { status: 400 });
    }

    const [post] = await db.insert(schema.fanPost).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      content,
      isApproved: true, // 초기엔 자동 승인
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // 미션 체크: "게시글 작성하기" 미션이 있다면 진행도 업데이트
    const shareMission = await db.query.mission.findFirst({
      where: and(
        like(schema.mission.title, "%post%"),
        eq(schema.mission.isActive, true)
      )
    });

    if (shareMission) {
      await db.insert(schema.userMission).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        missionId: shareMission.id,
        progress: 100,
        status: "COMPLETED",
        lastUpdated: new Date(),
      }).onConflictDoUpdate({
        target: [schema.userMission.userId, schema.userMission.missionId],
        set: {
          progress: 100,
          status: "COMPLETED",
          lastUpdated: new Date()
        }
      });
    }

    return Response.json({ success: true, post });
  }

  return Response.json({ error: "Invalid intent" }, { status: 400 });
}

function FandomCharacterButton({ char, characterId }: { char: SCharacter; characterId: string }) {
  const navigate = useNavigate();
  const { name } = useLocalizedCharacter(char.id, char.name, char.role);

  const isActive = char.id === characterId;
  const isInService = char.isOnline;

  return (
    <div
      key={char.id}
      onClick={() => navigate(`/fandom?characterId=${char.id}`)}
      className="flex flex-col items-center gap-2 group cursor-pointer"
    >
      <div className={cn(
        "p-[3px] rounded-full transition-all",
        isActive && isInService ? "bg-linear-to-tr from-primary to-purple-400" : "bg-transparent"
      )}>
        <div className={cn(
          "size-16 rounded-full border-4 overflow-hidden",
          isActive && isInService
            ? "border-background-light dark:border-background-dark bg-surface-dark"
            : "border-transparent bg-surface-dark/50",
          !isInService ? "opacity-70" : isActive ? "" : "opacity-70 group-hover:opacity-100"
        )}>
          <img
            className={cn(
              "w-full h-full object-cover",
              !isInService && "grayscale"
            )}
            src={(char.media?.find((m) => m.type === "AVATAR")?.url) || char.media?.[0]?.url}
            alt={name}
          />
        </div>
      </div>
      <span className={cn(
        "text-xs",
        isActive && isInService ? "font-bold text-primary" : !isInService ? "text-gray-500 dark:text-white/40" : "font-medium"
      )}>
        {name}
      </span>
    </div>
  );
}

export default function FandomScreen() {
  const { allCharacters, selectedCharacter, characterStat, missions, notices, leaderboard, feedPosts, characterId } = useLoaderData<typeof loader>() as FandomLoaderData;
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const { t } = useTranslation();
  const { name: selectedName, role: selectedRole } = useLocalizedCharacter(selectedCharacter.id, selectedCharacter.name, selectedCharacter.role);
  const [feedFilter, setFeedFilter] = useState("All");
  const [isPosting, setIsPosting] = useState(false);
  const [postContent, setPostContent] = useState("");

  const characters = allCharacters.filter((c): c is SCharacter => c != null);

  useEffect(() => {
    if (fetcher.data?.success) {
      toast.success("Post shared with the fandom!");
      setIsPosting(false);
      setPostContent("");
    } else if (fetcher.data?.error) {
      toast.error(fetcher.data.error);
    }
  }, [fetcher.data]);

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    fetcher.submit(
      { intent: "createPost", content: postContent },
      { method: "POST" }
    );
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display antialiased min-h-screen relative pb-24">
      {/* Top App Bar */}
      <div className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-black/5 dark:border-white/5">
        <div className="flex items-center p-4 justify-between max-w-md mx-auto w-full">
          <button
            onClick={() => navigate("/")}
            className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-slate-800 dark:text-white"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center">{t("fandom.title")}</h2>
          <button className="flex size-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            <div className="relative">
              <span className="material-symbols-outlined text-slate-800 dark:text-white">notifications</span>
              <span className="absolute top-0 right-0 size-2.5 bg-primary rounded-full border-2 border-background-light dark:border-background-dark" />
            </div>
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto w-full flex flex-col gap-6 pt-4">
        {/* Character Selector */}
        <div className="w-full overflow-x-auto scrollbar-hide px-4">
          <div className="flex gap-4 min-w-max">
            {characters.map((char) => (
              <FandomCharacterButton key={char.id} char={char} characterId={characterId} />
            ))}
          </div>
        </div>

        {/* Bias Spotlight Card */}
        <div className="px-4">
          <div className="relative overflow-hidden rounded-2xl bg-surface-dark dark:bg-surface-dark shadow-lg dark:shadow-none group">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay"
              style={{
                backgroundImage: `url('${(selectedCharacter.media?.find((m) => m.type === "COVER")?.url) || selectedCharacter.media?.[0]?.url}')`
              }}
            />
            <div className="absolute inset-0 bg-linear-to-t from-background-dark via-transparent to-transparent opacity-90" />
            <div className="relative p-6 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold mb-2 border border-primary/30">
                    <span className="material-symbols-outlined text-[14px]">star</span>
                    Selected Star
                  </span>
                  <h2 className="text-2xl font-bold text-white leading-tight">{selectedName}'s Official Space</h2>
                  <p className="text-white/60 text-sm">{selectedCharacter.isOnline ? `${selectedRole} • AI Generation 3` : t("home.comingSoon")}</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="size-12 rounded-full border-2 border-primary p-1 bg-surface-dark overflow-hidden">
                    {/* Show Heart Count Here */}
                    <div className="flex flex-col items-center justify-center h-full w-full bg-primary/20">
                      <span className="material-symbols-outlined text-primary text-sm">favorite</span>
                      <span className="text-[10px] font-bold text-white">{characterStat?.totalHearts || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium text-white/80">
                  <span>Heart Gauge</span>
                  <span className="text-primary">{characterStat?.totalHearts || 0} / 1000</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(238,43,140,0.5)] transition-all duration-1000"
                    style={{ width: `${Math.min(((characterStat?.totalHearts || 0) / 1000) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-white/50 text-right">Send hearts to level up!</p>
              </div>
              <button
                onClick={() => navigate(`/character/${selectedCharacter.id}`)}
                className="mt-2 w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-primary/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">forum</span>
                {t("characterProfile.enterLounge")}
              </button>
            </div>
          </div>
        </div>

        {/* Official Updates */}
        <div className="pl-4">
          <div className="flex items-center justify-between pr-4 mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">new_releases</span>
              <h3 className="text-xl font-bold dark:text-white text-slate-900">Official Updates</h3>
            </div>
            <button onClick={() => navigate("/notices")} className="text-sm font-medium text-primary uppercase tracking-widest">See All</button>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-4 pr-4 scrollbar-hide">
            {notices.length === 0 ? (
              <div className="min-w-[260px] h-32 rounded-xl bg-white dark:bg-surface-dark border border-slate-100 dark:border-white/5 flex items-center justify-center">
                <p className="text-white/20 text-xs font-bold uppercase">No updates yet</p>
              </div>
            ) : notices.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/notices/${item.id}`)}
                className="min-w-[260px] rounded-xl overflow-hidden bg-white dark:bg-surface-dark border border-slate-100 dark:border-white/5 shadow-sm group cursor-pointer"
              >
                <div className="aspect-video w-full bg-slate-200 relative">
                  {item.imageUrl ? (
                    <img
                      className="w-full h-full object-cover"
                      src={item.imageUrl}
                      alt={item.title}
                    />
                  ) : (
                    <div className="w-full h-full bg-linear-to-br from-primary/30 to-purple-600/30" />
                  )}
                  <div className={cn(
                    "absolute top-2 left-2 px-2 py-0.5 rounded backdrop-blur-sm text-[10px] font-bold text-white uppercase tracking-wider",
                    item.type === "EVENT" ? "bg-emerald-500" : "bg-primary"
                  )}>
                    {item.type}
                  </div>
                </div>
                <div className="p-3">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-white/40 mt-1">
                    {DateTime.fromJSDate(new Date(item.createdAt)).toRelative()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Missions */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-bold dark:text-white text-slate-900">Missions</h3>
            <button onClick={() => navigate("/missions")} className="text-sm font-medium text-primary hover:text-primary/80">View All</button>
          </div>
          <div className="flex flex-col gap-3">
            {missions.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-surface-dark rounded-xl border border-white/5">
                <p className="text-white/20 text-xs font-bold uppercase tracking-widest">No missions available</p>
              </div>
            ) : (
              missions.map((mission) => (
                <div
                  key={mission.id}
                  className={cn(
                    "p-4 rounded-xl bg-white dark:bg-surface-dark border border-slate-100 dark:border-white/5 shadow-sm flex items-center gap-4",
                    mission.completed && "opacity-60"
                  )}
                >
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">target</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <p className="text-sm font-bold dark:text-white truncate">{mission.title}</p>
                      <span className="text-xs font-bold text-primary">+{mission.rewardCredits} CHOCO</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full shadow-[0_0_5px_rgba(238,43,140,0.5)]"
                        style={{ width: `${mission.progress}%` }}
                      />
                    </div>
                  </div>
                  {mission.completed ? (
                    <button className="shrink-0 size-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                      <span className="material-symbols-outlined text-sm font-black">check</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate("/missions")}
                      className="shrink-0 px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-xs font-bold text-slate-500 dark:text-white/50"
                    >
                      GO
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="px-4">
          <h3 className="text-xl font-bold dark:text-white text-slate-900 mb-4">Top Collectors</h3>
          <div className="bg-surface-dark/50 dark:bg-surface-dark rounded-2xl p-4 border border-slate-100 dark:border-white/5">
            {leaderboard.length < 3 ? (
              <div className="py-8 text-center text-white/20 text-xs font-bold tracking-widest">COMPETITION HEATING UP...</div>
            ) : (
              <>
                {/* Podium */}
                <div className="flex items-end justify-center gap-4 mb-6 pt-4">
                  {/* 2nd Place */}
                  <div className="flex flex-col items-center gap-1 w-1/3">
                    <div className="relative">
                      <div className="size-12 rounded-full border-2 border-slate-400 overflow-hidden bg-slate-800">
                        <img
                          className="w-full h-full object-cover"
                          src={leaderboard[1].avatar}
                          alt={leaderboard[1].name}
                        />
                      </div>
                      <div className="absolute -bottom-2 inset-x-0 flex justify-center">
                        <span className="bg-slate-400 text-[10px] font-bold px-1.5 rounded text-white">2</span>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-white mt-1 truncate w-full text-center">{leaderboard[1].name}</p>
                    <p className="text-[10px] text-white/50">{leaderboard[1].points} pts</p>
                  </div>
                  {/* 1st Place */}
                  <div className="flex flex-col items-center gap-1 w-1/3 -mt-6">
                    <span className="material-symbols-outlined text-yellow-500 text-lg animate-bounce">crown</span>
                    <div className="relative">
                      <div className="size-16 rounded-full border-4 border-yellow-500 overflow-hidden shadow-[0_0_15px_rgba(234,179,8,0.4)] bg-slate-800">
                        <img
                          className="w-full h-full object-cover"
                          src={leaderboard[0].avatar}
                          alt={leaderboard[0].name}
                        />
                      </div>
                      <div className="absolute -bottom-2 inset-x-0 flex justify-center">
                        <span className="bg-yellow-500 text-xs font-bold px-2 py-0.5 rounded text-black">1</span>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-primary mt-1 truncate w-full text-center">{leaderboard[0].name}</p>
                    <p className="text-xs text-white/50">{leaderboard[0].points} pts</p>
                  </div>
                  {/* 3rd Place */}
                  <div className="flex flex-col items-center gap-1 w-1/3">
                    <div className="relative">
                      <div className="size-12 rounded-full border-2 border-orange-700 overflow-hidden bg-slate-800">
                        <img
                          className="w-full h-full object-cover"
                          src={leaderboard[2].avatar}
                          alt={leaderboard[2].name}
                        />
                      </div>
                      <div className="absolute -bottom-2 inset-x-0 flex justify-center">
                        <span className="bg-orange-700 text-[10px] font-bold px-1.5 rounded text-white">3</span>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-white mt-1 truncate w-full text-center">{leaderboard[2].name}</p>
                    <p className="text-[10px] text-white/50">{leaderboard[2].points} pts</p>
                  </div>
                </div>
                {/* List Items (4 and 5) */}
                <div className="flex flex-col gap-2">
                  {leaderboard.slice(3).map((user) => (
                    <div key={user.rank} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                      <span className="text-sm font-bold text-white/40 w-4 text-center">{user.rank}</span>
                      <div className="size-8 rounded-full bg-slate-700 overflow-hidden">
                        <img
                          className="w-full h-full object-cover"
                          src={user.avatar}
                          alt={user.name}
                        />
                      </div>
                      <p className="text-sm font-medium text-white flex-1">{user.name}</p>
                      <p className="text-xs text-primary font-bold">{user.points}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Community Feed */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold dark:text-white text-slate-900">Fan Feed</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setFeedFilter("All")}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold",
                  feedFilter === "All"
                    ? "bg-primary text-white"
                    : "bg-slate-200 dark:bg-white/10 dark:text-white/60 text-slate-600"
                )}
              >
                All
              </button>
            </div>
          </div>

          {feedPosts.length === 0 ? (
            <div className="py-20 text-center bg-white dark:bg-surface-dark border border-white/5 rounded-2xl">
              <span className="material-symbols-outlined text-6xl text-white/5">feed</span>
              <p className="text-white/10 text-xs font-black uppercase mt-4">Be the first to post!</p>
            </div>
          ) : feedPosts.map((post) => (
            <div
              key={post.id}
              className="bg-white dark:bg-surface-dark rounded-xl border border-slate-100 dark:border-white/5 p-4 mb-4 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="size-10 rounded-full bg-slate-200 overflow-hidden border border-white/5">
                  <img
                    className="w-full h-full object-cover"
                    src={post.user?.avatarUrl || post.user?.image || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + post.userId}
                    alt={post.user?.name ?? ""}
                  />
                </div>
                <div>
                  <p className="text-sm font-bold dark:text-white text-slate-900">{post.user?.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-white/40 font-bold uppercase tracking-tight">
                    {DateTime.fromJSDate(new Date(post.createdAt)).toRelative()}
                  </p>
                </div>
                <button className="ml-auto text-slate-400">
                  <span className="material-symbols-outlined">more_horiz</span>
                </button>
              </div>
              <p className="text-sm text-slate-700 dark:text-white/90 mb-3 leading-relaxed whitespace-pre-wrap">{post.content}</p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                <button className="flex items-center gap-1.5 text-slate-500 dark:text-white/60 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[20px]">favorite</span>
                  <span className="text-xs font-medium">{post.likes || 0}</span>
                </button>
                <button className="flex items-center gap-1.5 text-slate-500 dark:text-white/60 hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
                  <span className="text-xs font-medium">0</span>
                </button>
                <button className="flex items-center gap-1.5 text-slate-500 dark:text-white/60 hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[20px]">share</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Post Modal */}
      {isPosting && (
        <div className="fixed inset-0 z-100 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-background-dark w-full max-w-md rounded-t-[40px] sm:rounded-[40px] border border-white/10 p-8 pt-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-white">Share with Fandom</h3>
              <button onClick={() => setIsPosting(false)} className="size-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-6">
              <textarea
                autoFocus
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="What's happening in the fandom today?"
                className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-white text-base min-h-[160px] focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all resize-none"
              />

              <div className="flex items-center justify-between">
                <button type="button" className="p-3 rounded-full bg-white/5 text-white/60 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined">image</span>
                </button>
                <button
                  type="submit"
                  disabled={fetcher.state !== "idle" || postContent.length < 5}
                  className="px-8 py-3 rounded-2xl bg-primary text-white font-black text-sm shadow-[0_8px_20px_rgba(238,43,140,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                >
                  {fetcher.state !== "idle" ? "POSTING..." : "POST NOW"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsPosting(true)}
        className="fixed bottom-24 right-4 z-40 size-14 rounded-full bg-primary text-white shadow-[0_4px_20px_rgba(238,43,140,0.5)] flex items-center justify-center hover:scale-110 transition-transform active:scale-90"
      >
        <span className="material-symbols-outlined text-3xl">edit</span>
      </button>

      <BottomNavigation />
    </div>
  );
}
