import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, Link, useRevalidator } from "react-router";
import { AdminLayout } from "~/components/admin/AdminLayout";
import { requireAdmin } from "~/lib/auth.server";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { desc, eq } from "drizzle-orm";

export async function loader({ request }: LoaderFunctionArgs) {
    await requireAdmin(request);
    const missions = await db.query.mission.findMany({
        orderBy: [desc(schema.mission.createdAt)]
    });
    return { missions };
}

export async function action({ request }: ActionFunctionArgs) {
    await requireAdmin(request);
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "toggle_status") {
        const id = formData.get("id") as string;
        const mission = await db.query.mission.findFirst({ where: eq(schema.mission.id, id) });
        if (mission) {
            await db.update(schema.mission).set({
                isActive: !mission.isActive
            }).where(eq(schema.mission.id, id));
        }
        return { success: true };
    }

    if (intent === "delete") {
        const id = formData.get("id") as string;
        await db.delete(schema.mission).where(eq(schema.mission.id, id));
        return { success: true };
    }

    return null;
}

export default function AdminMissionIndex() {
    const { missions } = useLoaderData<typeof loader>();
    const revalidator = useRevalidator();

    const handleDelete = (id: string) => {
        if (!confirm("Are you sure?")) return;
        const formData = new FormData();
        formData.append("intent", "delete");
        formData.append("id", id);
        fetch(window.location.pathname, { method: "POST", body: formData })
            .then(() => {
                toast.success("Mission deleted");
                revalidator.revalidate();
            });
    };

    const handleToggle = (id: string) => {
        const formData = new FormData();
        formData.append("intent", "toggle_status");
        formData.append("id", id);
        fetch(window.location.pathname, { method: "POST", body: formData })
            .then(() => {
                toast.success("Status updated");
                revalidator.revalidate();
            });
    };

    return (
        <AdminLayout>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex justify-between items-end">
                    <div className="space-y-2">
                        <Link to="/admin/content" className="text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all group mb-2">
                            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                            Back to Studio
                        </Link>
                        <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">
                            User <span className="text-primary">Missions</span>
                        </h1>
                        <p className="text-white/40 text-sm font-medium">Manage engagement tasks and CHOCO rewards.</p>
                    </div>
                    <Link
                        to="/admin/content/missions/new"
                        className="bg-primary text-black px-6 py-3 rounded-2xl font-black italic text-sm hover:scale-105 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                    >
                        + NEW MISSION
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {missions.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-[#1A1821] border border-white/5 rounded-[40px]">
                            <p className="text-white/20 font-black italic tracking-widest uppercase">No missions configured</p>
                        </div>
                    ) : (
                        missions.map((m) => (
                            <div key={m.id} className="bg-[#1A1821] border border-white/5 rounded-[32px] p-8 flex flex-col group hover:border-emerald-500/20 transition-all">
                                <div className="flex justify-between items-start mb-6">
                                    <div className={cn(
                                        "px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest",
                                        m.type === "DAILY" ? "bg-emerald-500/20 text-emerald-400" : "bg-purple-500/20 text-purple-400"
                                    )}>
                                        {m.type}
                                    </div>
                                    <button
                                        onClick={() => handleToggle(m.id)}
                                        className={cn(
                                            "w-2 h-2 rounded-full",
                                            m.isActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-white/10"
                                        )}
                                    />
                                </div>

                                <h3 className="text-xl font-black italic text-white uppercase tracking-tighter mb-2 group-hover:text-emerald-400 transition-colors">{m.title}</h3>
                                <p className="text-white/40 text-xs font-medium leading-relaxed mb-6 line-clamp-2">{m.description}</p>

                                <div className="mt-auto flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-emerald-400 text-sm">database</span>
                                        <span className="text-sm font-black italic text-emerald-400">+{m.rewardCredits}</span>
                                    </div>

                                    <div className="flex gap-2">
                                        <Link to={`/admin/content/missions/${m.id}`} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                        </Link>
                                        <button onClick={() => handleDelete(m.id)} className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all">
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
