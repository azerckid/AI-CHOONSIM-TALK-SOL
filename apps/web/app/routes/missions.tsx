import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { auth } from "~/lib/auth.server";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useNavigate, useFetcher } from "react-router";
import type { MissionsLoaderData } from "~/lib/types/routes";
import { BottomNavigation } from "~/components/layout/BottomNavigation";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import { useEffect } from "react";

export async function loader({ request }: LoaderFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        throw new Response(null, { status: 302, headers: { Location: "/login" } });
    }

    // 1. 모든 활성 미션 가져오기
    const allMissions = await db.query.mission.findMany({
        where: eq(schema.mission.isActive, true),
        orderBy: [desc(schema.mission.createdAt)],
    });

    // 2. 유저의 미션 진행 상태 가져오기
    const userMissions = await db.query.userMission.findMany({
        where: eq(schema.userMission.userId, session.user.id),
    });

    // 3. 미션 데이터 결합
    const missions = allMissions.map((m) => {
        const userProgress = userMissions.find((um) => um.missionId === m.id);
        return {
            ...m,
            status: userProgress?.status || "IN_PROGRESS",
            progress: userProgress?.progress || 0,
        };
    });

    return Response.json({
        user: session.user,
        missions,
    });
}

export async function action({ request }: ActionFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const missionId = formData.get("missionId") as string;
    const intent = formData.get("intent") as string;

    if (intent === "claim") {
        const userMission = await db.query.userMission.findFirst({
            where: and(
                eq(schema.userMission.userId, session.user.id),
                eq(schema.userMission.missionId, missionId)
            ),
            with: { mission: true },
        });

        if (!userMission || userMission.status !== "COMPLETED") {
            return Response.json({ error: "Mission not ready to claim" }, { status: 400 });
        }

        // 트랜잭션: 상태 변경 및 CHOCO 지급 (1 Credit = 1 CHOCO)
        const rewardChoco = userMission.mission.rewardCredits.toString();

        await db.transaction(async (tx) => {
            await tx.update(schema.userMission)
                .set({ status: "CLAIMED" })
                .where(eq(schema.userMission.id, userMission.id));

            // 사용자 CHOCO 잔액 조회 및 업데이트
            const user = await tx.query.user.findFirst({
                where: eq(schema.user.id, session.user.id),
                columns: { chocoBalance: true },
            });

            const currentChocoBalance = user?.chocoBalance ? parseFloat(user.chocoBalance) : 0;
            const newChocoBalance = (currentChocoBalance + userMission.mission.rewardCredits).toString();

            await tx.update(schema.user)
                .set({ chocoBalance: newChocoBalance, updatedAt: new Date() })
                .where(eq(schema.user.id, session.user.id));

            await tx.insert(schema.systemLog).values({
                id: crypto.randomUUID(),
                level: "AUDIT",
                category: "PAYMENT",
                message: `User ${session.user.id} claimed ${rewardChoco} CHOCO from mission ${missionId}`,
                createdAt: new Date(),
            });
        });

        return Response.json({ success: true, reward: userMission.mission.rewardCredits, rewardChoco });
    }

    return Response.json({ error: "Invalid intent" }, { status: 400 });
}

export default function MissionsPage() {
    const { missions } = useLoaderData<typeof loader>() as MissionsLoaderData;
    const navigate = useNavigate();
    const fetcher = useFetcher();

    useEffect(() => {
        if (fetcher.data?.success) {
            toast.success(`${fetcher.data.reward} CHOCO claimed!`);
        } else if (fetcher.data?.error) {
            toast.error(fetcher.data.error);
        }
    }, [fetcher.data]);

    const handleClaim = (missionId: string) => {
        fetcher.submit(
            { missionId, intent: "claim" },
            { method: "POST" }
        );
    };

    return (
        <div className="bg-background-dark text-white font-display antialiased min-h-screen pb-24 max-w-md mx-auto shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-50 flex items-center bg-background-dark/80 backdrop-blur-md p-4 border-b border-white/5">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-xl font-black tracking-tight ml-2">Mission Center</h1>
            </div>

            <div className="p-4 space-y-6">
                {/* Daily Progress Overview */}
                <div className="bg-gradient-to-br from-primary/20 to-purple-600/20 rounded-[32px] p-6 border border-white/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-6xl">military_tech</span>
                    </div>
                    <div className="relative z-10">
                        <h2 className="text-sm font-black text-white/60 uppercase tracking-[0.2em] mb-1">Today's Progress</h2>
                        <div className="flex items-baseline gap-2 mb-4">
                            <span className="text-4xl font-black text-white">
                                {missions.filter((m) => m.status === "CLAIMED").length}
                            </span>
                            <span className="text-lg font-bold text-white/40">/ {missions.length}</span>
                        </div>
                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary shadow-[0_0_10px_rgba(238,43,140,0.5)] transition-all duration-1000"
                                style={{ width: `${(missions.filter((m) => m.status === "CLAIMED").length / (missions.length || 1)) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Categories */}
                <div className="space-y-4">
                    <h2 className="text-xs font-black text-white/40 uppercase tracking-[0.3em] flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-sm font-bold">radar</span>
                        Open Missions
                    </h2>

                    <div className="grid gap-3">
                        {missions.length === 0 ? (
                            <div className="py-12 text-center bg-white/5 rounded-2xl border border-white/5">
                                <p className="text-white/20 text-xs font-bold uppercase tracking-[0.2em]">No missions available</p>
                            </div>
                        ) : (
                            missions.map((mission) => (
                                <div key={mission.id} className={cn(
                                    "bg-[#1A1821] border border-white/5 rounded-2xl p-4 transition-all",
                                    mission.status === "CLAIMED" && "opacity-50 grayscale"
                                )}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <span className={cn(
                                                "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider mb-2",
                                                mission.type === "DAILY" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"
                                            )}>
                                                {mission.type}
                                            </span>
                                            <h3 className="font-bold text-base text-white">{mission.title}</h3>
                                            <p className="text-xs text-white/60">{mission.description}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-primary font-black text-sm">+{mission.rewardCredits}</span>
                                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">CHOCO</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full transition-all duration-500",
                                                    mission.status === "COMPLETED" || mission.status === "CLAIMED" ? "bg-emerald-500" : "bg-primary"
                                                )}
                                                style={{ width: mission.status === "CLAIMED" || mission.status === "COMPLETED" ? "100%" : `${mission.progress}%` }}
                                            />
                                        </div>

                                        {mission.status === "COMPLETED" && (
                                            <button
                                                onClick={() => handleClaim(mission.id)}
                                                disabled={fetcher.state !== "idle"}
                                                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-lg transition-all active:scale-95"
                                            >
                                                CLAIM
                                            </button>
                                        )}

                                        {mission.status === "CLAIMED" && (
                                            <span className="text-emerald-500 material-symbols-outlined">check_circle</span>
                                        )}

                                        {mission.status === "IN_PROGRESS" && (
                                            <span className="text-xs font-bold text-white/40">{mission.progress}%</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <BottomNavigation />
        </div>
    );
}
