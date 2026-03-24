import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { AdminLayout } from "~/components/admin/AdminLayout";
import { requireAdmin } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { desc } from "drizzle-orm";

export async function loader({ request }: LoaderFunctionArgs) {
    await requireAdmin(request);

    const items = await db.query.item.findMany({
        orderBy: [desc(schema.item.createdAt)],
    });

    return { items };
}

export default function AdminItems() {
    const { items } = useLoaderData<typeof loader>();

    return (
        <AdminLayout>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex justify-between items-end">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">
                            Item Store <span className="text-primary">Management</span>
                        </h1>
                        <p className="text-white/40 text-sm font-medium">Create and manage virtual gifts and tokens.</p>
                    </div>

                    <Link
                        to="/admin/items/new"
                        className="px-8 py-4 bg-primary text-black rounded-2xl font-black italic text-sm hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,0,255,0.3)] flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined font-bold">add_box</span>
                        CREATE NEW ITEM
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {items.length === 0 ? (
                        <div className="col-span-full py-20 bg-[#1A1821] rounded-[40px] border border-white/5 flex flex-col items-center justify-center space-y-4">
                            <span className="material-symbols-outlined text-white/10 text-64 font-thin">inventory_2</span>
                            <div className="text-center">
                                <p className="text-white/40 font-bold italic uppercase tracking-widest">No items found</p>
                                <p className="text-white/20 text-xs">Start by creating your first virtual gift.</p>
                            </div>
                        </div>
                    ) : (
                        items.map((item) => (
                            <Link
                                key={item.id}
                                to={`/admin/items/${item.id}`}
                                className="group relative bg-[#1A1821] border border-white/5 rounded-[40px] p-6 hover:border-primary/30 transition-all hover:translate-y-[-4px] overflow-hidden"
                            >
                                {/* Decorative background */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />

                                <div className="flex items-center gap-5 relative z-10">
                                    <div className="w-16 h-16 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden group-hover:border-primary/40 transition-colors shadow-inner">
                                        {item.iconUrl ? (
                                            <img src={item.iconUrl} alt={item.name} className="w-10 h-10 object-contain group-hover:scale-110 transition-transform" />
                                        ) : (
                                            <span className="material-symbols-outlined text-primary/40 text-3xl">token</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-black italic text-white uppercase tracking-tighter truncate leading-tight">
                                                {item.name}
                                            </h3>
                                            {!item.isActive && (
                                                <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[8px] font-black rounded uppercase">Hidden</span>
                                            )}
                                        </div>
                                        <p className="text-primary text-[10px] font-black uppercase tracking-widest opacity-60">
                                            {item.type}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-8 grid grid-cols-2 gap-3 relative z-10">
                                    <div className="p-4 bg-black/20 rounded-3xl border border-white/5 group-hover:border-primary/10 transition-colors">
                                        <p className="text-[8px] font-black text-white/20 uppercase mb-1">Price (CHOCO)</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-lg font-black italic text-white tracking-tighter">{item.priceChoco || item.priceCredits || 0}</span>
                                            <span className="text-[10px] text-primary/60 font-bold uppercase">CHOCO</span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-black/20 rounded-3xl border border-white/5 group-hover:border-primary/10 transition-colors">
                                        <p className="text-[8px] font-black text-white/20 uppercase mb-1">Price (KRW)</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-lg font-black italic text-white tracking-tighter">{item.priceKRW?.toLocaleString() || "N/A"}</span>
                                            <span className="text-[10px] text-white/20 font-bold">₩</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center justify-between px-2 relative z-10">
                                    <p className="text-[10px] text-white/40 font-medium line-clamp-1 flex-1 pr-4">{item.description || "No description set."}</p>
                                    <span className="material-symbols-outlined text-white/10 group-hover:text-primary/40 transition-colors">chevron_right</span>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
