import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate } from "react-router";
import type { NoticeDetailLoaderData } from "~/lib/types/routes";
import { BottomNavigation } from "~/components/layout/BottomNavigation";
import { cn } from "~/lib/utils";
import { DateTime } from "luxon";

export async function loader({ params }: LoaderFunctionArgs) {
    if (!params.id) {
        throw new Response("Notice ID Missing", { status: 400 });
    }

    const notice = await db.query.notice.findFirst({
        where: eq(schema.notice.id, params.id),
    });

    if (!notice) {
        throw new Response("Notice Not Found", { status: 404 });
    }

    return Response.json({ notice });
}

export default function NoticeDetailPage() {
    const { notice } = useLoaderData<typeof loader>() as NoticeDetailLoaderData;
    const navigate = useNavigate();

    return (
        <div className="bg-background-dark text-white font-display antialiased min-h-screen pb-24 max-w-md mx-auto shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-50 flex items-center bg-background-dark/80 backdrop-blur-md p-4 border-b border-white/5">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-lg font-bold tracking-tight ml-2">Detail</h1>
            </div>

            <div className="p-6 space-y-6">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white",
                            notice.type === "EVENT" ? "bg-emerald-500" : notice.type === "NEWS" ? "bg-blue-600" : "bg-primary"
                        )}>
                            {notice.type}
                        </span>
                        <span className="text-xs text-white/40 font-bold">
                            {DateTime.fromJSDate(new Date(notice.createdAt)).toFormat("yyyy. MM. dd HH:mm")}
                        </span>
                    </div>

                    <h2 className="text-2xl font-black text-white leading-tight">
                        {notice.title}
                    </h2>
                </div>

                {notice.imageUrl && (
                    <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50">
                        <img src={notice.imageUrl} alt="" className="w-full h-auto" />
                    </div>
                )}

                <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                    <div className="text-white/80 text-base leading-relaxed whitespace-pre-wrap font-medium">
                        {notice.content}
                    </div>
                </div>

                <button
                    onClick={() => navigate("/notices")}
                    className="w-full py-4 rounded-2xl bg-[#1A1821] border border-white/5 text-sm font-black text-white/60 hover:text-white hover:bg-white/5 transition-all"
                >
                    BACK TO LIST
                </button>
            </div>

            <BottomNavigation />
        </div>
    );
}
