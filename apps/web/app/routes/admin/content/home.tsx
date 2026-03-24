import { redirect } from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, Form, Link } from "react-router";
import { AdminLayout } from "~/components/admin/AdminLayout";
import { requireAdmin } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq, desc } from "drizzle-orm";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import { useEffect } from "react";

export async function loader({ request }: LoaderFunctionArgs) {
    await requireAdmin(request);

    // 1. Fetch current setting
    const setting = await db.query.systemSettings.findFirst({
        where: eq(schema.systemSettings.key, "TODAYS_PICK_ID")
    });

    // 2. Fetch all characters
    const characters = await db.query.character.findMany({
        with: {
            media: true
        }
    });

    return {
        currentPickId: setting?.value || null,
        characters
    };
}

export async function action({ request }: ActionFunctionArgs) {
    await requireAdmin(request);
    const formData = await request.formData();
    const characterId = formData.get("characterId") as string;

    if (!characterId) {
        return Response.json({ error: "No character selected" }, { status: 400 });
    }

    // Upsert the setting
    await db.insert(schema.systemSettings).values({
        key: "TODAYS_PICK_ID",
        value: characterId,
        description: "Home screen Today's Pick Character ID",
        updatedAt: new Date()
    }).onConflictDoUpdate({
        target: schema.systemSettings.key,
        set: {
            value: characterId,
            updatedAt: new Date()
        }
    });

    return { success: true };
}

export default function HomeContentAdmin() {
    const { currentPickId, characters } = useLoaderData<typeof loader>();

    return (
        <AdminLayout>
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="space-y-2">
                    <Link to="/admin/content" className="text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all group mb-2">
                        <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                        Back to Content Dashboard
                    </Link>
                    <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">
                        Home Screen <span className="text-primary">Configuration</span>
                    </h1>
                    <p className="text-white/40 text-sm font-medium">Manage featured content and highlights.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Main Config Column */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Box: Today's Pick */}
                        <div className="bg-[#1A1821] border border-white/5 rounded-[40px] p-8 space-y-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
                                <span className="material-symbols-outlined text-[120px] text-white">verified</span>
                            </div>

                            <div className="relative z-10">
                                <h2 className="text-xl font-black italic text-white uppercase mb-1">Today's Pick</h2>
                                <p className="text-white/40 text-xs font-medium mb-6">Select the character to feature on the main home screen.</p>

                                <Form method="post" className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {characters.map((char) => {
                                            const isSelected = char.id === currentPickId;
                                            const avatar = char.media.find(m => m.type === "AVATAR")?.url || char.media[0]?.url;

                                            return (
                                                <label
                                                    key={char.id}
                                                    className={cn(
                                                        "relative flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all hover:bg-white/5",
                                                        isSelected
                                                            ? "bg-primary/20 border-primary shadow-[0_0_20px_rgba(255,0,255,0.2)]"
                                                            : "bg-black/20 border-white/5 hover:border-white/20"
                                                    )}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="characterId"
                                                        value={char.id}
                                                        defaultChecked={isSelected}
                                                        className="peer sr-only"
                                                    />

                                                    {/* Avatar */}
                                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-black/50 shrink-0">
                                                        {avatar ? (
                                                            <img src={avatar} alt={char.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">?</div>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className={cn("text-sm font-bold truncate", isSelected ? "text-primary" : "text-white")}>
                                                                {char.name}
                                                            </p>
                                                            {isSelected && <span className="material-symbols-outlined text-[14px] text-primary">check_circle</span>}
                                                        </div>
                                                        <p className="text-[10px] text-white/40 truncate">{char.role}</p>
                                                    </div>

                                                    {/* Selection Indicator */}
                                                    <div className={cn(
                                                        "absolute inset-0 rounded-2xl border-2 pointer-events-none transition-opacity",
                                                        isSelected ? "border-primary opacity-100" : "border-transparent opacity-0"
                                                    )} />
                                                </label>
                                            );
                                        })}
                                    </div>

                                    <div className="pt-4 border-t border-white/5 flex justify-end">
                                        <button
                                            type="submit"
                                            className="bg-primary text-black px-8 py-3 rounded-xl font-black italic text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20"
                                        >
                                            Update Highlight
                                        </button>
                                    </div>
                                </Form>
                            </div>
                        </div>
                    </div>

                    {/* Preview Column */}
                    <div className="space-y-6">
                        <div className="bg-[#1A1821] border border-white/5 rounded-[40px] p-6 space-y-4">
                            <h3 className="text-xs font-black text-white/40 uppercase tracking-widest">Live Preview</h3>

                            {/* Mobile Mockup */}
                            <div className="relative w-full aspect-[9/16] bg-black rounded-[32px] border-4 border-[#333] overflow-hidden shadow-2xl">
                                {currentPickId && (() => {
                                    const picked = characters.find(c => c.id === currentPickId);
                                    if (!picked) return null;
                                    const cover = picked.media.find(m => m.type === "COVER")?.url || picked.media[0]?.url;

                                    return (
                                        <div className="absolute inset-0">
                                            <img src={cover} alt="Cover" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                                            <div className="absolute bottom-8 left-4 right-4">
                                                <span className="mb-2 inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-[8px] font-bold text-primary backdrop-blur-sm border border-primary/30">
                                                    ✨ Today's Pick
                                                </span>
                                                <h1 className="text-2xl font-black text-white mb-1">{picked.name}</h1>
                                                <p className="text-[10px] text-white/60 line-clamp-2">{picked.bio}</p>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                            <p className="text-[9px] text-white/20 text-center font-mono">Simulated iPhone 14 Pro View</p>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
