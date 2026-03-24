import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq, desc } from "drizzle-orm";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate } from "react-router";
import type { NoticesLoaderData } from "~/lib/types/routes";
import { BottomNavigation } from "~/components/layout/BottomNavigation";
import { cn } from "~/lib/utils";
import { DateTime } from "luxon";

export async function loader({ request }: LoaderFunctionArgs) {
    const notices = await db.query.notice.findMany({
        where: eq(schema.notice.isActive, true),
        orderBy: [
            desc(schema.notice.isPinned),
            desc(schema.notice.createdAt)
        ],
    });

    return Response.json({ notices });
}

export default function NoticeListPage() {
    const { notices } = useLoaderData<typeof loader>() as NoticesLoaderData;
    const navigate = useNavigate();

    return (
        <div className="bg-background-dark text-white font-display antialiased min-h-screen pb-24 max-w-md mx-auto shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-50 flex items-center bg-background-dark/80 backdrop-blur-md p-4 border-b border-white/5">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-xl font-black tracking-tight ml-2">Announcements</h1>
            </div>

            <div className="p-4 space-y-4">
                {notices.length === 0 ? (
                    <div className="py-20 text-center">
                        <span className="material-symbols-outlined text-6xl text-white/10 mb-4">campaign</span>
                        <p className="text-white/20 text-xs font-bold uppercase tracking-[0.2em]">No official updates available</p>
                    </div>
                ) : (
                    notices.map((notice) => (
                        <div
                            key={notice.id}
                            onClick={() => navigate(`/notices/${notice.id}`)}
                            className={cn(
                                "relative overflow-hidden rounded-2xl bg-[#1A1821] border border-white/5 active:bg-white/5 transition-all cursor-pointer group",
                                notice.isPinned && "border-primary/30 bg-primary/5"
                            )}
                        >
                            {notice.isPinned && (
                                <div className="absolute top-3 right-3 text-primary animate-pulse">
                                    <span className="material-symbols-outlined text-sm font-black">push_pin</span>
                                </div>
                            )}

                            <div className="p-5">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={cn(
                                        "rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white",
                                        notice.type === "EVENT" ? "bg-emerald-500" : notice.type === "NEWS" ? "bg-blue-600" : "bg-primary"
                                    )}>
                                        {notice.type}
                                    </span>
                                    <span className="text-[10px] text-white/40 font-bold">
                                        {DateTime.fromJSDate(new Date(notice.createdAt)).toFormat("yyyy. MM. dd")}
                                    </span>
                                </div>

                                <h3 className="text-white font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                                    {notice.title}
                                </h3>

                                <p className="text-white/60 text-sm line-clamp-2 leading-relaxed">
                                    {notice.content}
                                </p>

                                {notice.imageUrl && (
                                    <div className="mt-4 rounded-xl overflow-hidden aspect-[16/9] border border-white/5">
                                        <img src={notice.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <BottomNavigation />
        </div>
    );
}
