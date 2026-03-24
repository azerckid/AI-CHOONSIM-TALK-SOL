import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { AdminLayout } from "~/components/admin/AdminLayout";
import { requireAdmin } from "~/lib/auth.server";
import { cn } from "~/lib/utils";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { count, desc, sum, eq, inArray } from "drizzle-orm";

export async function loader({ request }: LoaderFunctionArgs) {
    await requireAdmin(request);

    // Get character stats with naming info
    const characterStats = await db.query.characterStat.findMany({
        with: {
            character: {
                columns: { name: true }
            }
        },
        orderBy: [desc(schema.characterStat.totalHearts)]
    });

    // Get aggregate statistics
    const totalHearts = characterStats.reduce((acc, stat) => acc + (stat.totalHearts || 0), 0);

    const totalGiftsRes = await db.select({ value: count() }).from(schema.giftLog);
    const totalGifts = totalGiftsRes[0]?.value || 0;

    const uniqueGiversRes = await db.select({
        fromUserId: schema.giftLog.fromUserId
    }).from(schema.giftLog).groupBy(schema.giftLog.fromUserId);
    const giversCount = uniqueGiversRes.length;

    // Item popularity
    const itemPopularity = await db.select({
        itemId: schema.giftLog.itemId,
        count: count()
    })
        .from(schema.giftLog)
        .groupBy(schema.giftLog.itemId)
        .orderBy(desc(count()))
        .limit(5);

    // Populate item names for popularity
    const itemIds = itemPopularity.map(p => p.itemId).filter((id): id is string => id !== null);

    let items: { id: string; name: string }[] = [];
    if (itemIds.length > 0) {
        items = await db.query.item.findMany({
            where: inArray(schema.item.id, itemIds),
            columns: { id: true, name: true }
        });
    }

    const itemStats = itemPopularity.map(p => ({
        name: items.find(i => i.id === p.itemId)?.name || "Unknown Item",
        count: p.count
    }));

    return { characterStats, totalHearts, totalGifts, giversCount, itemStats };
}

export default function GiftStatistics() {
    const { characterStats, totalHearts, totalGifts, giversCount, itemStats } = useLoaderData<typeof loader>();

    return (
        <AdminLayout>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">
                        Gift <span className="text-primary">Intelligence</span>
                    </h1>
                    <p className="text-white/40 text-sm font-medium">Analyze giving patterns and character popularity.</p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#1A1821] border border-white/5 rounded-[32px] p-8 space-y-2 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 blur-[60px] group-hover:bg-primary/20 transition-colors" />
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] relative z-10">Total Hearts Given</p>
                        <div className="flex items-baseline gap-2 relative z-10">
                            <span className="text-4xl font-black italic text-white tracking-tighter">{totalHearts.toLocaleString()}</span>
                            <span className="material-symbols-outlined text-primary font-bold">favorite</span>
                        </div>
                    </div>
                    <div className="bg-[#1A1821] border border-white/5 rounded-[32px] p-8 space-y-2 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-[60px] group-hover:bg-white/10 transition-colors" />
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] relative z-10">Total Gift Transactions</p>
                        <div className="flex items-baseline gap-2 relative z-10">
                            <span className="text-4xl font-black italic text-white tracking-tighter">{totalGifts.toLocaleString()}</span>
                            <span className="material-symbols-outlined text-white/40 font-bold">redeem</span>
                        </div>
                    </div>
                    <div className="bg-[#1A1821] border border-white/5 rounded-[32px] p-8 space-y-2 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 blur-[60px] group-hover:bg-primary/20 transition-colors" />
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] relative z-10">Unique Givers</p>
                        <div className="flex items-baseline gap-2 relative z-10">
                            <span className="text-4xl font-black italic text-white tracking-tighter">{giversCount.toLocaleString()}</span>
                            <span className="material-symbols-outlined text-primary/60 font-bold">group</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Character Ranking */}
                    <div className="bg-[#1A1821] border border-white/5 rounded-[40px] p-8 space-y-6">
                        <h2 className="text-xs font-black text-white/60 uppercase tracking-[0.3em] flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-sm font-bold">trophy</span>
                            Character Heart Ranking
                        </h2>

                        <div className="space-y-4">
                            {characterStats.map((stat, index) => (
                                <div key={stat.id} className="group flex items-center gap-4 p-4 bg-black/20 border border-white/5 rounded-2xl hover:border-primary/30 transition-all">
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center font-black italic text-xs",
                                        index === 0 ? "bg-primary text-black" : "bg-white/5 text-white/40"
                                    )}>
                                        {index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-black text-white uppercase tracking-tight">{stat.character.name}</p>
                                        <div className="flex items-center gap-4 mt-1">
                                            <div className="flex items-center gap-1 text-[10px] text-white/40">
                                                <span className="material-symbols-outlined text-[12px]">favorite</span>
                                                {stat.totalHearts.toLocaleString()}
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] text-white/40">
                                                <span className="material-symbols-outlined text-[12px]">group</span>
                                                {stat.totalUniqueGivers} givers
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-white/20 uppercase font-black">Last Gift</p>
                                        <p className="text-[10px] text-white/40 font-medium">
                                            {stat.lastGiftAt ? new Date(stat.lastGiftAt).toLocaleDateString() : 'Never'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Popular Items */}
                    <div className="bg-[#1A1821] border border-white/5 rounded-[40px] p-8 space-y-6">
                        <h2 className="text-xs font-black text-white/60 uppercase tracking-[0.3em] flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-sm font-bold">trending_up</span>
                            Item Popularity (Sales Vol)
                        </h2>

                        <div className="space-y-4">
                            {itemStats.map((item, index) => (
                                <div key={index} className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs font-bold text-white uppercase tracking-tight">{item.name}</span>
                                        <span className="text-[10px] font-black text-primary uppercase">{item.count} Sold</span>
                                    </div>
                                    <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                        <div
                                            className="h-full bg-primary shadow-[0_0_10px_rgba(255,0,255,0.4)] transition-all duration-1000"
                                            style={{ width: `${(item.count / totalGifts * 100) || 0}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
