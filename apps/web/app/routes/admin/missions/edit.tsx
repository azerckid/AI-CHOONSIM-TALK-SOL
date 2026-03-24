import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, Form, Link, redirect } from "react-router";
import { AdminLayout } from "~/components/admin/AdminLayout";
import { requireAdmin } from "~/lib/auth.server";
import { z } from "zod";

const missionSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    type: z.enum(["DAILY", "ONCE", "REPEAT"]),
    rewardCredits: z.number().int().min(1),
    isActive: z.boolean().default(true),
});

import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";

export async function loader({ request, params }: LoaderFunctionArgs) {
    await requireAdmin(request);
    const { id } = params;

    if (id === "new" || !id) return { mission: null };

    const mission = await db.query.mission.findFirst({ where: eq(schema.mission.id, id) });
    if (!mission) throw new Response("Not Found", { status: 404 });

    return { mission };
}

export async function action({ request, params }: ActionFunctionArgs) {
    await requireAdmin(request);
    const { id } = params;
    const formData = await request.formData();

    const validated = missionSchema.parse({
        title: formData.get("title"),
        description: formData.get("description"),
        type: formData.get("type"),
        rewardCredits: Number(formData.get("rewardCredits")),
        isActive: formData.get("isActive") === "on",
    });

    if (id === "new" || !id) {
        await db.insert(schema.mission).values({
            id: crypto.randomUUID(),
            ...validated,
            updatedAt: new Date(),
        });
    } else {
        await db.update(schema.mission).set({
            ...validated,
            updatedAt: new Date(),
        }).where(eq(schema.mission.id, id));
    }

    return redirect("/admin/content/missions");
}

export default function EditMission() {
    const { mission } = useLoaderData<typeof loader>();
    const isNew = !mission;

    return (
        <AdminLayout>
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="space-y-2">
                    <Link to="/admin/content/missions" className="text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all group mb-2">
                        <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                        Back to List
                    </Link>
                    <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">
                        {isNew ? "Configure" : "Edit"} <span className="text-primary">Mission</span>
                    </h1>
                </div>

                <Form method="post" className="space-y-8">
                    <div className="bg-[#1A1821] border border-white/5 rounded-[40px] p-8 space-y-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Mission Type</label>
                            <div className="grid grid-cols-3 gap-4">
                                {["DAILY", "ONCE", "REPEAT"].map((t) => (
                                    <label key={t} className="relative">
                                        <input
                                            type="radio"
                                            name="type"
                                            value={t}
                                            defaultChecked={mission?.type === t || (isNew && t === "DAILY")}
                                            className="peer sr-only"
                                        />
                                        <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-center text-[10px] font-black uppercase tracking-widest text-white/20 peer-checked:bg-emerald-500/20 peer-checked:border-emerald-500 peer-checked:text-emerald-400 transition-all cursor-pointer">
                                            {t}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Mission Title</label>
                                <input
                                    name="title"
                                    type="text"
                                    defaultValue={mission?.title}
                                    placeholder="e.g., Daily Check-in"
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:border-primary/50 transition-all"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Instructions / Description</label>
                                <textarea
                                    name="description"
                                    defaultValue={mission?.description}
                                    rows={4}
                                    placeholder="Explain how users can complete this mission..."
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm font-medium text-white/80 focus:border-primary/50 transition-all leading-relaxed"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Reward (CHOCO)</label>
                                    <div className="relative">
                                        <input
                                            name="rewardCredits"
                                            type="number"
                                            defaultValue={mission?.rewardCredits ?? 10}
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:border-primary/50 transition-all pl-12"
                                            required
                                        />
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 text-sm">database</span>
                                    </div>
                                </div>
                                <div className="space-y-2 flex flex-col justify-end">
                                    <label className="flex items-center gap-3 cursor-pointer group pb-4">
                                        <div className="relative">
                                            <input type="checkbox" name="isActive" defaultChecked={mission?.isActive ?? true} className="peer sr-only" />
                                            <div className="w-10 h-6 bg-white/5 rounded-full border border-white/10 peer-checked:bg-emerald-500/40 peer-checked:border-emerald-500 transition-all" />
                                            <div className="absolute left-1 top-1 w-4 h-4 bg-white/20 rounded-full transition-all peer-checked:translate-x-4 peer-checked:bg-white" />
                                        </div>
                                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest group-hover:text-white transition-colors">Enabled</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4">
                        <Link
                            to="/admin/content/missions"
                            className="px-8 py-4 rounded-2xl text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-white transition-colors"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            className="bg-primary text-black px-12 py-4 rounded-2xl font-black italic text-sm hover:scale-105 transition-all shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                        >
                            {isNew ? "CREATE MISSION" : "SAVE CHANGES"}
                        </button>
                    </div>
                </Form>
            </div>
        </AdminLayout>
    );
}
