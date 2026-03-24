import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { AdminLayout } from "~/components/admin/AdminLayout";
import { requireAdmin } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { count, sum, eq, desc } from "drizzle-orm";

export async function loader({ request }: LoaderFunctionArgs) {
    await requireAdmin(request);

    // Fetch basic stats
    const [
        userCountRes,
        characterCountRes,
        paymentTotalRes,
        messageCountRes,
        recentUsers,
        recentPayments,
        tierStatsRes
    ] = await Promise.all([
        db.select({ value: count() }).from(schema.user),
        db.select({ value: count() }).from(schema.character),
        db.select({ value: sum(schema.payment.amount) }).from(schema.payment).where(eq(schema.payment.status, "COMPLETED")),
        db.select({ value: count() }).from(schema.message),
        db.query.user.findMany({ orderBy: [desc(schema.user.createdAt)], limit: 5 }),
        db.query.payment.findMany({
            where: eq(schema.payment.status, "COMPLETED"),
            with: { user: { columns: { name: true, email: true } } },
            orderBy: [desc(schema.payment.createdAt)],
            limit: 5
        }),
        db.select({
            tier: schema.user.subscriptionTier,
            count: count()
        }).from(schema.user).groupBy(schema.user.subscriptionTier)
    ]);

    const userCount = userCountRes[0]?.value || 0;
    const characterCount = characterCountRes[0]?.value || 0;
    const revenue = Number(paymentTotalRes[0]?.value) || 0;
    const messageCount = messageCountRes[0]?.value || 0;

    return {
        stats: {
            userCount,
            characterCount,
            revenue,
            messageCount,
            tierStats: tierStatsRes.map(s => ({ tier: s.tier || "FREE", count: s.count }))
        },
        recentUsers,
        recentPayments
    };
}

export default function AdminDashboard() {
    const { stats, recentUsers, recentPayments } = useLoaderData<typeof loader>();

    const cards = [
        { label: "Total Users", value: stats.userCount.toLocaleString(), icon: "group", sub: "Registered accounts" },
        { label: "Total Messages", value: stats.messageCount.toLocaleString(), icon: "chat", sub: "History volume" },
        { label: "Total Revenue", value: `$${stats.revenue.toLocaleString()}`, icon: "payments", sub: "Excl. pending" },
        { label: "AI Characters", value: stats.characterCount.toLocaleString(), icon: "smart_toy", sub: "Active personals" },
    ];

    return (
        <AdminLayout>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-end">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">Command <span className="text-primary">Center</span></h1>
                        <p className="text-white/40 text-sm font-medium">Real-time health and growth metrics.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link to="/admin/items/statistics" className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl px-5 py-3 flex items-center gap-3 transition-colors group">
                            <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">insights</span>
                            <span className="text-xs font-black text-white/60 group-hover:text-white tracking-widest uppercase italic">Gift Intel</span>
                        </Link>
                        <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 flex items-center gap-3 text-xs font-black text-white/60 tracking-widest uppercase italic">
                            <span className="w-2 h-2 bg-primary rounded-full animate-ping" />
                            Live Feed Active
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {cards.map((card) => (
                        <div key={card.label} className="bg-[#1A1821] border border-white/5 p-8 rounded-[40px] hover:border-primary/30 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
                            <div className="flex justify-between items-start mb-6 relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:border-primary/40 transition-all duration-500">
                                    <span className="material-symbols-outlined text-primary text-3xl">{card.icon}</span>
                                </div>
                                <span className="text-[10px] font-black text-white/10 group-hover:text-primary/20 transition-colors uppercase tracking-[0.2em] italic">Intelligence</span>
                            </div>
                            <div className="space-y-1 relative z-10">
                                <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">{card.label}</p>
                                <p className="text-3xl font-black text-white italic tracking-tighter">{card.value}</p>
                                <p className="text-[9px] text-white/20 font-medium">{card.sub}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Tier Distribution */}
                    <div className="lg:col-span-1 bg-[#1A1821] border border-white/5 rounded-[40px] p-8 space-y-6">
                        <h3 className="text-xs font-black text-white/60 uppercase tracking-[0.3em] flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-sm font-bold">pie_chart</span>
                            Tier Distribution
                        </h3>
                        <div className="space-y-4">
                            {stats.tierStats.map((tier) => (
                                <div key={tier.tier} className="space-y-2">
                                    <div className="flex justify-between px-2">
                                        <span className="text-[10px] font-black text-white/60 uppercase">{tier.tier}</span>
                                        <span className="text-[10px] font-black text-primary">{tier.count}</span>
                                    </div>
                                    <div className="h-2 bg-black/40 rounded-full border border-white/5 overflow-hidden">
                                        <div
                                            className="h-full bg-primary shadow-[0_0_10px_rgba(255,0,255,0.3)] transition-all duration-1000"
                                            style={{ width: `${(tier.count / stats.userCount * 100) || 0}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Registrations */}
                    <div className="lg:col-span-1 bg-[#1A1821] border border-white/5 rounded-[40px] p-8 space-y-6">
                        <h3 className="text-xs font-black text-white/60 uppercase tracking-[0.3em] flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-sm font-bold">person_add</span>
                            New Arrivals
                        </h3>
                        <div className="space-y-4">
                            {recentUsers.map((u) => (
                                <Link key={u.id} to={`/admin/users/${u.id}`} className="flex items-center gap-4 p-4 rounded-3xl bg-black/20 border border-white/5 hover:border-primary/20 transition-all group">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-primary italic text-xs">
                                        {u.name?.[0] || u.email[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-white truncate group-hover:text-primary transition-colors">{u.name || "Unnamed"}</p>
                                        <p className="text-[10px] text-white/20 truncate">{u.email}</p>
                                    </div>
                                    <span className="text-[9px] text-white/10 font-bold uppercase whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString()}</span>
                                </Link>
                            ))}
                            <Link to="/admin/users" className="block text-center text-[10px] font-black text-white/20 hover:text-white uppercase tracking-widest transition-colors py-2">View All Users</Link>
                        </div>
                    </div>

                    {/* Recent Sales */}
                    <div className="lg:col-span-1 bg-[#1A1821] border border-white/5 rounded-[40px] p-8 space-y-6">
                        <h3 className="text-xs font-black text-white/60 uppercase tracking-[0.3em] flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-sm font-bold">receipt_long</span>
                            Recent Revenue
                        </h3>
                        <div className="space-y-4">
                            {recentPayments.map((p) => (
                                <div key={p.id} className="flex items-center gap-4 p-4 rounded-3xl bg-black/20 border border-white/5 group">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-primary text-lg font-bold">attach_money</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-white tracking-tighter italic">+{p.currency === "KRW" ? "₩" : "$"}{p.amount.toLocaleString()}</p>
                                        <p className="text-[9px] text-white/40 truncate">{p.user?.name || "Premium User"}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-[9px] font-black text-primary uppercase leading-none">{p.provider}</span>
                                        <span className="text-[8px] text-white/10 font-medium uppercase">{new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            ))}
                            <Link to="/admin/payments" className="block text-center text-[10px] font-black text-white/20 hover:text-white uppercase tracking-widest transition-colors py-2">View Transaction Log</Link>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
